// The limited-time "Watch this while they play GTA 6" catalog: matching, order, caching and the end date.
import {createSpecialCatalog, SPECIAL} from "./specialCatalog.ts";
let passed = 0;
const ok = (value: unknown, message: string) => { if (!value) throw Error(message); };
async function test(name: string, fn: () => unknown) { await fn(); passed++; console.log("PASS " + name); }

await test("the catalog has 20 hand-picked titles and ends at midnight Pacific on January 1, 2027", () => {
  ok(SPECIAL.name === "Watch this while they play GTA 6" && SPECIAL.titles.length === 20, "name and size");
  ok(SPECIAL.until === "2027-01-01T08:00:00.000Z", "ends at midnight Pacific: " + SPECIAL.until);
  ok(new Set(SPECIAL.titles.map(t => t.title)).size === 20, "no title is listed twice");
});

const NOW = Date.UTC(2026, 10, 20, 12);
const special = {...SPECIAL, titles: [
  {title: "Business Proposal", year: 2022, country: "KR" as const, kind: "tv" as const},
  {title: "Extreme Job", year: 2019, country: "KR" as const, kind: "movie" as const},
  {title: "Legal High", year: 2012, country: "JP" as const, kind: "tv" as const},
  {title: "Strong Woman Do Bong Soon", year: 2017, country: "KR" as const, kind: "tv" as const, alt: ["Strong Girl Bong-soon"]},
  {title: "Nowhere Show", year: 2020, country: "KR" as const, kind: "tv" as const},
]};
function fakeTmdb() {
  const calls: string[] = [];
  const tv = (id: number, name: string, extra: Record<string, unknown> = {}) => ({id, name, original_name: name, first_air_date: "2022-02-07", origin_country: ["KR"], poster_path: "/p" + id + ".jpg", vote_average: 8, overview: "", ...extra});
  const tmdb = async (path: string, params: Record<string, string> = {}) => {
    calls.push(path + ":" + params.query);
    if (params.query === "Business Proposal") return {results: [
      tv(9, "Business Proposal", {origin_country: ["US"]}),
      tv(8, "Business Proposal", {first_air_date: "2010-01-01"}),
      tv(1, "Business Proposal"),
    ]};
    if (params.query === "Extreme Job") return {results: [{id: 2, title: "Extreme Job", release_date: "2019-01-23", original_language: "ko", poster_path: "/e.jpg", vote_average: 7.5}]};
    if (params.query === "Legal High") return {results: [tv(3, "Legal High", {first_air_date: "2012-04-17", origin_country: ["JP"]})]};
    if (params.query === "Strong Woman Do Bong Soon") return {results: [tv(4, "Strong Girl Bong-soon", {first_air_date: "2017-02-24"}), tv(44, "Strong Girl Nam-soon", {first_air_date: "2023-10-07"})]};
    return {results: []};
  };
  return {tmdb, calls};
}

await test("titles are matched by year and country, in the hand-picked order, and an unmatched title is skipped", async () => {
  const {tmdb, calls} = fakeTmdb();
  const saved: any = {};
  const catalog = createSpecialCatalog({tmdb, now: () => NOW, special, storage: {load: async () => saved.rows, save: async (rows: any) => { saved.rows = rows; }}});
  const data = await catalog.current();
  ok(data && data.catalog.url === "ydl-special:gta6" && data.catalog.kind === "special" && data.catalog.until === SPECIAL.until, "catalog identity");
  ok(data!.items.map(i => i.kind + ":" + i.id).join(",") === "tv:1,movie:2,tv:3,tv:4", "right titles in order: " + data!.items.map(i => i.kind + ":" + i.id).join(","));
  ok(data!.items[0].poster === "https://image.tmdb.org/t/p/w780/p1.jpg" && data!.items[1].name === "Extreme Job", "items carry TMDB posters and names");
  const before = calls.length;
  await catalog.current();
  ok(calls.length === before + 0, "matches are reused (the unmatched title waits a day before trying again)");
  ok(Array.isArray(saved.rows) && saved.rows.length === 5, "matches are saved in their own store");
});

await test("after midnight Pacific on January 1 the catalog is gone, and nothing is looked up", async () => {
  const {tmdb, calls} = fakeTmdb();
  const late = createSpecialCatalog({tmdb, now: () => Date.parse(SPECIAL.until), special});
  ok((await late.current()) === null && calls.length === 0, "ended catalogs return nothing");
  const justBefore = createSpecialCatalog({tmdb, now: () => Date.parse(SPECIAL.until) - 60000, special});
  ok((await justBefore.current())?.items.length === 4, "one minute before the end it still shows");
});
console.log(JSON.stringify({passed}));
