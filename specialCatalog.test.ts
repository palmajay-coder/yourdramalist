// Spotlight: GTA 6 until the winter list, a holiday or seasonal list for every month, matching and caching.
import {createSpecialCatalog, activeSpotlights, monthlySpotlight, GTA6, MONTHLY} from "./specialCatalog.ts";
let passed = 0;
const ok = (value: unknown, message: string) => { if (!value) throw Error(message); };
async function test(name: string, fn: () => unknown) { await fn(); passed++; console.log("PASS " + name); }

await test("every month has its approved list of at least 10 titles, with no repeats", () => {
  const names = Array.from({length: 12}, (_, i) => MONTHLY[i + 1]?.name).join(" | ");
  ok(names === "New Year, New Obsession | Fall in Love This February | White Day Sweethearts | Spring Into Love | Watch With Mom | Summer Crush | Beach Brain | Last Days of Summer | Chuseok at Home | K-Horror Night | Thankful for Family | Snowed In for Christmas", "the approved names: " + names);
  for (let month = 1; month <= 12; month++) {
    const titles = MONTHLY[month].titles.map(t => t.title);
    ok(titles.length >= 10 && new Set(titles).size === titles.length, MONTHLY[month].name + " has at least 10 different titles");
    ok(MONTHLY[month].titles.every(t => t.year > 1990 && ["tv", "movie"].includes(t.kind) && ["KR", "JP", "CN", "TW", "TH"].includes(t.country)), MONTHLY[month].name + " titles are complete");
  }
  ok(GTA6.titles.length === 20 && GTA6.until === "2026-12-01T08:00:00.000Z", "GTA 6 ends when the winter list begins: " + GTA6.until);
});

await test("the calendar: GTA 6 and the month's list until Dec 1, then one list a month, changing at midnight Pacific", () => {
  const names = (time: number) => activeSpotlights(time).map(list => list.name + " until " + list.until).join(" / ");
  ok(names(Date.UTC(2026, 10, 20, 20)) === "Watch this while they play GTA 6 until 2026-12-01T08:00:00.000Z / Thankful for Family until 2026-12-01T08:00:00.000Z", "Nov 20: " + names(Date.UTC(2026, 10, 20, 20)));
  ok(names(Date.UTC(2026, 11, 1, 7, 59)) .startsWith("Watch this while they play GTA 6"), "still November one minute before midnight Pacific");
  ok(names(Date.UTC(2026, 11, 1, 8)) === "Snowed In for Christmas until 2027-01-01T08:00:00.000Z", "Dec 1: " + names(Date.UTC(2026, 11, 1, 8)));
  ok(names(Date.UTC(2027, 0, 1, 8)) === "New Year, New Obsession until 2027-02-01T08:00:00.000Z", "Jan 1: " + names(Date.UTC(2027, 0, 1, 8)));
  ok(monthlySpotlight(Date.UTC(2027, 2, 15)).until === "2027-04-01T07:00:00.000Z" && monthlySpotlight(Date.UTC(2027, 2, 15)).name === "White Day Sweethearts", "March ends at midnight Pacific, in daylight saving time");
  ok(monthlySpotlight(Date.UTC(2027, 9, 31, 12)).name === "K-Horror Night", "Halloween is in October");
});

const NOW = Date.UTC(2026, 10, 20, 20);
const one = (id: string, name: string, until: string, titles: any[]) => ({id, name, until, titles});
const lists = () => [
  one("gta6", "GTA", "2026-12-01T08:00:00.000Z", [
    {title: "Business Proposal", year: 2022, country: "KR", kind: "tv"},
    {title: "Extreme Job", year: 2019, country: "KR", kind: "movie"},
    {title: "Legal High", year: 2012, country: "JP", kind: "tv"},
    {title: "Strong Woman Do Bong Soon", year: 2017, country: "KR", kind: "tv", alt: ["Strong Girl Bong-soon"]},
    {title: "Nowhere Show", year: 2020, country: "KR", kind: "tv"},
  ]),
  one("monthly", "Thankful for Family", "2026-12-01T08:00:00.000Z", [{title: "Legal High", year: 2012, country: "JP", kind: "tv"}]),
];
function fakeTmdb() {
  const calls: string[] = [];
  const tv = (id: number, name: string, extra: Record<string, unknown> = {}) => ({id, name, original_name: name, first_air_date: "2022-02-07", origin_country: ["KR"], poster_path: "/p" + id + ".jpg", vote_average: 8, overview: "", ...extra});
  const tmdb = async (path: string, params: Record<string, string> = {}) => {
    calls.push(path + ":" + params.query);
    if (params.query === "Business Proposal") return {results: [tv(9, "Business Proposal", {origin_country: ["US"]}), tv(8, "Business Proposal", {first_air_date: "2010-01-01"}), tv(1, "Business Proposal")]};
    if (params.query === "Extreme Job") return {results: [{id: 2, title: "Extreme Job", release_date: "2019-01-23", original_language: "ko", poster_path: "/e.jpg", vote_average: 7.5}]};
    if (params.query === "Legal High") return {results: [tv(3, "Legal High", {first_air_date: "2012-04-17", origin_country: ["JP"]})]};
    if (params.query === "Strong Woman Do Bong Soon") return {results: [tv(4, "Strong Girl Bong-soon", {first_air_date: "2017-02-24"}), tv(44, "Strong Girl Nam-soon", {first_air_date: "2023-10-07"})]};
    return {results: []};
  };
  return {tmdb, calls};
}

await test("each running list is matched on TMDB in its hand-picked order, sharing one cache", async () => {
  const {tmdb, calls} = fakeTmdb();
  const saved: any = {};
  const spotlight = createSpecialCatalog({tmdb, now: () => NOW, lists, storage: {load: async () => saved.rows, save: async (rows: any) => { saved.rows = rows; }}});
  const data = await spotlight.current();
  ok(data.lists.map(l => l.catalog.id).join(",") === "gta6,monthly", "GTA 6 first, then the month's list");
  const gta = data.lists[0];
  ok(gta.catalog.url === "ydl-special:gta6" && gta.catalog.kind === "special" && gta.catalog.until === "2026-12-01T08:00:00.000Z", "catalog identity");
  ok(gta.items.map(i => i.kind + ":" + i.id).join(",") === "tv:1,movie:2,tv:3,tv:4", "right titles in order, unmatched left out: " + gta.items.map(i => i.kind + ":" + i.id).join(","));
  ok(data.lists[1].catalog.url === "ydl-special:monthly" && data.lists[1].items[0].id === 3, "the month's list");
  ok(calls.filter(c => c.endsWith("Legal High")).length === 1, "a title in two lists is looked up once");
  const before = calls.length;
  await spotlight.current();
  ok(calls.length === before, "matches are reused");
  ok(Array.isArray(saved.rows) && saved.rows.length === 5, "matches are saved");
});

await test("a list that has nothing to show is left out", async () => {
  const {tmdb} = fakeTmdb();
  const spotlight = createSpecialCatalog({tmdb, now: () => NOW, lists: () => [one("monthly", "Empty", "2026-12-01T08:00:00.000Z", [{title: "Nowhere Show", year: 2020, country: "KR", kind: "tv"}])]});
  ok((await spotlight.current()).lists.length === 0, "no titles, no list");
});
console.log(JSON.stringify({passed}));
