import { load } from "npm:cheerio@1.0.0";
import { kuryana, KuryanaError } from "./kuryana.ts";

export function dramaUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || !["mydramalist.com", "www.mydramalist.com"].includes(u.hostname) || u.port || u.username || u.password || !/^\/[1-9]\d{0,11}-[A-Za-z0-9-]{1,200}\/?$/.test(u.pathname)) return null;
    return "https://mydramalist.com" + u.pathname.replace(/\/$/, "");
  } catch { return null; }
}
export function synopsisPreview(text: string): string {
  const sentences = [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(text)];
  if (sentences.length <= 3) return text;
  return text.slice(0, sentences[2].index + sentences[2].segment.length).trimEnd();
}
export function extractDramaDetails(html: string, expectedUrl: string) {
  const $ = load(html);
  const canonical = dramaUrl($('link[rel="canonical"]').attr('href') || '');
  if (!canonical || canonical.match(/^https:\/\/mydramalist.com\/(\d+)-/)?.[1] !== expectedUrl.match(/^https:\/\/mydramalist.com\/(\d+)-/)?.[1]) throw Error("Unexpected drama page");
  const synopsisNode = $('.show-synopsis').first().clone();
  synopsisNode.find('script,style,button,.read-more,.read-more-button,.mdl-synopsis-languages,a[href*="/edit/"]').remove();
  synopsisNode.find('br').replaceWith('\n');
  // Include read-more-hidden text; never use the truncated metadata description.
  const synopsis = synopsisNode.text().trim() || null;
  const field = (label: string) => {
    const b = $('li > b').filter((_, el) => $(el).text().trim() === label + ':').first();
    return b.length ? b.parent().text().slice(b.text().length).trim() : '';
  };
  const positive = (raw: string) => { const m = raw.match(/^#([\d,]+)$/); const n = m ? Number(m[1].replace(/,/g,'')) : NaN; return Number.isSafeInteger(n) && n > 0 ? n : null; };
  const scoreRaw = field('Score').match(/^(\d+(?:\.\d+)?)(?:\s|$)/)?.[1];
  const score = scoreRaw && Number(scoreRaw) > 0 && Number(scoreRaw) <= 10 ? Number(scoreRaw) : null;
  return { sourceUrl: canonical, synopsis, score, rank: positive(field('Ranked')), popularity: positive(field('Popularity')) };
}

// Kuryana version of extractDramaDetails (MyDramaList refuses cloud hosts). Same fields.
export function detailsFromKuryana(data: any, expectedUrl: string): Details {
  const id = expectedUrl.match(/^https:\/\/mydramalist.com\/(\d+)-/)?.[1];
  if (!id || String(data?.id) !== id) throw Error("Unexpected drama page");
  const positive = (value: unknown) => { const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? n : null; };
  const rating = Number(data?.rating);
  const synopsis = String(data?.synopsis || "").replace(/\r\n/g, "\n").trim() || null;
  return { sourceUrl: expectedUrl, synopsis, score: Number.isFinite(rating) && rating > 0 && rating <= 10 ? rating : null, rank: positive(data?.ranked), popularity: positive(data?.popularity) };
}

export type Details = ReturnType<typeof extractDramaDetails>;
export type Entry = { data: Details | null; fetchedAt: number; retryAt: number; error?: string };
export interface Cache { get(key: string): Promise<Entry | undefined>; set(key: string, value: Entry): Promise<void>; }

/** Limits apply per runtime instance. Cache hits and duplicate requests consume no fetch slot. */
export function createDetailsService(cache: Cache, fetcher: typeof fetch = fetch, now = Date.now) {
  const pending = new Map<string, Promise<unknown>>();
  let active = 0;
  const queue: (() => void)[] = [];
  let windowAt = now(), requests = 0;
  async function slot() {
    if (active >= 3) {
      if (queue.length >= 24) throw Error('Details service is busy. Please try again shortly.');
      await new Promise<void>(resolve => queue.push(resolve));
      return;
    }
    active++;
  }
  function release() { const next = queue.shift(); if (next) next(); else active--; }
  async function readHtml(r: Response) {
    const reader = r.body?.getReader(); if (!reader) throw Error('Empty drama page');
    const chunks: Uint8Array[] = []; let size = 0;
    try { while (true) { const {value, done} = await reader.read(); if (done) break; size += value.length; if (size > 2_000_000) throw Error('Drama page exceeded size limit'); chunks.push(value); } }
    finally { await reader.cancel().catch(()=>{}); }
    const bytes = new Uint8Array(size); let offset = 0; for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
    return new TextDecoder().decode(bytes);
  }
  async function resolve(url: string) {
    const old = await cache.get(url).catch(()=>undefined);
    const usable = old?.data && now() - old.fetchedAt < 7 * 86400_000;
    if (old && old.retryAt > now()) return { ...(usable ? old.data : {}), status: usable ? (old.error ? 'stale' : 'cached') : 'unavailable', fetchedAt: usable ? new Date(old.fetchedAt).toISOString() : null, warning: old.error };
    let acquired = false;
    try {
      await slot(); acquired = true;
      if (now() - windowAt >= 60_000) { windowAt = now(); requests = 0; }
      if (requests >= 60) throw Error('Details request limit reached. Please try again shortly.');
      requests++;
      let payload: any;
      try { payload = await kuryana('/v2/dramas/' + new URL(url).pathname.slice(1), { fetcher, timeoutMs: 8000 }); }
      catch (e) { throw Error('MyDramaList details unavailable (HTTP ' + (e instanceof KuryanaError ? e.status : 502) + ').'); }
      const data = detailsFromKuryana(payload, url);
      const fetchedAt = now();
      await cache.set(url, { data, fetchedAt, retryAt: fetchedAt + 6 * 3600_000 }).catch(()=>{});
      return { ...data, status: 'live', fetchedAt: new Date(fetchedAt).toISOString() };
    } catch (e) {
      const warning = e instanceof Error && /busy|limit|MyDramaList/.test(e.message) ? e.message : 'Drama details could not be loaded. Please try again later.';
      await cache.set(url, { data: usable ? old!.data : null, fetchedAt: usable ? old!.fetchedAt : now(), retryAt: now() + 5 * 60_000, error: warning }).catch(()=>{});
      return { ...(usable ? old!.data : {}), status: usable ? 'stale' : 'unavailable', fetchedAt: usable ? new Date(old!.fetchedAt).toISOString() : null, warning };
    } finally { if (acquired) release(); }
  }
  return (raw: string): Promise<any> => {
    const url = dramaUrl(raw); if (!url) return Promise.reject(Error('Invalid drama URL'));
    if (pending.has(url)) return pending.get(url)!;
    const p = resolve(url).finally(()=>pending.delete(url)); pending.set(url,p); return p;
  };
}
