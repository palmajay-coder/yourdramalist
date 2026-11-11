import {listFromKuryana} from "./directListApi.ts";
import {nextPacificMidnight} from "./pacificTime.ts";
import {TEXT} from "./text.ts";

const origin = "https://mydramalist.com";
const listsBySeason = {
  fall: ["V3WZNK2L", "D3mkoPq1", "Lp6xdVr4"],
  winter: ["71NwBPKL", "W19kZWR3", "3bgeYMG4"],
  spring: ["q1XvpXk3", "71gqjEl3", "84JjRKb4"],
  summer: ["V3WD8Dn4", "81yOEME3", "W3rBmN93"],
} as const;

export type BannerSeason = keyof typeof listsBySeason;
export type BannerCard = {
  id: string;
  url: string;
  title: string;
  label: string;
  description: string;
  images: string[];
  profile?: string;
  profileName?: string;
  count?: number | null;
};
export type FeaturedBannerData = {
  featured: BannerCard | null;
  slides: BannerCard[];
  season: BannerSeason;
  heading: string;
  subtitle: string;
  nextRefresh?: string;
  status?: string;
};

function pacificMonthDay(timestamp: number) {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(timestamp));
  return {
    month: Number(values.find(part => part.type === "month")?.value),
    day: Number(values.find(part => part.type === "day")?.value),
  };
}

export function seasonForPacificDate(timestamp: number): BannerSeason {
  const {month, day} = pacificMonthDay(timestamp);
  if (month >= 9 && month <= 11) return "fall";
  if (month === 12 || month <= 2) return "winter";
  if (month >= 3 && month <= 5) return "spring";
  return "summer";
}

function copyForSeason(season: BannerSeason) {
  return TEXT.seasonalBannerCopy[season];
}

function boundedPageText(response: Response): Promise<string> {
  return (async () => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("MyDramaList response was empty.");
    const decoder = new TextDecoder();
    let html = "", size = 0;
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4_000_000) throw new Error("MyDramaList page was too large.");
        html += decoder.decode(value, {stream: true});
      }
      return html + decoder.decode();
    } finally {
      await reader.cancel().catch(() => {});
    }
  })();
}

async function readCuratedList(id: string, fetcher: typeof fetch): Promise<BannerCard> {
  const url = `${origin}/list/${id}`;
  // MyDramaList refuses cloud hosts, so the curated lists come from Kuryana.
  const list = await listFromKuryana(url, fetcher);
  if (list.listId !== id || !list.name) throw new Error("Unexpected MyDramaList list.");
  return {
    id,
    url,
    title: list.name,
    label: TEXT.featuredListLabel,
    description: list.description,
    images: list.posters,
    ...(list.profile ? {profile: list.profile} : {}),
    ...(list.profileName ? {profileName: list.profileName} : {}),
    count: list.count,
  };
}

export function createFeaturedService(
  storage?: {load: () => Promise<any>; save: (value: any) => Promise<any>},
  fetcher: typeof fetch = fetch,
  now = Date.now,
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

  function result(status: string, season: BannerSeason) {
    const copy = copyForSeason(season);
    return {
      featured: entry?.season === season ? entry.featured ?? null : null,
      slides: entry?.season === season ? entry.slides ?? [] : [],
      season,
      heading: copy.title,
      subtitle: copy.description,
      nextRefresh: new Date(entry?.season === season ? entry.expires : nextPacificMidnight(now())).toISOString(),
      status,
    };
  }

  return async () => {
    ready ??= (async () => {
      try { entry = storage ? await bounded(storage.load()) : null; } catch { /* Use memory cache. */ }
    })();
    await ready;
    const season = seasonForPacificDate(now());
    if (entry?.season === season && entry.expires > now()) {
      return result(entry.error ? (entry.featured ? "stale" : "unavailable") : "cached", season);
    }
    if (pending) return pending;

    pending = (async () => {
      if (storage) {
        try {
          const shared = await bounded(storage.load());
          if (shared?.season === season && shared.expires > now()) {
            entry = shared;
            return result(entry.error ? (entry.featured ? "stale" : "unavailable") : "cached", season);
          }
        } catch { /* Use memory cache. */ }
      }

      const old = entry?.season === season ? entry : null;
      const expires = nextPacificMidnight(now());
      const ids = listsBySeason[season];
      const outcomes = await Promise.allSettled(ids.map(id => readCuratedList(id, fetcher)));
      const slides = outcomes.flatMap(outcome => outcome.status === "fulfilled" ? [outcome.value] : []);

      if (slides.length) {
        let enriched = slides;
        try {
          const data = await enrich({featured: slides[0], slides, season,
            heading: copyForSeason(season).title, subtitle: copyForSeason(season).description});
          enriched = data.slides;
        } catch { /* Keep the MyDramaList posters if artwork enrichment is unavailable. */ }
        entry = {
          season,
          featured: enriched[0] || slides[0],
          slides: enriched.length ? enriched : slides,
          at: now(),
          expires,
          ...(slides.length < ids.length ? {error: true} : {}),
        };
      } else {
        entry = {
          season,
          featured: old?.featured ?? null,
          slides: old?.slides ?? [],
          at: old?.at ?? now(),
          expires,
          error: true,
        };
      }

      if (storage) await bounded(storage.save(entry)).catch(() => {});
      return result(entry.error ? (entry.featured ? "stale" : "unavailable") : "live", season);
    })().finally(() => { pending = undefined; });
    return pending;
  };
}
