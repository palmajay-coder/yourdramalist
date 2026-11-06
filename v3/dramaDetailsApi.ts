import { blob } from "https://esm.town/v/std/blob/main.ts";
import { createDetailsService, dramaUrl, type Entry } from './dramaDetails.ts';

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
export async function handleDramaDetails(req: Request) {
  if (req.method !== 'GET') return new Response('Method not allowed', {status:405,headers:{Allow:'GET'}});
  const raw = new URL(req.url).searchParams.get('url') || '';
  if (!dramaUrl(raw)) return Response.json({error:'Provide an HTTPS MyDramaList drama URL.'},{status:400});
  return Response.json(await details(raw), {headers:{'cache-control':'no-store'}});
}
