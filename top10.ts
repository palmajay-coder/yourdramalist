// Netflix-style "Top 10 K-Dramas Today" and "Top 10 K-Movies Today", ranked by TMDB popularity.
// Dramas: shows with an episode aired in the last 30 days (airing now). Movies: films released in the last
// 180 days. Discover's country filter picks the country (Korea by default, and always Korea for older Nuvio
// installs). Rebuilt once per Pacific day per country, so everyone sees the same list that day.
import {blob} from "https://esm.town/v/std/blob/main.ts";
import {posterUrl} from "./collections.ts";
import {pacificDate} from "./pacificTime.ts";

type Storage = {load: () => Promise<any>; save: (value: any) => Promise<any>};
export type Top10Item = {kind: "tv" | "movie"; id: number; name: string; poster: string; overview: string; date: string; score: number};
export type Top10Country = "KR" | "JP" | "CN" | "TW" | "TH";
export type Top10Row = {catalog: {kind: "top10"; id: "tv" | "movie"; url: string; name: string; type: "series" | "movie"; country: Top10Country}; items: Top10Item[]};
export type Top10 = {date: string; rows: Top10Row[]};

/** Discover's filter values ("3" = South Korea) and each country's row names. */
export const TOP10_COUNTRIES: Record<string, Top10Country> = {"3": "KR", "2": "CN", "1": "JP", "5": "TW", "6": "TH"};
const PREFIX: Record<Top10Country, string> = {KR: "K-", JP: "J-", CN: "C-", TW: "Taiwanese ", TH: "Thai "};
/** A row's catalog. Korea keeps the original addresses (ydl-top10:tv), other countries add theirs (ydl-top10:tv:JP). */
export function top10Catalog(id: "tv" | "movie", country: Top10Country = "KR") {
  return {kind: "top10" as const, id, url: "ydl-top10:" + id + (country === "KR" ? "" : ":" + country), name: "Top 10 " + PREFIX[country] + (id === "tv" ? "Dramas" : "Movies") + " Today", type: id === "tv" ? "series" as const : "movie" as const, country};
}
export const TOP10_CATALOGS = {tv: top10Catalog("tv"), movie: top10Catalog("movie")};
const DAY = 86400000, KEEP_STALE = 3 * DAY, MIN_ROW = 5;
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);

export function createTop10(deps: {tmdb: (path: string, params?: Record<string, string>) => Promise<any>; now?: () => number; storage?: Storage}) {
  const now = deps.now || Date.now;
  type Saved = Top10 & {builtAt: number};
  let saved: Partial<Record<Top10Country, Saved>> | undefined;
  const pending: Partial<Record<Top10Country, Promise<Top10>>> = {};
  const bounded = async <T>(p: Promise<T>) => { let t: any; try { return await Promise.race([p, new Promise<undefined>(r => { t = setTimeout(r, 1000); })]); } finally { clearTimeout(t); } };
  async function load() {
    if (saved !== undefined) return;
    try {
      const data = deps.storage ? await bounded(deps.storage.load()) : null;
      // Older saves held Korea's list only; newer ones hold a list per country.
      saved = data && Array.isArray(data.rows) ? {KR: data} : data && typeof data === "object" ? data : {};
    } catch { saved = {}; }
  }

  async function row(kind: "tv" | "movie", country: Top10Country): Promise<Top10Item[]> {
    const today = iso(now());
    // Smaller markets have fewer votes, so the floor that keeps out unknown shows is lower there.
    const votes = country === "KR" || country === "JP" || country === "CN" ? "5" : "1";
    const params: Record<string, string> = kind === "tv"
      ? {with_origin_country: country, "air_date.gte": iso(now() - 30 * DAY), "air_date.lte": today, without_genres: "16,99,10763,10764,10767", "vote_count.gte": votes}
      : {with_origin_country: country, "primary_release_date.gte": iso(now() - 180 * DAY), "primary_release_date.lte": today, without_genres: "16,99"};
    const data = await deps.tmdb("discover/" + kind, {...params, sort_by: "popularity.desc", include_adult: "false", language: "en-US", page: "1"});
    const items: Top10Item[] = [];
    for (const r of Array.isArray(data?.results) ? data.results : []) {
      const poster = posterUrl(r?.poster_path), name = String(r?.name || r?.title || "").trim();
      const date = String(r?.first_air_date || r?.release_date || "");
      if (!poster || !name || r?.adult || items.some(item => item.id === Number(r.id))) continue;
      if (kind === "tv" && Array.isArray(r?.origin_country) && !r.origin_country.includes(country)) continue;
      items.push({kind, id: Number(r.id), name, poster, overview: String(r.overview || ""), date, score: Number(r.vote_average) || 0});
      if (items.length === 10) break;
    }
    return items;
  }

  /** Today's Top 10 rows for a country (a row with fewer than five titles is left out). */
  async function current(country: Top10Country = "KR"): Promise<Top10> {
    await load();
    const today = pacificDate(now()).date.toISOString().slice(0, 10), last = saved![country];
    if (last && last.date === today) return {date: last.date, rows: last.rows};
    pending[country] ??= (async () => {
      try {
        const rows: Top10Row[] = [];
        for (const kind of ["tv", "movie"] as const) {
          const items = await row(kind, country);
          if (items.length >= MIN_ROW) rows.push({catalog: top10Catalog(kind, country), items});
        }
        if (!rows.length) throw Error("No titles");
        saved![country] = {date: today, rows, builtAt: now()};
        if (deps.storage) await bounded(deps.storage.save(saved)).catch(() => {});
        return {date: today, rows};
      } catch {
        // TMDB trouble: keep showing the last list for up to three days, then nothing.
        const old = saved![country];
        if (old && now() - old.builtAt < KEEP_STALE) return {date: old.date, rows: old.rows};
        return {date: today, rows: []};
      }
    })().finally(() => { delete pending[country]; });
    return pending[country]!;
  }
  return {current};
}

let shared: ReturnType<typeof createTop10> | undefined;
export async function top10(country: Top10Country = "KR") {
  const {collections} = await import("./collectionService.ts");
  shared ??= createTop10({tmdb: collections.tmdb, storage: {load: () => blob.getJSON("top10:v1"), save: value => blob.setJSON("top10:v1", value)}});
  return shared.current(country);
}

/** GET /api/catalogs/top10?country=3 for the Discover rows (Discover's filter value; Korea when left out). */
export async function handleTop10(req: Request) {
  if (req.method !== "GET") return new Response("Method not allowed", {status: 405, headers: {Allow: "GET"}});
  const value = new URL(req.url).searchParams.get("country") || "3";
  if (!TOP10_COUNTRIES[value]) return Response.json({error: "Choose a country."}, {status: 400, headers: {"cache-control": "no-store"}});
  return Response.json(await top10(TOP10_COUNTRIES[value]), {headers: {"cache-control": "no-store"}});
}
