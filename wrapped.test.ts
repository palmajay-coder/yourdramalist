// MyDramaList Wrapped (wrappedClient.ts): the story slides and the Discover banner.
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
const DAY = 86400000;

const sample = (extra: Record<string, unknown> = {}) => ({
  username: "jaesan", syncedAt: "2026-11-22T18:00:00.000Z", stale: false, allTime: true,
  statusCounts: {watching: 6, completed: 79, planToWatch: 63, onHold: 5, dropped: 8},
  types: {dramas: 23, movies: 56, tvShows: 0},
  viewingTime: {source: "mydramalist", hours: 388.8, days: 16.2, episodes: 303, includingWatching: 391.2},
  ratings: {rated: 79, unrated: 0, average: 8.89, distribution: [{score: 10, count: 34}, {score: 8, count: 13}, {score: 9, count: 10}], byCountry: [], minCountrySample: 3,
    highestCountry: {country: "Hong Kong", rated: 14, average: 9.36}, lowestCountry: {country: "China", rated: 4, average: 8.13}},
  countries: [{country: "Japan", count: 29}, {country: "South Korea", count: 29}, {country: "Hong Kong", count: 14}],
  decades: [{decade: "2010s", count: 17}, {decade: "2000s", count: 20}], unknownYear: 0,
  topRated: Array.from({length: 10}, (_, i) => ({rank: i + 1, slug: (i + 1) + "-t", title: "Title " + (i + 1), year: 2000, country: "Japan", type: "Movie", score: 10, poster: "https://image.tmdb.org/t/p/w500/" + i + ".jpg"})),
  genres: [{genre: "Drama", count: 36}, {genre: "Thriller", count: 23}, {genre: "Crime", count: 18}],
  actors: [{id: 1, name: "Moon Lee", profile: null, count: 4, titles: []}, {id: 2, name: "Yukari Ôshima", profile: null, count: 3, titles: []}],
  hero: {slug: "1475-3-iron", title: "3-Iron", year: 2004, reason: "newly-completed", detectedAt: "2026-11-22T17:00:00Z", backdrop: "https://image.tmdb.org/t/p/w1280/b.jpg", poster: null},
  coverage: {completed: 79, matched: 75, unmatched: 4, pending: 0},
  topDramas: [1, 2, 3].map(i => ({rank: i, slug: i + "-d", title: "Drama " + i, year: 2010, country: "South Korea", type: "Drama", score: 10, poster: "https://image.tmdb.org/t/p/w500/d" + i + ".jpg"})),
  topMovies: [1, 2, 3, 4, 5].map(i => ({rank: i, slug: i + "-m", title: "Movie " + i, year: 2000, country: "Japan", type: "Movie", score: 10, poster: "https://image.tmdb.org/t/p/w500/m" + i + ".jpg"})),
  art: {opening: {title: "Goblin", backdrop: "https://image.tmdb.org/t/p/original/open.jpg"}, time: {title: "Cure", backdrop: "https://image.tmdb.org/t/p/original/cure.jpg"}, genres: {title: "Pulse", backdrop: "https://image.tmdb.org/t/p/original/pulse.jpg"}, countries: null, actors: null,
    topDrama: {title: "Drama 1", backdrop: "https://image.tmdb.org/t/p/original/drama1.jpg"}, topMovie: {title: "Movie 1", backdrop: "https://image.tmdb.org/t/p/original/movie1.jpg"}, ratings: null, type: null, card: null},
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

await test("Your Drama Wrapped on Stats opens twelve story slides: a story line, one big stat, one supporting line", async () => {
  const {document, window, click} = mount({user: "jaesan"});
  click("stats"); await tick(60);
  const button = document.querySelector(".statsWrappedButton") as any;
  ok(button && button.textContent === "Your Drama Wrapped", "the button sits under the hero");
  button.click(); await tick();
  const d = story(document);
  ok(d.open && slideKinds(document) === 12, "twelve slides: " + slideKinds(document));
  const text = () => currentText(document);
  const storyLine = () => d.querySelector(".wrappedStage .wrappedStory")?.textContent;
  const big = () => d.querySelector(".wrappedStage .wrappedHuge, .wrappedStage .wrappedHeadline")?.textContent;
  ok(d.querySelector(".wrappedStage .wrappedKicker")?.textContent === "@jaesan" && d.querySelector(".wrappedStage .wrappedSlogan")?.textContent === "You've watched the dramas. Now here's the drama." && /Here's everything you've completed so far from then to 2026\./.test(text()) && !/all time/.test(text()) && d.querySelector(".wrappedBackdrop img")?.getAttribute("src") === "https://image.tmdb.org/t/p/original/open.jpg", "opening: @username above the slogan, on a sharp backdrop");
  d.querySelector(".wrappedStage").dispatchEvent(new window.Event("click", {bubbles: true}));
  await tick(1300);
  ok(storyLine() === "That's a whole lot of drama." && big() === "79" && /You didn't just start 23 dramas and 56 movies\. You finished every single one\./.test(text()) && d.querySelectorAll(".wrappedStage .wrappedLine").length === 1 && d.querySelectorAll(".wrappedStage .wrappedLine strong").length === 2 && !d.querySelector(".wrappedStage .wrappedFact"), "a tap goes forward to the completed count: " + text());
  const key = (k: string) => d.dispatchEvent(Object.assign(new window.Event("keydown", {bubbles: true}), {key: k}));
  key("ArrowRight"); await tick(1300);
  ok(storyLine() === "Time well spent. Or was it?" && big() === "388.8 hours" && /16 days nonstop, fueled by snacks, tissues and zero regrets\./.test(text()) && d.querySelector(".wrappedBackdrop img")?.getAttribute("src") === "https://image.tmdb.org/t/p/original/cure.jpg" && !/Backdrop:/.test(text()), "hours, with its own backdrop: " + big());
  key("ArrowRight");
  ok(storyLine() === "You clearly have a type." && big() === "Thriller" && /23 thrillers in, and you still never trust the nice guy\./.test(text()) && !/Crime/.test(text()) && d.querySelectorAll(".wrappedStage .wrappedLine").length === 1, "genre: " + text());
  key("ArrowRight");
  ok(storyLine() === "Your passport to drama." && big() === "Japan and South Korea" && /heart belongs to two places! You watched 29 titles from each country\./.test(text()) && !/Hong Kong/.test(text()), "countries, a tie said as a tie: " + text());
  ok(d.querySelector(".wrappedStage svg.wrappedMap") && d.querySelectorAll(".wrappedStage .wrappedMapRing").length === 2 && (d.querySelector(".wrappedStage .wrappedMap .isHit")?.getAttribute("d") || "").split("M").length > 10 && !d.querySelector(".wrappedStage .wrappedBar"), "a map with both tied countries lit up and circled, instead of bars");
  key("ArrowRight");
  ok(storyLine() === "Every era has its drama, yours was:" && big() === "The 2000s" && /Dramas from this decade dominated your watchlists\./.test(text()) && [...d.querySelectorAll(".wrappedStage .wrappedBarLabel")].map((x: any) => x.textContent).join() === "2000s,2010s", "eras by release decade, most first: " + text());
  key("ArrowRight");
  ok(big() === "Your most-watched actor is Moon Lee." && d.querySelectorAll(".wrappedStage .wrappedRanked li").length === 2, "the actor slide is unchanged");
  key("ArrowRight");
  ok(storyLine() === "Some dramas hit different." && big() === "Drama 1" && /Of everything you've finished, this one hit hardest\./.test(text()) && d.querySelectorAll(".wrappedStage .wrappedRanked li").length === 3 && /2010 · your score 10/.test(text()) && d.querySelector(".wrappedBackdrop img")?.getAttribute("src") === "https://image.tmdb.org/t/p/original/drama1.jpg", "your #1 drama: " + text());
  key("ArrowRight");
  ok(storyLine() === "Some movies hit different." && big() === "Movie 1" && /hit hardest/.test(text()) && d.querySelectorAll(".wrappedStage .wrappedRanked li").length === 5 && d.querySelector(".wrappedBackdrop img")?.getAttribute("src") === "https://image.tmdb.org/t/p/original/movie1.jpg", "your #1 movie");
  key("ArrowRight"); key("ArrowRight");
  ok(storyLine() === "Your drama personality revealed." && big() === "The Thriller Addict" && /You live for the twist\. You trust no one/.test(text()) && !/\d/.test(d.querySelector(".wrappedStage .wrappedLine").textContent), "personality: " + text());
  for (let i = 0; i < 12; i++) key("ArrowLeft");
  ok(/Now here's the drama/.test(text()), "← goes back");
  for (let i = 0; i < 12; i++) key("ArrowRight");
  ok(/That's a wrap\. But the drama never ends\./.test(text()) && /Drama personality: The Thriller Addict/.test(text()) && /Top genre: Thriller/.test(text()) && /Most-watched actor: Moon Lee/.test(text()) && /@jaesan · so far/.test(text()) && !/all time/i.test(text()), "the summary card, all time");
  ok(d.querySelector(".wrappedHint").hidden, "no tap hint on the last slide");
  ok(![...d.querySelectorAll(".wrappedStage button")].some((b: any) => /Replay|Close/.test(b.textContent)), "no Replay or Close buttons, only the ×");
  (d.querySelector(".wrappedClose") as any).click();
  ok(!d.open, "× closes");
});

await test("slides without data are left out, and ratings only state supported facts", async () => {
  const {document, click} = mount({user: "jaesan", stats: sample({actors: [], genres: [{genre: "Drama", count: 9}], hero: null, decades: [{decade: "2000s", count: 79}]})});
  click("stats"); await tick(60);
  (document.querySelector(".statsWrappedButton") as any).click(); await tick();
  ok(slideKinds(document) === 9, "no actors, genres or era slide (one decade only): " + slideKinds(document));
  const d = story(document);
  const key = (k: string) => d.dispatchEvent(Object.assign(new (d.ownerDocument.defaultView as any).Event("keydown", {bubbles: true}), {key: k}));
  for (let i = 0; i < 6; i++) key("ArrowRight");
  await tick(1300);
  ok(story(document).querySelector(".wrappedStage .wrappedHeadline")?.textContent === "Your average score is 8.89.", "the average keeps two decimals: " + story(document).querySelector(".wrappedStage .wrappedHeadline")?.textContent);
  ok(/Out of everything you watched, you gave 34 titles a perfect 10!/.test(currentText(document)) && story(document).querySelectorAll(".wrappedStage .wrappedLine").length === 1 && !/Hong Kong|China|favorite/.test(currentText(document)), "rating facts, with no country line: " + currentText(document));
});

await test("a top country that isn't on the Asia map falls back to bars", async () => {
  const m = mount({user: "jaesan", stats: sample({countries: [{country: "United States", count: 9}, {country: "Japan", count: 3}]})});
  m.click("stats"); await tick(60);
  (m.document.querySelector(".statsWrappedButton") as any).click(); await tick();
  const d = story(m.document);
  for (let i = 0; i < 4; i++) d.dispatchEvent(Object.assign(new m.window.Event("keydown", {bubbles: true}), {key: "ArrowRight"}));
  ok(/Your passport to drama/.test(currentText(m.document)) && !d.querySelector(".wrappedStage .wrappedMap") && d.querySelectorAll(".wrappedStage .wrappedBar").length === 2, "bars, no map: " + currentText(m.document));
});

await test("someone with only movies (or only dramas) gets just their one #1 slide", async () => {
  const m = mount({user: "jaesan", stats: sample({topDramas: []})});
  m.click("stats"); await tick(60);
  (m.document.querySelector(".statsWrappedButton") as any).click(); await tick();
  ok(slideKinds(m.document) === 11, "no #1 drama slide: " + slideKinds(m.document));
  const d = story(m.document);
  for (let i = 0; i < 7; i++) d.dispatchEvent(Object.assign(new m.window.Event("keydown", {bubbles: true}), {key: "ArrowRight"}));
  ok(currentText(m.document).includes("Movie 1") && !d.textContent.includes("Drama 1"), "only the movie slide: " + currentText(m.document));
});

await test("a movie's lead actors fill the #1 subtitle", async () => {
  const stats = sample({topMovies: [1, 2].map(i => ({rank: i, slug: i + "-m", title: "Movie " + i, year: 2000, country: "Japan", type: "Movie", score: 10, poster: null, cast: i === 1 ? ["Star One", "Star Two"] : []})), topDramas: [{rank: 1, slug: "1-d", title: "Drama 1", year: 2010, country: "South Korea", type: "Drama", score: 10, poster: null, cast: ["Solo Star"]}]});
  const m = mount({user: "jaesan", stats});
  m.click("stats"); await tick(60);
  (m.document.querySelector(".statsWrappedButton") as any).click(); await tick();
  const d = story(m.document);
  for (let i = 0; i < 7; i++) d.dispatchEvent(Object.assign(new m.window.Event("keydown", {bubbles: true}), {key: "ArrowRight"}));
  ok(/this one with Solo Star hit hardest\./.test(currentText(m.document)), "one name: " + currentText(m.document));
  d.dispatchEvent(Object.assign(new m.window.Event("keydown", {bubbles: true}), {key: "ArrowRight"}));
  ok(/this one with Star One and Star Two hit hardest\./.test(currentText(m.document)), "two names: " + currentText(m.document));
});

await test("the last slide offers Share and Save image, and says so when the card can't be made", async () => {
  const m = mount({user: "jaesan"});
  m.click("stats"); await tick(60);
  (m.document.querySelector(".statsWrappedButton") as any).click(); await tick();
  const d = story(m.document);
  for (let i = 0; i < 15; i++) d.dispatchEvent(Object.assign(new m.window.Event("keydown", {bubbles: true}), {key: "ArrowRight"}));
  const buttons = [...d.querySelectorAll(".wrappedStage button")].map((b: any) => b.textContent);
  ok(buttons.join("|") === "Share|Save image", "buttons: " + buttons);
  (d.querySelector(".wrappedStage button") as any).click(); await tick();
  ok(/couldn't be made|Making your card|Saved/.test(d.querySelector(".wrappedShareNote").textContent), "a status line, never a silent failure: " + d.querySelector(".wrappedShareNote").textContent);
  ok(slideKinds(m.document) === 12 && /That's a wrap/.test(currentText(m.document)), "tapping a button doesn't change slides");
});

await test("the soundtrack starts from the tap that opens Wrapped, mutes and remembers it, and stops on close", async () => {
  const played: string[] = [];
  (globalThis as any).Audio = class { volume = 1; loop = false; src: string; constructor(src: string) { this.src = src; played.push("new " + src); } addEventListener() {} play() { played.push("play"); return Promise.resolve(); } pause() { played.push("pause"); } };
  try {
    const m = mount({user: "jaesan"});
    m.click("stats"); await tick(60);
    (m.document.querySelector(".statsWrappedButton") as any).click(); await tick();
    const d = story(m.document);
    ok(played.join() === "new /assets/wrapped-music-v2-1.mp3,play", "starts the track on open: " + played);
    const sound = d.querySelector(".wrappedSound") as any;
    ok(sound.getAttribute("aria-label") === "Turn the music off", "a mute button");
    sound.click();
    ok(sound.getAttribute("aria-label") === "Turn the music on" && m.saved.get("ydl-wrapped-muted") === "1", "mute is remembered");
    await tick(700);
    ok(played.includes("pause"), "muting stops the track");
    (d.querySelector(".wrappedClose") as any).click(); await tick(700);
    ok(played.filter(x => x === "play").length === 1, "closing while muted plays nothing");
  } finally { delete (globalThis as any).Audio; }
});

await test("four soundtrack tracks take turns: each page load plays the next one, round and round", async () => {
  const played: string[] = [];
  (globalThis as any).Audio = class { volume = 1; loop = false; constructor(src: string) { played.push(src); } addEventListener() {} play() { return Promise.resolve(); } pause() {} };
  try {
    const first = async (last: string | null) => {
      played.length = 0;
      const m = mount({user: "jaesan", saved: last === null ? [] : [["ydl-wrapped-track", last]]});
      m.click("stats"); await tick(60);
      (m.document.querySelector(".statsWrappedButton") as any).click(); await tick();
      (story(m.document).querySelector(".wrappedClose") as any).click(); await tick(700);
      return played[0].replace("/assets/wrapped-music-v2-", "").replace(".mp3", "");
    };
    ok(await first(null) === "1", "a new device starts on track 1");
    ok(await first("0") === "2" && await first("1") === "3" && await first("2") === "4", "then the next one each time");
    ok(await first("3") === "1", "after track 4, back to 1");
  } finally { delete (globalThis as any).Audio; }
});

await test("the music file is served with Range support, and 404 when it isn't stored", async () => {
  const {serveWrappedMusic} = await import("./wrappedMusic.ts");
  const bytes = Uint8Array.from({length: 100}, (_, i) => i);
  const whole = await serveWrappedMusic(new Request("https://t/x"), bytes);
  ok(whole.status === 200 && whole.headers.get("content-type") === "audio/mpeg" && whole.headers.get("accept-ranges") === "bytes" && (await whole.arrayBuffer()).byteLength === 100, "whole file");
  const part = await serveWrappedMusic(new Request("https://t/x", {headers: {range: "bytes=10-19"}}), bytes);
  ok(part.status === 206 && part.headers.get("content-range") === "bytes 10-19/100" && (await part.arrayBuffer()).byteLength === 10, "a range");
  const tail = await serveWrappedMusic(new Request("https://t/x", {headers: {range: "bytes=90-"}}), bytes);
  ok(tail.status === 206 && tail.headers.get("content-range") === "bytes 90-99/100", "an open-ended range");
  ok((await serveWrappedMusic(new Request("https://t/x", {headers: {range: "bytes=500-"}}), bytes)).status === 416, "out of range");
  ok((await serveWrappedMusic(new Request("https://t/x"), null)).status === 404, "missing file");
  ok((await handler(new Request("https://test/assets/wrapped-music-v2-1.mp3"))).status === 404, "the route exists and says 404 without a stored file");
});

await test("the Wrapped pop-up: shows once when a username is newly connected, Let's go opens Stats, and it never nags after that", async () => {
  // The test DOM shares one window between mounts, so each case mounts, checks, and is done before the next.
  const banner = (m: any) => m.document.querySelector(".wrappedBanner") as any;
  const lists = async (m: any) => { (m.document.querySelector('[data-list-tab="profiles"]') as any).click(); await tick(); };
  // A login: the Connect page, a username typed in, the form sent.
  const login = async (m: any, name = "jaesan") => {
    m.click("connect"); await tick();
    m.document.getElementById("source").value = name;
    m.document.getElementById("connectForm").onsubmit({preventDefault() {}});
    await tick(100);
  };
  const mounted = async (options: any = {}) => { const m = mount(options); await tick(100); return m; };

  const fresh = await mounted();
  ok(banner(fresh).hidden && banner(fresh).parentElement === fresh.document.body, "nobody connected: no pop-up, and it floats over the page");
  await login(fresh);
  ok(!banner(fresh).hidden, "it pops up right after logging in, without waiting for any numbers");
  ok(banner(fresh).querySelector("h2").textContent === "Your Drama Wrapped"
    && /Jump into your years of drama from the beginning to 2026\./.test(banner(fresh).textContent)
    && banner(fresh).querySelector("button.wrappedBannerGo").textContent === "Let's go", "the wording");
  banner(fresh).querySelector(".wrappedBannerGo").click(); await tick(60);
  ok(banner(fresh).hidden && !!fresh.document.querySelector(".statsWrappedButton"), "Let's go opens the Stats page and the pop-up goes");
  await lists(fresh);
  ok(banner(fresh).hidden, "it does not come back on Lists");
  await login(fresh);
  ok(banner(fresh).hidden, "looking up the same username again is not a new login");
  await login(fresh, "someoneelse");
  ok(!banner(fresh).hidden, "a different username is a new login: it shows once more");
  banner(fresh).querySelector(".wrappedBannerClose").click();
  ok(banner(fresh).hidden, "× closes it");
  fresh.click("stats"); await tick(60); await lists(fresh);
  ok(banner(fresh).hidden, "and it stays closed");

  const away = await mounted();
  await login(away);
  away.click("stats"); await tick(60); await lists(away);
  ok(banner(away).hidden, "moving on without tapping anything uses it up");

  const returning = await mounted({user: "jaesan"});
  await lists(returning);
  ok(banner(returning).hidden, "a saved username on a page reload is not a login: no pop-up");

  const empty = await mounted({stats: sample({statusCounts: {watching: 0, completed: 0, planToWatch: 0, onHold: 0, dropped: 0}})});
  await login(empty); await tick(60);
  ok(banner(empty).hidden, "nothing completed: nothing to show");
});
await test("drama personalities follow fixed rules, first match wins, and everyone gets one", async () => {
  const personality = async (stats: any) => {
    const m = mount({user: "u", stats});
    m.click("stats"); await tick(60);
    (m.document.querySelector(".statsWrappedButton") as any).click(); await tick();
    const d = story(m.document);
    for (let i = 0; i < 15; i++) d.dispatchEvent(Object.assign(new m.window.Event("keydown", {bubbles: true}), {key: "ArrowRight"}));
    const line = [...d.querySelectorAll(".wrappedCardLines li")].map((li: any) => li.textContent).find((t: string) => t.startsWith("Drama personality: "));
    return line?.slice("Drama personality: ".length);
  };
  const g = (...list: [string, number][]) => list.map(([genre, count]) => ({genre, count}));
  const base = {statusCounts: {watching: 0, completed: 40, planToWatch: 0, onHold: 0, dropped: 0}, viewingTime: {hours: 50, days: 2.1}};
  ok(await personality(sample({...base, genres: g(["Drama", 30], ["Romance", 20], ["Thriller", 5])})) === "The Hopeless Romantic", "Romance leads (Drama is left out)");
  ok(await personality(sample({...base, genres: g(["Mystery", 15], ["Romance", 10])})) === "The Thriller Addict", "Mystery leads");
  ok(await personality(sample({...base, genres: g(["Comedy", 9], ["Family", 8], ["Fantasy", 7], ["History", 6], ["Action", 5], ["Music", 4])})) === "The Genre Hopper", "six genres, none in 25% or more");
  ok(await personality(sample({...base, viewingTime: {hours: 400, days: 16.7}, genres: g(["Comedy", 20])})) === "The Drama Marathoner", "400 hours, no genre rule fits");
  ok(await personality(sample({...base, genres: g(["Comedy", 20])})) === "The Drama Fan", "nothing fits: The Drama Fan");
  ok(await personality(sample({...base, viewingTime: {hours: 400, days: 16.7}, genres: g(["Romance", 20])})) === "The Hopeless Romantic", "a genre rule comes before hours");
});
console.log(JSON.stringify({passed}));
