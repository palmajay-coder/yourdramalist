import {sqlite} from "https://esm.town/v/std/sqlite/main.ts";

/** Genres, country and poster for MyDramaList titles, looked up on TMDB and saved for 30 days.
 * Watchlist pages carry no artwork, so watchlist shelves take their posters from here.
 * TMDB's TV genres lack Romance, Thriller, Horror and Historical, so dramas also read TMDB keyword tags. */
export type FactsInput = {slug: string; title: string; year?: number | null; type?: string | null};
export type Facts = {genres: string[]; country?: string; poster?: string; v?: number};
const VERSION = 2; // Saved answers from before posters were added are looked up again.

const MOVIE: Record<number, string[]> = {28: ["Action"], 12: ["Adventure"], 16: ["Animation"], 35: ["Comedy"], 80: ["Crime"], 99: ["Documentary"], 18: ["Drama"], 10751: ["Family"], 14: ["Fantasy"], 36: ["Historical"], 27: ["Horror"], 10402: ["Music"], 9648: ["Mystery"], 10749: ["Romance"], 878: ["Sci-Fi"], 53: ["Thriller"], 10752: ["War"], 37: ["Western"]};
const TV: Record<number, string[]> = {10759: ["Action", "Adventure"], 16: ["Animation"], 35: ["Comedy"], 80: ["Crime"], 99: ["Documentary"], 18: ["Drama"], 10751: ["Family"], 10762: ["Kids"], 9648: ["Mystery"], 10763: ["News"], 10764: ["Reality"], 10765: ["Sci-Fi", "Fantasy"], 10766: ["Soap"], 10767: ["Talk"], 10768: ["War", "Politics"], 37: ["Western"]};
const KEYWORDS: [RegExp, string][] = [
  [/\b(romance|romantic|love triangle|first love|love story|rom ?com)\b/i, "Romance"],
  [/\b(thriller|suspense)\b/i, "Thriller"],
  [/\b(horror|zombie|ghost story|haunted|vampire)\b/i, "Horror"],
  [/\b(historical|period drama|period piece|costume drama|joseon|goryeo|ancient china|imperial court|wuxia|sageuk)\b/i, "Historical"],
];
const LANGUAGES: Record<string, string> = {ko: "KR", ja: "JP", th: "TH", zh: "CN", cn: "HK", tl: "PH"};
const FRESH_MS = 30 * 24 * 60 * 60 * 1000, MISS_MS = 7 * 24 * 60 * 60 * 1000;

export function factsGenresFor(type: "tv" | "movie", genreIds: number[], keywords: string[] = []): string[] {
  const table = type === "tv" ? TV : MOVIE, out = new Set<string>();
  for (const id of genreIds) for (const name of table[id] || []) out.add(name);
  for (const word of keywords) for (const [pattern, name] of KEYWORDS) if (pattern.test(word)) out.add(name);
  return [...out].sort();
}

const clean = (value: string) => String(value || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Picks the TMDB result whose title and year best match the MyDramaList title. */
export function pickTmdbResult(results: any[], title: string, year?: number | null) {
  const wanted = clean(title);
  let best: any = null, bestScore = -1;
  for (const r of results.slice(0, 10)) {
    const names = [r.name, r.title, r.original_name, r.original_title].filter(Boolean).map(clean);
    let score = names.includes(wanted) ? 3 : names.some((n) => n.startsWith(wanted) || wanted.startsWith(n)) ? 1.5 : -1;
    if (score < 0) continue;
    const found = Number(String(r.first_air_date || r.release_date || "").slice(0, 4)) || null;
    if (year && found) score += found === year ? 3 : Math.abs(found - year) === 1 ? 1.5 : -2;
    if (score > bestScore) { bestScore = score; best = r; }
  }
  return bestScore >= 3 ? best : null;
}

async function lookup(item: FactsInput, key: string, fetcher: typeof fetch): Promise<Facts> {
  const type = /movie/i.test(String(item.type || "")) ? "movie" : "tv";
  const get = async (path: string, params: Record<string, string> = {}) => {
    const url = new URL("https://api.themoviedb.org/3" + path);
    url.searchParams.set("api_key", key);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const r = await fetcher(url, {signal: AbortSignal.timeout(8000)});
    if (!r.ok) { await r.body?.cancel(); throw Error("tmdb " + r.status); }
    return r.json();
  };
  const search = await get(`/search/${type}`, {query: item.title, include_adult: "false"});
  const match = pickTmdbResult(search.results || [], item.title, item.year);
  if (!match) return {genres: [], v: VERSION};
  let keywords: string[] = [];
  if (type === "tv") {
    const tagged = await get(`/tv/${match.id}/keywords`).catch(() => ({results: []}));
    keywords = (tagged.results || []).map((k: any) => String(k.name || ""));
  }
  const origin = Array.isArray(match.origin_country) && match.origin_country[0] ? String(match.origin_country[0]) : LANGUAGES[String(match.original_language || "")] || "";
  const poster = typeof match.poster_path === "string" && /^\/[A-Za-z0-9_-]+\.(jpg|png)$/.test(match.poster_path) ? "https://image.tmdb.org/t/p/w342" + match.poster_path : "";
  return {genres: factsGenresFor(type, match.genre_ids || [], keywords), ...(origin ? {country: origin} : {}), ...(poster ? {poster} : {}), v: VERSION};
}

let schema: Promise<void> | undefined;
async function ready() {
  schema ??= sqlite.execute(`CREATE TABLE IF NOT EXISTS ydl_title_facts (slug TEXT PRIMARY KEY, data TEXT NOT NULL, at INTEGER NOT NULL)`).then(() => {});
  try { await schema; } catch (error) { schema = undefined; throw error; }
}

/** Returns facts by slug. Saved answers are reused; missing ones are looked up within the time budget. */
export async function getTitleFacts(items: FactsInput[], options: {key?: string; fetcher?: typeof fetch; budgetMs?: number; now?: () => number} = {}): Promise<Record<string, Facts>> {
  const now = options.now ?? Date.now, fetcher = options.fetcher ?? fetch, key = options.key ?? (Deno.env.get("TMDB_API_KEY") || "");
  const valid = new Map<string, FactsInput>();
  for (const item of items) if (/^\d+-[a-z0-9-]+$/i.test(String(item?.slug || "")) && item.title) valid.set(item.slug, item);
  const out: Record<string, Facts> = {};
  if (!valid.size) return out;
  const slugs = [...valid.keys()];
  try {
    await ready();
    for (let i = 0; i < slugs.length; i += 100) {
      const part = slugs.slice(i, i + 100);
      const rows = await sqlite.execute({sql: `SELECT slug, data, at FROM ydl_title_facts WHERE slug IN (${part.map(() => "?").join(",")})`, args: part});
      for (const row of (rows.rows || []) as any[]) {
        const data = JSON.parse(String(row.data));
        if (data.v === VERSION && Number(row.at) > now() - (data.genres?.length ? FRESH_MS : MISS_MS)) out[String(row.slug)] = data;
      }
    }
  } catch { /* A storage problem only means more lookups. */ }
  const missing = slugs.filter((s) => !out[s]);
  if (!missing.length || !key) return out;
  const started = now(), budget = options.budgetMs ?? 20000, found: [string, Facts][] = [];
  let next = 0;
  await Promise.all(Array.from({length: Math.min(6, missing.length)}, async () => {
    while (next < missing.length && now() - started < budget) {
      const slug = missing[next++];
      try { const facts = await lookup(valid.get(slug)!, key, fetcher); out[slug] = facts; found.push([slug, facts]); } catch { /* Try again next time. */ }
    }
  }));
  if (found.length) {
    try {
      await sqlite.batch([
        ...found.map(([slug, facts]) => ({sql: "INSERT OR REPLACE INTO ydl_title_facts(slug, data, at) VALUES(?, ?, ?)", args: [slug, JSON.stringify(facts), now()]})),
        {sql: "DELETE FROM ydl_title_facts WHERE at < ?", args: [now() - FRESH_MS]},
      ]);
    } catch { /* Saving is best effort. */ }
  }
  return out;
}
