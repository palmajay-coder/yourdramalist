import { dramaUrl } from "./dramaDetails.ts";
import { kuryana } from "./kuryana.ts";

type CatalogTitle = {
  kind: "tv" | "movie";
  year: number;
  names: string[];
  countries: string[];
};
type SearchTitle = {title: string; slug: string; link: string; year: number; type: string};
type Match = {url: string; year: number; type: string};

const countryNames: Record<string, string> = {
  KR: "Korean", JP: "Japanese", CN: "Chinese", TW: "Taiwanese",
  HK: "Hong Kong", TH: "Thai", PH: "Filipino",
};
const normalize = (name: string) => String(name || "").normalize("NFKD").toLowerCase()
  .replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]/gu, "");

export async function matchCatalogTitle(title: CatalogTitle): Promise<Match | null> {
  if (!title.year) return null;
  const queries = [...new Set(title.names.filter(name => normalize(name).length >= 2))].slice(0, 4);
  const names = new Set(queries.map(normalize));
  const countries = title.countries.map(code => countryNames[code]).filter(Boolean);
  const matches = new Map<string, Match>();

  let searched = false;
  for (let i = 0; i < queries.length; i += 2) {
    const results = await Promise.allSettled(queries.slice(i, i + 2).map(query =>
      kuryana<{dramas?: SearchTitle[]}>("/v2/search?q=" + encodeURIComponent(query) + "&page=1", {timeoutMs: 3500}),
    ));
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      searched = true;
      for (const item of result.value.dramas || []) {
        const type = String(item.type || "");
        const compatible = title.kind === "movie" ? /\bMovie$/i.test(type) : /\b(?:Drama|Special|TV Show)$/i.test(type);
        if (!compatible || Number(item.year) !== title.year) continue;
        if (countries.length && !countries.some(country => type.startsWith(country + " "))) continue;
        if (!names.has(normalize(item.title)) && !names.has(normalize(item.slug?.replace(/^\d+-/, "")))) continue;
        const url = dramaUrl(item.link);
        if (url) matches.set(url, {url, year: Number(item.year), type});
      }
    }
    if (matches.size) break;
  }
  if (queries.length && !searched) throw Error("MyDramaList search unavailable");
  return matches.size === 1 ? matches.values().next().value! : null;
}
