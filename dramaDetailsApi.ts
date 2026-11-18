import { kuryana, mdlLink } from "./kuryana.ts";
import { tmdbPreviewForMdl } from "./tmdbExplore.ts";
import { blob } from "https://esm.town/v/std/blob/main.ts";
import { createDetailsService, dramaUrl, type Entry } from './dramaDetails.ts';
import { tmdbDetails } from './tmdbExplore.ts';
import { matchCatalogTitle } from './catalogMdlMatch.ts';

// One bounded, val-scoped snapshot. Never reads or writes YDL-V2 storage.
const key = 'drama-details:v2';
let entries = new Map<string, Entry>();
let loaded: Promise<void> | undefined;
let writes = Promise.resolve();
async function ready() {
  loaded ??= (async()=>{
    try { const saved = await blob.getJSON(key); if (Array.isArray(saved)) entries = new Map(saved.slice(-200)); }
    catch { /* Memory cache remains available when persistent storage is unavailable. */ }
  })();
  await loaded;
}
const details = createDetailsService({
  async get(url) { await ready(); return entries.get(url); },
  async set(url, value) {
    await ready(); entries.delete(url); entries.set(url, value);
    while (entries.size > 200) entries.delete(entries.keys().next().value!);
    const snapshot = [...entries];
    writes = writes.catch(()=>{}).then(()=>blob.setJSON(key, snapshot));
    await writes;
  },
});
type CatalogMatch = Awaited<ReturnType<typeof matchCatalogTitle>>;
const catalogMatches = new Map<string, {expires: number; match: Promise<CatalogMatch>}>();

/** The MyDramaList match for a TMDB title, cached (6 hours when found, 30 minutes when not). */
function catalogMatch(url: string, source: NonNullable<Awaited<ReturnType<typeof tmdbDetails>>>): Promise<CatalogMatch> {
  let entry = catalogMatches.get(url);
  if (!entry || entry.expires <= Date.now()) {
    const lookup = {expires: Infinity, match: matchCatalogTitle(source)};
    catalogMatches.set(url, lookup);
    while (catalogMatches.size > 300) catalogMatches.delete(catalogMatches.keys().next().value!);
    lookup.match.then(match => {
      lookup.expires = Date.now() + (match ? 6 * 3600_000 : 30 * 60_000);
    }, () => {
      if (catalogMatches.get(url) === lookup) catalogMatches.delete(url);
    });
    entry = lookup;
  }
  return entry.match;
}

/** Full preview for a TMDB title with no MyDramaList match: TMDB story, artwork, cast and facts only. */
export function tmdbOnlyPreview(source: {kind: string; year?: number; synopsis?: string | null; preview?: Record<string, unknown>}) {
  const preview = Object.fromEntries(Object.entries(source.preview || {}).filter(([, value]) =>
    value != null && value !== "" && (!Array.isArray(value) || value.length)));
  return {
    ...preview,
    status: "unavailable", score: null, popularity: null, reviews: [], totalReviews: null,
    synopsis: source.synopsis || null,
    year: source.year || undefined,
    type: source.kind === "movie" ? "Movie" : "Drama",
  };
}

async function catalogDetails(url: string) {
  const source = await tmdbDetails(url);
  if (!source) return null;
  const unavailable = {status: "unavailable", synopsis: source.synopsis, score: null, popularity: null};
  let match: CatalogMatch;
  try {
    match = await catalogMatch(url, source);
  } catch {
    return {...unavailable, status: "retry"};
  }
  if (!match) return unavailable;
  const data = await details(match.url);
  return {
    ...data,
    score: data.score ?? match.score,
    synopsis: data.synopsis || source.synopsis,
    type: match.type,
    year: match.year,
  };
}

async function reviewTotal(slug: string, page: any): Promise<number | null> {
  if (!Array.isArray(page?.reviews)) return null;
  const pagination = page.pagination;
  const reported = pagination?.total_reviews ?? pagination?.total_items ?? pagination?.total_results ?? pagination?.total;
  if (reported != null && /^\d+$/.test(String(reported))) {
    const total = Number(reported);
    if (Number.isSafeInteger(total) && total >= page.reviews.length) return total;
  }

  const lastPage = Number(pagination?.total_pages);
  if (lastPage === 1) return page.reviews.length;
  if (!Number.isSafeInteger(lastPage) || lastPage < 2 || !page.reviews.length) return null;

  // Earlier pages are full. Fetch only the final page to count its remainder.
  const last = await kuryana("/v2/dramas/" + slug + "/reviews?page=" + lastPage, {timeoutMs: 4000}).catch(() => null);
  if (!Array.isArray(last?.reviews) || !last.reviews.length ||
      last.reviews.length > page.reviews.length || Number(last.pagination?.total_pages) !== lastPage) return null;
  const total = (lastPage - 1) * page.reviews.length + last.reviews.length;
  return Number.isSafeInteger(total) ? total : null;
}

export async function handleDramaDetails(req: Request) {
  if (req.method !== 'GET') return new Response('Method not allowed', {status:405,headers:{Allow:'GET'}});
  const raw = new URL(req.url).searchParams.get('url') || '';
  const headers = {'cache-control':'no-store'};
  if (/^https:\/\/www\.themoviedb\.org\//.test(raw)) {
    // Weekly Picks and country shelves: match to MyDramaList for the full preview, or show TMDB info only.
    if (new URL(req.url).searchParams.get("view") === "discover") {
      try {
        const source = await tmdbDetails(raw);
        if (source) {
          const match = await catalogMatch(raw, source);
          if (!match) return Response.json(tmdbOnlyPreview(source), {headers});
          const rich = await discoverDetails(match.url, {title: source.names[0], year: String(match.year || source.year || ""), type: match.type});
          const fallback = tmdbOnlyPreview(source);
          return Response.json({...fallback, ...Object.fromEntries(Object.entries(rich).filter(([, value]) => value != null && value !== "")),
            score: rich.score ?? match.score, synopsis: rich.synopsis || source.synopsis, type: match.type, year: match.year}, {headers});
        }
      } catch {
        return Response.json({status:'retry', score:null, popularity:null}, {headers});
      }
    }
    try {
      const data = await catalogDetails(raw);
      if (data) return Response.json(data, {headers});
    } catch {
      return Response.json({status:'retry', score:null, popularity:null}, {headers});
    }
  }
  if (!dramaUrl(raw)) return Response.json({error:'Provide an HTTPS MyDramaList drama URL.'},{status:400});
  const source = dramaUrl(raw)!;
  if (new URL(req.url).searchParams.get("view") !== "discover") {
    return Response.json(await details(source), {headers});
  }
  const query = new URL(req.url).searchParams;
  return Response.json(await discoverDetails(source, {title: query.get("title"), year: query.get("year"), type: query.get("type")}), {headers});
}

/** The full preview for a MyDramaList title: details, first reviews, review count and TMDB artwork. */
async function discoverDetails(source: string, hint: {title?: string | null; year?: string | null; type?: string | null}) {
  const slug = new URL(source).pathname.slice(1);
  const [data, reviews] = await Promise.all([
    details(source),
    kuryana("/v2/dramas/" + slug + "/reviews?page=1", {timeoutMs: 5000}).catch(() => null),
  ]);
  const hintYear = hint.year || "";
  const [artwork, totalReviews] = await Promise.all([tmdbPreviewForMdl({
    sourceUrl: source,
    name: data.name || hint.title?.slice(0, 180),
    year: data.year || (/^\d{4}$/.test(hintYear) ? hintYear : undefined),
    type: data.type || hint.type?.slice(0, 60) || undefined,
  }).catch(() => null), reviewTotal(slug, reviews)]);
  const reviewList = Array.isArray(reviews?.reviews) ? reviews.reviews.slice(0, 5).map(review => ({
    author: String(review?.reviewer?.name || "").slice(0, 120),
    headline: String(review?.headline || "").slice(0, 160),
    body: String(review?.body || "").slice(0, 600),
    spoiler: !!review?.spoiler,
    score: Number(review?.ratings?.overall) || null,
    link: mdlLink(String(review?.link || "").replace(/^\/(?!\/)/, "https://mydramalist.com/")) || source,
  })).filter(review => review.body || review.headline) : [];
  const availableArtwork = Object.fromEntries(Object.entries(artwork || {}).filter(([, value]) =>
    value != null && value !== "" && (!Array.isArray(value) || value.length)));
  return {...data, ...availableArtwork, reviews: reviewList, totalReviews, mdlUrl: source};
}
