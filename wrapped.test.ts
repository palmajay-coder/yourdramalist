// MyDramaList Wrapped (wrappedClient.ts): the story slides and the once-a-year "ready" card.
import {parseHTML} from "npm:linkedom@0.18.12";
import handler from "./app.ts";
let passed = 0;
const ok = (value: unknown, message: string) => { if (!value) throw Error(message); };
async function test(name: string, fn: () => unknown) { await fn(); passed++; console.log("PASS " + name); }

const html = await (await handler(new Request("https://test/setup/lists"))).text();
const script = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join("\n");
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));
const DAY = 86400000;

const sample = (extra: Record<string, unknown> = {}) => ({
  username: "jaesan", syncedAt: "2026-11-22T18:00:00.000Z", stale: false, allTime: true,
  statusCounts: {watching: 6, completed: 79, planToWatch: 63, onHold: 5, dropped: 8},
  types: {dramas: 23, movies: 56, tvShows: 0},
  viewingTime: {source: "mydramalist", hours: 388.8, days: 16.2, episodes: 303, includingWatching: 391.2},
  ratings: {rated: 79, unrated: 0, average: 8.89, distribution: [{score: 10, count: 34}, {score: 8, count: 13}, {score: 9, count: 10}], byCountry: [], minCountrySample: 3,
    highestCountry: {country: "Hong Kong", rated: 14, average: 9.36}, lowestCountry: {country: "China", rated: 4, average: 8.13}},
  countries: [{country: "Japan", count: 29}, {country: "South Korea", count: 29}, {country: "Hong Kong", count: 14}],
  decades: [{decade: "2000s", count: 20}], unknownYear: 0,
  topRated: Array.from({length: 10}, (_, i) => ({rank: i + 1, slug: (i + 1) + "-t", title: "Title " + (i + 1), year: 2000, country: "Japan", type: "Movie", score: 10, poster: "https://image.tmdb.org/t/p/w500/" + i + ".jpg"})),
  genres: [{genre: "Drama", count: 36}, {genre: "Thriller", count: 23}, {genre: "Crime", count: 18}],
  actors: [{id: 1, name: "Moon Lee", profile: null, count: 4, titles: []}, {id: 2, name: "Yukari Ôshima", profile: null, count: 3, titles: []}],
  hero: {slug: "1475-3-iron", title: "3-Iron", year: 2004, reason: "newly-completed", detectedAt: "2026-11-22T17:00:00Z", backdrop: "https://image.tmdb.org/t/p/w1280/b.jpg", poster: null},
  coverage: {completed: 79, matched: 75, unmatched: 4, pending: 0},
  ...extra,
});

function mount(options: {user?: string; stats?: Record<string, unknown>; saved?: [string, string][]} = {}) {
  const {document, window} = parseHTML(html);
  for (const dialog of document.querySelectorAll("dialog")) { (dialog as any).showModal = () => { (dialog as any).open = true; }; (dialog as any).close = () => { (dialog as any).open = false; dialog.dispatchEvent(new window.Event("close")); }; }
  const saved = new Map<string, string>([["ydl-v3-started", "1"], ...(options.user ? [["ydl-v3-user", options.user]] as [string, string][] : []), ...(options.saved || [])]);
  const asked: string[] = [];
  const fetcher = async (url: string) => {
    const u = String(url); asked.push(u);
    if (u.startsWith("/api/stats")) return Response.json(options.stats || sample());
    return Response.json({collections: [], items: [], titles: [], people: [], lists: [], hasNextPage: false});
  };
  new Function("window", "document", "localStorage", "location", "history", "fetch", "requestAnimationFrame", "matchMedia", "ResizeObserver", script)(window, document,
    {getItem: (k: string) => saved.get(k) ?? null, setItem: (k: string, v: string) => saved.set(k, v), removeItem: (k: string) => saved.delete(k)},
    {href: "https://test/setup/lists", origin: "https://test", pathname: "/setup/lists", search: "", hostname: "test"},
    {state: null, pushState() {}, replaceState() {}, back() {}}, fetcher, () => 0, () => ({matches: false, addEventListener() {}}), class { observe() {} });
  // Patch dialogs created after start-up (Wrapped's own dialog) the same way.
  for (const dialog of document.querySelectorAll("dialog")) {
    if (!(dialog as any).showModal) (dialog as any).showModal = () => { (dialog as any).open = true; };
    if (!(dialog as any).close) (dialog as any).close = () => { (dialog as any).open = false; dialog.dispatchEvent(new window.Event("close")); };
  }
  const click = (destination: string) => (document.querySelector('[data-destination="' + destination + '"]') as any).click();
  return {document, window, saved, asked, click};
}
const story = (document: any) => document.querySelector("dialog.wrapped");
const slideKinds = (document: any) => [...story(document).querySelectorAll(".wrappedProgressBar")].length;
const currentText = (document: any) => story(document).querySelector(".wrappedStage").textContent;

await test("View My Wrapped on Stats opens eight story slides from the same stats", async () => {
  const {document, window, click} = mount({user: "jaesan"});
  click("stats"); await tick(60);
  const button = document.querySelector(".statsWrappedButton") as any;
  ok(button && button.textContent === "View My Wrapped", "the button sits under the hero");
  button.click(); await tick();
  const d = story(document);
  ok(d.open && slideKinds(document) === 8, "eight slides: " + slideKinds(document));
  ok(/@jaesan, here's your drama story so far/.test(currentText(document)) && /Recently completed: 3-Iron/.test(currentText(document)) && d.querySelector(".wrappedBackdrop img"), "opening slide with the backdrop");
  const stage = d.querySelector(".wrappedStage");
  stage.dispatchEvent(new window.Event("click", {bubbles: true}));
  ok(/Time well spent/.test(currentText(document)), "a tap goes forward");
  await tick(1300);
  ok(d.querySelector(".wrappedBig").textContent === "388.8" && /16.2 days, across 79 completed titles/.test(currentText(document)), "hours count up to the real number");
  const key = (k: string) => d.dispatchEvent(Object.assign(new window.Event("keydown", {bubbles: true}), {key: k}));
  key("ArrowLeft");
  ok(/here's your drama story/.test(currentText(document)), "← goes back");
  for (let i = 0; i < 7; i++) key("ArrowRight");
  ok(/Your story in one card/.test(currentText(document)) && /Top genre: Thriller/.test(currentText(document)) && /Most-watched actor: Moon Lee/.test(currentText(document)) && /@jaesan · all time/.test(currentText(document)), "the summary card, all time, without Drama as top genre");
  ok(d.querySelector(".wrappedHint").hidden, "no tap hint on the last slide");
  (d.querySelector('[data-wrapped-action="replay"]') as any).click();
  ok(/here's your drama story/.test(currentText(document)), "Replay starts over");
  (d.querySelector(".wrappedClose") as any).click();
  ok(!d.open, "× closes");
});

await test("slides without data are left out, and ratings only state supported facts", async () => {
  const {document, click} = mount({user: "jaesan", stats: sample({actors: [], genres: [{genre: "Drama", count: 9}], hero: null})});
  click("stats"); await tick(60);
  (document.querySelector(".statsWrappedButton") as any).click(); await tick();
  ok(slideKinds(document) === 6, "no actors or genres slide: " + slideKinds(document));
  const d = story(document);
  const key = (k: string) => d.dispatchEvent(Object.assign(new (d.ownerDocument.defaultView as any).Event("keydown", {bubbles: true}), {key: k}));
  for (let i = 0; i < 4; i++) key("ArrowRight");
  ok(/Your rating personality/.test(currentText(document)) && /perfect 10 to 34 titles/.test(currentText(document)) && /Kindest to Hong Kong/.test(currentText(document)), "rating facts: " + currentText(document));
});

await test("the ready card: once a year, ask first, never when not ready or not connected", async () => {
  const fresh = mount({user: "jaesan"});
  const recent = mount({user: "jaesan", saved: [["ydl-wrapped-prompt:jaesan", String(Date.now() - 30 * DAY)]]});
  const old = mount({user: "jaesan", saved: [["ydl-wrapped-prompt:jaesan", String(Date.now() - 400 * DAY)]]});
  const busy = mount({user: "jaesan", stats: sample({coverage: {completed: 79, matched: 20, unmatched: 0, pending: 59}})});
  const guest = mount();
  await tick(2300);
  const card = (m: any) => m.document.querySelector(".wrappedPrompt") as any;
  ok(!card(fresh).hidden && /Your drama recap is ready!/.test(card(fresh).textContent) && fresh.saved.has("ydl-wrapped-prompt:jaesan"), "shows once stats are ready, and remembers it");
  ok(card(recent).hidden && !recent.asked.some(u => u.startsWith("/api/stats")), "not again within a year (no request either)");
  ok(!card(old).hidden, "again after a year");
  ok(card(busy).hidden && !busy.saved.has("ydl-wrapped-prompt:jaesan"), "not while TMDB details are still coming, and nothing is written");
  ok(card(guest).hidden, "not without a connected username");
  const view = [...card(fresh).querySelectorAll("button")].find((b: any) => b.textContent === "View") as any;
  view.click(); await tick();
  ok(card(fresh).hidden && story(fresh.document).open && slideKinds(fresh.document) === 8, "View opens Wrapped");
  const later = [...card(old).querySelectorAll("button")].find((b: any) => b.textContent === "Later") as any;
  later.click();
  ok(card(old).hidden && !story(old.document).open, "Later just closes the card");
});
console.log(JSON.stringify({passed}));
