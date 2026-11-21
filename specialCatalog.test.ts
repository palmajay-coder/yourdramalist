// Spotlight: GTA 6 until the winter list, a holiday or seasonal list for every month, matching and caching.
import {createSpecialCatalog, activeSpotlights, monthlySpotlight, spotlightName, GTA6, MONTHLY, HOLIDAYS, ENDINGS} from "./specialCatalog.ts";
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
  const oct = monthlySpotlight(Date.UTC(2027, 9, 31, 12));
  ok(spotlightName(oct) === "K-Horror Night" && spotlightName(oct, "JP") === "Horror Night (Japan)" && spotlightName(oct, "KR") === "Horror Night (South Korea)", "one country: named like Weekly Picks, without the K-");
  ok(spotlightName(GTA6, "CN") === "Watch this while they play GTA 6 (China)" && spotlightName(monthlySpotlight(Date.UTC(2026, 10, 20), "JP"), "JP") === "Thankful for Family (Japan)", "every list gets the country in brackets");
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
  ok(Array.isArray(saved.rows?.matches) && saved.rows.matches.length === 5, "matches are saved");
});

await test("a list that has nothing to show is left out", async () => {
  const {tmdb} = fakeTmdb();
  const spotlight = createSpecialCatalog({tmdb, now: () => NOW, lists: () => [one("monthly", "Empty", "2026-12-01T08:00:00.000Z", [{title: "Nowhere Show", year: 2020, country: "KR", kind: "tv"}])]});
  ok((await spotlight.current()).lists.length === 0, "no titles, no list");
});
await test("a country sees its own picks first, topped up to 15 on the list's theme, and kept for a week", async () => {
  const {tmdb: base, calls} = fakeTmdb();
  const discover: Record<string, string>[] = [];
  let clock = NOW;
  const tmdb = async (path: string, params: Record<string, string> = {}) => {
    if (path === "search/keyword") return {results: [{id: params.query === "romance" ? 9840 : 818, name: params.query}]};
    if (path.startsWith("discover/")) {
      discover.push({path, ...params});
      const kind = path.slice(9), many = params["vote_count.gte"] === "20" ? 6 : 20;
      return {results: Array.from({length: many}, (_, i) => ({id: (kind === "tv" ? 500 : 700) + i, name: "JP " + kind + " " + i, title: "JP " + kind + " " + i, origin_country: ["JP"], poster_path: "/j" + i + ".jpg", vote_average: 9 - i / 10, overview: "", first_air_date: "2020-01-01", release_date: "2020-01-01"}))};
    }
    return base(path, params);
  };
  const saved: any = {};
  const themed = () => lists().map(list => ({...list, theme: list.id === "gta6" ? {genre: "35"} : {keywords: ["romance", "family"]}}));
  const spotlight = createSpecialCatalog({tmdb, now: () => clock, lists: themed, storage: {load: async () => saved.rows, save: async (rows: any) => { saved.rows = rows; }}});
  const data = await spotlight.current("JP");
  ok(data.lists.map(l => l.catalog.url).join(",") === "ydl-special:gta6:JP,ydl-special:monthly:JP", "both lists, with the country in their address: " + data.lists.map(l => l.catalog.url));
  const gta = data.lists[0];
  ok(gta.items.length === 15 && gta.items[0].id === 3, "Japan's hand-picked title comes first, then 14 more: " + gta.items.length);
  ok(!gta.items.some(i => i.id === 1 || i.id === 2 || i.id === 4), "other countries' picks are left out");
  const comedy = discover.filter(d => d.with_genres === "35");
  ok(comedy.length >= 2 && comedy.every(d => d.with_origin_country === "JP" && !d.with_keywords), "GTA 6 is topped up with Japanese comedies");
  ok(discover.some(d => d.with_keywords === "9840|818" && d.with_origin_country === "JP"), "the month's list is topped up on its keywords");
  ok(discover.find(d => d["vote_count.gte"] === "5"), "a short list relaxes the rating floor");
  const before = discover.length;
  clock += 3 * 86400000;
  await spotlight.current("JP");
  ok(discover.length === before, "the top-up is kept for a week");
  ok(Array.isArray(saved.rows?.fills) && saved.rows.fills.length === 2, "top-ups are saved");
  const all = await spotlight.current();
  ok(all.lists[0].catalog.url === "ydl-special:gta6" && all.lists[0].items.length === 4 && !all.lists[0].catalog.country, "without a country every country's picks show, with no top-up");
  ok(calls.length > 0, "matching still runs");
});

await test("a sparse country digs deeper: lower floors, most popular tagged titles, then the genre", async () => {
  const asked: Record<string, string>[] = [];
  const tmdb = async (path: string, params: Record<string, string> = {}) => {
    if (path === "search/keyword") return {results: [{id: 7, name: params.query}]};
    if (!path.startsWith("discover/")) return {results: []};
    asked.push(params);
    const kind = path.slice(9), base = params.with_genres ? 900 : params.sort_by === "popularity.desc" ? 800 : 0;
    const n = params.with_genres && params["vote_count.gte"] === "20" ? 12 : base ? 3 : 0;
    return {results: Array.from({length: n}, (_, i) => ({id: base + (kind === "tv" ? i : 50 + i), name: "CN " + i, title: "CN " + i, origin_country: ["CN"], poster_path: "/c.jpg", vote_average: 7}))};
  };
  const spotlight = createSpecialCatalog({tmdb, now: () => NOW, lists: () => [one("monthly", "Singles Day", "2026-12-01T08:00:00.000Z", [])].map(l => ({...l, theme: {keywords: ["single"], genre: "35|10749"}}))});
  const data = await spotlight.current("CN");
  ok(data.lists.length === 1 && data.lists[0].items.length === 15, "filled to 15: " + data.lists[0]?.items.length);
  ok(asked.some(p => p.sort_by === "popularity.desc" && p.with_keywords) && asked.some(p => p.with_genres === "35|10749"), "tried popular tagged titles, then the genre");
  ok(data.lists[0].items.slice(0, 6).every(i => i.id >= 800 && i.id < 900), "tagged titles come before genre titles");
});

await test("a country with fewer than five titles after the top-up does not get that list", async () => {
  const tmdb = async (path: string) => path.startsWith("discover/") ? {results: [{id: 1, name: "Only one", origin_country: ["TW"], poster_path: "/a.jpg", vote_average: 8}]} : path === "search/keyword" ? {results: []} : {results: []};
  const spotlight = createSpecialCatalog({tmdb, now: () => NOW, lists: () => lists().map(list => ({...list, theme: {genre: "35"}}))});
  ok((await spotlight.current("TW")).lists.length === 0, "too short to show");
});

await test("a country's own holidays replace the usual list that month, with no colons in names", () => {
  const name = (month: number, country?: any) => spotlightName(monthlySpotlight(Date.UTC(2027, month - 1, 15, 20), country), country);
  ok(name(7, "JP") === "Tanabata Wishes (Japan)" && name(8, "JP") === "Obon Nights (Japan)" && name(9, "JP") === "Moon Viewing Night (Japan)" && name(12, "JP") === "Christmas Eve Date Night (Japan)", "Japan");
  ok(name(2, "CN") === "Spring Festival Reunion (China)" && name(8, "CN") === "Qixi Sweethearts (China)" && name(9, "CN") === "Mid-Autumn Reunion (China)" && name(11, "CN") === "Singles Day (China)", "China");
  ok(name(2, "TW") === "Spring Festival Reunion (Taiwan)" && name(8, "TW") === "Ghost Month Chills (Taiwan)" && name(9, "TW") === "Mid-Autumn Reunion (Taiwan)", "Taiwan");
  ok(name(4, "TH") === "Songkran Splash (Thailand)" && name(11, "TH") === "Loy Krathong Lovers (Thailand)", "Thailand");
  ok(name(9, "KR") === "Chuseok at Home (South Korea)" && name(9) === "Chuseok at Home" && name(7, "CN") === "Beach Brain (China)", "everyone else keeps the usual list");
  ok(monthlySpotlight(Date.UTC(2027, 6, 15, 20), "JP").titles.length === 0, "holiday lists fill by theme only");
  const all = [...Object.values(MONTHLY).map(m => m.name), ...Object.values(HOLIDAYS).flatMap(h => Object.values(h!).map(x => x.name))];
  ok(all.every(n => !n.includes(":")), "no colons: " + all.filter(n => n.includes(":")));
});

await test("every running list has a theme for topping up", () => {
  for (const time of [Date.UTC(2026, 10, 20), ...Array.from({length: 12}, (_, m) => Date.UTC(2027, m, 15))]) {
    for (const country of [undefined, "KR", "JP", "CN", "TW", "TH"] as any[]) for (const list of activeSpotlights(time, GTA6, country)) ok(list.theme && (list.theme.genre || list.theme.keywords?.length), list.name + " has a theme");
  }
});
await test("Dramas With a Satisfying Ending: 18 hand-picked titles, topped up from all five countries to 30, never on Discover", async () => {
  ok(ENDINGS.id === "endings" && ENDINGS.titles.length === 18 && new Set(ENDINGS.titles.map(t => t.title)).size === 18, "18 different titles");
  ok(!ENDINGS.titles.some(t => ["Twenty-Five Twenty-One", "Cheese in the Trap", "Uncontrollably Fond", "Youth of May"].includes(t.title)), "divisive and sad endings stay out");
  for (const time of [Date.UTC(2026, 10, 20), Date.UTC(2027, 5, 1)]) ok(!activeSpotlights(time).some(l => l.id === "endings"), "not a Spotlight list");
  const asked: Record<string, string>[] = [];
  const tmdb = async (path: string, params: Record<string, string> = {}) => {
    if (path === "search/keyword") return {results: [{id: 4344, name: params.query}]};
    if (path.startsWith("discover/")) {
      asked.push(params);
      const kind = path.slice(9);
      return {results: Array.from({length: 20}, (_, i) => ({id: (kind === "tv" ? 3000 : 4000) + i, name: "E" + i, title: "E" + i, origin_country: [["KR", "CN", "JP", "TW", "TH"][i % 5]], poster_path: "/e.jpg", vote_average: 9 - i / 10, overview: ""}))};
    }
    return {results: []};
  };
  const lists = () => [{...ENDINGS, titles: [{title: "Nowhere", year: 2020, country: "KR" as const, kind: "tv" as const}]}];
  const catalog = createSpecialCatalog({tmdb, now: () => NOW, lists, fillCountries: ["KR", "CN", "JP", "TW", "TH"], fullList: 30});
  const data = await catalog.current();
  ok(asked.length && asked.every(p => p.with_origin_country === "KR|CN|JP|TW|TH" && p.with_keywords === "4344"), "the top-up asks for all five countries' happy endings");
  ok(data.lists.length === 1 && data.lists[0].items.length === 30 && data.lists[0].catalog.url === "ydl-special:endings" && data.lists[0].catalog.name === "Dramas With a Satisfying Ending", "a full list of 30: " + data.lists[0]?.items.length);
});
console.log(JSON.stringify({passed}));
