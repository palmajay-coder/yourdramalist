import {load, type Cheerio, type CheerioAPI} from "npm:cheerio@1.0.0";
import type {AnyNode} from "npm:domhandler@5.0.3";
import {nextPacificMidnight} from "./pacificTime.ts";

const origin = "https://mydramalist.com";
const clean = (value: string) => value.replace(/\s+/g, " ").trim();

function listId(href: string) {
  try {
    const url = new URL(href, origin);
    if (url.origin !== origin || url.username || url.password) return "";
    const id = url.pathname.match(/^\/list\/([A-Za-z0-9]{4,20})\/?$/)?.[1] || "";
    return id !== "create" ? id : "";
  } catch { return ""; }
}

function posters($: CheerioAPI, box: Cheerio<AnyNode>) {
  const images = new Set<string>();
  for (const node of box.find("img").toArray()) {
    try {
      const img = $(node);
      const url = new URL(img.attr("data-src") || img.attr("src") || "", origin);
      if (url.origin === "https://i.mydramalist.com" && !url.username && !url.password) images.add(url.href);
    } catch { /* Ignore invalid poster links. */ }
    if (images.size === 5) break;
  }
  return [...images];
}

export function extractFeatured(html: string) {
  return featuredCard(load(html));
}

function featuredCard($: CheerioAPI) {
  const box = $(".featured-list").first();
  const id = box.find("a[href]").toArray().map(a => listId($(a).attr("href")!)).find(Boolean);
  const title = clean(box.find(".list-title").first().text());
  if (!id || !title) throw Error("Featured list is unavailable.");
  return {id, url: origin + "/list/" + id, title, label: clean(box.find(".list-type").first().text()),
    description: clean(box.find(".list-desc").first().text()), images: posters($, box)};
}

type Card = ReturnType<typeof featuredCard>;
const sections = [
  {key: "recent", heading: /^Recent(?:ly)? Activity Lists$/i, label: "Recent Activity"},
  {key: "trending", heading: /^Trending Lists$/i, label: "Trending"},
] as const;

function extractBanners(html: string, previous: Record<string, {lineup: string; card: Card}> = {}, random = Math.random) {
  const $ = load(html);
  const featured = featuredCard($);
  const picks: typeof previous = {};
  const used = new Set([featured.id]);
  for (const section of sections) {
    const header = $(".box-header").filter((_, node) => section.heading.test(clean($(node).find("h2").text()))).first();
    const candidates = new Map<string, Card>();
    for (const node of header.next(".box-body").find(".custom-list-preview").toArray()) {
      const box = $(node);
      if (!box.find(".content.titles").length) continue;
      const link = box.find(".title a[href], a.title-primary[href]").first();
      const id = listId(link.attr("href") || "");
      const title = clean(link.text());
      const images = posters($, box.find(".content.titles").first());
      if (id && title && images.length) candidates.set(id, {id, title, label: section.label,
        url: origin + "/list/" + id, description: "", images});
    }
    const lineup = [...candidates.keys()].sort().join(",");
    const old = previous[section.key];
    const eligible = [...candidates.values()].filter(card => !used.has(card.id));
    let card = old?.lineup === lineup && !used.has(old.card.id) ? candidates.get(old.card.id) : undefined;
    if (!card && eligible.length) {
      const fresh = eligible.filter(item => item.id !== old?.card.id);
      const pool = fresh.length ? fresh : eligible;
      card = pool[Math.floor(random() * pool.length)];
    }
    if (!card && !header.length && old && !used.has(old.card.id)) card = old.card;
    if (card) {
      picks[section.key] = {lineup, card};
      used.add(card.id);
    }
  }
  return {featured, picks, slides: [featured, ...Object.values(picks).map(pick => pick.card)]};
}

export type FeaturedBannerData = ReturnType<typeof extractBanners>;

export function createFeaturedService(
  storage?: {load: () => Promise<any>; save: (value: any) => Promise<any>},
  fetcher: typeof fetch = fetch, now = Date.now, random = Math.random,
  enrich: (data: FeaturedBannerData) => Promise<FeaturedBannerData> = async data => data,
) {
  let entry: any = null;
  let ready: Promise<void> | undefined;
  let pending: Promise<any> | undefined;
  async function bounded<T>(promise: Promise<T>) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([promise, new Promise<undefined>(resolve => {
        timer = setTimeout(() => resolve(undefined), 1000);
      })]);
    } finally { clearTimeout(timer); }
  }
  function result(status: string) {
    return {featured: entry?.data ?? null, slides: entry?.slides ?? (entry?.data ? [entry.data] : []),
      nextRefresh: new Date(entry.expires).toISOString(), status};
  }
  return async () => {
    ready ??= (async () => {
      try { entry = storage ? await bounded(storage.load()) : null; } catch { /* Use memory cache. */ }
    })();
    await ready;
    if (entry?.slides && entry.expires > now()) return result(entry.error ? (entry.data ? "stale" : "unavailable") : "cached");
    if (pending) return pending;
    pending = (async () => {
      if (storage) {
        try {
          const shared = await bounded(storage.load());
          if (shared?.slides && shared.expires > now()) {
            entry = shared;
            return result(entry.error ? (entry.data ? "stale" : "unavailable") : "cached");
          }
        } catch { /* Use memory cache. */ }
      }
      const old = entry;
      const expires = nextPacificMidnight(now());
      try {
        const response = await fetcher(origin + "/list", {redirect: "error", signal: AbortSignal.timeout(8000), headers: {Accept: "text/html"}});
        if (!response.ok || !response.headers.get("content-type")?.includes("text/html") ||
            response.headers.get("cf-mitigated") === "challenge" || !response.body) {
          await response.body?.cancel();
          throw Error("MyDramaList unavailable.");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let html = "", size = 0;
        try {
          while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 3000000) throw Error("Page too large.");
            html += decoder.decode(value, {stream: true});
          }
          html += decoder.decode();
        } finally { await reader.cancel().catch(() => {}); }
        if (/cf-chl-|Just a moment|\/cdn-cgi\/challenge-platform/i.test(html)) throw Error("MDL access restricted.");
        let data = extractBanners(html, old?.picks, random);
        try { data = await enrich(data); } catch { /* Keep the original MyDramaList banner art. */ }
        entry = {data: data.featured, slides: data.slides, picks: data.picks, at: now(), expires};
      } catch {
        entry = {data: old?.data ?? null, slides: old?.slides ?? (old?.data ? [old.data] : []),
          picks: old?.picks, at: old?.at, expires, error: true};
      }
      if (storage) await bounded(storage.save(entry)).catch(() => {});
      return result(entry.error ? (entry.data ? "stale" : "unavailable") : "live");
    })().finally(() => { pending = undefined; });
    return pending;
  };
}
