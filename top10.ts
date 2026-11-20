// Netflix-style "Top 10 K-Dramas Today" and "Top 10 K-Movies Today", ranked by TMDB popularity.
// K-dramas: Korean shows with an episode aired in the last 30 days (airing now). K-movies: Korean films
// released in the last 180 days. Rebuilt once per Pacific day, so everyone sees the same list that day.
import {blob} from "https://esm.town/v/std/blob/main.ts";
import {posterUrl} from "./collections.ts";
import {pacificDate} from "./pacificTime.ts";

type Storage = {load: () => Promise<any>; save: (value: any) => Promise<any>};
export type Top10Item = {kind: "tv" | "movie"; id: number; name: string; poster: string; overview: string; date: string; score: number};
export type Top10Row = {catalog: {kind: "top10"; id: "tv" | "movie"; url: string; name: string; type: "series" | "movie"}; items: Top10Item[]};
export type Top10 = {date: string; rows: Top10Row[]};

export const TOP10_CATALOGS = {
  tv: {kind: "top10" as const, id: "tv" as const, url: "ydl-top10:tv", name: "Top 10 K-Dramas Today", type: "series" as const},
  movie: {kind: "top10" as const, id: "movie" as const, url: "ydl-top10:movie", name: "Top 10 K-Movies Today", type: "movie" as const},
};
const DAY = 86400000, KEEP_STALE = 3 * DAY, MIN_ROW = 5;
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);

export function createTop10(deps: {tmdb: (path: string, params?: Record<string, string>) => Promise<any>; now?: () => number; storage?: Storage}) {
  const now = deps.now || Date.now;
  let saved: (Top10 & {builtAt: number}) | null | undefined, pending: Promise<Top10> | undefined;
  const bounded = async <T>(p: Promise<T>) => { let t: any; try { return await Promise.race([p, new Promise<undefined>(r => { t = setTimeout(r, 1000); })]); } finally { clearTimeout(t); } };
  async function load() {
    if (saved !== undefined) return;
    try { const data = deps.storage ? await bounded(deps.storage.load()) : null; saved = data && Array.isArray(data.rows) ? data : null; } catch { saved = null; }
  }

  async function row(kind: "tv" | "movie"): Promise<Top10Item[]> {
    const today = iso(now());
    const params: Record<string, string> = kind === "tv"
      ? {with_origin_country: "KR", "air_date.gte": iso(now() - 30 * DAY), "air_date.lte": today, without_genres: "16,99,10763,10764,10767", "vote_count.gte": "5"}
      : {with_origin_country: "KR", "primary_release_date.gte": iso(now() - 180 * DAY), "primary_release_date.lte": today, without_genres: "16,99"};
    const data = await deps.tmdb("discover/" + kind, {...params, sort_by: "popularity.desc", include_adult: "false", language: "en-US", page: "1"});
    const items: Top10Item[] = [];
    for (const r of Array.isArray(data?.results) ? data.results : []) {
      const poster = posterUrl(r?.poster_path), name = String(r?.name || r?.title || "").trim();
      const date = String(r?.first_air_date || r?.release_date || "");
      if (!poster || !name || r?.adult || items.some(item => item.id === Number(r.id))) continue;
      items.push({kind, id: Number(r.id), name, poster, overview: String(r.overview || ""), date, score: Number(r.vote_average) || 0});
      if (items.length === 10) break;
    }
    return items;
  }

  /** Today's Top 10 rows (a row with fewer than five titles is left out). */
  async function current(): Promise<Top10> {
    await load();
    const today = pacificDate(now()).date.toISOString().slice(0, 10);
    if (saved && saved.date === today) return {date: saved.date, rows: saved.rows};
    pending ??= (async () => {
      try {
        const rows: Top10Row[] = [];
        for (const kind of ["tv", "movie"] as const) {
          const items = await row(kind);
          if (items.length >= MIN_ROW) rows.push({catalog: TOP10_CATALOGS[kind], items});
        }
        if (!rows.length) throw Error("No titles");
        saved = {date: today, rows, builtAt: now()};
        if (deps.storage) await bounded(deps.storage.save(saved)).catch(() => {});
        return {date: today, rows};
      } catch {
        // TMDB trouble: keep showing the last list for up to three days, then nothing.
        if (saved && now() - saved.builtAt < KEEP_STALE) return {date: saved.date, rows: saved.rows};
        return {date: today, rows: []};
      }
    })().finally(() => { pending = undefined; });
    return pending;
  }
  return {current};
}

let shared: ReturnType<typeof createTop10> | undefined;
export async function top10() {
  const {collections} = await import("./collectionService.ts");
  shared ??= createTop10({tmdb: collections.tmdb, storage: {load: () => blob.getJSON("top10:v1"), save: value => blob.setJSON("top10:v1", value)}});
  return shared.current();
}

/** GET /api/catalogs/top10 for the Discover rows. */
export async function handleTop10(req: Request) {
  if (req.method !== "GET") return new Response("Method not allowed", {status: 405, headers: {Allow: "GET"}});
  return Response.json(await top10(), {headers: {"cache-control": "no-store"}});
}
