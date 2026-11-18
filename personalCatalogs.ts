import {blob} from "https://esm.town/v/std/blob/main.ts";
import {dramaUrl} from "./dramaDetails.ts";

export const personalCatalogId = /^[a-f0-9]{32}$/;
const maximumBody = 512 * 1024;
const maximumTitles = 1000;
const storageKey = (id: string) => "personal-catalog/v1/" + id;
const headers = {"cache-control":"no-store","referrer-policy":"no-referrer"};
let rateWindow = 0, writes = 0;

function artwork(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 600) return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.port && !url.username && !url.password &&
      ["i.mydramalist.com", "image.tmdb.org"].includes(url.hostname)) return url.href;
  } catch { /* Missing or invalid artwork uses the existing catalog fallback. */ }
}

export async function loadPersonalCatalog(id: string) {
  if (!personalCatalogId.test(id)) throw Error("Invalid catalog ID");
  return (await blob.getJSON(storageKey(id))) as {items: ReturnType<typeof normalizeItems>} | undefined;
}

function normalizeItems(titles: unknown) {
  if (!Array.isArray(titles) || titles.length > maximumTitles) throw Error("Invalid titles");
  const items = [];
  const seen = new Set<string>();
  for (const title of titles) {
    const link = typeof title?.url === "string" && title.url.length <= 240 ? dramaUrl(title.url) : null;
    const name = typeof title?.name === "string" ? title.name.trim().slice(0, 180) : "";
    if (!link || !name) throw Error("Invalid title");
    const slug = new URL(link).pathname.slice(1);
    const mdlId = slug.split("-")[0];
    if (seen.has(mdlId)) continue;
    seen.add(mdlId);
    const year = /^[12]\d{3}$/.test(String(title.year)) ? Number(title.year) : undefined;
    const type = /^(movie|film)$/i.test(String(title.type).trim()) ? "Movie" : "Drama";
    items.push({slug, link, title:name, year, type, image:artwork(title.poster)});
  }
  return items;
}

export async function handlePersonalCatalog(req: Request, store = blob) {
  const respond = (body: object, status = 200) => Response.json(body, {headers,status});
  if (req.method !== "POST") return respond({error:"method"}, 405);
  if (req.headers.get("origin") !== new URL(req.url).origin) return respond({error:"origin"}, 403);
  if (!req.headers.get("content-type")?.startsWith("application/json")) return respond({error:"format"}, 415);
  const reader = req.body?.getReader();
  if (!reader) return respond({error:"body"}, 400);
  let body;
  try {
    const decoder = new TextDecoder();
    let size = 0, json = "";
    for (;;) {
      const {done,value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBody) {
        await reader.cancel();
        return respond({error:"size"}, 413);
      }
      json += decoder.decode(value,{stream:true});
    }
    body = JSON.parse(json + decoder.decode());
  } catch { return respond({error:"body"}, 400); }
  if (typeof body?.key !== "string" || !/^[a-f0-9]{64}$/.test(body.key)) return respond({error:"key"},400);

  // The write key never appears in the install link or storage. Knowing a catalog ID cannot authorize writes.
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(body.key)));
  const id = Array.from(digest.slice(0,16), byte => byte.toString(16).padStart(2,"0")).join("");
  let items;
  try { items = body.titles === null ? null : normalizeItems(body.titles); }
  catch { return respond({error:"titles"},400); }

  const minute = Math.floor(Date.now() / 60000);
  if (rateWindow !== minute) { rateWindow = minute; writes = 0; }
  if (writes >= 180) return respond({error:"retry"},429);
  writes++;
  try {
    if (items === null) await store.delete(storageKey(id));
    else await store.setJSON(storageKey(id),{items});
    return respond({id});
  } catch { return respond({error:"storage"},503); }
}
