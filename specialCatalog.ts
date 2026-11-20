// A limited-time, hand-picked catalog: "Watch this while they play GTA 6". Simple, funny, easy-to-follow
// dramas and movies to put on while someone else is busy gaming. It is the first list on Discover, with a
// countdown, can be added to Nuvio, and disappears on its own at midnight Pacific on January 1, 2027.
import {blob} from "https://esm.town/v/std/blob/main.ts";
import {normalizeTitle, posterUrl} from "./collections.ts";
import {pacificMidnight} from "./pacificTime.ts";

type Storage = {load: () => Promise<any>; save: (value: any) => Promise<any>};
type Pick = {title: string; year: number; country: "KR" | "JP" | "CN" | "TW" | "TH"; kind: "tv" | "movie"; alt?: string[]};
export type SpecialItem = {kind: "tv" | "movie"; id: number; name: string; poster: string; overview: string; date: string; score: number};

export const SPECIAL = {
  id: "gta6",
  name: "Watch this while they play GTA 6",
  until: new Date(pacificMidnight(new Date(Date.UTC(2027, 0, 1)))).toISOString(),
  titles: [
    {title: "Strong Woman Do Bong Soon", year: 2017, country: "KR", kind: "tv", alt: ["Strong Girl Bong-soon"]},
    {title: "Business Proposal", year: 2022, country: "KR", kind: "tv", alt: ["A Business Proposal"]},
    {title: "What's Wrong with Secretary Kim", year: 2018, country: "KR", kind: "tv", alt: ["Why Secretary Kim"]},
    {title: "Welcome to Waikiki", year: 2018, country: "KR", kind: "tv", alt: ["Eulachacha Waikiki"]},
    {title: "Extreme Job", year: 2019, country: "KR", kind: "movie"},
    {title: "Hometown Cha-Cha-Cha", year: 2021, country: "KR", kind: "tv"},
    {title: "Prison Playbook", year: 2017, country: "KR", kind: "tv", alt: ["Wise Prison Life"]},
    {title: "Legal High", year: 2012, country: "JP", kind: "tv"},
    {title: "Go Go Squid!", year: 2019, country: "CN", kind: "tv", alt: ["Go Go Squid"]},
    {title: "Lovely Runner", year: 2024, country: "KR", kind: "tv"},
    {title: "Bad Genius", year: 2017, country: "TH", kind: "movie"},
    {title: "King the Land", year: 2023, country: "KR", kind: "tv"},
    {title: "Love O2O", year: 2016, country: "CN", kind: "tv", alt: ["Just One Smile Is Very Alluring"]},
    {title: "Fight for My Way", year: 2017, country: "KR", kind: "tv", alt: ["Fight My Way"]},
    {title: "Sunny", year: 2011, country: "KR", kind: "movie"},
    {title: "Boys Over Flowers", year: 2005, country: "JP", kind: "tv", alt: ["Hana Yori Dango"]},
    {title: "Extraordinary Attorney Woo", year: 2022, country: "KR", kind: "tv"},
    {title: "Hidden Love", year: 2023, country: "CN", kind: "tv"},
    {title: "F4 Thailand: Boys Over Flowers", year: 2021, country: "TH", kind: "tv", alt: ["F4 Thailand"]},
    {title: "Hospital Playlist", year: 2020, country: "KR", kind: "tv", alt: ["Wise Doctor Life"]},
  ] as Pick[],
};
const LANGUAGE: Record<string, string> = {KR: "ko", JP: "ja", CN: "zh", TW: "zh", TH: "th"};
const DAY = 86400000;

export function createSpecialCatalog(deps: {tmdb: (path: string, params?: Record<string, string>) => Promise<any>; now?: () => number; storage?: Storage; special?: typeof SPECIAL}) {
  const now = deps.now || Date.now, special = deps.special || SPECIAL;
  const cache = new Map<string, {item: SpecialItem | null; expires: number}>();
  let ready: Promise<void> | undefined, saving = Promise.resolve();
  const bounded = async <T>(p: Promise<T>) => { let t: any; try { return await Promise.race([p, new Promise<undefined>(r => { t = setTimeout(r, 1000); })]); } finally { clearTimeout(t); } };
  async function init() {
    ready ??= (async () => { try { const rows = deps.storage ? await bounded(deps.storage.load()) : null; if (Array.isArray(rows)) for (const [k, v] of rows) if (v && typeof v.expires === "number") cache.set(k, v); } catch { /* Start empty. */ } })();
    await ready;
  }

  /** The TMDB title for a pick: same title (or one of its other names), year within one, and its country. */
  async function find(pick: Pick): Promise<SpecialItem | null> {
    const data = await deps.tmdb("search/" + pick.kind, {query: pick.title, include_adult: "false", language: "en-US"});
    const yearOf = (r: any) => Number(String(r?.first_air_date || r?.release_date || "").slice(0, 4)) || 0;
    const fromCountry = (r: any) => pick.kind === "tv" ? Array.isArray(r?.origin_country) && r.origin_country.includes(pick.country) : r?.original_language === LANGUAGE[pick.country];
    const results = (Array.isArray(data?.results) ? data.results : []).filter((r: any) => !r.adult && posterUrl(r.poster_path) && Math.abs(yearOf(r) - pick.year) <= 1 && fromCountry(r));
    const names = new Set([pick.title, ...(pick.alt || [])].map(normalizeTitle));
    const exact = results.filter((r: any) => [r.name, r.title, r.original_name, r.original_title].some(n => n && names.has(normalizeTitle(n))));
    const r = exact[0] || (results.length === 1 ? results[0] : null);
    if (!r) return null;
    return {kind: pick.kind, id: Number(r.id), name: String(r.name || r.title).trim(), poster: posterUrl(r.poster_path)!, overview: String(r.overview || ""), date: String(r.first_air_date || r.release_date || ""), score: Number(r.vote_average) || 0};
  }

  /** The catalog while it runs (titles in the hand-picked order), or null once it has ended. */
  async function current() {
    if (now() >= Date.parse(special.until)) return null;
    await init();
    let changed = false;
    const items: (SpecialItem | null)[] = Array(special.titles.length).fill(null);
    let cursor = 0;
    async function worker() {
      while (cursor < special.titles.length) {
        const index = cursor++, pick = special.titles[index], key = pick.kind + ":" + pick.title + ":" + pick.year;
        const hit = cache.get(key);
        if (hit && hit.expires > now()) { items[index] = hit.item; continue; }
        try {
          const item = await find(pick);
          if (!item) console.log(JSON.stringify({specialCatalog: special.id, unmatched: pick.title}));
          // A match is kept for 30 days; a title TMDB could not match is tried again the next day.
          cache.set(key, {item, expires: now() + (item ? 30 : 1) * DAY});
          changed = true;
          items[index] = item;
        } catch { items[index] = hit?.item || null; }
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    if (changed && deps.storage) { const rows = [...cache]; saving = saving.catch(() => {}).then(() => deps.storage!.save(rows)); await bounded(saving).catch(() => {}); }
    const seen = new Set<string>();
    return {
      catalog: {kind: "special", id: special.id, url: "ydl-special:" + special.id, name: special.name, type: "series", until: special.until},
      items: items.filter((item): item is SpecialItem => !!item && !seen.has(item.kind + ":" + item.id) && !!seen.add(item.kind + ":" + item.id)),
    };
  }
  return {current};
}

let shared: ReturnType<typeof createSpecialCatalog> | undefined;
/** The site's special catalog, using the shared TMDB limits. Null once it has ended. */
export async function specialCatalog() {
  const {collections} = await import("./collectionService.ts");
  shared ??= createSpecialCatalog({tmdb: collections.tmdb, storage: {load: () => blob.getJSON("special:v1"), save: value => blob.setJSON("special:v1", value)}});
  return shared.current();
}

/** GET /api/catalogs/special for the Discover shelf: posters rotate every 12 hours, as in Weekly Picks. */
export async function handleSpecialCatalog(req: Request) {
  if (req.method !== "GET") return new Response("Method not allowed", {status: 405, headers: {Allow: "GET"}});
  const headers = {"cache-control": "no-store"};
  try {
    const data = await specialCatalog();
    if (!data) return Response.json({catalog: null, items: []}, {headers});
    const {collections} = await import("./collectionService.ts");
    const withPosters = await collections.withPosterChoices({collections: [{catalog: data.catalog, items: data.items}]});
    return Response.json({catalog: data.catalog, items: withPosters.collections[0].items}, {headers});
  } catch {
    return Response.json({error: "This catalog is temporarily unavailable."}, {status: 502, headers});
  }
}
