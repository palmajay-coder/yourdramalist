// Netflix-style Top 10 K-dramas and K-movies: TMDB query, ranking, daily rebuild and fallbacks.
import {createTop10, TOP10_CATALOGS} from "./top10.ts";
let passed = 0;
const ok = (value: unknown, message: string) => { if (!value) throw Error(message); };
async function test(name: string, fn: () => unknown) { await fn(); passed++; console.log("PASS " + name); }

const NOON = Date.UTC(2026, 10, 20, 20); // Nov 20, noon Pacific
const show = (id: number, extra: Record<string, unknown> = {}) => ({id, name: "Show " + id, first_air_date: "2026-10-01", poster_path: "/s" + id + ".jpg", vote_average: 8, overview: "", ...extra});
const film = (id: number, extra: Record<string, unknown> = {}) => ({id, title: "Film " + id, release_date: "2026-09-01", poster_path: "/f" + id + ".jpg", vote_average: 7, overview: "", ...extra});

function fake(options: {shows?: number; films?: number; fail?: () => boolean} = {}) {
  const calls: {path: string; params: Record<string, string>}[] = [];
  const tmdb = async (path: string, params: Record<string, string> = {}) => {
    if (options.fail?.()) throw Error("TMDB down");
    calls.push({path, params});
    if (path === "discover/tv") return {results: [show(99, {poster_path: null}), ...Array.from({length: options.shows ?? 14}, (_, i) => show(i + 1))]};
    if (path === "discover/movie") return {results: Array.from({length: options.films ?? 12}, (_, i) => film(i + 100))};
    throw Error("unexpected " + path);
  };
  return {tmdb, calls};
}

await test("asks TMDB for Korean dramas airing now and recent Korean films, by popularity", async () => {
  const {tmdb, calls} = fake();
  const data = await createTop10({tmdb, now: () => NOON}).current();
  const tv = calls.find(c => c.path === "discover/tv")!.params, movie = calls.find(c => c.path === "discover/movie")!.params;
  ok(tv.with_origin_country === "KR" && tv.sort_by === "popularity.desc" && tv["air_date.gte"] === "2026-10-21" && tv["air_date.lte"] === "2026-11-20", "dramas with an episode in the last 30 days: " + JSON.stringify(tv));
  ok(tv.without_genres === "16,99,10763,10764,10767", "no animation, documentaries, news, reality or talk shows");
  ok(movie.with_origin_country === "KR" && movie["primary_release_date.gte"] === "2026-05-24" && movie["primary_release_date.lte"] === "2026-11-20" && movie.without_genres === "16,99", "films released in the last 180 days: " + JSON.stringify(movie));
  ok(data.rows.length === 2 && data.rows[0].catalog.name === "Top 10 Dramas Today (South Korea)" && data.rows[1].catalog.name === "Top 10 Movies Today (South Korea)", "two rows, dramas first");
  ok(data.rows.every(r => r.items.length === 10), "ten titles each");
  ok(data.rows[0].items.map(i => i.id).join(",") === "1,2,3,4,5,6,7,8,9,10", "TMDB's popularity order, skipping titles without a poster");
  ok(data.rows[1].items[0].name === "Film 100" && data.rows[1].items[0].kind === "movie" && data.rows[1].catalog.type === "movie", "films are movies");
  ok(TOP10_CATALOGS.tv.url === "ydl-top10:tv" && TOP10_CATALOGS.movie.url === "ydl-top10:movie", "catalog addresses");
});

await test("a row with fewer than five titles is left out", async () => {
  const {tmdb} = fake({films: 3});
  const data = await createTop10({tmdb, now: () => NOON}).current();
  ok(data.rows.length === 1 && data.rows[0].catalog.id === "tv", "only the full row shows");
});

await test("built once per Pacific day, saved, and kept for up to three days when TMDB fails", async () => {
  let clock = NOON, down = false;
  const {tmdb, calls} = fake({fail: () => down});
  const saved: any = {};
  const storage = {load: async () => saved.value, save: async (value: any) => { saved.value = value; }};
  const top = createTop10({tmdb, now: () => clock, storage});
  await top.current();
  const first = calls.length;
  clock += 6 * 3600000; // 6pm the same day
  await top.current();
  ok(calls.length === first, "the same Pacific day reuses the list");
  ok(saved.value?.KR?.date === "2026-11-20" && saved.value.KR.rows.length === 2, "the list is saved");
  clock = NOON + 24 * 3600000;
  await top.current();
  ok(calls.length === first * 2, "the next day rebuilds");
  down = true;
  const restarted = createTop10({tmdb, now: () => NOON + 3 * 24 * 3600000, storage});
  ok((await restarted.current()).rows.length === 2, "TMDB trouble shows the saved list");
  const later = createTop10({tmdb, now: () => NOON + 5 * 24 * 3600000, storage});
  ok((await later.current()).rows.length === 0, "after three days without TMDB nothing shows");
});
await test("follows the country filter, with each country's own rows and names", async () => {
  const {tmdb, calls} = fake();
  const top = createTop10({tmdb, now: () => NOON});
  const jp = await top.current("JP");
  ok(calls.every(c => c.params.with_origin_country === "JP"), "asks for Japanese titles");
  ok(jp.rows.map(r => r.catalog.name).join(" / ") === "Top 10 Dramas Today (Japan) / Top 10 Movies Today (Japan)", "named like Weekly Picks: " + jp.rows.map(r => r.catalog.name));
  ok(jp.rows[0].catalog.url === "ydl-top10:tv:JP" && jp.rows[1].catalog.url === "ydl-top10:movie:JP", "the country is in the address");
  const th = await top.current("TH");
  ok(th.rows[0].catalog.name === "Top 10 Dramas Today (Thailand)" && calls.some(c => c.params.with_origin_country === "TH" && c.params["vote_count.gte"] === "1"), "small markets use a lower vote floor");
  const kr = await top.current();
  ok(kr.rows[0].catalog.url === "ydl-top10:tv" && kr.rows[0].catalog.name === "Top 10 Dramas Today (South Korea)", "Korea keeps its original address");
});

await test("a saved list from before countries still counts as Korea's", async () => {
  const {tmdb, calls} = fake();
  const old = {date: "2026-11-20", builtAt: NOON, rows: [{catalog: TOP10_CATALOGS.tv, items: []}]};
  const top = createTop10({tmdb, now: () => NOON, storage: {load: async () => old, save: async () => {}}});
  ok((await top.current("KR")).rows.length === 1 && calls.length === 0, "used as Korea's list for today");
});
console.log(JSON.stringify({passed}));
