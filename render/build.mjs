// Bundles the unchanged Val Town code into one Node.js server file: dist/server.mjs.
// Run with: node build.mjs   (Render runs this as the build command)
//
// The public address is used for the add-on icon link. Set it when the address changes:
//   YDL_PUBLIC_ORIGIN=https://yourdramalist.net node build.mjs
import * as esbuild from "esbuild";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const shim = (name) => path.join(here, "shims", name);
const isInside = (file, dir) => file.startsWith(dir + path.sep);

const PUBLIC_ORIGIN = (process.env.YDL_PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL || "https://yourdramalist.onrender.com").replace(/\/$/, "");

// Val Town and Deno specifiers, mapped to their replacements on this server.
function resolveSpecifier(specifier, importer) {
  if (specifier === "https://esm.town/v/std/blob/main.ts") {
    // Each val had its own blob storage on Val Town; keep them apart here too.
    return { path: isInside(importer, path.join(root, "vals", "YDL-V2")) ? shim("blob-ydl-v2.ts") : shim("blob-yourdramalist.ts") };
  }
  const map = {
    "https://esm.town/v/std/sqlite/main.ts": { path: shim("sqlite.ts") },
    "https://esm.town/v/std/utils/index.ts": { path: shim("utils.ts") },
    "https://esm.town/v/std/oauth/middleware.ts": { path: shim("oauth.ts") },
    "npm:cheerio@1.0.0": { path: "cheerio", external: true },
    "npm:hono": { path: "hono", external: true },
  };
  return map[specifier];
}

// Hard-coded Val Town addresses in the app, and where each one points now.
// `to: null` keeps the old address for now; the build lists these as unfinished.
const URL_REWRITES = [
  {
    label: "YDL-V2 profile and avatar service (answered in-process)",
    from: /https:\/\/niwa710--d1ead410d92d11f196511607ee4eb77e\.web\.val\.run/gi,
    to: "https://ydl-v2.internal",
  },
  {
    label: "Add-on icon (served by this server at /assets/ydl-classic-blue-v1.png)",
    from: /https:\/\/niwa710--b3275342d95911f1bbef1607ee4eb77e\.web\.val\.run/gi,
    to: PUBLIC_ORIGIN,
  },
  {
    label: "Add-on and reviews logo (Mdl-lists logo.ts, image not copied yet)",
    from: /https:\/\/niwa710--443e318cd88f11f1b1661607ee4eb77e\.web\.val\.run\//gi,
    to: null,
  },
];

// Files Val Town serves to browsers at /__immutable/<version>/<file>.
// Must match the list in app.ts's serveImmutableFile route.
const BROWSER_FILES = ["preferencesClient.ts", "preferences.ts", "text.ts", "preferences.css", "catalogShelves.css"];

async function buildAssets() {
  const assets = {};
  for (const file of BROWSER_FILES) {
    const source = await readFile(path.join(root, file), "utf8");
    if (file.endsWith(".ts")) {
      // Val Town transpiles TypeScript per file and keeps relative imports, so do the same.
      const { code } = await esbuild.transform(source, { loader: "ts", format: "esm", target: "es2020" });
      assets["/" + file] = { type: "text/javascript; charset=utf-8", body: code };
    } else {
      assets["/" + file] = { type: "text/css; charset=utf-8", body: source };
    }
  }
  return assets;
}

function valTownPlugin({ assets, buildId, usage }) {
  return {
    name: "val-town",
    setup(build) {
      build.onResolve({ filter: /^ydl:assets$/ }, () => ({ path: "ydl:assets", namespace: "ydl" }));
      build.onLoad({ filter: /.*/, namespace: "ydl" }, () => ({
        contents: `export const BUILD_ID = ${JSON.stringify(buildId)};\nexport const ASSETS = ${JSON.stringify(assets)};\n`,
        loader: "js",
      }));
      build.onResolve({ filter: /^(npm:|jsr:|https?:)/ }, (args) => {
        const target = resolveSpecifier(args.path, args.importer);
        if (target) return target;
        return { errors: [{ text: `No mapping for import "${args.path}" (from ${args.importer})` }] };
      });
      // Rewrite hard-coded Val Town addresses in app source files (not this folder).
      build.onLoad({ filter: /\.ts$/ }, async (args) => {
        if (isInside(args.path, here)) return;
        let source = await readFile(args.path, "utf8");
        for (const rule of URL_REWRITES) {
          const count = (source.match(rule.from) || []).length;
          if (!count) continue;
          usage.set(rule.label, (usage.get(rule.label) || 0) + count);
          if (rule.to) source = source.replace(rule.from, rule.to);
        }
        const leftover = source.match(/https:\/\/[a-z0-9-]+(--[a-z0-9]+)?\.(web\.)?val\.run[^\s'"`]*/gi) || [];
        const unmapped = leftover.filter((u) => !URL_REWRITES.some((r) => !r.to && new RegExp(r.from.source, "i").test(u)));
        if (unmapped.length) {
          return { errors: [{ text: `Unmapped Val Town address in ${path.relative(root, args.path)}: ${unmapped[0]}` }] };
        }
        return { contents: source, loader: "ts" };
      });
    },
  };
}

const usage = new Map();
const buildId = String(Date.now()); // Digits only: app.ts matches /__immutable/\d+/.
await mkdir(path.join(here, "dist"), { recursive: true });
const result = await esbuild.build({
  entryPoints: [path.join(here, "server.ts")],
  outfile: path.join(here, "dist/server.mjs"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  packages: "external",
  // App code reads Deno.env; point it at the process.env-backed object in shims/env.ts.
  define: { "Deno.env": "globalThis.__ydlDenoEnv" },
  plugins: [valTownPlugin({ assets: await buildAssets(), buildId, usage })],
  logLevel: "error",
  metafile: true,
});
const bytes = Object.values(result.metafile.outputs).reduce((sum, o) => sum + o.bytes, 0);
console.log(`Built dist/server.mjs (${(bytes / 1024).toFixed(0)} KB) for ${PUBLIC_ORIGIN}`);
for (const rule of URL_REWRITES) {
  const count = usage.get(rule.label);
  if (count) console.log(`  ${rule.to ? "rewrote" : "KEPT OLD"} ${count}x ${rule.label}${rule.to ? " -> " + rule.to : ""}`);
}
