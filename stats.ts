// Stats: an all-time recap of a public MyDramaList watchlist (not a yearly one; MyDramaList gives no completion dates).
//
// Sources:
// - Kuryana's v2 dramalist (the same service Lists uses, see kuryana.ts): every status list with each title's country,
//   year, type, the owner's score and episodes seen/total, plus MyDramaList's OWN per-list totals (episodes and days
//   watched). Viewing time comes from those totals, not from an estimate.
// - TMDB, for genres, cast and artwork only (matched by title, year and country with titleFacts.ts's pickTmdbResult,
//   through the shared TMDB limits). Missing matches are counted as coverage, never guessed.
// - Completion order is not in any source. The hero's "recently completed" title comes from comparing successive
//   snapshots of the Completed list (see heroFrom); detection time is when YourDramaList noticed, not when they finished.
import {blob} from "https://esm.town/v/std/blob/main.ts";
import {kuryana, KuryanaError} from "./kuryana.ts";
import {pickTmdbResult, factsGenresFor} from "./titleFacts.ts";

export const STATUSES = ["watching", "completed", "plan_to_watch", "on_hold", "dropped"] as const;
export type Status = typeof STATUSES[number];
export type Entry = {slug: string; title: string; country: string; year: number | null; type: string; score: number; episodesSeen: number; episodesTotal: number | null};
export type ListTotals = {dramas: number; tvShows: number; movies: number; episodes: number; days: number};
export type Watchlist = {username: string; fetchedAt: string; lists: Record<Status, {items: Entry[]; totals: ListTotals | null}>};
export type TitleMeta = {v: number; slug: string; matched: boolean; tmdb?: {kind: "tv" | "movie"; id: number}; genres: string[];
  cast: {id: number; name: string; profile: string | null}[]; backdrop: string | null; backdropHd: string | null; poster: string | null; at: number};
export type Snapshot = {v: 1; lastSync: string; completed: Record<string, string | null>};

const COUNTRY_CODES: Record<string, string> = {"South Korea": "KR", "China": "CN", "Japan": "JP", "Taiwan": "TW", "Thailand": "TH", "Hong Kong": "HK", "Philippines": "PH"};
// Version 2 added backdropHd (sharp pictures for Wrapped), so every older saved answer is looked up again.
const META_VERSION = 2, DAY = 86400000;
const IMG = "https://image.tmdb.org/t/p/";
const num = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const round = (value: number, places = 1) => Math.round(value * 10 ** places) / 10 ** places;

/** Kuryana's dramalist → a checked watchlist. Throws {code: "LAYOUT"} when MyDramaList's V2 layout hides the lists. */
export function parseDramalist(data: any, username: string, now = Date.now()): Watchlist {
  if (!data?.lists || typeof data.lists !== "object" || !Object.keys(data.lists).length) {
    throw Object.assign(new Error("This MyDramaList watchlist uses the V2 beta layout."), {code: "LAYOUT"});
  }
  const lists = {} as Watchlist["lists"], seen = new Set<string>();
  for (const status of STATUSES) {
    const list = data.lists[status], items: Entry[] = [];
    for (const raw of Array.isArray(list?.items) ? list.items : []) {
      const slug = String(raw?.slug || "");
      // A title appears once, in its first status list; bad or repeated slugs are skipped.
      if (!/^\d+-[a-z0-9-]+$/i.test(slug) || seen.has(slug)) continue;
      seen.add(slug);
      const year = Number(raw?.year), total = Number(raw?.episodes_total), score = Number(raw?.score);
      items.push({slug, title: String(raw?.title || "").replace(/\s+/g, " ").trim() || slug, country: String(raw?.country || "").trim(),
        year: Number.isInteger(year) && year > 1800 && year < 2200 ? year : null, type: String(raw?.type || "").trim(),
        score: score > 0 && score <= 10 ? score : 0, episodesSeen: Math.max(0, Math.floor(num(raw?.episodes_seen))),
        episodesTotal: Number.isInteger(total) && total > 0 ? total : null});
    }
    const s = list?.stats;
    const totals = s && typeof s === "object" ? {dramas: num(s.dramas), tvShows: num(s.tv_shows), movies: num(s.movies), episodes: num(s.episodes), days: num(s.days)} : null;
    lists[status] = {items, totals};
  }
  return {username, fetchedAt: new Date(now).toISOString(), lists};
}

/**
 * Completion tracking for the hero. The first sync records every completed title as "already there" (null).
 * Later syncs stamp titles that newly entered Completed with the time they were first seen; titles that left
 * Completed are dropped. A snapshot older than 180 days starts over, like a first sync.
 */
export function nextSnapshot(previous: Snapshot | null, list: Watchlist, now = Date.now()): Snapshot {
  const fresh = !previous || now - Date.parse(previous.lastSync) > 180 * DAY;
  const completed: Record<string, string | null> = {};
  for (const item of list.lists.completed.items) {
    completed[item.slug] = fresh ? null : item.slug in previous!.completed ? previous!.completed[item.slug] : new Date(now).toISOString();
  }
  return {v: 1, lastSync: new Date(now).toISOString(), completed};
}

/**
 * The hero: the most recently detected completion. Several found in one sync are ordered by the owner's score, then
 * title (their real order is unknown). With no detected completion yet (first sync, or nothing new since), the
 * owner's highest-rated completed title stands in, and the reason says so.
 */
export function heroFrom(list: Watchlist, snapshot: Snapshot) {
  const completed = list.lists.completed.items;
  const detected = completed.filter(item => snapshot.completed[item.slug]);
  const byScore = (a: Entry, b: Entry) => b.score - a.score || a.title.localeCompare(b.title);
  if (detected.length) {
    const latest = detected.map(item => snapshot.completed[item.slug]!).sort().pop()!;
    const pick = detected.filter(item => snapshot.completed[item.slug] === latest).sort(byScore)[0];
    return {slug: pick.slug, title: pick.title, year: pick.year, reason: "newly-completed" as const, detectedAt: latest};
  }
  const pick = [...completed].sort(byScore)[0];
  return pick ? {slug: pick.slug, title: pick.title, year: pick.year, reason: "top-rated-fallback" as const, detectedAt: null} : null;
}

/** Every number on the Stats page, from the watchlist (exact) and TMDB details (where matched). */
export function computeStats(list: Watchlist, meta: Record<string, TitleMeta>, hero: ReturnType<typeof heroFrom>, extra: {stale?: boolean; pending?: number} = {}) {
  const L = list.lists, completed = L.completed.items;
  const kind = (item: Entry) => /movie/i.test(item.type) ? "movie" : /tv show/i.test(item.type) ? "tvShow" : "drama";
  const countryOf = (item: Entry) => item.country || "Unknown";

  // Viewing time: MyDramaList's own totals (days to one decimal, so within about 1.2 hours).
  const completedDays = L.completed.totals?.days ?? null;
  const viewingTime = completedDays === null ? null : {
    source: "mydramalist", hours: round(completedDays * 24), days: completedDays, episodes: L.completed.totals!.episodes,
    note: "MyDramaList's own total for Completed, given to a tenth of a day (within about 1.2 hours).",
    includingWatching: L.watching.totals ? round((completedDays + L.watching.totals.days) * 24) : null,
  };

  // Ratings: scored titles only (unrated are not zeros). Country comparisons need at least 3 scored titles.
  const scored = completed.filter(item => item.score > 0);
  const average = scored.length ? round(scored.reduce((n, item) => n + item.score, 0) / scored.length, 2) : null;
  const distribution = [...new Set(scored.map(item => item.score))].sort((a, b) => b - a).map(score => ({score, count: scored.filter(item => item.score === score).length}));
  const MIN_COUNTRY_SAMPLE = 3;
  const byCountry = [...new Set(scored.map(countryOf))].map(country => {
    const group = scored.filter(item => countryOf(item) === country);
    return {country, code: COUNTRY_CODES[country] || null, rated: group.length, average: round(group.reduce((n, item) => n + item.score, 0) / group.length, 2)};
  }).sort((a, b) => b.average - a.average || b.rated - a.rated || a.country.localeCompare(b.country));
  const comparable = byCountry.filter(c => c.rated >= MIN_COUNTRY_SAMPLE);

  const countries = [...new Set(completed.map(countryOf))].map(country => ({country, code: COUNTRY_CODES[country] || null, count: completed.filter(item => countryOf(item) === country).length}))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
  const decades = [...new Set(completed.filter(i => i.year).map(i => Math.floor(i.year! / 10) * 10))].sort().map(start => ({decade: start + "s", count: completed.filter(i => i.year && Math.floor(i.year / 10) * 10 === start).length}));

  // Top 10: the owner's score, then title A to Z (no dates exist, so no recency).
  const topRated = [...scored].sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, 10)
    .map((item, i) => ({rank: i + 1, slug: item.slug, title: item.title, year: item.year, country: item.country, type: item.type, score: item.score, poster: meta[item.slug]?.poster || null}));

  // Genres and actors: completed titles that matched on TMDB, each title counted once.
  const matched = completed.filter(item => meta[item.slug]?.matched);
  const genreCount = new Map<string, number>(), actorCount = new Map<number, {id: number; name: string; profile: string | null; count: number; titles: string[]}>();
  for (const item of matched) {
    for (const genre of new Set(meta[item.slug].genres)) genreCount.set(genre, (genreCount.get(genre) || 0) + 1);
    for (const person of meta[item.slug].cast) {
      const row = actorCount.get(person.id) || {id: person.id, name: person.name, profile: person.profile, count: 0, titles: []};
      if (!row.titles.includes(item.title)) { row.count++; row.titles.push(item.title); }
      actorCount.set(person.id, row);
    }
  }
  // Your highest scored dramas and movies, each with its own #1 (ties by title A to Z; no dates exist, so no recency).
  const byScoreThenTitle = (a: Entry, b: Entry) => b.score - a.score || a.title.localeCompare(b.title);
  const rankList = (items: Entry[]) => items.slice(0, 5).map((item, i) => ({rank: i + 1, slug: item.slug, title: item.title, year: item.year, country: item.country, type: item.type, score: item.score, poster: meta[item.slug]?.poster || null}));
  const dramasScored = scored.filter(i => kind(i) !== "movie").sort(byScoreThenTitle), moviesScored = scored.filter(i => kind(i) === "movie").sort(byScoreThenTitle);
  const topDramas = rankList(dramasScored), topMovies = rankList(moviesScored);

  // Backdrops for the Wrapped slides: sharp pictures only, one fitting title per slide, never the same picture twice
  // (except a #1 that is also the hero). A category's #1 always gets its own slide's backdrop (its next-ranked title if it has none).
  const genreList = [...genreCount].map(([genre, count]) => ({genre, count})).sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
  const actorList = [...actorCount.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const hd = (slug: string) => meta[slug]?.backdropHd || null;
  const withArt = completed.filter(item => hd(item.slug)).sort(byScoreThenTitle);
  const used = new Set<string>();
  const take = (item: Entry) => { used.add(hd(item.slug)!); return {title: item.title, backdrop: hd(item.slug)!}; };
  const pick = (test: (item: Entry) => boolean) => {
    const item = withArt.find(i => !used.has(hd(i.slug)!) && test(i)) || withArt.find(i => !used.has(hd(i.slug)!));
    return item ? take(item) : null;
  };
  const firstWithArt = (items: Entry[]) => items.find(i => hd(i.slug));
  const topDramaArt = firstWithArt(dramasScored), topMovieArt = firstWithArt(moviesScored);
  const artTopDrama = topDramaArt ? take(topDramaArt) : null, artTopMovie = topMovieArt ? take(topMovieArt) : null;
  // The opening: a title just completed keeps its own picture; otherwise (the top-rated fallback) a fresh one.
  const heroItem = hero ? completed.find(i => i.slug === hero.slug) : null;
  const opening = hero?.reason === "newly-completed" && heroItem && hd(heroItem.slug) ? take(heroItem) : pick(() => true);
  const topGenre = genreList.find(g => g.genre !== "Drama")?.genre;
  const art = {
    opening,
    topDrama: artTopDrama, topMovie: artTopMovie,
    genres: pick(i => !!topGenre && meta[i.slug].genres.includes(topGenre)),
    countries: pick(i => countryOf(i) === countries[0]?.country),
    actors: pick(i => !!actorList[0] && meta[i.slug].cast.some(c => c.id === actorList[0].id)),
    time: pick(() => true),
    ratings: pick(i => i.score === 10),
    type: pick(() => true),
    card: pick(() => true),
  };
  const coverage = {completed: completed.length, matched: matched.length, unmatched: completed.filter(item => meta[item.slug] && !meta[item.slug].matched).length, pending: extra.pending || 0};

  return {
    username: list.username, syncedAt: list.fetchedAt, stale: !!extra.stale, allTime: true,
    statusCounts: {watching: L.watching.items.length, completed: completed.length, planToWatch: L.plan_to_watch.items.length, onHold: L.on_hold.items.length, dropped: L.dropped.items.length},
    types: {dramas: completed.filter(i => kind(i) === "drama").length, movies: completed.filter(i => kind(i) === "movie").length, tvShows: completed.filter(i => kind(i) === "tvShow").length},
    viewingTime,
    ratings: {rated: scored.length, unrated: completed.length - scored.length, average, distribution, byCountry, minCountrySample: MIN_COUNTRY_SAMPLE,
      highestCountry: comparable.length >= 2 ? comparable[0] : null, lowestCountry: comparable.length >= 2 ? comparable[comparable.length - 1] : null},
    countries, decades, unknownYear: completed.filter(i => !i.year).length, topRated, topDramas, topMovies,
    genres: genreList.slice(0, 8),
    actors: actorList.slice(0, 10),
    art,
    hero: hero ? {...hero, backdrop: meta[hero.slug]?.backdrop || null, poster: meta[hero.slug]?.poster || null} : null,
    coverage,
  };
}

/** TMDB details for one watchlist title: genres (with drama keywords), top-billed cast, a textless backdrop and a poster. */
export async function lookupTitle(item: Entry, tmdb: (path: string, params?: Record<string, string>) => Promise<any>, now = Date.now()): Promise<TitleMeta> {
  const type = /movie/i.test(item.type) ? "movie" : "tv";
  const yearKey = type === "movie" ? "primary_release_year" : "first_air_date_year";
  const code = COUNTRY_CODES[item.country] || "";
  let match = item.year ? pickTmdbResult((await tmdb("search/" + type, {query: item.title, include_adult: "false", [yearKey]: String(item.year)}))?.results || [], item.title, item.year, code) : null;
  if (!match) match = pickTmdbResult((await tmdb("search/" + type, {query: item.title, include_adult: "false"}))?.results || [], item.title, item.year, code);
  if (!match) return {v: META_VERSION, slug: item.slug, matched: false, genres: [], cast: [], backdrop: null, backdropHd: null, poster: null, at: now};
  const details = await tmdb(type + "/" + match.id, {append_to_response: (type === "tv" ? "aggregate_credits" : "credits") + ",keywords,images", include_image_language: "en,null"});
  const keywords = (details?.keywords?.results || details?.keywords?.keywords || []).map((k: any) => String(k?.name || ""));
  const genres = factsGenresFor(type, (details?.genres || []).map((g: any) => Number(g?.id)), keywords);
  const castSource = type === "tv" ? details?.aggregate_credits?.cast : details?.credits?.cast;
  const cast = (Array.isArray(castSource) ? castSource : []).filter((c: any) => Number.isInteger(Number(c?.id)) && c?.name)
    .sort((a: any, b: any) => (Number(a?.order) || 0) - (Number(b?.order) || 0)).slice(0, 5)
    .map((c: any) => ({id: Number(c.id), name: String(c.name), profile: c.profile_path ? IMG + "w185" + c.profile_path : null}));
  // Backdrop: textless and wide first (best voted), then English, then TMDB's default.
  const backdrops = (Array.isArray(details?.images?.backdrops) ? details.images.backdrops : []).filter((b: any) => b?.file_path && Number(b?.width) >= 1280);
  const pickBackdrop = (lang: string | null) => backdrops.filter((b: any) => (b.iso_639_1 ?? null) === lang).sort((a: any, b: any) => (Number(b.vote_average) || 0) - (Number(a.vote_average) || 0))[0];
  const backdropPath = (pickBackdrop(null) || pickBackdrop("en"))?.file_path || details?.backdrop_path || null;
  // Wrapped shows a wide picture cropped to a tall phone screen, so it needs far more pixels than a card does: only
  // pictures at least 1920 wide, loaded at TMDB's original size (never the default picture, whose size is unknown).
  const sharp = backdrops.filter((b: any) => Number(b?.width) >= 1920 && Number(b?.height) >= 1000);
  const pickSharp = (lang: string | null) => sharp.filter((b: any) => (b.iso_639_1 ?? null) === lang).sort((a: any, b: any) => (Number(b.vote_average) || 0) - (Number(a.vote_average) || 0))[0];
  const sharpPath = (pickSharp(null) || pickSharp("en"))?.file_path || null;
  return {v: META_VERSION, slug: item.slug, matched: true, tmdb: {kind: type, id: Number(match.id)}, genres, cast,
    backdrop: backdropPath ? IMG + "w1280" + backdropPath : null, backdropHd: sharpPath ? IMG + "original" + sharpPath : null,
    poster: details?.poster_path ? IMG + "w500" + details.poster_path : null, at: now};
}

type Store = {get: (key: string) => Promise<any>; set: (key: string, value: any) => Promise<any>};

/**
 * The stats service: a fresh watchlist at most every 30 minutes per person, TMDB details cached per title for 30 days
 * (3 days for no match), at most ~20 seconds of TMDB lookups per request (the rest is reported as pending and
 * continues on the next request), and the last good watchlist kept for when Kuryana is down.
 */
export function createStatsService(deps: {fetchList: (username: string) => Promise<any>; tmdb: (path: string, params?: Record<string, string>) => Promise<any>; store: Store; now?: () => number; budgetMs?: number}) {
  // About 12 seconds of lookups per request, two at a time, so a first fill leaves room in the shared TMDB limit for Discover.
  const now = deps.now || Date.now, budget = deps.budgetMs ?? 12000;
  const key = (kind: string, username: string) => "stats-" + kind + ":v1:" + username.toLowerCase();

  async function stats(username: string, options: {refresh?: boolean} = {}) {
    let list: Watchlist | null = null, stale = false;
    const saved = await deps.store.get(key("list", username)).catch(() => null) as Watchlist | null;
    // A refresh asks MyDramaList again, but not more than once every 2 minutes per person.
    const age = saved ? now() - Date.parse(saved.fetchedAt) : Infinity;
    const fresh = age < (options.refresh ? 2 : 30) * 60000;
    if (fresh) list = saved;
    else {
      try {
        list = parseDramalist(await deps.fetchList(username), username, now());
        await deps.store.set(key("list", username), list).catch(() => {});
      } catch (error) {
        const code = (error as any)?.code || ((error instanceof KuryanaError && error.status === 404) ? "PRIVATE" : "");
        if (code === "PRIVATE" || code === "LAYOUT" || !saved) throw Object.assign(error instanceof Error ? error : Error("Unavailable"), {code: code || "UNAVAILABLE"});
        list = saved; stale = true;
      }
    }
    // Completion tracking only advances on a real, fresh sync.
    let snapshot = await deps.store.get(key("snapshot", username)).catch(() => null) as Snapshot | null;
    if (!fresh && !stale) { snapshot = nextSnapshot(snapshot, list, now()); await deps.store.set(key("snapshot", username), snapshot).catch(() => {}); }
    snapshot ??= nextSnapshot(null, list, now());
    const hero = heroFrom(list, snapshot);

    // TMDB details: the hero first, then completed titles, from the shared per-title cache.
    const cache: Record<string, TitleMeta> = (await deps.store.get("stats-titles:v1").catch(() => null)) || {};
    const usable = (m?: TitleMeta) => m && m.v === META_VERSION && now() - m.at < (m.matched ? 30 : 3) * DAY;
    const wanted = [...list.lists.completed.items].sort((a, b) => Number(b.slug === hero?.slug) - Number(a.slug === hero?.slug));
    const todo = wanted.filter(item => !usable(cache[item.slug]));
    const started = now();
    let cursor = 0, changed = false;
    async function worker() {
      while (cursor < todo.length && now() - started < budget) {
        const item = todo[cursor++];
        try { cache[item.slug] = await lookupTitle(item, deps.tmdb, now()); changed = true; }
        catch { /* TMDB trouble: try this title again next time. */ }
      }
    }
    await Promise.all([worker(), worker()]);
    if (changed) {
      // Keep the shared title cache to the 5,000 most recently looked-up titles.
      const entries = Object.entries(cache);
      if (entries.length > 5000) for (const [slug] of entries.sort((a, b) => a[1].at - b[1].at).slice(0, entries.length - 5000)) delete cache[slug];
      await deps.store.set("stats-titles:v1", cache).catch(() => {});
    }
    const meta: Record<string, TitleMeta> = {};
    for (const item of wanted) if (usable(cache[item.slug])) meta[item.slug] = cache[item.slug];
    return computeStats(list, meta, hero, {stale, pending: wanted.filter(item => !meta[item.slug]).length});
  }
  return {stats};
}

let shared: ReturnType<typeof createStatsService> | undefined;
async function service() {
  const {collections} = await import("./collectionService.ts");
  shared ??= createStatsService({
    fetchList: username => kuryana(`/v2/users/${encodeURIComponent(username)}/dramalist`),
    tmdb: collections.tmdb,
    store: {get: k => blob.getJSON(k), set: (k, v) => blob.setJSON(k, v)},
  });
  return shared;
}

/** GET /api/stats?username=<MyDramaList username>[&refresh=1] */
export async function handleStats(req: Request) {
  const headers = {"cache-control": "no-store"};
  if (req.method !== "GET") return new Response("Method not allowed", {status: 405, headers: {Allow: "GET"}});
  const u = new URL(req.url), username = u.searchParams.get("username") || "";
  if (!/^[a-zA-Z0-9_-]{1,60}$/.test(username)) return Response.json({error: "Enter a MyDramaList username."}, {status: 400, headers});
  try {
    const result = await (await service()).stats(username, {refresh: u.searchParams.get("refresh") === "1"});
    // One summary line per request, to check TMDB coverage in the Worker logs (no watchlist contents beyond the top picks).
    console.log(JSON.stringify({stats: username.toLowerCase(), coverage: result.coverage, stale: result.stale, hours: result.viewingTime?.hours ?? null,
      genres: result.genres.slice(0, 3).map(g => g.genre + " " + g.count), actors: result.actors.slice(0, 3).map(a => a.name + " " + a.count),
      hero: result.hero ? {title: result.hero.title, reason: result.hero.reason, backdrop: !!result.hero.backdrop} : null, topPosters: result.topRated.filter(t => t.poster).length}));
    return Response.json(result, {headers});
  } catch (error) {
    const code = (error as any)?.code;
    const message = code === "PRIVATE" ? "This MyDramaList watchlist is private." : code === "LAYOUT" ? "This MyDramaList watchlist uses the V2 beta layout, which can't be read yet." : "MyDramaList data is temporarily unavailable. Please try again.";
    return Response.json({error: message, code: code || "UNAVAILABLE"}, {status: code === "PRIVATE" ? 404 : code === "LAYOUT" ? 422 : 502, headers});
  }
}
