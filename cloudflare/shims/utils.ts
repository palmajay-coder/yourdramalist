// Stand-in for the two helpers app.ts uses from https://esm.town/v/std/utils/index.ts.
// Val Town serves val files at /__immutable/<version>/<path> and transpiles .ts to JavaScript.
// build.mjs does the transpiling ahead of time and embeds the results as ydl:assets.
import { ASSETS, BUILD_ID } from "ydl:assets";

export function immutableFileUrl(path: string): string {
  return `/__immutable/${BUILD_ID}${path.startsWith("/") ? path : "/" + path}`;
}

export async function serveImmutableFile(pathname: string): Promise<Response> {
  const name = pathname.replace(/^\/__immutable\/\d+/, "");
  const asset = (ASSETS as Record<string, { type: string; body: string }>)[name];
  if (!asset) return new Response("Not found", { status: 404 });
  return new Response(asset.body, {
    headers: {
      "content-type": asset.type,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
