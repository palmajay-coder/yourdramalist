import {loadPreferences, normalizePreferences, preferenceIssue, savePreferences, pageForPath, posterPlusPattern, posterPlusImageUrl} from "./preferences.ts";
import {parsePreviewInput, createPreviewHandler} from "./preferencesPreview.ts";
import {installPreferencesUI} from "./preferencesClient.ts";
import {TEXT} from "./text.ts";
import {parseHTML} from "npm:linkedom@0.18.12";
let passed = 0;
function assert(v: unknown, message: string) {if(!v) throw Error(message);}
async function test(name: string, fn: () => unknown) {await fn(); passed++; console.log("PASS " + name);}
const sampleKeys = {tmdb: "a".repeat(32), mdblist: "test-preview-not-real"};
await test("settings whitelist never serializes keys", () => {
  let saved = ""; savePreferences({setItem: (_, value) => saved = value}, {...sampleKeys, apiKey: "private", reviews: true, ratings: ["imdb", "imdb", "injected"]});
  assert(!saved.includes("private") && !saved.includes(sampleKeys.tmdb) && !saved.includes("mdblist"), "credential leak");
  assert(JSON.parse(saved).ratings.join() === "imdb" && JSON.parse(saved).reviews, "normalization");
});
await test("old or corrupt saved settings safely default off", () => {
  const p = loadPreferences({getItem: () => "broken json"});
  assert(!p.reviews && !p.posters && p.ratings.length === 3 && !p.hideCompleted, "default mismatch");
  assert(!normalizePreferences({reviews: "true"}).reviews, "truthy value accepted");
});
await test("optional keys gate only enabled poster ratings", () => {
  const p = normalizePreferences(null);
  assert(preferenceIssue(p, {tmdb: "", mdblist: ""}) === null, "optional keys blocked");
  p.posters = true; assert(preferenceIssue(p, {tmdb: "", mdblist: ""}) === "keys", "missing keys accepted");
  assert(preferenceIssue(p, sampleKeys) === null, "valid key shapes rejected");
  p.ratings = []; assert(preferenceIssue(p, sampleKeys) === "ratings", "empty badge set accepted");
});
await test("setup deep links select the correct step", () => {
  assert(pageForPath("/setup/preferences") === "preferences" && pageForPath("/setup/confirm") === "confirm" && pageForPath("/setup/lists") === "selection", "deep links");
});
const request = (body: unknown, origin = "https://test") => new Request("https://test/api/preferences/poster-preview", {method: "POST", headers: {origin, "content-type": "application/json"}, body: JSON.stringify(body)});
await test("preview rejects unknown rating sources and invalid credentials", () => {
  assert(!parsePreviewInput({...sampleKeys, ratings: ["imdb", "arbitrary"]}), "unsafe source");
  assert(!parsePreviewInput({tmdb: "", mdblist: "", ratings: ["imdb"]}), "empty keys");
});
await test("poster verification errors return a diagnosis code and record only provider/category", async () => {
  const events: string[] = [];
  const handler = createPreviewHandler(fetch, Date.now, async (_metric, category) => {events.push(category);});
  const response = await handler(request({provider:"posterplus",pattern:"not-a-valid-pattern"}));
  const data = await response.json();
  assert(response.status === 400 && /^YDL-[A-F0-9]{8}$/.test(data.diagnosticCode), "diagnosis code missing");
  assert(events.join() === "posterplus:invalid-settings", "analytics included wrong event data");
  const offline = await handler(request({provider:"posterplus",clientFailure:"network"}));
  const offlineData = await offline.json();
  assert(offline.status === 502 && /^YDL-[A-F0-9]{8}$/.test(offlineData.diagnosticCode), "network diagnosis code missing");
  assert(events.join(",") === "posterplus:invalid-settings,posterplus:client-network", "network failure was not counted by provider/category");
});
await test("preview blocks cross-origin requests and oversized bodies before upstream", async () => {
  let calls = 0; const handler = createPreviewHandler((() => {calls++; throw Error("unexpected");}) as typeof fetch);
  assert((await handler(request({provider:"ratings",...sampleKeys, ratings: ["imdb"]}, "https://other"))).status === 403, "cross origin");
  assert([400,413].includes((await handler(request({padding: "x".repeat(3000)}))).status), "oversized body");
  assert(calls === 0, "called upstream");
});
await test("ERDB preview preserves original layout parameters without response credentials", async () => {
  let called = ""; const handler = createPreviewHandler((async (url: string | URL) => {called = String(url); return new Response(new Uint8Array([255,216,255,217]), {headers: {"content-type": "image/jpeg"}});}) as typeof fetch);
  const r = await handler(request({provider:"ratings",...sampleKeys, ratings: ["imdb", "letterboxd"]}));
  const url = new URL(called);
  assert(r.status === 200 && r.headers.get("cache-control") === "no-store", "image/cache");
  assert(url.hostname === "dmaxg-dynrat.hf.space" && url.pathname === "/poster/tt6751668", "unexpected target");
  assert(url.searchParams.get("ratings") === "letterboxd,imdb" && url.searchParams.get("posterRatingsLayout") === "bottom" && url.searchParams.get("posterStreamBadges") === "off", "ERDB parameters");
  assert(!JSON.stringify([...r.headers]).includes(sampleKeys.tmdb), "response leak");
});
await test("preview rejects upstream HTML and hides upstream error details", async () => {
  const handler = createPreviewHandler((async () => new Response("<html>not an image</html>")) as typeof fetch);
  const r = await handler(request({provider:"ratings",...sampleKeys, ratings: ["imdb"]}));
  assert(r.status === 424 && (await r.json()).code === "not-an-image", "upstream image validation");
});
await test("preview limits concurrent upstream requests", async () => {
  const resolve: (() => void)[] = []; let calls = 0;
  const handler = createPreviewHandler((async () => {calls++; await new Promise<void>(r => resolve.push(r)); return new Response(new Uint8Array([255,216,255,217]));}) as typeof fetch);
  const a = handler(request({provider:"ratings",...sampleKeys, ratings: ["imdb"]})), b = handler(request({provider:"ratings",...sampleKeys, ratings: ["imdb"]}));
  while(calls < 2) await new Promise(r => setTimeout(r, 1));
  assert((await handler(request({provider:"ratings",...sampleKeys, ratings: ["imdb"]}))).status === 429, "concurrency exceeded");
  resolve.forEach(r => r()); await Promise.all([a, b]);
});
await test("Poster+ accepts arbitrary configurator options and preserves them in rendered URLs", () => {
  const pattern = "https://postersplus.stremio.ru/poster?tmdb_id={tmdb_id?}&imdb_id={imdb_id?}&stremio_id={id}&type={type}&shape={shape}&tmdb_key=test-secret&hy=1&hr=1&tx=1&_hg=0&_hy=0&ll=pt&lf=jakarta&hy=0";
  assert(posterPlusPattern(pattern) === pattern, "configured Poster+ options were rejected");
  assert(parsePreviewInput({provider:"posterplus",pattern}) !== null, "custom pattern blocked from verification");
  const rendered = new URL(posterPlusImageUrl(pattern, {id:"tt1234567",type:"movie",posterShape:"poster"}));
  assert(rendered.searchParams.get("tmdb_key") === "test-secret", "provider key was dropped");
  assert(rendered.searchParams.getAll("hy").join(",") === "1,0", "duplicate or custom option was dropped");
  assert(rendered.searchParams.get("_hg") === "0" && rendered.searchParams.get("ll") === "pt" && rendered.searchParams.get("lf") === "jakarta", "custom options were changed");
  assert(!rendered.searchParams.has("tmdb_id") && rendered.searchParams.get("imdb_id") === "tt1234567" && rendered.searchParams.get("stremio_id") === "tt1234567", "optional identifiers rendered incorrectly");
  assert(rendered.searchParams.get("type") === "movie" && rendered.searchParams.get("shape") === "poster", "required placeholders were not substituted");
  const longPattern = pattern + "&custom_option=" + "x".repeat(1300);
  assert(longPattern.length > 1200 && !!posterPlusPattern(longPattern), "long custom Poster+ URL was rejected");
  assert(!posterPlusPattern(pattern.replace("&shape={shape}", "")), "missing shape placeholder accepted");
  assert(!posterPlusPattern(pattern.replace("postersplus.stremio.ru", "example.com")), "untrusted Poster+ host accepted");
});

const {document, window} = parseHTML('<html><body><section id="preferences"></section><section id="confirm"></section></body></html>');
Object.assign(globalThis, {document});
// linkedom exposes select.value as read-only; browsers provide a setter.
Object.defineProperty(window.HTMLSelectElement.prototype, "value", {configurable:true, get(){return this.getAttribute("data-test-value") || "";}, set(value:string){this.setAttribute("data-test-value", String(value));}});
// EasyPosters ("ratings") is only offered to setups that already use it, so start from such a saved setup.
Object.defineProperty(globalThis,"localStorage",{value:{getItem:(k:string)=>k==="ydl-v3-preferences"?JSON.stringify({posters:true}):null,setItem:()=>{}},writable:true,configurable:true});
let page = "", user = ""; const ui = installPreferencesUI({navigate: p => page = p, selection: () => [{name: "Sample user's list"}], user: () => user});
const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const chooseArtwork = (value: string) => {
  const choice = document.querySelector<HTMLInputElement>(`#prefPosterStyle input[value="${value}"]`)!;
  choice.checked = true;
  choice.dispatchEvent(new window.Event("change"));
};
const change = (input: HTMLInputElement, checked: boolean) => {input.checked = checked; input.dispatchEvent(new window.Event("change"));};
await test("review preview follows its switch", () => {
  assert($("prefReviewPreview").hidden, "reviews default on"); change($("prefReviews"), true);
  assert(!$("prefReviewPreview").hidden, "preview missing");
});
await test("poster options and individual badges follow switches", () => {
  chooseArtwork("ratings"); assert(!$("prefRatingsPanel").hidden, "poster options missing");
  const checkbox = document.querySelector('[data-rating="tomatoes"]') as HTMLInputElement;
  change(checkbox, false); assert((document.querySelector('[data-badge="tomatoes"]') as HTMLElement).hidden, "badge remains visible");
  assert(!(document.querySelector('[data-badge="imdb"]') as HTMLElement).hidden, "other badge hidden");
  change(checkbox, true); assert(!(document.querySelector('[data-badge="tomatoes"]') as HTMLElement).hidden, "badge didn't return");
});
await test("key Show/Hide controls do not change the key value", () => {
  const input = $("prefTmdb"); input.value = sampleKeys.tmdb;
  const button = document.querySelector('[aria-controls="prefTmdb"]') as HTMLButtonElement;
  button.click(); assert(input.type === "text" && input.value === sampleKeys.tmdb, "show");
  button.click(); assert(input.type === "password", "hide");
});
await test("completed filter is available only for a connected username", () => {
  assert($("prefCompleted").disabled, "filter enabled without account"); user = "TestUser"; ui.show("preferences");
  assert(!$("prefCompleted").disabled, "filter disabled with account");
});
await test("Continue validates enabled posters and permits skipping keys", () => {
  const next = document.querySelector(".prefActions button") as HTMLButtonElement;
  next.click(); assert(page === "" && document.querySelector('[role="alert"]')?.textContent === TEXT.preferencesKeysRequired, "missing key not caught");
  chooseArtwork("standard"); next.click(); assert(page === "confirm", "optional keys required");
});
await test("Confirm summarizes lists and choices without credentials", () => {
  ui.show("confirm"); const summary = document.getElementById("confirm")!;
  assert(summary.textContent?.includes("Sample user's list") && summary.textContent.includes(TEXT.reviewsTitle), "summary missing");
  assert(!summary.textContent?.includes(sampleKeys.tmdb), "summary key leak");
});
await test("Confirm shows the server diagnostic code and a separate connection error", async () => {
  const originalFetch = globalThis.fetch;
  const status = () => document.querySelector("#confirm [role=status]")?.textContent;
  try {
    globalThis.fetch = async () => Response.json({diagnosticCode: "YDL-A1B2C3D4"}, {status: 400});
    ui.show("confirm");
    await new Promise(resolve => setTimeout(resolve, 0));
    assert(status()?.includes("YDL-A1B2C3D4"), "server diagnostic was not displayed");
    globalThis.fetch = async () => {throw Error("offline");};
    ui.show("confirm");
    await new Promise(resolve => setTimeout(resolve, 0));
    assert(status() === TEXT.manifestConnectionFailed, "connection failure was not identified");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
await test("BetterPosters validates its URL and sends it without rating keys", async () => {
  const metadataMdl=document.querySelector('.prefMetadataChoices input[value="mdl"]') as HTMLInputElement;
  const metadataTmdb=document.querySelector('.prefMetadataChoices input[value="tmdb"]') as HTMLInputElement;
  assert(metadataMdl.checked,"MyDramaList is the default metadata provider");
  metadataTmdb.checked=true; metadataTmdb.dispatchEvent(new window.Event("change"));
  chooseArtwork("better");
  const next = document.querySelector(".prefActions button") as HTMLButtonElement;
  page = "";
  next.click();
  assert(page !== "confirm", "missing BetterPosters URL was accepted");
  page = "";
  $("prefBetterPosters").value = "https://btttr.cc/poster/imdb/poster-default/{imdb_id}.jpg";
  next.click();
  assert(page === "confirm", "valid URL did not advance");
  const originalFetch = globalThis.fetch;
  try {
    let payload: any;
    globalThis.fetch = async (_url, options) => {payload = JSON.parse(String(options?.body)); return Response.json({}, {status:400});};
    ui.show("confirm");
    await new Promise(resolve => setTimeout(resolve, 0));
    assert(payload.betterPosters === $("prefBetterPosters").value && !payload.preferences.posters, "poster preference missing");
    assert(payload.preferences.metadataProvider==="tmdb" && !payload.keys.tmdb && !payload.keys.mdblist, "metadata provider requires no user keys");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
console.log(JSON.stringify({passed}));
