import {loadPreferences, normalizePreferences, preferenceIssue, savePreferences, pageForPath} from "./preferences.ts";
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
await test("preview blocks cross-origin requests and oversized bodies before upstream", async () => {
  let calls = 0; const handler = createPreviewHandler((() => {calls++; throw Error("unexpected");}) as typeof fetch);
  assert((await handler(request({...sampleKeys, ratings: ["imdb"]}, "https://other"))).status === 403, "cross origin");
  assert([400,413].includes((await handler(request({padding: "x".repeat(3000)}))).status), "oversized body");
  assert(calls === 0, "called upstream");
});
await test("ERDB preview preserves original layout parameters without response credentials", async () => {
  let called = ""; const handler = createPreviewHandler((async (url: string | URL) => {called = String(url); return new Response(new Uint8Array([255,216,255,217]), {headers: {"content-type": "image/jpeg"}});}) as typeof fetch);
  const r = await handler(request({...sampleKeys, ratings: ["imdb", "letterboxd"]}));
  const url = new URL(called);
  assert(r.status === 200 && r.headers.get("cache-control") === "no-store", "image/cache");
  assert(url.hostname === "dmaxg-dynrat.hf.space" && url.pathname === "/poster/tt6751668.jpg", "unexpected target");
  assert(url.searchParams.get("ratings") === "letterboxd,imdb" && url.searchParams.get("posterRatingsLayout") === "bottom" && url.searchParams.get("posterStreamBadges") === "off", "ERDB parameters");
  assert(!JSON.stringify([...r.headers]).includes(sampleKeys.tmdb), "response leak");
});
await test("preview rejects upstream HTML and hides upstream error details", async () => {
  const handler = createPreviewHandler((async () => new Response("<html>not an image</html>")) as typeof fetch);
  const r = await handler(request({...sampleKeys, ratings: ["imdb"]}));
  assert(r.status === 502 && await r.text() === '{"code":"upstream"}', "upstream content leak");
});
await test("preview limits concurrent upstream requests", async () => {
  const resolve: (() => void)[] = []; let calls = 0;
  const handler = createPreviewHandler((async () => {calls++; await new Promise<void>(r => resolve.push(r)); return new Response(new Uint8Array([255,216,255,217]));}) as typeof fetch);
  const a = handler(request({...sampleKeys, ratings: ["imdb"]})), b = handler(request({...sampleKeys, ratings: ["imdb"]}));
  while(calls < 2) await new Promise(r => setTimeout(r, 1));
  assert((await handler(request({...sampleKeys, ratings: ["imdb"]}))).status === 429, "concurrency exceeded");
  resolve.forEach(r => r()); await Promise.all([a, b]);
});

const {document, window} = parseHTML('<html><body><section id="preferences"></section><section id="confirm"></section></body></html>');
Object.assign(globalThis, {document});
Object.defineProperty(globalThis,"localStorage",{value:{getItem:()=>null,setItem:()=>{}},writable:true,configurable:true});
let page = "", user = ""; const ui = installPreferencesUI({navigate: p => page = p, selection: () => [{name: "Sample user's list"}], user: () => user});
const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const chooseArtwork = (value: string) => {
  const select = document.getElementById("prefArtwork") as HTMLSelectElement;
  Object.defineProperty(select, "value", {value, configurable:true});
  select.dispatchEvent(new window.Event("change"));
};
const change = (input: HTMLInputElement, checked: boolean) => {input.checked = checked; input.dispatchEvent(new window.Event("change"));};
await test("review preview follows its switch", () => {
  assert($("prefReviewPreview").hidden, "reviews default on"); change($("prefReviews"), true);
  assert(!$("prefReviewPreview").hidden, "preview missing");
});
await test("poster options and individual badges follow switches", () => {
  chooseArtwork("ratings"); assert(!$("prefPosterOptions").hidden, "poster options missing");
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
  chooseArtwork("better");
  const next = document.querySelector(".prefActions button") as HTMLButtonElement;
  page = "";
  next.click();
  assert(page === "" && document.querySelector('[role="alert"]')?.textContent === TEXT.posterBetterInvalid, "missing URL accepted");
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
    assert(!payload.keys.tmdb && !payload.keys.mdblist, "rating keys sent");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
console.log(JSON.stringify({passed}));
