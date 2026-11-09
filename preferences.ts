/** Public preference data only. Keys deliberately never enter this shape. */
export const RATING_SOURCES = ["letterboxd", "tomatoes", "imdb"] as const;
export type RatingSource = typeof RATING_SOURCES[number];
export type MetadataProvider = "mdl" | "tmdb";
export const TMDB_LANGUAGES = [
  ["en-US", "English"], ["es-ES", "Spanish"], ["fr-FR", "French"],
  ["de-DE", "German"], ["it-IT", "Italian"], ["pt-BR", "Portuguese"],
  ["nl-NL", "Dutch"], ["pl-PL", "Polish"], ["tr-TR", "Turkish"],
  ["ru-RU", "Russian"], ["uk-UA", "Ukrainian"], ["ar-SA", "Arabic"],
  ["he-IL", "Hebrew"], ["hi-IN", "Hindi"], ["ja-JP", "Japanese"],
  ["ko-KR", "Korean"], ["zh-CN", "Chinese"],
] as const;
export type TmdbLanguage = typeof TMDB_LANGUAGES[number][0];
export interface Preferences {
  metadataProvider: MetadataProvider;
  tmdbLanguage: TmdbLanguage;
  reviews: boolean;
  posters: boolean;
  ratings: RatingSource[];
  hideUnreleased: boolean;
  hideCompleted: boolean;
}
export const PREFERENCES_STORAGE_KEY = "ydl-v3-preferences";
/** Largest setup tested end to end in Nuvio (v1.0.9). Val Town rejects install links near 14,500 characters. */
export const MAX_CATALOGS = 60;
/** Longest encrypted setup accepted for a new install link, leaving room for catalog request paths. */
export const MAX_MANIFEST_TOKEN = 14000;
export function normalizePreferences(value: unknown): Preferences {
  const v = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const ratings = Array.isArray(v.ratings) ? v.ratings : null;
  return {
    // Keep older saved TMDB choices on the original TMDB-first, MDL-fallback behavior.
    metadataProvider: ["tmdb", "tmdb-mdl", "tmdb-only"].includes(String(v.metadataProvider)) ? "tmdb" : "mdl",
    tmdbLanguage: TMDB_LANGUAGES.some(([code]) => code === v.tmdbLanguage)
      ? v.tmdbLanguage as TmdbLanguage : "en-US",
    reviews: v.reviews === true,
    posters: v.posters === true,
    ratings: ratings
      ? RATING_SOURCES.filter(source => ratings.includes(source))
      : [...RATING_SOURCES],
    hideUnreleased: v.hideUnreleased === true,
    hideCompleted: v.hideCompleted === true,
  };
}
export function savePreferences(storage: Pick<Storage, "setItem">, value: unknown) {
  // Explicit whitelist protects against accidental key/config serialization.
  storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(normalizePreferences(value)));
}
export function loadPreferences(storage: Pick<Storage, "getItem">): Preferences {
  try { return normalizePreferences(JSON.parse(storage.getItem(PREFERENCES_STORAGE_KEY) || "null")); }
  catch { return normalizePreferences(null); }
}
export function preferenceIssue(p: Preferences, keys: {tmdb: string; mdblist: string}): "keys" | "ratings" | null {
  if (!p.posters) return null;
  if (!p.ratings.length) return "ratings";
  if (!/^[a-f0-9]{32}$/i.test(keys.tmdb.trim()) || !/^[a-zA-Z0-9_-]{8,200}$/.test(keys.mdblist.trim())) return "keys";
  return null;
}
export function betterPostersPattern(value: unknown): string {
  if (typeof value !== "string" || value.length > 1200) return "";
  const pattern = value.trim().replace(/%7Bimdb_id%7D/gi, "{imdb_id}");
  if (!/^https:\/\/btttr\.cc\/poster(?:-[a-z0-9]+)*\/imdb\/poster-default\/\{imdb_id\}\.jpg(?:\?[^\s#{}]*)?$/.test(pattern)) return "";
  return pattern;
}
export function posterPlusPattern(value: unknown): string {
  if (typeof value !== "string" || value.length > 8000) return "";
  const pattern = value.trim()
    .replace(/%7B([^{}]*)%7D/gi, (_, key: string) => {
      try { return "{" + decodeURIComponent(key).toLowerCase() + "}"; }
      catch { return ""; }
    })
    .replace(/%7C/gi, "|");
  if (/^https:\/\/postersplus\.elfhosted\.com\/p\/[a-z0-9_-]{1,40}\/\{type\}\/\{(?:imdb_id\|tmdb_id|imdb_id)\}\.jpg(?:\?shape=\{shape\})?$/i.test(pattern)) return pattern;
  if (!pattern.startsWith("https://postersplus.stremio.ru/poster?")) return "";
  let url: URL;
  try { url = new URL(pattern); } catch { return ""; }
  if (url.protocol !== "https:" || url.hostname !== "postersplus.stremio.ru" || url.port || url.username || url.password || url.pathname !== "/poster" || url.hash) return "";
  const values = new Map<string, string>();
  for (const [key, value] of [...url.searchParams]) {
    // Posters+ adds URL settings over time; accept its safe query names generically
    // instead of maintaining a brittle list of every configurator option.
    if (!/^[a-zA-Z_][a-zA-Z0-9_.~-]{0,63}$/.test(key) || /[\u0000-\u001f\u007f]/.test(value)) return "";
    const cleaned = value
      .replace(/\{(?:tmdb_id\??|imdb_id\??|id|type|shape)\}/g, "x");
    if (/[{}]/.test(cleaned)) return "";
    values.set(key, value);
  }
  const hasId = ["tmdb_id", "imdb_id"].some(key => /\{(?:tmdb_id|imdb_id)\??\}/.test(values.get(key) || ""));
  if (!hasId || values.get("type") !== "{type}" || values.get("shape") !== "{shape}") return "";
  return pattern;
}
export function posterPlusImageUrl(value: unknown, meta: {id: string; type?: string; posterShape?: string; tmdbId?: string; tmdb_id?: string}): string {
  const pattern = posterPlusPattern(value);
  if (!pattern) return "";
  const imdbId = /^tt\d+$/.test(meta.id) ? meta.id : "";
  const tmdbId = /^\d+$/.test(meta.tmdbId || meta.tmdb_id || "") ? String(meta.tmdbId || meta.tmdb_id) : "";
  if (pattern.startsWith("https://postersplus.elfhosted.com/")) {
    return pattern.replace("{imdb_id|tmdb_id}", imdbId).replace("{imdb_id}", imdbId).replace("{type}", meta.type === "movie" ? "movie" : "series").replace("{shape}", meta.posterShape || "poster");
  }
  const url = new URL(pattern);
  const replacements: Record<string, string> = {
    "{tmdb_id?}": tmdbId, "{tmdb_id}": tmdbId,
    "{imdb_id?}": imdbId, "{imdb_id}": imdbId,
    "{id}": imdbId, "{type}": meta.type === "movie" ? "movie" : "series",
    "{shape}": meta.posterShape || "poster",
  };
  const parameters = [...url.searchParams];
  url.search = "";
  for (const [key, value] of parameters) {
    if (key === "tmdb_id" && !tmdbId && value === "{tmdb_id?}") continue;
    const rendered = value.replace(/\{(tmdb_id\??|imdb_id\??|id|type|shape)\}/g, token => replacements[token] ?? token);
    url.searchParams.append(key, rendered);
  }
  return url.href;
}
export function rpdbApiKey(value: unknown): string {
  if (typeof value !== "string" || value.length > 200) return "";
  const key = value.trim();
  return /^[a-zA-Z0-9_-]{8,200}$/.test(key) ? key : "";
}
export function rpdbPosterUrl(key: unknown, id: string): string {
  const apiKey = rpdbApiKey(key);
  return apiKey && /^tt\d+$/.test(id)
    ? `https://api.ratingposterdb.com/${apiKey}/imdb/poster-default/${id}.jpg?fallback=true`
    : "";
}
export function pageForPath(path: string) {
  return path === "/setup/preferences" ? "preferences"
    : path === "/setup/confirm" ? "confirm"
    : path.startsWith("/setup/lists") ? "selection"
    : path.startsWith("/setup") ? "connect" : "landing";
}
