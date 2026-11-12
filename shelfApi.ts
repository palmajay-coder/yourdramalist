import {loadWatchlist, loadWatchlistCategory, WATCHLIST_CARDS, X} from "./addonScrape.ts";
import {getTitleFacts, type FactsInput} from "./titleFacts.ts";

/** Titles for one Community or drama-related list, shown as a shelf on the setup page. */
export type ShelfItem = {slug: string; title: string; url: string; poster: string | null; year: number | null; type: string | null; country: string; added?: number};
const MAX_ITEMS = 1000;

/** Accepts MyDramaList list and watchlist links only. */
export function shelfSource(raw: string): {kind: "list"; id: string} | {kind: "watchlist"; user: string; status?: string} | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:" || !["mydramalist.com", "www.mydramalist.com"].includes(u.hostname) || u.username || u.password || u.port) return null;
  const list = u.pathname.match(/^\/list\/([A-Za-z0-9]{4,20})\/?$/);
  if (list) return {kind: "list", id: list[1]};
  const watch = u.pathname.match(/^\/dramalist\/([a-zA-Z0-9_-]{1,60})(?:\/([a-z_]+))?\/?$/);
  if (!watch) return null;
  if (watch[2] && !WATCHLIST_CARDS.some(([key]) => key === watch[2])) return null;
  return {kind: "watchlist", user: watch[1].toLowerCase(), ...(watch[2] ? {status: watch[2]} : {})};
}

export function toShelfItem(item: any): ShelfItem | null {
  const slug = String(item?.slug || "");
  if (!/^\d+-[a-z0-9-]+$/i.test(slug)) return null;
  const poster = typeof item.image === "string" && /^https:\/\/i\.mydramalist\.com\//.test(item.image) ? item.image : null;
  return {slug, title: String(item.title || "").slice(0, 300), url: "https://mydramalist.com/" + slug, poster, year: Number(item.year) || null, type: item.type ? String(item.type).slice(0, 60) : null, country: item.country ? String(item.country).slice(0, 8) : "", ...(Number(item.added) > 0 ? {added: Number(item.added)} : {})};
}

export async function loadShelfItems(source: NonNullable<ReturnType<typeof shelfSource>>, deps = {list: X, watchlist: loadWatchlist, category: loadWatchlistCategory}): Promise<any[]> {
  if (source.kind === "list") return (await deps.list(source.id)).items || [];
  if (source.status) return await deps.category(source.user, source.status);
  const sections = await deps.watchlist(source.user), seen = new Set<string>();
  return Object.values(sections).flat().filter((item: any) => item?.slug && !seen.has(item.slug) && seen.add(item.slug));
}

export function createShelfHandler(deps = {load: loadShelfItems, facts: getTitleFacts}, now = Date.now) {
  let windowAt = now(), count = 0;
  const headers = {"cache-control": "no-store", "x-content-type-options": "nosniff"};
  const limited = () => { if (now() - windowAt > 60000) { windowAt = now(); count = 0; } return ++count > 120; };
  return async function (req: Request): Promise<Response> {
    const u = new URL(req.url);
    if (u.pathname === "/api/mdl/shelf") {
      if (req.method !== "GET") return Response.json({error: "Method not allowed"}, {status: 405, headers});
      const source = shelfSource(u.searchParams.get("url") || "");
      if (!source) return Response.json({error: "Enter a MyDramaList list or watchlist link."}, {status: 400, headers});
      if (limited()) return Response.json({error: "Too many requests. Please wait a moment."}, {status: 429, headers});
      try {
        const raw = await deps.load(source);
        const items = raw.map(toShelfItem).filter(Boolean) as ShelfItem[];
        const limit = u.searchParams.get("preview") === "1" ? 3 : MAX_ITEMS;
        return Response.json({items: items.slice(0, limit), total: items.length}, {headers});
      } catch (error) {
        if ((error as {code?: string})?.code === "PRIVATE") return Response.json({error: "This list is private or unavailable."}, {status: 404, headers});
        return Response.json({error: "MyDramaList is temporarily unavailable."}, {status: 502, headers});
      }
    }
    if (u.pathname === "/api/mdl/title-facts") {
      if (req.method !== "POST") return Response.json({error: "Method not allowed"}, {status: 405, headers});
      if (req.headers.get("origin") !== u.origin) return Response.json({error: "Origin check failed"}, {status: 403, headers});
      if (Number(req.headers.get("content-length") || 0) > 20000) return Response.json({error: "Request is too large"}, {status: 413, headers});
      let body: any;
      try { const text = await req.text(); if (text.length > 20000) throw 0; body = JSON.parse(text); } catch { return Response.json({error: "Invalid request"}, {status: 400, headers}); }
      const items = (Array.isArray(body?.items) ? body.items : []).slice(0, 40).map((x: any): FactsInput => ({slug: String(x?.slug || ""), title: String(x?.title || "").slice(0, 300), year: Number(x?.year) || null, type: x?.type ? String(x.type).slice(0, 60) : null, country: x?.country ? String(x.country).slice(0, 8) : null}));
      if (!items.length) return Response.json({facts: {}}, {headers});
      if (limited()) return Response.json({error: "Too many requests. Please wait a moment."}, {status: 429, headers});
      return Response.json({facts: await deps.facts(items, {budgetMs: 15000})}, {headers});
    }
    return Response.json({error: "Not found"}, {status: 404, headers});
  };
}
export const handleShelf = createShelfHandler();
