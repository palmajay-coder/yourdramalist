import {betterPostersPattern, posterPlusPattern, posterPlusImageUrl, rpdbApiKey, rpdbPosterUrl} from "./preferences.ts";
import {recordAnalytics, recordErrorLog, type AnalyticsMetric} from "./analyticsApi.ts";

/** Stateless poster check. Credentials and patterns are never persisted or logged. */
const SOURCES = ["letterboxd", "tomatoes", "imdb"];
const SAMPLE_IMDB_ID = "tt6751668"; // Parasite, also used by the EasyPosters preview.
type PreviewInput =
  | {provider: "ratings"; tmdb: string; mdblist: string; ratings: string[]}
  | {provider: "better"; pattern: string}
  | {provider: "posterplus"; pattern: string}
  | {provider: "rpdb"; apiKey: string};

export function parsePreviewInput(v: unknown): PreviewInput | null {
  if(!v || typeof v !== "object") return null;
  const b = v as Record<string, unknown>;
  if(b.provider === "ratings") {
    if(typeof b.tmdb !== "string" || !/^[a-f0-9]{32}$/i.test(b.tmdb.trim())) return null;
    if(typeof b.mdblist !== "string" || !/^[a-zA-Z0-9_-]{8,200}$/.test(b.mdblist.trim())) return null;
    const ratings = b.ratings;
    if(!Array.isArray(ratings) || ratings.length > 3 || !ratings.length || ratings.some(x => !SOURCES.includes(String(x)))) return null;
    return {provider: "ratings", tmdb: b.tmdb.trim(), mdblist: b.mdblist.trim(), ratings: SOURCES.filter(x => ratings.includes(x))};
  }
  if(b.provider === "better") {
    const pattern = betterPostersPattern(b.pattern);
    return pattern ? {provider: "better", pattern} : null;
  }
  if(b.provider === "posterplus") {
    const pattern = posterPlusPattern(b.pattern);
    return pattern ? {provider: "posterplus", pattern} : null;
  }
  if(b.provider === "rpdb") {
    const apiKey = rpdbApiKey(b.apiKey);
    return apiKey ? {provider: "rpdb", apiKey} : null;
  }
  return null;
}

async function boundedBytes(body: ReadableStream<Uint8Array> | null, limit: number) {
  if(!body) throw Error("empty");
  const reader = body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try {while(true) {const {done, value} = await reader.read(); if(done) break; size += value.length; if(size > limit) throw Error("size"); chunks.push(value);}}
  finally {await reader.cancel().catch(() => {});}
  const out = new Uint8Array(size); let offset = 0; for(const part of chunks) {out.set(part, offset); offset += part.length;} return out;
}
function imageType(bytes: Uint8Array, header: string | null): "image/jpeg" | "image/png" | "image/webp" | null {
  if(header && !/^image\/(jpeg|png|webp)(?:\s*;|$)/i.test(header)) return null;
  if(bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if(bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return "image/png";
  if(bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 && String.fromCharCode(...bytes.slice(8,12)) === "WEBP") return "image/webp";
  return null;
}

async function fetchImage(url: string, hosts: readonly string[], fetcher: typeof fetch) {
  let target = new URL(url);
  for(let hop = 0; hop <= 3; hop++) {
    if(target.protocol !== "https:" || !hosts.includes(target.hostname) || target.username || target.password) throw Error("redirect");
    const response = await fetcher(target.href, {signal: AbortSignal.timeout(10000), redirect: "manual", headers: {Accept: "image/jpeg,image/png,image/webp"}, cache: "no-store"});
    if([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get("location"); await response.body?.cancel();
      if(!location || hop === 3) throw Error("redirect");
      target = new URL(location, target); continue;
    }
    if(!response.ok) {await response.body?.cancel(); throw Object.assign(Error("provider-response"), {status: response.status});}
    const bytes = await boundedBytes(response.body, 3000000), type = imageType(bytes, response.headers.get("content-type"));
    if(!type) throw Error("not-image");
    return {bytes, type};
  }
  throw Error("redirect");
}

export function createPreviewHandler(fetcher: typeof fetch = fetch, now = Date.now, track: typeof recordAnalytics = async () => {}, logError: typeof recordErrorLog = async () => {}) {
  let active = 0, requests: number[] = [];
  return async function(req: Request) {
    const headers = {"cache-control": "no-store", "referrer-policy": "no-referrer", "x-content-type-options": "nosniff"};
    const providers = ["ratings", "better", "posterplus", "rpdb"] as const;
    type Provider = typeof providers[number] | "unknown";
    const diagnostic = async (provider: Provider, category: string, status = 424) => {
      const diagnosticCode = "YDL-" + crypto.randomUUID().slice(0, 8).toUpperCase();
      const analyticsCategory = `${provider}:${category}`;
      await track("poster.verify.error" as AnalyticsMetric, analyticsCategory);
      await logError({code: diagnosticCode, kind: "poster", category, provider});
      console.warn(JSON.stringify({diagnosticCode, provider, category, timestamp: new Date().toISOString()}));
      return Response.json({code: category, diagnosticCode}, {status, headers});
    };
    const bodyProvider = (value: unknown): Provider => {
      const candidate = value && typeof value === "object" ? (value as Record<string, unknown>).provider : "";
      return providers.includes(candidate as typeof providers[number]) ? candidate as Provider : "unknown";
    };
    if(req.method !== "POST") return diagnostic("unknown", "request-method", 405);
    if(req.headers.get("origin") !== new URL(req.url).origin) return diagnostic("unknown", "request-origin", 403);
    if(!req.headers.get("content-type")?.startsWith("application/json")) return diagnostic("unknown", "request-format", 415);
    if(Number(req.headers.get("content-length")) > 12000) return diagnostic("unknown", "request-size", 413);
    requests = requests.filter(t => t > now() - 60000);
    if(active >= 2 || requests.length >= 30) return diagnostic("unknown", "request-limit", 429);
    requests.push(now());
    let raw: unknown;
    try {const data = await boundedBytes(req.body, 12000); raw = JSON.parse(new TextDecoder().decode(data));}
    catch {return diagnostic("unknown", "invalid-input", 400);}
    const provider = bodyProvider(raw);
    if(raw && typeof raw === "object" && (raw as Record<string, unknown>).clientFailure === "network") return diagnostic(provider, "client-network", 502);
    const input = parsePreviewInput(raw);
    if(!input) {
      const b = raw as Record<string, unknown>;
      const category = provider === "ratings"
        ? (!/^[a-f0-9]{32}$/i.test(String(b?.tmdb || "").trim()) || !/^[a-zA-Z0-9_-]{8,200}$/.test(String(b?.mdblist || "").trim()) ? "invalid-credentials" : "invalid-settings")
        : provider === "rpdb" && !rpdbApiKey(b?.apiKey) ? "invalid-credentials"
        : provider === "better" || provider === "posterplus" ? "invalid-settings" : "invalid-configuration";
      return diagnostic(provider, category, 400);
    }
    if(active >= 2) return diagnostic(input.provider, "request-limit", 429);
    active++;
    try {
      if(input.provider === "ratings") {
        const query = new URLSearchParams({ratings: input.ratings.join(","), posterRatingsLayout: "bottom", posterStreamBadges: "off", lang: "en", tmdbKey: input.tmdb, mdblistKey: input.mdblist});
        const response = await fetcher("https://dmaxg-dynrat.hf.space/poster/" + SAMPLE_IMDB_ID + "?" + query, {signal: AbortSignal.timeout(12000), redirect: "error", headers: {Accept: "image/jpeg,image/png"}, cache: "no-store"});
        if(!response.ok) {const status=response.status; await response.body?.cancel(); return diagnostic(input.provider, status === 401 || status === 403 ? "credentials-rejected" : status === 429 ? "provider-rate-limit" : "provider-response");}
        const bytes = await boundedBytes(response.body, 3000000), type = imageType(bytes, response.headers.get("content-type"));
        if(!type) return diagnostic(input.provider, "not-an-image");
        return new Response(bytes, {headers: {...headers, "content-type": type, "x-ydl-poster-verified": "true"}});
      }
      if(input.provider === "rpdb") {
        const validation = await fetcher(`https://api.ratingposterdb.com/${input.apiKey}/isValid`, {signal: AbortSignal.timeout(10000), redirect: "error", headers: {Accept: "application/json"}, cache: "no-store"});
        if(!validation.ok) {const status=validation.status; await validation.body?.cancel(); return diagnostic(input.provider, status === 403 ? "credentials-rejected" : status === 429 ? "provider-rate-limit" : "provider-response");}
        await validation.body?.cancel();
      }
      const url = input.provider === "better"
        ? input.pattern.replace("{imdb_id}", SAMPLE_IMDB_ID)
        : input.provider === "posterplus" ? posterPlusImageUrl(input.pattern, {id:SAMPLE_IMDB_ID,type:"movie",posterShape:"poster"})
        : rpdbPosterUrl(input.apiKey, SAMPLE_IMDB_ID);
      const hosts = input.provider === "better" ? ["btttr.cc"] : input.provider === "posterplus" ? ["postersplus.stremio.ru", "postersplus.elfhosted.com", "postersplus-assets.elfhosted.com"] : ["api.ratingposterdb.com"];
      try {
        const {bytes,type} = await fetchImage(url, hosts, fetcher);
        return new Response(bytes, {headers: {...headers, "content-type": type, "x-ydl-poster-verified": "true"}});
      } catch(error) {
        const status = (error as {status?:number}).status;
        return diagnostic(input.provider, status === 401 || status === 403 ? "credentials-rejected" : status === 404 ? "sample-poster-missing" : status === 429 ? "provider-rate-limit" : "provider-unavailable");
      }
    } catch {return diagnostic(input.provider, "provider-unavailable");}
    finally {active--;}
  };
}
export const handlePosterPreview = createPreviewHandler(fetch, Date.now, recordAnalytics, recordErrorLog);
