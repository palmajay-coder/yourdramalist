// The Wrapped soundtrack: one MP3 kept in blob storage (the R2 bucket on Cloudflare) and served with Range support,
// which Safari and some Android players need for audio. The path carries a version so a new track gets a new URL.
import {blob} from "https://esm.town/v/std/blob/main.ts";

export const WRAPPED_MUSIC_PATH = "/assets/wrapped-music-v1.mp3";
const KEY = "assets/wrapped-music-v1.mp3";
let cached: Uint8Array | null = null;

async function load(): Promise<Uint8Array | null> {
  if (cached) return cached;
  try {
    const response = await blob.get(KEY);
    if (!response.ok) return null;
    cached = new Uint8Array(await response.arrayBuffer());
    return cached.length ? cached : (cached = null);
  } catch { return null; }
}

export async function serveWrappedMusic(req: Request, bytes?: Uint8Array | null): Promise<Response> {
  const data = bytes === undefined ? await load() : bytes;
  if (!data) return new Response("Not found", {status: 404});
  const headers: Record<string, string> = {"content-type": "audio/mpeg", "accept-ranges": "bytes", "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff"};
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") || "");
  if (range && (range[1] || range[2])) {
    const size = data.length;
    let start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    end = Math.min(end, size - 1);
    if (start > end || start >= size) return new Response(null, {status: 416, headers: {"content-range": "bytes */" + size}});
    return new Response(req.method === "HEAD" ? null : data.slice(start, end + 1), {status: 206, headers: {...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1)}});
  }
  return new Response(req.method === "HEAD" ? null : data, {headers: {...headers, "content-length": String(data.length)}});
}
