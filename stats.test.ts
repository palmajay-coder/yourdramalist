// Stats engine: watchlist parsing, exact counts, ratings, MyDramaList viewing time, completion tracking for the hero,
// TMDB enrichment (genres, actors, backdrop), coverage, time budget, caching and failures.
import {parseDramalist, nextSnapshot, heroFrom, computeStats, lookupTitle, createStatsService, handleStats, type TitleMeta} from "./stats.ts";
let passed = 0;
const ok = (value: unknown, message: string) => { if (!value) throw Error(message); };
async function test(name: string, fn: () => unknown) { await fn(); passed++; console.log("PASS " + name); }

const T0 = Date.UTC(2026, 10, 22, 12);
const entry = (slug: string, title: string, country: string, year: number | null, type: string, score: number, seen = 16, total: number | null = 16) =>
  ({title, slug, link: "https://mydramalist.com/" + slug, country, year, type, score, episodes_seen: seen, episodes_total: total});
function dramalist(completed = [
  entry("1-reply-1988", "Reply 1988", "South Korea", 2015, "Drama", 10, 20, 20),
  entry("2-goblin", "Goblin", "South Korea", 2016, "Drama", 9.5),
  entry("3-cure", "Cure", "Japan", 1997, "Movie", 9, 1, 1),
  entry("4-hidden-love", "Hidden Love", "China", 2023, "Drama", 8, 25, 25),
  entry("5-signal", "Signal", "South Korea", 2016, "Drama", 0),
  entry("6-tokyo-sonata", "Tokyo Sonata", "Japan", 2008, "Movie", 7, 1, 1),
  entry("7-unknown", "Lost Tape", "Philippines", null, "Movie", 6, 1, 1),
  entry("8-good-doc", "Good Doctor", "Japan", 2018, "Drama", 8),
]) {
  return {lists: {
    watching: {name: "Watching", items: [entry("9-moving", "Moving", "South Korea", 2023, "Drama", 0, 4, 20)], stats: {dramas: 1, tv_shows: 0, movies: 0, episodes: 4, days: 0.2}},
    completed: {name: "Completed", items: completed, stats: {dramas: 5, tv_shows: 0, movies: 3, episodes: 112, days: 3.5}},
    plan_to_watch: {name: "Plan to Watch", items: [entry("10-mr-queen", "Mr. Queen", "South Korea", 2020, "Drama", 0, 0, 20), entry("2-goblin", "Goblin", "South Korea", 2016, "Drama", 0)], stats: null},
    on_hold: {name: "On Hold", items: [], stats: null},
    dropped: {name: "Dropped", items: [entry("bad slug", "Broken", "", 2020, "Drama", 0)], stats: null},
  }};
}

await test("watchlist parsing: valid public records only, each title once, numbers checked", () => {
  const list = parseDramalist(dramalist(), "jaesan", T0);
  ok(list.lists.completed.items.length === 8 && list.lists.plan_to_watch.items.length === 1 && list.lists.dropped.items.length === 0, "the repeated Goblin and the bad slug are skipped");
  ok(list.lists.completed.items[4].score === 0 && list.lists.completed.items[6].year === null, "unrated stays 0, unknown year stays null");
  let layout = false; try { parseDramalist({lists: {}}, "x"); } catch (e) { layout = (e as any).code === "LAYOUT"; }
  ok(layout, "MyDramaList's V2 layout is reported, not shown as empty");
});

await test("exact statistics: statuses, types, countries, decades, viewing time from MyDramaList, ratings without unrated titles", () => {
  const list = parseDramalist(dramalist(), "jaesan", T0);
  const s = computeStats(list, {}, heroFrom(list, nextSnapshot(null, list, T0)));
  ok(JSON.stringify(s.statusCounts) === JSON.stringify({watching: 1, completed: 8, planToWatch: 1, onHold: 0, dropped: 0}), "status counts " + JSON.stringify(s.statusCounts));
  ok(s.types.dramas === 5 && s.types.movies === 3, "dramas and movies");
  ok(s.viewingTime!.hours === 84 && s.viewingTime!.days === 3.5 && s.viewingTime!.episodes === 112 && s.viewingTime!.source === "mydramalist" && s.viewingTime!.includingWatching === 88.8, "MyDramaList's own totals: " + JSON.stringify(s.viewingTime));
  ok(s.ratings.rated === 7 && s.ratings.unrated === 1 && s.ratings.average === 8.21, "average of scored titles only: " + s.ratings.average);
  ok(s.ratings.distribution[0].score === 10 && s.ratings.distribution.find(d => d.score === 9.5)?.count === 1, "half scores kept");
  ok(s.ratings.highestCountry?.country === "Japan" && s.ratings.lowestCountry?.country === "Japan" || (s.ratings.highestCountry === null && s.ratings.lowestCountry === null), "country extremes need two countries with 3+ scored titles");
  ok(s.countries.map(c => c.country + ":" + c.count).join() === "Japan:3,South Korea:3,China:1,Philippines:1", "countries " + s.countries.map(c => c.country + ":" + c.count));
  ok(s.decades.map(d => d.decade + ":" + d.count).join() === "1990s:1,2000s:1,2010s:4,2020s:1" && s.unknownYear === 1, "decades " + JSON.stringify(s.decades));
  ok(s.topRated.map(t => t.title).join() === "Reply 1988,Goblin,Cure,Good Doctor,Hidden Love,Tokyo Sonata,Lost Tape", "top rated, scored only, ties by title: " + s.topRated.map(t => t.title));
  ok(s.allTime === true && s.coverage.pending === 0, "labelled all-time");
});

await test("country extremes use only countries with at least three scored titles", () => {
  const items = ["KR", "KR", "KR", "JP", "JP", "JP", "CN"].map((c, i) => entry(i + 1 + "-t", "T" + i, {KR: "South Korea", JP: "Japan", CN: "China"}[c]!, 2020, "Drama", c === "KR" ? 9 : c === "JP" ? 7 : 10));
  const list = parseDramalist(dramalist(items), "u", T0);
  const s = computeStats(list, {}, null);
  ok(s.ratings.highestCountry?.country === "South Korea" && s.ratings.lowestCountry?.country === "Japan", "China's single 10 is not the highest: " + JSON.stringify([s.ratings.highestCountry, s.ratings.lowestCountry]));
});

await test("the hero: first sync falls back to the top-rated title; later syncs show the newest completion; removals and ties are handled", () => {
  const first = parseDramalist(dramalist(), "u", T0);
  const s1 = nextSnapshot(null, first, T0);
  ok(Object.values(s1.completed).every(v => v === null), "first sync: nothing is called new");
  ok(heroFrom(first, s1)?.reason === "top-rated-fallback" && heroFrom(first, s1)?.title === "Reply 1988", "fallback is the top-rated title, and says so");
  const more = dramalist(); more.lists.completed.items.push(entry("11-lovely-runner", "Lovely Runner", "South Korea", 2024, "Drama", 9), entry("12-queen-of-tears", "Queen of Tears", "South Korea", 2024, "Drama", 9.5));
  more.lists.completed.items = more.lists.completed.items.filter(i => i.slug !== "3-cure");
  const second = parseDramalist(more, "u", T0 + 3600000);
  const s2 = nextSnapshot(s1, second, T0 + 3600000);
  ok(!("3-cure" in s2.completed) && s2.completed["1-reply-1988"] === null && !!s2.completed["11-lovely-runner"], "removed titles drop out; old ones stay unstamped; new ones get the detection time");
  const hero = heroFrom(second, s2)!;
  ok(hero.reason === "newly-completed" && hero.title === "Queen of Tears" && hero.detectedAt === new Date(T0 + 3600000).toISOString(), "two found at once: the higher-scored one, with the detection time (not a completion date): " + JSON.stringify(hero));
  const third = parseDramalist(more, "u", T0 + 2 * 3600000);
  const s3 = nextSnapshot(s2, third, T0 + 2 * 3600000);
  ok(s3.completed["11-lovely-runner"] === s2.completed["11-lovely-runner"], "a title keeps its first detection time");
  ok(Object.values(nextSnapshot(s3, third, T0 + 200 * 86400000).completed).every(v => v === null), "a snapshot older than 180 days starts over");
  ok(heroFrom(parseDramalist(dramalist([]), "u", T0), nextSnapshot(null, parseDramalist(dramalist([]), "u", T0), T0)) === null, "no completed titles: no hero");
});

function fakeTmdb(options: {unmatched?: string[]; failOnce?: string[]} = {}) {
  const calls: string[] = [], failed = new Set<string>();
  const tmdb = async (path: string, params: Record<string, string> = {}) => {
    calls.push(path);
    if (path.startsWith("search/")) {
      const q = params.query;
      if (options.unmatched?.includes(q)) return {results: []};
      if (options.failOnce?.includes(q) && !failed.has(q)) { failed.add(q); throw Error("TMDB down"); }
      const kind = path.slice(7), id = q.length * 100 + (kind === "tv" ? 1 : 2);
      return {results: [{id, name: q, title: q, original_name: q, first_air_date: (params.first_air_date_year || "2016") + "-01-01", release_date: (params.primary_release_year || "2008") + "-01-01", origin_country: ["KR", "JP", "CN", "PH"], original_language: "ko", popularity: 10}]};
    }
    const [kind, id] = path.split("/");
    const romance = Number(id) % 3 === 0;
    return {genres: [{id: 18}, ...(kind === "movie" ? [{id: 53}] : [])], keywords: {results: romance ? [{name: "romance"}] : []},
      [kind === "tv" ? "aggregate_credits" : "credits"]: {cast: [{id: 1, name: "Son Ye Jin", order: 0, profile_path: "/s.jpg"}, {id: 2, name: "Hyun Bin", order: 1, profile_path: null}, {id: Number(id), name: "Actor " + id, order: 2}, {id: 1, name: "Son Ye Jin", order: 3}]},
      images: {backdrops: [{file_path: "/text.jpg", iso_639_1: "ko", width: 1920, height: 1080, vote_average: 9}, {file_path: "/clean.jpg", iso_639_1: null, width: 1920, height: 1080, vote_average: 5}, {file_path: "/mid.jpg", iso_639_1: null, width: 1280, height: 720, vote_average: 9.5}, {file_path: "/small.jpg", iso_639_1: null, width: 780, height: 439, vote_average: 10}]},
      poster_path: "/p" + id + ".jpg", backdrop_path: "/default.jpg"};
  };
  return {tmdb, calls};
}

await test("TMDB details: genres with drama keywords, top-billed cast, a textless wide backdrop, a poster", async () => {
  const {tmdb} = fakeTmdb();
  const meta = await lookupTitle({slug: "2-goblin", title: "Goblin", country: "South Korea", year: 2016, type: "Drama", score: 9, episodesSeen: 16, episodesTotal: 16}, tmdb, T0);
  ok(meta.matched && meta.tmdb?.kind === "tv" && meta.genres.includes("Drama"), "matched with genres: " + JSON.stringify(meta.genres));
  ok(meta.backdrop === "https://image.tmdb.org/t/p/w1280/mid.jpg", "a card gets the best textless wide picture (1280+), not the one with text or the small one: " + meta.backdrop);
  ok(meta.backdropHd === "https://image.tmdb.org/t/p/original/clean.jpg", "Wrapped gets a textless picture 1920 wide or more, at original size: " + meta.backdropHd);
  const lowOnly = async (path: string, params?: Record<string, string>) => { const r = await tmdb(path, params); return path.startsWith("search/") ? r : {...r, images: {backdrops: [{file_path: "/low.jpg", iso_639_1: null, width: 1280, height: 720, vote_average: 9}]}}; };
  const low = await lookupTitle({slug: "2-goblin", title: "Goblin", country: "South Korea", year: 2016, type: "Drama", score: 9, episodesSeen: 16, episodesTotal: 16}, lowOnly, T0);
  ok(low.backdrop?.endsWith("/low.jpg") && low.backdropHd === null, "a picture under 1920 wide is fine for a card, but is never stretched full screen (and the default picture is never used there)");
  ok(meta.cast.length <= 5 && meta.cast[0].name === "Son Ye Jin" && meta.cast[0].profile?.endsWith("/s.jpg"), "top-billed cast in order");
  const none = await lookupTitle({slug: "x-1", title: "Nowhere", country: "", year: 2000, type: "Drama", score: 0, episodesSeen: 0, episodesTotal: null}, fakeTmdb({unmatched: ["Nowhere"]}).tmdb, T0);
  ok(!none.matched && !none.backdrop && !none.genres.length, "no match is recorded as no match, nothing guessed");
});

await test("genres and actors count each title once; actors deduplicate by id; coverage is reported", () => {
  const list = parseDramalist(dramalist(), "u", T0);
  const meta: Record<string, TitleMeta> = {};
  for (const [i, item] of list.lists.completed.items.entries()) {
    if (i === 7) { meta[item.slug] = {v: 1, slug: item.slug, matched: false, genres: [], cast: [], backdrop: null, poster: null, at: T0}; continue; }
    if (i === 6) continue; // not looked up yet
    meta[item.slug] = {v: 1, slug: item.slug, matched: true, genres: ["Drama", "Drama", i % 2 ? "Romance" : "Thriller"], cast: [{id: 1, name: "Son Ye Jin", profile: null}, {id: 1, name: "Son Ye Jin", profile: null}, {id: 100 + i, name: "A" + i, profile: null}], backdrop: null, poster: "p" + i, at: T0};
  }
  const s = computeStats(list, meta, null, {pending: 1});
  ok(s.genres[0].genre === "Drama" && s.genres[0].count === 6, "Drama once per title: " + JSON.stringify(s.genres));
  ok(s.actors[0].name === "Son Ye Jin" && s.actors[0].count === 6, "an actor once per title: " + JSON.stringify(s.actors[0]));
  ok(JSON.stringify(s.coverage) === JSON.stringify({completed: 8, matched: 6, unmatched: 1, pending: 1}), "coverage " + JSON.stringify(s.coverage));
  ok(s.topRated[0].poster === "p0", "top rated carries posters where matched");
  ok(s.art.topDrama === null && s.art.topMovie === null && s.art.time === null && s.art.opening === null, "no backdrops without sharp TMDB backdrops");
  ok(s.topDramas.map(t => t.title).join() === "Reply 1988,Goblin,Good Doctor,Hidden Love" && s.topMovies.map(t => t.title).join() === "Cure,Tokyo Sonata,Lost Tape", "your top dramas and your top movies are ranked apart (unrated Signal left out): " + JSON.stringify([s.topDramas.map(t => t.title), s.topMovies.map(t => t.title)]));
  const arty: Record<string, TitleMeta> = {};
  for (const [i, item] of list.lists.completed.items.entries()) arty[item.slug] = {...meta[item.slug] || {v: 2, slug: item.slug, matched: true, genres: [], cast: [], poster: null, at: T0}, matched: true, backdrop: "b" + i, backdropHd: "h" + i, genres: i === 3 ? ["Romance"] : ["Thriller"], cast: i === 2 ? [{id: 9, name: "Star", profile: null}, {id: 9, name: "Star", profile: null}] : [{id: 9, name: "Star", profile: null}]};
  const fallbackStats = computeStats(list, arty, heroFrom(list, nextSnapshot(null, list, T0)));
  const art = fallbackStats.art;
  const pictures = Object.values(art).filter(Boolean).map(a => a!.backdrop);
  ok(new Set(pictures).size === pictures.length && pictures.every(p => p.startsWith("h")), "every slide gets a different sharp (HD) backdrop: " + JSON.stringify(art));
  ok(art.topDrama?.title === "Reply 1988" && art.topMovie?.title === "Cure", "the #1 drama and #1 movie slides show their own #1's backdrop");
  ok(art.opening?.title === "Goblin" && art.genres?.title === "Good Doctor" && art.countries?.title === "Tokyo Sonata", "the opening (a top-rated fallback hero is already the #1) and the genre and country slides take other fitting titles: " + JSON.stringify(art));
  const snapshot = nextSnapshot(null, list, T0); snapshot.completed["4-hidden-love"] = new Date(T0).toISOString();
  const fresh = computeStats(list, arty, heroFrom(list, snapshot)).art;
  ok(fresh.opening?.title === "Hidden Love", "a title just completed keeps its own picture for the opening: " + JSON.stringify(fresh.opening));
});

function memoryStore() {
  const mem = new Map<string, any>();
  return {mem, store: {get: async (k: string) => mem.has(k) ? structuredClone(mem.get(k)) : null, set: async (k: string, v: any) => void mem.set(k, structuredClone(v))}};
}

await test("the service: caches the watchlist and title details, keeps to its time budget, and finishes on the next request", async () => {
  let clock = T0, fetches = 0;
  const {tmdb, calls} = fakeTmdb();
  const {store, mem} = memoryStore();
  // A slow TMDB: each lookup moves the clock 2 seconds against a 5-second budget.
  const slow = async (path: string, params?: Record<string, string>) => { clock += 2000; return tmdb(path, params); };
  const service = createStatsService({fetchList: async () => { fetches++; return dramalist(); }, tmdb: slow, store, now: () => clock, budgetMs: 5000});
  const first = await service.stats("Jaesan");
  ok(first.coverage.pending > 0 && first.coverage.pending < 8, "the first request stops at its budget: " + JSON.stringify(first.coverage));
  ok(first.hero?.slug === "1-reply-1988", "the hero is looked up first");
  let s = first;
  for (let i = 0; i < 10 && s.coverage.pending; i++) s = await service.stats("jaesan");
  ok(s.coverage.pending === 0 && s.coverage.matched === 8 && fetches === 1, "later requests finish the rest from the cached watchlist: " + JSON.stringify(s.coverage) + " fetches " + fetches);
  ok(s.hero?.backdrop?.endsWith("/mid.jpg"), "the hero gets its backdrop");
  const before = calls.length;
  await service.stats("jaesan");
  ok(calls.length === before, "title details are reused");
  ok(mem.has("stats-list:v1:jaesan") && mem.has("stats-snapshot:v1:jaesan") && mem.has("stats-titles:v1"), "stored: the last watchlist, the completion snapshot, title details");
  clock += 60000;
  await service.stats("jaesan", {refresh: true});
  ok(fetches === 1, "a refresh within 2 minutes of the last sync does not ask MyDramaList again");
  clock += 31 * 60000;
  await service.stats("jaesan");
  ok(fetches === 2, "after 30 minutes the watchlist is fetched again");
});

await test("failures: a private list says so; MyDramaList trouble shows the last good stats, marked stale", async () => {
  const {tmdb} = fakeTmdb();
  const {store} = memoryStore();
  let clock = T0, mode = "ok";
  const service = createStatsService({fetchList: async () => { if (mode === "down") throw Error("Kuryana down"); if (mode === "private") throw Object.assign(Error("private"), {code: "PRIVATE"}); return dramalist(); }, tmdb, store, now: () => clock});
  await service.stats("u");
  mode = "down"; clock += 40 * 60000;
  const stale = await service.stats("u");
  ok(stale.stale === true && stale.statusCounts.completed === 8, "last good stats, marked stale");
  mode = "private";
  let code = ""; try { await service.stats("u"); } catch (e) { code = (e as any).code; }
  ok(code === "PRIVATE", "private is reported even with old stats saved");
  let none = ""; try { await createStatsService({fetchList: async () => { throw Error("down"); }, tmdb, store: memoryStore().store}).stats("new"); } catch (e) { none = (e as any).code; }
  ok(none === "UNAVAILABLE", "no saved stats and no service: unavailable");
  const bad = await handleStats(new Request("https://test/api/stats?username=" + encodeURIComponent("<x>")));
  ok(bad.status === 400, "usernames are checked");
});
console.log(JSON.stringify({passed}));
