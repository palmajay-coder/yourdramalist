// "Because you watched …": up to three personal recommendation rows built from a user's public
// MyDramaList watchlist (through Kuryana) and TMDB's own recommendations. The rows change every Monday at
// midnight Pacific, the same moment as Weekly Picks. Used by the Discover shelves and the Nuvio catalogs.
import {blob} from "https://esm.town/v/std/blob/main.ts";
import {weekWindow, normalizeTitle, posterUrl} from "./collections.ts";

type Storage = {load: () => Promise<any>; save: (value: any) => Promise<any>};
type Sections = Record<string, any[]>;
export type RecItem = {kind: "tv" | "movie"; id: number; name: string; poster: string; overview: string; date: string; score: number};
export type RecRow = {seed: {title: string; slug: string}; items: RecItem[]};
export type Recommendations = {week: string; nextRefresh: string; rows: RecRow[]};

export const USERNAME = /^[a-zA-Z0-9_-]{1,60}$/;
const ASIAN_COUNTRIES = new Set(["KR", "JP", "CN", "TW", "TH", "HK"]);
const ASIAN_LANGUAGES = new Set(["ko", "ja", "zh", "cn", "th"]);
// Animation, documentary, news, reality and talk shows: MyDramaList's drama and movie lists leave these out.
const SKIPPED_GENRES = new Set([16, 99, 10763, 10764, 10767]);
const ROWS = 3, PER_ROW = 30, GATHER = 45, REUSE_MS = 24 * 3600000, MAX_USERS = 200;

const yearOf = (r: any) => Number(String(r?.first_air_date || r?.release_date || "").slice(0, 4)) || 0;
const titleKey = (title: unknown, year: unknown) => normalizeTitle(String(title || "")) + "|" + (Number(year) || "");
const asian = (r: any, kind: string) => kind === "tv"
  ? (Array.isArray(r?.origin_country) && r.origin_country.some((c: string) => ASIAN_COUNTRIES.has(c)))
  : ASIAN_LANGUAGES.has(String(r?.original_language || ""));

/** The watchlist titles this week's rows are built around, in order: what they're watching (most episodes
 * first), then completed titles they scored 8 or higher (highest first), or all completed titles if they
 * never score. Each week starts three further along, wrapping round, so the rows rotate on Mondays. */
export function seedOrder(sections: Sections, weekIndex: number) {
  const seen = new Set<string>(), pool: any[] = [];
  const add = (list: any[]) => { for (const item of list) if (item?.slug && item?.title && !seen.has(item.slug)) { seen.add(item.slug); pool.push(item); } };
  add([...(sections[1] || [])].sort((a, b) => (b.episodesSeen || 0) - (a.episodesSeen || 0)));
  const completed = sections[2] || [];
  const scored = completed.filter(item => (item.score || 0) >= 8).sort((a, b) => b.score - a.score);
  add(scored.length ? scored : completed);
  if (pool.length <= ROWS) return pool;
  const start = ((weekIndex * ROWS) % pool.length + pool.length) % pool.length;
  return [...pool.slice(start), ...pool.slice(0, start)];
}

export function createRecommendations(deps: {
  watchlist: (user: string) => Promise<Sections>;
  tmdb: (path: string, params?: Record<string, string>) => Promise<any>;
  now?: () => number;
  storage?: Storage;
}) {
  const now = deps.now || Date.now;
  const cache = new Map<string, {week: string; at: number; data: Recommendations}>();
  const pending = new Map<string, Promise<Recommendations>>();
  type Target = {kind: "tv" | "movie"; id: number; country?: string; language?: string};
  const matches = new Map<string, Target | null>();
  let ready: Promise<void> | undefined, saving = Promise.resolve();
  const bounded = async <T>(p: Promise<T>) => { let t: any; try { return await Promise.race([p, new Promise<undefined>(r => { t = setTimeout(r, 1000); })]); } finally { clearTimeout(t); } };
  async function init() {
    ready ??= (async () => { try { const rows = deps.storage ? await bounded(deps.storage.load()) : null; if (Array.isArray(rows)) for (const [k, v] of rows.slice(-MAX_USERS)) if (Array.isArray(v?.data?.rows)) cache.set(k, v); } catch { /* Start empty. */ } })();
    await ready;
  }
  async function save() {
    if (!deps.storage) return;
    const rows = [...cache];
    saving = saving.catch(() => {}).then(() => deps.storage!.save(rows));
    await bounded(saving).catch(() => {});
  }

  /** The TMDB title for a watchlist entry: same title, year within one, Asian origin. Null when unsure. */
  async function match(seed: any) {
    const kind: "tv" | "movie" = /movie/i.test(seed.type || "") ? "movie" : "tv";
    const key = kind + ":" + seed.slug;
    if (matches.has(key)) return matches.get(key)!;
    const data = await deps.tmdb("search/" + kind, {query: String(seed.title).slice(0, 200), include_adult: "false", language: "en-US"});
    const results = (Array.isArray(data?.results) ? data.results : [])
      .filter((r: any) => !r.adult && asian(r, kind) && (!seed.year || Math.abs(yearOf(r) - seed.year) <= 1));
    const want = normalizeTitle(seed.title);
    const exact = results.filter((r: any) => [r.name, r.title, r.original_name, r.original_title].some(n => n && normalizeTitle(n) === want));
    const chosen = exact[0] || (results.length === 1 ? results[0] : null);
    // The origin country (shows) or language (films) steers the "same themes" and "same genres" top-ups.
    const found = chosen ? {kind, id: Number(chosen.id), country: (Array.isArray(chosen.origin_country) ? chosen.origin_country.find((c: string) => ASIAN_COUNTRIES.has(c)) : "") || "", language: String(chosen.original_language || "")} : null;
    matches.set(key, found);
    while (matches.size > 2000) matches.delete(matches.keys().next().value!);
    return found;
  }

  /** Up to 45 titles like the target, most relevant first: TMDB's recommendations, then similar titles,
   * then titles sharing its themes (keywords), then well-rated titles of its genres from the same country.
   * Every source goes through the same filters. Each title remembers its source (tier) and place (rank). */
  async function candidates(target: Target, today: string, skip: Set<string>, exclude: Set<number> = new Set()) {
    const keep = (r: any): RecItem | null => {
      const date = String(r?.first_air_date || r?.release_date || "");
      const name = String(r?.name || r?.title || "").trim(), poster = posterUrl(r?.poster_path);
      if (!name || !poster || r?.adult || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) return null;
      if (!asian(r, target.kind) || (r.genre_ids || []).some((g: number) => SKIPPED_GENRES.has(g))) return null;
      const year = Number(date.slice(0, 4));
      if ([r.name, r.title, r.original_name, r.original_title].some(n => n && (skip.has(titleKey(n, year)) || skip.has(titleKey(n, year - 1)) || skip.has(titleKey(n, year + 1)) || skip.has(titleKey(n, ""))))) return null;
      return {kind: target.kind, id: Number(r.id), name, poster, overview: String(r.overview || ""), date, score: Number(r.vote_average) || 0,
        // Ranking only; removed before the rows are returned.
        ...{votes: Number(r.vote_count) || 0} as any};
    };
    const out: any[] = [], ids = new Set<number>([target.id, ...exclude]);
    const take = (results: any, tier: number) => {
      for (const r of Array.isArray(results) ? results : []) {
        if (out.length >= GATHER) return;
        const item: any = keep(r);
        if (item && !ids.has(item.id)) { ids.add(item.id); out.push({...item, tier, rank: out.filter(x => x.tier === tier).length}); }
      }
    };
    const get = (path: string, params: Record<string, string> = {}) => deps.tmdb(path, {language: "en-US", ...params}).catch(() => null);
    const base = target.kind + "/" + target.id;
    for (const [tier, list] of [[0, "recommendations"], [1, "similar"]] as const) {
      for (const page of ["1", "2"]) {
        if (out.length >= GATHER) break;
        const data = await get(base + "/" + list, {page});
        take(data?.results, tier);
        if (!data?.results?.length || Number(data?.total_pages) <= Number(page)) break;
      }
    }
    // Same place as the title: its country for shows, its language for films.
    const place: Record<string, string> = target.kind === "tv" ? (target.country ? {with_origin_country: target.country} : {}) : (target.language ? {with_original_language: target.language} : {});
    const discover = (params: Record<string, string>) => get("discover/" + target.kind, {include_adult: "false", sort_by: "vote_average.desc", without_genres: [...SKIPPED_GENRES].join(","), ...place, ...params});
    if (out.length < GATHER && Object.keys(place).length) {
      const words = await get(base + "/keywords");
      const keywordIds = (words?.results || words?.keywords || []).map((k: any) => Number(k?.id)).filter((id: number) => id > 0).slice(0, 8);
      if (keywordIds.length) take((await discover({with_keywords: keywordIds.join("|"), "vote_count.gte": "20"}))?.results, 2);
    }
    if (out.length < GATHER && Object.keys(place).length) {
      const details = await get(base);
      const genres = (details?.genres || []).map((g: any) => Number(g?.id)).filter((id: number) => id > 0 && !SKIPPED_GENRES.has(id));
      for (const page of ["1", "2"]) {
        if (!genres.length || out.length >= GATHER) break;
        take((await discover({with_genres: genres.join("|"), "vote_count.gte": "50", page}))?.results, 3);
      }
    }
    return out as RecItem[];
  }

  async function build(user: string, week: ReturnType<typeof weekWindow>): Promise<Recommendations> {
    const sections = await deps.watchlist(user);
    // Everything already on their watchlist, in any section (dropped too), stays out of the rows.
    const skip = new Set<string>();
    for (const items of Object.values(sections || {})) for (const item of items || []) {
      if (!item?.title) continue;
      skip.add(titleKey(item.title, item.year || ""));
    }
    const today = new Date(now()).toISOString().slice(0, 10);
    const found: {seed: any; target: Target; list: RecItem[]}[] = [];
    for (const seed of seedOrder(sections || {}, week.index).slice(0, ROWS * 2)) {
      if (found.length >= ROWS) break;
      const target = await match(seed).catch(() => null);
      if (!target) continue;
      const list = await candidates(target, today, skip).catch(() => []);
      if (list.length) found.push({seed, target, list});
    }
    // A title several favorites point to ranks higher, as does a well-rated one; earlier rows claim titles first.
    const seenIn = new Map<string, number>();
    for (const {list} of found) for (const item of list) seenIn.set(item.kind + ":" + item.id, (seenIn.get(item.kind + ":" + item.id) || 0) + 1);
    const used = new Set<string>(), rows: RecRow[] = [];
    // Each source sits 10 points above the next, so boosts reorder titles within a source but a themed or
    // genre pick never jumps ahead of a real TMDB recommendation.
    const order = (list: any[]) => list.map((item: any) => ({item, points: (3 - item.tier) * 10 + 1 - item.rank / GATHER + 0.5 * ((seenIn.get(item.kind + ":" + item.id) || 1) - 1) + (item.score >= 7 && item.votes >= 20 ? 0.3 : 0)}))
      .sort((a, b) => b.points - a.points)
      .map(({item}) => item)
      .filter(item => !used.has(item.kind + ":" + item.id));
    for (const {seed, target, list} of found) {
      let pool = order(list);
      // Earlier rows took some shared titles: collect more for this row, skipping everything already used.
      if (pool.length < PER_ROW) {
        const taken = new Set<number>([...list.map(item => item.id), ...[...used].filter(key => key.startsWith(target.kind + ":")).map(key => Number(key.split(":")[1]))]);
        const more = await candidates(target, today, skip, taken).catch(() => []);
        pool = [...pool, ...order(more)];
      }
      const ranked = pool.slice(0, PER_ROW)
        .map(({votes: _votes, tier: _tier, rank: _rank, ...item}: any) => item as RecItem);
      ranked.forEach(item => used.add(item.kind + ":" + item.id));
      if (ranked.length >= 4) rows.push({seed: {title: String(seed.title), slug: String(seed.slug)}, items: ranked});
    }
    return {week: week.week, nextRefresh: week.nextRefresh, rows};
  }

  /** This week's rows for a MyDramaList username; no rows (never an error) when the watchlist can't be read. */
  async function forUser(username: string): Promise<Recommendations> {
    const week = weekWindow(now());
    const empty = {week: week.week, nextRefresh: week.nextRefresh, rows: []};
    if (!USERNAME.test(username || "")) return empty;
    const user = username.toLowerCase();
    await init();
    const hit = cache.get(user);
    if (hit && hit.week === week.week && now() - hit.at < REUSE_MS) return hit.data;
    if (pending.has(user)) return pending.get(user)!;
    const task = (async () => {
      try {
        const data = await build(user, week);
        cache.delete(user);
        cache.set(user, {week: week.week, at: now(), data});
        while (cache.size > MAX_USERS) cache.delete(cache.keys().next().value!);
        await save();
        return data;
      } catch {
        // Keep last result for this week if there is one; otherwise show nothing.
        return hit && hit.week === week.week ? hit.data : empty;
      }
    })().finally(() => pending.delete(user));
    pending.set(user, task);
    return task;
  }
  return {forUser};
}

let shared: ReturnType<typeof createRecommendations> | undefined;
/** The site's recommendations, using the cached watchlist loader and the shared TMDB limits. */
export async function recommendationsFor(username: string) {
  if (!shared) {
    const [{G}, {collections}] = await Promise.all([import("./addonScrape.ts"), import("./collectionService.ts")]);
    shared = createRecommendations({
      watchlist: G,
      tmdb: collections.tmdb,
      storage: {load: () => blob.getJSON("recs:v2"), save: value => blob.setJSON("recs:v2", value)},
    });
  }
  return shared.forUser(username);
}

/** GET /api/recommendations?username=… for the Discover shelves. */
export async function handleRecommendations(req: Request) {
  if (req.method !== "GET") return new Response("Method not allowed", {status: 405, headers: {Allow: "GET"}});
  const username = new URL(req.url).searchParams.get("username") || "";
  if (!USERNAME.test(username)) return Response.json({error: "Enter a MyDramaList username."}, {status: 400, headers: {"cache-control": "no-store"}});
  return Response.json(await recommendationsFor(username), {headers: {"cache-control": "no-store"}});
}
