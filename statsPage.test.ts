// The Stats tab (statsClient.ts) and My Collections' new place inside Lists.
import {parseHTML} from "npm:linkedom@0.18.12";
import handler from "./app.ts";
// The page re-checks in the background with long timers; don't let them keep the test process alive.
{ const realSetTimeout = globalThis.setTimeout; (globalThis as any).setTimeout = (fn: any, ms?: number, ...args: any[]) => { const id = realSetTimeout(fn, ms, ...args); if ((ms || 0) >= 15000) (Deno as any).unrefTimer(id); return id; }; }
let passed = 0;
const ok = (value: unknown, message: string) => { if (!value) throw Error(message); };
async function test(name: string, fn: () => unknown) { await fn(); passed++; console.log("PASS " + name); }

const html = await (await handler(new Request("https://test/setup/lists"))).text();
const script = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join("\n");
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

const sample = (extra: Record<string, unknown> = {}) => ({
  username: "jaesan", syncedAt: "2026-11-22T18:00:00.000Z", stale: false, allTime: true,
  statusCounts: {watching: 6, completed: 79, planToWatch: 63, onHold: 5, dropped: 8},
  types: {dramas: 23, movies: 56, tvShows: 0},
  viewingTime: {source: "mydramalist", hours: 388.8, days: 16.2, episodes: 303, note: "", includingWatching: 391.2},
  ratings: {rated: 79, unrated: 0, average: 8.89, distribution: [{score: 10, count: 34}, {score: 9, count: 10}], byCountry: [], minCountrySample: 3,
    highestCountry: {country: "Hong Kong", code: "HK", rated: 14, average: 9.36}, lowestCountry: {country: "China", code: "CN", rated: 4, average: 8.13}},
  countries: [{country: "Japan", code: "JP", count: 29}, {country: "South Korea", code: "KR", count: 29}, {country: "Hong Kong", code: "HK", count: 14}],
  decades: [{decade: "2000s", count: 20}, {decade: "2010s", count: 17}], unknownYear: 0,
  topRated: Array.from({length: 10}, (_, i) => ({rank: i + 1, slug: (i + 1) + "-t" + i, title: "Title " + (i + 1), year: 2000 + i, country: "Japan", type: "Movie", score: 10, poster: i ? "https://image.tmdb.org/t/p/w500/" + i + ".jpg" : null})),
  genres: [{genre: "Drama", count: 36}, {genre: "Thriller", count: 23}, {genre: "Crime", count: 18}],
  actors: [{id: 1, name: "Moon Lee", profile: "https://image.tmdb.org/t/p/w185/m.jpg", count: 4, titles: []}, {id: 2, name: "Yukari Ôshima", profile: null, count: 3, titles: []}],
  hero: {slug: "1475-3-iron", title: "3-Iron", year: 2004, reason: "top-rated-fallback", detectedAt: null, backdrop: "https://image.tmdb.org/t/p/w1280/b.jpg", poster: null},
  coverage: {completed: 79, matched: 75, unmatched: 4, pending: 0},
  ...extra,
});

function mount(options: {user?: string; stats?: () => Response} = {}) {
  const {document, window} = parseHTML(html);
  for (const dialog of document.querySelectorAll("dialog")) { (dialog as any).showModal = () => { (dialog as any).open = true; }; (dialog as any).close = () => { (dialog as any).open = false; }; }
  const saved = new Map<string, string>([["ydl-v3-started", "1"], ...(options.user ? [["ydl-v3-user", options.user]] as [string, string][] : [])]);
  const asked: string[] = [];
  const fetcher = async (url: string) => {
    const u = String(url); asked.push(u);
    if (u.startsWith("/api/stats")) return options.stats ? options.stats() : Response.json(sample());
    return Response.json({collections: [], items: [], titles: [], people: [], lists: [], hasNextPage: false});
  };
  new Function("window", "document", "localStorage", "location", "history", "fetch", "requestAnimationFrame", "matchMedia", "ResizeObserver", script)(window, document,
    {getItem: (k: string) => saved.get(k) ?? null, setItem: (k: string, v: string) => saved.set(k, v), removeItem: (k: string) => saved.delete(k)},
    {href: "https://test/setup/lists", origin: "https://test", pathname: "/setup/lists", search: "", hostname: "test"},
    {state: null, pushState() {}, replaceState() {}, back() {}}, fetcher, () => 0, () => ({matches: false, addEventListener() {}}), class { observe() {} });
  const click = (destination: string) => (document.querySelector('[data-destination="' + destination + '"]') as any).click();
  const panel = () => document.getElementById("statsPanel") as any;
  return {document, window, asked, click, panel};
}

await test("Stats takes My Collections' place in the bottom bar", () => {
  const {document} = mount();
  const labels = [...document.querySelectorAll(".androidBottomNav button")].map((b: any) => b.getAttribute("aria-label")).join("|");
  ok(labels === "Connect|Lists|Search titles to add|Discover|Stats", "bottom bar: " + labels);
});

await test("without a connected username, Stats asks you to connect", async () => {
  const {click, panel, asked} = mount();
  click("stats"); await tick();
  ok(!panel().classList.contains("hidden") && /Connect your MyDramaList username/.test(panel().textContent) && panel().querySelector("button")?.textContent === "Connect", "connect prompt");
  ok(!asked.some(u => u.startsWith("/api/stats")), "no stats request without a username");
});

await test("with a username, Stats shows the hero and every section from the API", async () => {
  const {click, panel, asked, document} = mount({user: "jaesan"});
  click("stats"); await tick(60);
  const p = panel(), text = p.textContent;
  ok(asked.includes("/api/stats?username=jaesan"), "asks for this user's stats");
  ok(p.querySelector(".statsHeroArt img")?.getAttribute("src") === "https://image.tmdb.org/t/p/w1280/b.jpg" && /Your top-rated/.test(text) && /3-Iron/.test(text), "hero backdrop and its title, labelled honestly");
  ok(p.querySelector(".statsHeroHours strong").textContent === "388.8" && /79 completed · average score 8.89/.test(text) && /All time, from your MyDramaList list/.test(text), "hours, completed, average, all time");
  ok([...p.querySelectorAll(".statsChips")[0].querySelectorAll("li")].map((l: any) => l.textContent).join("|") === "Watching 6|Completed 79|Plan to Watch 63|On Hold 5|Dropped 8", "status chips");
  ok(/23 dramas · 56 movies/.test(text) && /Hong Kong/.test(text), "dramas vs movies and every country");
  const genres = [...p.querySelectorAll(".statsCard")].find((c: any) => /Your top genres/.test(c.textContent));
  ok(genres && !/Drama 36/.test(genres.textContent) && /Thriller 23/.test(genres.textContent), "genres leave out Drama");
  ok(/Moon Lee/.test(text) && /4 titles/.test(text), "most-watched actors");
  ok([...p.querySelectorAll(".statsRank")].map((r: any) => r.textContent).join(",") === "1,2,3,4,5,6,7,8,9,10" && p.querySelector(".statsTopPosterName")?.textContent === "Title 1", "Top 10 with ranks; a missing poster shows the title");
  ok(/Titles from Hong Kong were your favorite \(average 9.36\)\. Titles from China were not \(average 8.13\)\./.test(text) && /79 rated/.test(text), "how you score");
  ok(/By release decade/.test(text) && !/couldn't be matched/.test(text), "decades, and no note about titles TMDB couldn't match");
  ok(!document.querySelector(".androidFilterButton:not([hidden])") || (document.querySelector(".androidFilterButton") as any).hidden, "no filter icon on Stats");
});

await test("still being looked up, stale, empty and error states say so instead of showing zeros", async () => {
  let reply = () => Response.json(sample({stale: true, coverage: {completed: 79, matched: 40, unmatched: 0, pending: 39}}));
  const m = mount({user: "jaesan", stats: () => reply()});
  m.click("stats"); await tick(60);
  ok(/Showing your last saved stats/.test(m.panel().textContent) && /39 titles left/.test(m.panel().textContent), "stale banner and pending note");
  m.click("discover"); // leaving the tab stops the follow-up check
  const empty = mount({user: "newbie", stats: () => Response.json(sample({statusCounts: {watching: 1, completed: 0, planToWatch: 3, onHold: 0, dropped: 0}, topRated: [], ratings: {...sample().ratings, rated: 0, average: null}}))});
  empty.click("stats"); await tick(60);
  ok(/You haven't completed anything on MyDramaList yet/.test(empty.panel().textContent) && !/Your top 10/.test(empty.panel().textContent), "no completed titles");
  const priv = mount({user: "secret", stats: () => Response.json({error: "This MyDramaList watchlist is private.", code: "PRIVATE"}, {status: 404})});
  priv.click("stats"); await tick(60);
  ok(/This MyDramaList watchlist is private/.test(priv.panel().textContent) && priv.panel().querySelector("button")?.textContent === "Try again", "the API's message with Try again");
});

await test("Lists has two tabs, MyDramaList and My Collections, with the hint inside the search box", async () => {
  const {document, click} = mount({user: "jaesan"});
  click("discover"); await tick();
  const tabs = document.querySelector(".androidListTabs") as any;
  ok(tabs.hidden, "no tabs on Discover");
  click("community"); await tick();
  const buttons = [...tabs.querySelectorAll("button")] as any[];
  ok(!tabs.hidden && buttons.map(b => b.textContent).join("|") === "MyDramaList|My Collections" && buttons[0].classList.contains("active"), "two tabs, MyDramaList active");
  ok((document.getElementById("profileInput") as any).placeholder === "Search a MyDramaList username or paste a list link", "the hint is the search box's placeholder");
  ok((document.querySelector(".androidPageDescription") as any).hidden, "no hint line on the MyDramaList tab");
  buttons[1].click(); await tick();
  ok(!document.getElementById("myCollections")!.classList.contains("hidden") && buttons[1].classList.contains("active") && !buttons[0].classList.contains("active"), "My Collections opens");
  ok(document.querySelector('[data-destination="community"]')!.classList.contains("active"), "Lists stays highlighted in the bottom bar");
  buttons[0].click(); await tick();
  ok(document.getElementById("myCollections")!.classList.contains("hidden") && buttons[0].classList.contains("active"), "back to MyDramaList");
  click("stats"); await tick();
  ok(tabs.hidden, "no tabs on Stats");
});
console.log(JSON.stringify({passed}));
