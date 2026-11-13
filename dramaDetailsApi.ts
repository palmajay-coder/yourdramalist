import { blob } from "https://esm.town/v/std/blob/main.ts";
import { createDetailsService, dramaUrl, type Entry } from './dramaDetails.ts';
import { tmdbDetails } from './tmdbExplore.ts';
import { matchCatalogTitle } from './catalogMdlMatch.ts';

// One bounded, val-scoped snapshot. Never reads or writes YDL-V2 storage.
const key = 'drama-details:v1';
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

async function catalogDetails(url: string) {
  const source = await tmdbDetails(url);
  if (!source) return null;
  const unavailable = {status: "unavailable", synopsis: source.synopsis, score: null, popularity: null};
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
  const match = await entry.match.catch(() => null);
  if (!match) return unavailable;
  const data = await details(match.url);
  return {...data, synopsis: data.synopsis || source.synopsis, type: match.type, year: match.year};
}

export async function handleDramaDetails(req: Request) {
  if (req.method !== 'GET') return new Response('Method not allowed', {status:405,headers:{Allow:'GET'}});
  const raw = new URL(req.url).searchParams.get('url') || '';
  const headers = {'cache-control':'no-store'};
  if (/^https:\/\/www\.themoviedb\.org\//.test(raw)) {
    try {
      const data = await catalogDetails(raw);
      if (data) return Response.json(data, {headers});
    } catch {
      return Response.json({status:'unavailable', score:null, popularity:null}, {headers});
    }
  }
  if (!dramaUrl(raw)) return Response.json({error:'Provide an HTTPS MyDramaList drama URL.'},{status:400});
  return Response.json(await details(raw), {headers});
}
