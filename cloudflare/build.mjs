// Bundles the unchanged Val Town code into Cloudflare Worker files in dist/.
//   dist/worker.js  YourDramaList (repository root, entry app.ts)
//   dist/ydl-v2.js  YDL-V2 profile and avatar service (vals/YDL-V2/main.ts)
// Run with: node build.mjs
//
// Origins can be overridden when a custom domain is added, for example:
//   YDL_PUBLIC_ORIGIN=https://yourdramalist.net node build.mjs
import * as esbuild from "esbuild";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const shim = (name) => path.join(here, "shims", name);

const PUBLIC_ORIGIN = process.env.YDL_PUBLIC_ORIGIN || "https://yourdramalist.palmajay.workers.dev";
const YDL_V2_ORIGIN = process.env.YDL_V2_ORIGIN || "https://ydl-v2.palmajay.workers.dev";

// Val Town and Deno specifiers, mapped to their Cloudflare replacements.
const ALIASES = {
  "https://esm.town/v/std/blob/main.ts": shim("blob.ts"),
  "https://esm.town/v/std/sqlite/main.ts": shim("sqlite.ts"),
  "https://esm.town/v/std/utils/index.ts": shim("utils.ts"),
  "https://esm.town/v/std/oauth/middleware.ts": shim("oauth.ts"),
  // The app only uses cheerio's load(). This file is the same load() that cheerio's
  // main entry re-exports, without the fetch helpers that need Node streams and undici.
  "npm:cheerio@1.0.0": path.join(here, "node_modules/cheerio/dist/esm/load-parse.js"),
  "npm:hono": path.join(here, "node_modules/hono/dist/index.js"),
};

// Hard-coded Val Town addresses in the app, and where each one points on Cloudflare.
// `to: null` keeps the old address for now; the build lists these as unfinished.
const URL_REWRITES = [
  {
    label: "YDL-V2 profile and avatar service",
    from: /https:\/\/niwa710--d1ead410d92d11f196511607ee4eb77e\.web\.val\.run/gi,
    to: YDL_V2_ORIGIN,
  },
  {
    label: "Add-on icon (served by this Worker at /assets/ydl-classic-blue-v1.png)",
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
        const target = ALIASES[args.path];
        if (target) return { path: target };
        return { errors: [{ text: `No Cloudflare mapping for import "${args.path}" (from ${args.importer})` }] };
      });
      // Rewrite hard-coded Val Town addresses in app source files (not node_modules).
      build.onLoad({ filter: /\.ts$/ }, async (args) => {
        if (args.path.includes(`${path.sep}node_modules${path.sep}`) || args.path.startsWith(here + path.sep + "shims")) return;
        let source = await readFile(args.path, "utf8");
        for (const rule of URL_REWRITES) {
          const count = (source.match(rule.from) || []).length;
          if (!count) continue;
          usage.set(rule.label, (usage.get(rule.label) || 0) + count);
          if (rule.to) source = source.replace(rule.from, rule.to);
        }
        const leftover = source.match(/https:\/\/[a-z0-9-]+(--[a-z0-9]+)?\.(web\.)?val\.run[^\s'"`]*/gi) || [];
        const kept = leftover.filter((u) => !URL_REWRITES.some((r) => !r.to && new RegExp(r.from.source, "i").test(u)));
        if (kept.length) {
          return { errors: [{ text: `Unmapped Val Town address in ${path.relative(root, args.path)}: ${kept[0]}` }] };
        }
        return { contents: source, loader: "ts" };
      });
    },
  };
}

async function bundle({ entry, outfile, assets, buildId }) {
  const usage = new Map();
  const result = await esbuild.build({
    entryPoints: [path.join(here, entry)],
    outfile: path.join(here, "dist", outfile),
    bundle: true,
    format: "esm",
    platform: "browser",
    conditions: ["workerd", "worker", "browser"],
    target: "es2022",
    external: ["cloudflare:*", "node:*"],
    plugins: [valTownPlugin({ assets, buildId, usage })],
    logLevel: "error",
    metafile: true,
  });
  const bytes = Object.values(result.metafile.outputs).reduce((sum, o) => sum + o.bytes, 0);
  console.log(`Built dist/${outfile} (${(bytes / 1024).toFixed(0)} KB)`);
  for (const rule of URL_REWRITES) {
    const count = usage.get(rule.label);
    if (count) console.log(`  ${rule.to ? "rewrote" : "KEPT OLD"} ${count}x ${rule.label}${rule.to ? " -> " + rule.to : ""}`);
  }
}

const buildId = String(Date.now()); // Digits only: app.ts matches /__immutable/\d+/.
await mkdir(path.join(here, "dist"), { recursive: true });
await bundle({ entry: "worker.ts", outfile: "worker.js", assets: await buildAssets(), buildId });
await bundle({ entry: "ydl-v2.worker.ts", outfile: "ydl-v2.js", assets: {}, buildId });
