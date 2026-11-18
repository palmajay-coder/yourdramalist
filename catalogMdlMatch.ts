import { dramaUrl } from "./dramaDetails.ts";
import { kuryana } from "./kuryana.ts";

type CatalogTitle = {
  kind: "tv" | "movie";
  year: number;
  names: string[];
  countries: string[];
};
type SearchTitle = {title: string; slug: string; link: string; year: number; type: string; rating?: number | null};
type Match = {url: string; year: number; type: string; score: number | null};

const countryNames: Record<string, string> = {
  KR: "Korean", JP: "Japanese", CN: "Chinese", TW: "Taiwanese",
  HK: "Hong Kong", TH: "Thai", PH: "Filipino",
};
const normalize = (name: string) => String(name || "").normalize("NFKD").toLowerCase()
  .replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]/gu, "");

type Search = (query: string) => Promise<{dramas?: SearchTitle[]}>;
const kuryanaSearch: Search = query =>
  kuryana<{dramas?: SearchTitle[]}>("/v2/search?q=" + encodeURIComponent(query) + "&page=1", {timeoutMs: 3500});

/** A title's names plus the short title before a subtitle ("W: Two Worlds" also counts as "W"). */
function nameVariants(names: string[]) {
  const variants = new Set<string>();
  for (const name of names) {
    const clean = String(name || "").trim();
    if (!clean) continue;
    variants.add(clean);
    const short = clean.split(/\s*:\s+|\s+[-–—]\s+/)[0]?.trim();
    if (short && short !== clean) variants.add(short);
  }
  return [...variants].filter(name => normalize(name).length >= 1);
}

export async function matchCatalogTitle(title: CatalogTitle, search: Search = kuryanaSearch): Promise<Match | null> {
  if (!title.year) return null;
  // Single-letter titles such as "W" count too; the year, type and country checks below keep matches exact.
  const variants = nameVariants(title.names);
  const queries = variants.slice(0, 4);
  const names = new Set(variants.map(normalize));
  const countries = title.countries.map(code => countryNames[code]).filter(Boolean);
  const matches = new Map<string, Match>();

  let hadFailure = false;
  for (let i = 0; i < queries.length; i += 2) {
    const results = await Promise.allSettled(queries.slice(i, i + 2).map(query => search(query)));
    for (const result of results) {
      if (result.status !== "fulfilled") {
        hadFailure = true;
        continue;
      }
      for (const item of result.value.dramas || []) {
        const type = String(item.type || "");
        const compatible = title.kind === "movie" ? /\bMovie$/i.test(type) : /\b(?:Drama|Special|TV Show)$/i.test(type);
        if (!compatible || Number(item.year) !== title.year) continue;
        if (countries.length && !countries.some(country => type.startsWith(country + " "))) continue;
        if (!names.has(normalize(item.title)) && !names.has(normalize(item.slug?.replace(/^\d+-/, "")))) continue;
        const url = dramaUrl(item.link);
        const rating = Number(item.rating);
        const score = rating > 0 && rating <= 10 ? rating : null;
        if (url) matches.set(url, {url, year: Number(item.year), type, score: score ?? matches.get(url)?.score ?? null});
      }
    }
    if (matches.size) break;
  }
  if (!matches.size && hadFailure) throw Error("MyDramaList search unavailable");
  return matches.size === 1 ? matches.values().next().value! : null;
}
