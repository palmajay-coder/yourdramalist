import { load } from "npm:cheerio@1.0.0";

export interface PopularListPreview {
  listId: string;
  name: string;
  url: string;
  titleCount: number | null;
  loves: number | null;
  comments: number | null;
  posterUrls: string[];
}
export interface PopularListsResult {
  sourceUrl: string | null;
  dramaId: string | null;
  sectionFound: boolean;
  lists: PopularListPreview[];
  warnings: string[];
}
const ORIGIN = "https://mydramalist.com";
const clean = (text: string) => text.replace(/\s+/g, " ").trim();

function mdlUrl(value: string | undefined): URL | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim(), ORIGIN);
    if (!["http:", "https:"].includes(url.protocol) ||
        !["mydramalist.com", "www.mydramalist.com"].includes(url.hostname) ||
        url.username || url.password || url.port) return null;
    return url;
  } catch { return null; }
}
function listUrl(value: string | undefined): { listId: string; url: string } | null {
  const url = mdlUrl(value);
  const match = url?.pathname.match(/^\/list\/([A-Za-z0-9_-]+)\/?$/);
  if (!match || match[1].toLowerCase() === "create") return null;
  return { listId: match[1], url: ORIGIN + "/list/" + match[1] };
}
function posterUrl(value: string | undefined): string | null {
  // Only original remote image URLs; never resolve saved local src paths.
  if (!value || !/^(https?:\/\/|\/\/)/i.test(value.trim())) return null;
  try {
    const url = new URL(value.trim(), ORIGIN);
    if (!["http:", "https:"].includes(url.protocol) ||
        url.hostname !== "i.mydramalist.com" || url.username || url.password || url.port) return null;
    url.protocol = "https:";
    url.hash = "";
    return url.href;
  } catch { return null; }
}

/** Offline, server-side extraction only. Does not fetch or execute page scripts. */
export function extractPopularLists(html: string): PopularListsResult {
  const $ = load(html);
  const warnings: string[] = [];
  const canonical = mdlUrl($('link[rel="canonical"]').first().attr("href"));
  const drama = canonical?.pathname.match(/^\/(\d+)-[^/]+\/?$/);
  const sourceUrl = drama ? ORIGIN + canonical!.pathname.replace(/\/$/, "") : null;
  if (!sourceUrl) warnings.push("Missing or invalid canonical drama URL.");
  const sections = $(".box-header > h3").filter((_, el) =>
    clean($(el).text()) === "Popular Lists").map((_, el) => $(el).closest("div.box")[0]).get();
  const result: PopularListsResult = {
    sourceUrl, dramaId: drama?.[1] ?? null, sectionFound: sections.length > 0, lists: [], warnings,
  };
  if (!sections.length) {
    warnings.push("Popular Lists section absent; this does not establish an empty result or identify an access challenge.");
    return result;
  }
  if (sections.length > 1) warnings.push("Multiple Popular Lists sections; extracting the first.");
  const seen = new Set<string>();
  $(sections[0]).find(".box-body > .custom-list-preview").each((index, el) => {
    const card = $(el);
    const title = card.find(".title.bottom > a").first();
    const identity = listUrl(title.attr("href"));
    const name = clean(title.text());
    if (!identity || !name) {
      warnings.push("Skipped card " + index + ": missing name or invalid list URL.");
      return;
    }
    if (seen.has(identity.listId)) return;
    seen.add(identity.listId);
    const count = (icon: string): number | null => {
      const spans = card.find(".list-bars > span").filter((_, span) => $(span).find("i." + icon).length > 0);
      const raw = clean(spans.first().text());
      const match = raw.match(/^(\d{1,3}(?:,\d{3})+|\d+)(?:\s+[A-Za-z]+)?$/);
      const value = match ? Number(match[1].replace(/,/g, "")) : NaN;
      if (spans.length !== 1 || !Number.isSafeInteger(value)) {
        warnings.push(identity.listId + ": missing or invalid " + icon + " count.");
        return null;
      }
      return value;
    };
    const posterUrls: string[] = [];
    card.find(".content.titles > a.collection > .list-item.titles > img").each((_, img) => {
      const image = $(img);
      const url = posterUrl(image.attr("data-src")) ?? posterUrl(image.attr("src"));
      if (url) posterUrls.push(url);
      else warnings.push(identity.listId + ": missing valid remote poster URL.");
    });
    result.lists.push({ ...identity, name, titleCount: count("fa-tv"),
      loves: count("fa-heart"), comments: count("fa-comment-alt"), posterUrls });
  });
  return result;
}
