/** Stateless, fixed-title ERDB image proxy. Never logs or persists credentials. */
const SOURCES = ["letterboxd", "tomatoes", "imdb"];
export function parsePreviewInput(v: unknown) {
  if(!v || typeof v !== "object") return null;
  const b = v as Record<string, unknown>;
  if(typeof b.tmdb !== "string" || !/^[a-f0-9]{32}$/i.test(b.tmdb.trim())) return null;
  if(typeof b.mdblist !== "string" || !/^[a-zA-Z0-9_-]{8,200}$/.test(b.mdblist.trim())) return null;
  const ratings = b.ratings;
  if(!Array.isArray(ratings) || ratings.length > 3 || !ratings.length || ratings.some(x => !SOURCES.includes(x))) return null;
  return {tmdb: b.tmdb.trim(), mdblist: b.mdblist.trim(), ratings: SOURCES.filter(x => ratings.includes(x))};
}
async function boundedBytes(body: ReadableStream<Uint8Array> | null, limit: number) {
  if(!body) throw Error("empty");
  const reader = body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try {while(true) {const {done, value} = await reader.read(); if(done) break; size += value.length; if(size > limit) throw Error("size"); chunks.push(value);}}
  finally {await reader.cancel().catch(() => {});}
  const out = new Uint8Array(size); let offset = 0; for(const part of chunks) {out.set(part, offset); offset += part.length;} return out;
}
export function createPreviewHandler(fetcher: typeof fetch = fetch, now = Date.now) {
  let active = 0, requests: number[] = [];
  return async function(req: Request) {
    const headers = {"cache-control": "no-store", "referrer-policy": "no-referrer", "x-content-type-options": "nosniff"};
    const fail = (code: string, status: number) => Response.json({code}, {status, headers});
    if(req.method !== "POST") return fail("method", 405);
    if(req.headers.get("origin") !== new URL(req.url).origin) return fail("origin", 403);
    if(!req.headers.get("content-type")?.startsWith("application/json")) return fail("format", 415);
    if(Number(req.headers.get("content-length")) > 2048) return fail("size", 413);
    requests = requests.filter(t => t > now() - 60000);
    if(active >= 2 || requests.length >= 30) return fail("limit", 429);
    let input;
    try {input = parsePreviewInput(JSON.parse(new TextDecoder().decode(await boundedBytes(req.body, 2048))));}
    catch {return fail("format", 400);}
    if(!input) return fail("keys", 400);
    if(active >= 2 || requests.length >= 30) return fail("limit", 429);
    requests.push(now()); active++;
    try {
      const query = new URLSearchParams({ratings: input.ratings.join(","), posterRatingsLayout: "bottom", posterStreamBadges: "off", lang: "en", tmdbKey: input.tmdb, mdblistKey: input.mdblist});
      const response = await fetcher("https://dmaxg-dynrat.hf.space/poster/tt6751668.jpg?" + query, {signal: AbortSignal.timeout(12000), redirect: "error", headers: {Accept: "image/jpeg,image/png"}, cache: "no-store"});
      if(!response.ok) {await response.body?.cancel(); return fail(response.status === 401 || response.status === 403 ? "keys" : "upstream", 502);}
      const bytes = await boundedBytes(response.body, 3000000);
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
      if(!jpeg && !png) return fail("upstream", 502);
      return new Response(bytes, {headers: {...headers, "content-type": jpeg ? "image/jpeg" : "image/png"}});
    } catch {return fail("upstream", 502);}
    finally {active--;}
  };
}
export const handlePosterPreview = createPreviewHandler();
