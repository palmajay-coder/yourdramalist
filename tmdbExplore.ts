// Discover catalogs by country, built from TMDB.
// MyDramaList's own rankings are unavailable (it refuses requests from cloud hosts), so each
// catalog is a TMDB "discover" query. Rankings follow TMDB's audience and will differ from
// MyDramaList's. Catalog ids and categories are unchanged, so existing install links keep working.
import { COLLECTION_COUNTRIES, posterUrl } from "./collections.ts";
import { applyShelfFilter, normalizeShelfFilter } from "./shelfFilters.ts";

const TMDB = "https://api.themoviedb.org/3";
const ASIAN_COUNTRIES = Object.values(COLLECTION_COUNTRIES).join("|"); // KR|CN|JP|TW|TH
const ADJECTIVE: Record<string, string> = { KR: "Korean", CN: "Chinese", JP: "Japanese", TW: "Taiwanese", TH: "Thai" };

export type ExploreItem = {
  id: number; kind: "tv" | "movie"; name: string; poster: string | null; overview: string;
  date: string; score?: number; url: string; details: string;
};

const iso = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);

// TMDB discover parameters for each category. `votes` keeps a handful of ratings from topping the
// "top rated" lists; new and upcoming titles have too few votes, so they are not filtered by votes.
function query(category: string): { kind: "tv" | "movie"; params: Record<string, string> } {
  const today = iso(), tomorrow = iso(1);
  const tv = { include_adult: "false", language: "en-US", without_genres: "16,99" };
  const movie = { include_adult: "false", language: "en-US", without_genres: "16,99" };
  switch (category) {
    case "top-shows": return { kind: "tv", params: { ...tv, sort_by: "vote_average.desc", "vote_count.gte": "30", "first_air_date.lte": today } };
    case "popular-shows": return { kind: "tv", params: { ...tv, sort_by: "popularity.desc", "first_air_date.lte": today } };
    case "newest-shows": return { kind: "tv", params: { ...tv, sort_by: "first_air_date.desc", "first_air_date.lte": today } };
    case "upcoming-shows": return { kind: "tv", params: { ...tv, sort_by: "first_air_date.asc", "first_air_date.gte": tomorrow } };
    case "airing-shows": return { kind: "tv", params: { ...tv, sort_by: "vote_average.desc", "vote_count.gte": "10", with_status: "0", "air_date.gte": iso(-21) } };
    case "variety-shows": return { kind: "tv", params: { include_adult: "false", language: "en-US", with_genres: "10764|10767", sort_by: "popularity.desc", "first_air_date.lte": today } };
    case "top-movies": return { kind: "movie", params: { ...movie, sort_by: "vote_average.desc", "vote_count.gte": "50", "primary_release_date.lte": today } };
    case "popular-movies": return { kind: "movie", params: { ...movie, sort_by: "popularity.desc", "primary_release_date.lte": today } };
    case "newest-movies": return { kind: "movie", params: { ...movie, sort_by: "primary_release_date.desc", "primary_release_date.lte": today } };
    case "upcoming-movies": return { kind: "movie", params: { ...movie, sort_by: "primary_release_date.asc", "primary_release_date.gte": tomorrow } };
  }
  throw Error("Choose a valid category.");
}

export async function tmdbExplorePage(
  category: string, country: string, page: number,
  { fetcher = fetch, key = (typeof Deno < "u" && Deno.env.get("TMDB_API_KEY")) || "" } = {},
): Promise<{ items: ExploreItem[]; hasNextPage: boolean }> {
  if (!key) throw Error("TMDB is not configured.");
  const { kind, params } = query(category);
  const code = country ? COLLECTION_COUNTRIES[country] : "";
  if (country && !code) throw Error("Choose a valid country.");
  const url = new URL(`${TMDB}/discover/${kind}`);
  for (const [k, v] of Object.entries({ ...params, with_origin_country: code || ASIAN_COUNTRIES, page: String(page), api_key: key })) url.searchParams.set(k, v);
  const response = await fetcher(url, { redirect: "error", signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } });
  if (!response.ok) { await response.body?.cancel(); throw Error("TMDB could not be loaded (HTTP " + response.status + ")."); }
  const data = await response.json();
  const items: ExploreItem[] = [];
  for (const r of Array.isArray(data?.results) ? data.results : []) {
    const id = Number(r?.id), name = String(r?.name || r?.title || "").replace(/\s+/g, " ").trim();
    const poster = posterUrl(r?.poster_path), date = String(r?.first_air_date || r?.release_date || "");
    // Titles with no picture or no date are placeholders; skip them.
    if (!Number.isInteger(id) || !name || !poster || !/^\d{4}-\d{2}-\d{2}$/.test(date) || r?.adult) continue;
    const origin = code || (Array.isArray(r?.origin_country) ? r.origin_country.find((c: string) => ADJECTIVE[c]) : "") || "";
    const rating = Number(r?.vote_average);
    items.push({
      id, kind, name, poster, overview: String(r?.overview || ""), date,
      ...(rating > 0 && rating <= 10 ? { score: Math.round(rating * 10) / 10 } : {}),
      url: `https://www.themoviedb.org/${kind}/${id}`,
      details: [`${ADJECTIVE[origin] ? ADJECTIVE[origin] + " " : ""}${kind === "tv" ? "Drama" : "Movie"}`, date.slice(0, 4)].join(" - "),
    });
  }
  const total = Number(data?.total_pages) || 1;
  return { items, hasNextPage: page < total && page < 5 };
}

// Several pages at once, for the Nuvio catalog (20 titles a page, five pages at most).
// The result is kept for 30 minutes so the site preview and Nuvio paging do not refetch every page.
const poolMemo = new Map<string, { items: ExploreItem[]; expires: number }>();
export async function tmdbExploreItems(category: string, country: string, count: number, deps = {}): Promise<ExploreItem[]> {
  const pages = Math.min(5, Math.max(1, Math.ceil(count / 20)));
  const memo = `${category}|${country}`, hit = poolMemo.get(memo);
  if (hit && hit.expires > Date.now() && hit.items.length >= Math.min(count, 20 * pages)) return hit.items;
  const results = await Promise.all(Array.from({ length: pages }, (_, i) => tmdbExplorePage(category, country, i + 1, deps).catch(() => ({ items: [] as ExploreItem[] }))));
  const seen = new Set<number>();
  const items = results.flatMap((r) => r.items).filter((item) => !seen.has(item.id) && seen.add(item.id));
  if (items.length && !Object.keys(deps).length) {
    poolMemo.set(memo, { items, expires: Date.now() + 30 * 60_000 });
    while (poolMemo.size > 60) poolMemo.delete(poolMemo.keys().next().value!);
  }
  return items;
}

// Reorders explore items (newest, oldest, highest rated, A to Z) with the same rules the Community tab uses.
export function sortExploreItems<T extends { name: string; date: string; score?: number }>(items: T[], sort: unknown): T[] {
  const filter = normalizeShelfFilter({ sort });
  if (!filter) return items;
  const view = items.map((item) => ({ item, year: Number(item.date.slice(0, 4)) || 0, title: item.name, score: item.score }));
  return applyShelfFilter(view, filter).map((x: any) => x.item);
}

// Synopsis and score for the title dialog of a TMDB-sourced catalog item.
const detailsMemo = new Map<string, { data: any; expires: number }>();
export async function tmdbDetails(raw: string, { fetcher = fetch, key = (typeof Deno < "u" && Deno.env.get("TMDB_API_KEY")) || "" } = {}) {
  const match = String(raw).match(/^https:\/\/www\.themoviedb\.org\/(tv|movie)\/([1-9]\d{0,9})$/);
  if (!match) return null;
  const hit = detailsMemo.get(raw);
  if (hit && hit.expires > Date.now()) return hit.data;
  if (!key) throw Error("TMDB is not configured.");
  const response = await fetcher(`${TMDB}/${match[1]}/${match[2]}?language=en-US&api_key=${key}`, { redirect: "error", signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } });
  if (!response.ok) { await response.body?.cancel(); throw Error("TMDB details unavailable (HTTP " + response.status + ")."); }
  const d = await response.json();
  const rating = Number(d?.vote_average);
  const data = { sourceUrl: raw, synopsis: String(d?.overview || "").trim() || null, score: rating > 0 && rating <= 10 ? Math.round(rating * 10) / 10 : null, rank: null, popularity: null, status: "live", fetchedAt: new Date().toISOString() };
  detailsMemo.set(raw, { data, expires: Date.now() + 6 * 3600_000 });
  while (detailsMemo.size > 300) detailsMemo.delete(detailsMemo.keys().next().value!);
  return data;
}
