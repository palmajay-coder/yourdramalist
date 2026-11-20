// "Because you watched …" rows: seed choice and Monday rotation, TMDB matching, filters, ranking and caching.
import {createRecommendations, seedOrder} from "./recommendations.ts";
import {weekWindow} from "./collections.ts";
let passed = 0;
const ok = (value: unknown, message: string) => { if (!value) throw Error(message); };
async function test(name: string, fn: () => unknown) { await fn(); passed++; console.log("PASS " + name); }

const entry = (title: string, extra: Record<string, unknown> = {}) => ({slug: "1-" + title.toLowerCase().replace(/\W+/g, "-"), title, year: 2020, type: "Drama", score: 0, episodesSeen: 0, ...extra});

await test("seeds: watching first (most episodes), then completed scored 8+, rotating three further each Monday", () => {
  const sections = {
    1: [entry("Alpha", {episodesSeen: 2}), entry("Bravo", {episodesSeen: 9})],
    2: [entry("Charlie", {score: 9}), entry("Delta", {score: 7}), entry("Echo", {score: 9.5}), entry("Foxtrot", {score: 8})],
  };
  const titles = (week: number) => seedOrder(sections, week).slice(0, 3).map(s => s.title).join(",");
  ok(titles(0) === "Bravo,Alpha,Echo", "week 0: " + titles(0));
  ok(titles(1) === "Charlie,Foxtrot,Bravo", "week 1 moves three along and wraps: " + titles(1));
  ok(titles(2) === "Alpha,Echo,Charlie", "week 2: " + titles(2));
  ok(!seedOrder(sections, 0).some(s => s.title === "Delta"), "a completed title scored under 8 is not a seed when others are scored");
  const unscored = seedOrder({2: [entry("One"), entry("Two")]}, 5).map(s => s.title).join(",");
  ok(unscored === "One,Two", "with no scores, completed titles are used as listed: " + unscored);
  ok(seedOrder({}, 0).length === 0, "an empty watchlist gives no seeds");
});

// A fake TMDB: each seed title matches one show; its recommendations hold valid titles plus one of each kind
// that must be filtered out, and a title every seed recommends.
const NOW = Date.UTC(2026, 10, 18, 20);
function fakeWorld() {
  const sections: Record<string, any[]> = {
    1: [entry("Bravo", {episodesSeen: 9}), entry("Alpha", {episodesSeen: 2})],
    2: [entry("Echo", {score: 9.5}), entry("Charlie", {score: 9}), entry("Foxtrot", {score: 8.5})],
    3: [entry("Plan Drama", {year: 2021})],
  };
  const ids: Record<string, number> = {Alpha: 1, Bravo: 2, Charlie: 3, Echo: 5, Foxtrot: 6};
  const calls: string[] = [];
  const show = (id: number, name: string, extra: Record<string, unknown> = {}) => ({id, name, original_name: name, first_air_date: "2021-05-01", origin_country: ["KR"], genre_ids: [18], poster_path: "/p" + id + ".jpg", vote_average: 6.5, vote_count: 10, overview: "", ...extra});
  const tmdb = async (path: string, params: Record<string, string> = {}) => {
    calls.push(path);
    if (path === "search/tv") {
      const id = ids[params.query];
      if (!id) return {results: []};
      // Echo's TMDB entry is from a different year, so Echo cannot be matched and is skipped.
      return {results: [show(id, params.query, {first_air_date: params.query === "Echo" ? "2005-01-01" : "2020-03-01"})]};
    }
    const seed = Number(path.split("/")[1]);
    if (path.endsWith("/recommendations")) return {results: [
      ...Array.from({length: 6}, (_, i) => show(seed * 100 + i, "Pick " + seed + "-" + i)),
      show(seed * 100 + 50, "Plan Drama", {first_air_date: "2021-02-02"}),
      show(seed * 100 + 51, "Hollywood Show", {origin_country: ["US"]}),
      show(seed * 100 + 52, "Cartoon", {genre_ids: [16]}),
      show(seed * 100 + 53, "Not Yet", {first_air_date: "2099-01-01"}),
      show(seed * 100 + 54, "No Poster", {poster_path: null}),
      show(900, "Everyone's Favorite", {vote_average: 8.4, vote_count: 500}),
    ]};
    if (path.endsWith("/similar")) return {results: []};
    throw Error("unexpected " + path);
  };
  return {sections, tmdb, calls};
}

await test("rows: matched seeds, filtered titles, no repeats, shared favorites first, cached for the week", async () => {
  const world = fakeWorld();
  let clock = NOW, watchlistCalls = 0;
  const saved: any = {};
  const recs = createRecommendations({watchlist: async () => { watchlistCalls++; return world.sections; }, tmdb: world.tmdb, now: () => clock,
    storage: {load: async () => saved.rows, save: async (rows: any) => { saved.rows = rows; }}});
  const data = await recs.forUser("Jaesan");
  const expected = seedOrder(world.sections, weekWindow(NOW).index).filter(s => s.title !== "Echo").slice(0, 3).map(s => s.title);
  ok(data.rows.map(r => r.seed.title).join(",") === expected.join(","), "three matched seeds in this week's order (Echo has no match): " + data.rows.map(r => r.seed.title).join(","));
  const names = data.rows.flatMap(r => r.items.map(i => i.name));
  ok(!names.some(n => /Plan Drama|Hollywood|Cartoon|Not Yet|No Poster/.test(n)), "watchlist, non-Asian, animation, unreleased and posterless titles are left out: " + names.join(", "));
  ok(new Set(data.rows.flatMap(r => r.items.map(i => i.kind + i.id))).size === names.length, "no title appears in two rows");
  ok(data.rows[0].items[0].name === "Everyone's Favorite" && !data.rows[1].items.some(i => i.id === 900), "a title all favorites recommend leads the first row only");
  ok(data.rows.every(r => r.items.length >= 4 && r.items.every(i => i.poster.startsWith("https://image.tmdb.org/") && !("votes" in i))), "rows hold clean items with TMDB posters");
  ok(data.nextRefresh === weekWindow(NOW).nextRefresh, "the rows say when they change (next Monday)");
  const calls = world.calls.length;
  ok((await recs.forUser("jaesan")).rows.length === 3 && world.calls.length === calls && watchlistCalls === 1, "the same week reuses the saved rows (usernames ignore case)");
  ok(Array.isArray(saved.rows) && saved.rows.length === 1, "rows are saved in their own store");
  clock = NOW + 7 * 86400000;
  const next = await recs.forUser("Jaesan");
  const nextExpected = seedOrder(world.sections, weekWindow(clock).index).filter(s => s.title !== "Echo").slice(0, 3).map(s => s.title);
  ok(next.rows.map(r => r.seed.title).join(",") === nextExpected.join(",") && next.week !== data.week, "next Monday brings the next seeds: " + next.rows.map(r => r.seed.title).join(","));
});

await test("rows fill to 30: recommendations, then similar, then same themes, then same genres, all filtered", async () => {
  const sections: Record<string, any[]> = {1: [entry("Alpha", {episodesSeen: 3}), entry("Bravo", {episodesSeen: 2}), entry("Charlie", {episodesSeen: 1})], 3: [entry("Already Planned", {year: 2022})]};
  const seeds: Record<string, number> = {Alpha: 1, Bravo: 2, Charlie: 3};
  const calls: string[] = [];
  const show = (id: number, extra: Record<string, unknown> = {}) => ({id, name: "Title " + id, first_air_date: "2022-02-02", origin_country: ["KR"], genre_ids: [18], poster_path: "/x" + id + ".jpg", vote_average: 6, vote_count: 30, ...extra});
  const range = (from: number, count: number) => Array.from({length: count}, (_, i) => show(from + i));
  let bigRecs = false;
  const tmdb = async (path: string, params: Record<string, string> = {}) => {
    calls.push(path + (params.page ? "#" + params.page : "") + (params.with_keywords ? "#keywords" : params.with_genres ? "#genres" : ""));
    if (path === "search/tv") return {results: [show(seeds[params.query], {name: params.query, first_air_date: "2020-01-01"})]};
    const seed = Number(path.split("/")[1]) || 0;
    if (path.endsWith("/recommendations")) {
      if (bigRecs) return {results: range(seed * 1000 + (params.page === "2" ? 20 : 0), 20), total_pages: 2};
      return {results: [...range(seed * 1000, 8), show(seed * 1000 + 99, {origin_country: ["US"]})], total_pages: 1};
    }
    if (path.endsWith("/similar")) return {results: range(seed * 1000 + 100, 5), total_pages: 1};
    if (path.endsWith("/keywords")) return {results: [{id: 11}, {id: 12}]};
    if (path.startsWith("discover/") && params.with_keywords) {
      ok(params.with_origin_country === "KR" && params.with_keywords === "11|12", "themes stay in the same country");
      return {results: [...range(seed * 1000 + 200, 10), show(seed * 1000 + 298, {origin_country: ["US"]}), show(seed * 1000 + 299, {name: "Already Planned", first_air_date: "2022-05-05"})]};
    }
    if (/^tv\/\d+$/.test(path)) return {genres: [{id: 18}, {id: 35}]};
    if (path.startsWith("discover/") && params.with_genres) {
      ok(params.with_genres === "18|35" && params.with_origin_country === "KR", "genres stay in the same country");
      // Shared by every title (so later rows lose some) plus titles of its own.
      return {results: [...range(5000 + (params.page === "2" ? 20 : 0), 20), ...range(seed * 1000 + 300 + (params.page === "2" ? 20 : 0), 20)]};
    }
    throw Error("unexpected " + path);
  };
  const recs = createRecommendations({watchlist: async () => sections, tmdb, now: () => NOW});
  const data = await recs.forUser("Jaesan");
  ok(data.rows.length === 3 && data.rows.every(r => r.items.length === 30), "three rows of 30: " + data.rows.map(r => r.items.length).join(","));
  const all = data.rows.flatMap(r => r.items.map(i => i.id));
  ok(new Set(all).size === all.length, "no title repeats across rows");
  ok(!data.rows.flatMap(r => r.items.map(i => i.name)).some(n => n === "Already Planned") && !all.some(id => id % 1000 === 99 || id % 1000 === 298), "top-up titles are filtered too");
  const first = data.rows[0].items.map(i => i.id - 1000 * Math.floor(i.id / 1000));
  const tierOf = (id: number) => id < 100 ? 0 : id < 200 ? 1 : id < 300 ? 2 : 3;
  const tiers = data.rows[0].items.map(i => i.id >= 5000 ? 3 : tierOf(i.id % 1000));
  ok(tiers.every((t, i) => i === 0 || t >= tiers[i - 1]), "recommendations, then similar, then themes, then genres: " + tiers.join(""));
  ok(first.slice(0, 8).every((id, i) => id === i), "TMDB's own recommendations lead, in TMDB's order");
  calls.length = 0;bigRecs = true;
  const quick = createRecommendations({watchlist: async () => ({1: [entry("Alpha")]}), tmdb, now: () => NOW});
  const one = await quick.forUser("Other");
  ok(one.rows[0].items.length === 30 && !calls.some(c => /keywords|discover/.test(c)), "plenty of recommendations means no theme or genre lookups: " + calls.join(","));
});
await test("no rows, never an error, for private watchlists, bad usernames or TMDB trouble", async () => {
  const privateList = createRecommendations({watchlist: async () => { throw Object.assign(Error("private"), {code: "PRIVATE"}); }, tmdb: async () => ({}), now: () => NOW});
  ok((await privateList.forUser("Someone")).rows.length === 0, "a private watchlist shows nothing");
  let asked = 0;
  const bad = createRecommendations({watchlist: async () => { asked++; return {}; }, tmdb: async () => ({}), now: () => NOW});
  ok((await bad.forUser("../evil")).rows.length === 0 && asked === 0, "an invalid username is never looked up");
  const world = fakeWorld();
  const down = createRecommendations({watchlist: async () => world.sections, tmdb: async () => { throw Error("TMDB down"); }, now: () => NOW});
  ok((await down.forUser("Jaesan")).rows.length === 0, "TMDB trouble shows nothing instead of failing");
});
console.log(JSON.stringify({passed}));
