import {St} from "./addonScrape.ts";
import {collections} from "./collectionService.ts";
import type {FeaturedBannerData} from "./featured.ts";

function safeMdlPoster(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "i.mydramalist.com" &&
      !url.username && !url.password && !url.port ? url.href : "";
  } catch { return ""; }
}

function safeTmdbPoster(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "image.tmdb.org" &&
      url.pathname.startsWith("/t/p/w780/") && !url.username && !url.password && !url.port
      ? url.href : "";
  } catch { return ""; }
}

async function enrichCard(card: FeaturedBannerData["featured"]) {
  const fallback = card.images.map(safeMdlPoster).filter(Boolean);
  const original = {...card, images: fallback.length ? fallback : card.images};
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const list = await St(card.id, 1);
        const items = list.items.slice(0, 3);
        const images = await Promise.all(items.map(async (item, index) => {
          const mdlImage = safeMdlPoster(item.image) || fallback[index] || "";
          if (!item.title || !Number.isInteger(item.year)) return mdlImage;
          const match = await collections.artwork({
            ...item,
            name: item.title,
            url: item.link || `${card.url}/${item.slug || ""}`,
            details: `${item.type || "Drama"} - ${item.year}`,
          });
          return safeTmdbPoster(match.posterSource === "TMDB" ? match.poster : "") || mdlImage;
        }));
        while (images.length < 3 && fallback[images.length]) images.push(fallback[images.length]);
        return {...card, images: images.filter(Boolean).slice(0, 3)};
      })(),
      new Promise<typeof original>(resolve => {
        timer = setTimeout(() => resolve(original), 10000);
      }),
    ]);
  } catch {
    return original;
  } finally {
    clearTimeout(timer);
  }
}

/** Use exact title/year TMDB matches; preserve the MDL poster for anything uncertain. */
export async function enrichFeaturedArtwork(data: FeaturedBannerData): Promise<FeaturedBannerData> {
  const enhanced = await Promise.all(data.slides.map(enrichCard));
  const byId = new Map(enhanced.map(card => [card.id, card]));
  const featured = byId.get(data.featured.id) || data.featured;
  const picks = Object.fromEntries(Object.entries(data.picks).map(([key, pick]) => [key, {
    ...pick,
    card: byId.get(pick.card.id) || pick.card,
  }]));
  return {featured, picks, slides: data.slides.map(card => byId.get(card.id) || card)};
}
