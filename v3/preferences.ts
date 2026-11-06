/** Public preference data only. Keys deliberately never enter this shape. */
export const RATING_SOURCES = ["letterboxd", "tomatoes", "imdb"] as const;
export type RatingSource = typeof RATING_SOURCES[number];
export interface Preferences {
  reviews: boolean;
  posters: boolean;
  ratings: RatingSource[];
  hideUnreleased: boolean;
  hideCompleted: boolean;
}
export const PREFERENCES_STORAGE_KEY = "ydl-v3-preferences";
export function normalizePreferences(value: unknown): Preferences {
  const v = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const ratings = Array.isArray(v.ratings) ? v.ratings : null;
  return {
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
export function pageForPath(path: string) {
  return path === "/setup/preferences" ? "preferences"
    : path === "/setup/confirm" ? "confirm"
    : path.startsWith("/setup/lists") ? "selection"
    : path.startsWith("/setup") ? "connect" : "landing";
}
