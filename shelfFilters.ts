/** Filter rules shared by the setup page preview and the Nuvio catalog, so both show the same titles.
 * Every function here is self-contained: app.ts injects them into the browser with toString(). */
export type ShelfFilter = {type?: "drama" | "movie"; countries?: string[]; from?: number; to?: number; genres?: string[]; sort?: "newest" | "oldest" | "az" | "added" | "rating"};
export type TitleFacts = {genres?: string[]; country?: string};

export const FILTER_COUNTRIES: [string, string][] = [["KR", "South Korea"], ["CN", "China"], ["JP", "Japan"], ["TW", "Taiwan"], ["TH", "Thailand"], ["HK", "Hong Kong"], ["PH", "Philippines"], ["OTHER", "Other"]];
export const FILTER_GENRES = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "Historical", "Horror", "Music", "Mystery", "Romance", "Sci-Fi", "Thriller", "War", "Western", "Kids", "Reality", "Talk", "News", "Soap", "Politics"];

/** Country code from MyDramaList data: watchlist rows carry a numeric code, list rows a type such as "Korean Drama". */
export function shelfCountry(item: any, facts?: any): string {
  const codes: Record<string, string> = {"1": "JP", "2": "CN", "3": "KR", "5": "TW", "6": "TH"};
  if (codes[String(item?.country || "")]) return codes[String(item.country)];
  const type = String(item?.type || "").toLowerCase();
  const names: [RegExp, string][] = [[/^korean\b/, "KR"], [/^chinese\b/, "CN"], [/^japanese\b/, "JP"], [/^taiwanese\b/, "TW"], [/^thai\b/, "TH"], [/^hong kong\b/, "HK"], [/^filipino\b/, "PH"]];
  for (const [pattern, code] of names) if (pattern.test(type)) return code;
  const fromFacts = String(facts?.country || "");
  if (fromFacts) return ["KR", "CN", "JP", "TW", "TH", "HK", "PH"].includes(fromFacts) ? fromFacts : "OTHER";
  return "";
}

/** "movie" for films, "drama" for everything else (dramas, TV shows and specials). */
export function shelfKind(item: any): "drama" | "movie" {
  return /movie/i.test(String(item?.type || "")) ? "movie" : "drama";
}

/** Returns a clean filter, or null when nothing is filtered. Unknown values are dropped. */
export function normalizeShelfFilter(raw: any): ShelfFilter | null {
  if (!raw || typeof raw !== "object") return null;
  const countries = ["KR", "CN", "JP", "TW", "TH", "HK", "PH", "OTHER"];
  const genres = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "Historical", "Horror", "Music", "Mystery", "Romance", "Sci-Fi", "Thriller", "War", "Western", "Kids", "Reality", "Talk", "News", "Soap", "Politics"];
  const year = (value: any) => Number.isInteger(Number(value)) && Number(value) >= 1900 && Number(value) <= 2100 ? Number(value) : undefined;
  const out: ShelfFilter = {};
  if (raw.type === "drama" || raw.type === "movie") out.type = raw.type;
  const c = Array.isArray(raw.countries) ? [...new Set(raw.countries.map(String))].filter((x) => countries.includes(x as string)).sort() as string[] : [];
  if (c.length) out.countries = c;
  const g = Array.isArray(raw.genres) ? [...new Set(raw.genres.map(String))].filter((x) => genres.includes(x as string)).sort() as string[] : [];
  if (g.length) out.genres = g;
  let from = year(raw.from), to = year(raw.to);
  if (from && to && from > to) [from, to] = [to, from];
  if (from) out.from = from;
  if (to) out.to = to;
  if (raw.sort === "newest" || raw.sort === "oldest" || raw.sort === "az" || raw.sort === "added" || raw.sort === "rating") out.sort = raw.sort;
  return Object.keys(out).length ? out : null;
}

/** True when the filter needs TMDB facts (genres, or countries MyDramaList did not provide). */
export function shelfNeedsFacts(filter: any, items: any[]): boolean {
  if (!filter) return false;
  if (filter.genres?.length) return true;
  return !!filter.countries?.length && items.some((item) => !shelfCountry(item));
}

/** Applies a filter and sort. Items keep MyDramaList order unless a sort is chosen. */
export function applyShelfFilter(items: any[], filter: any, facts: Record<string, any> = {}): any[] {
  if (!filter) return items;
  const country = (item: any) => {
    const codes: Record<string, string> = {"1": "JP", "2": "CN", "3": "KR", "5": "TW", "6": "TH"};
    if (codes[String(item?.country || "")]) return codes[String(item.country)];
    const type = String(item?.type || "").toLowerCase();
    const names: [RegExp, string][] = [[/^korean\b/, "KR"], [/^chinese\b/, "CN"], [/^japanese\b/, "JP"], [/^taiwanese\b/, "TW"], [/^thai\b/, "TH"], [/^hong kong\b/, "HK"], [/^filipino\b/, "PH"]];
    for (const [pattern, code] of names) if (pattern.test(type)) return code;
    const known = String(facts[item.slug]?.country || "");
    return known ? (["KR", "CN", "JP", "TW", "TH", "HK", "PH"].includes(known) ? known : "OTHER") : "";
  };
  const year = (item: any) => Number(item?.year) || null;
  let out = items.filter((item) => {
    if (filter.type && (/movie/i.test(String(item?.type || "")) ? "movie" : "drama") !== filter.type) return false;
    if (filter.countries?.length && !filter.countries.includes(country(item))) return false;
    if (filter.from && !(year(item) && year(item)! >= filter.from)) return false;
    if (filter.to && !(year(item) && year(item)! <= filter.to)) return false;
    if (filter.genres?.length) {
      const genres = facts[item.slug]?.genres || [];
      if (!filter.genres.some((g: string) => genres.includes(g))) return false;
    }
    return true;
  });
  if (filter.sort === "newest") out = [...out].sort((a, b) => (year(b) || 0) - (year(a) || 0));
  else if (filter.sort === "oldest") out = [...out].sort((a, b) => (year(a) || 9999) - (year(b) || 9999));
  else if (filter.sort === "added") { if (out.some((item) => item.added)) out = [...out].sort((a, b) => (Number(b.added) || 0) - (Number(a.added) || 0)); }
  else if (filter.sort === "rating") out = [...out].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0) || String(a.title || a.name || "").localeCompare(String(b.title || b.name || "")));
  else if (filter.sort === "az") out = [...out].sort((a, b) => String(a.title || a.name || "").localeCompare(String(b.title || b.name || "")));
  return out;
}

/** Readable label that follows the list name, e.g. "Korean Romance Dramas". Year and sort change the list but stay out of the name. */
export function shelfFilterLabel(filter: any): string {
  if (!filter) return "";
  const names: Record<string, string> = {KR: "Korean", CN: "Chinese", JP: "Japanese", TW: "Taiwanese", TH: "Thai", HK: "Hong Kong", PH: "Filipino", OTHER: "Other"};
  const parts: string[] = [], phrase: string[] = [];
  if (filter.countries?.length) phrase.push(filter.countries.map((c: string) => names[c] || c).join(" & "));
  if (filter.genres?.length) phrase.push(filter.genres.join(" & "));
  if (filter.type) phrase.push(filter.type === "movie" ? "Movies" : "Dramas");
  if (phrase.length) parts.push(phrase.join(" "));
  return parts.join(", ");
}

/** Stable short key for a filter, used to tell filtered versions of the same list apart. */
export function shelfFilterKey(filter: any): string {
  if (!filter) return "";
  const text = JSON.stringify([filter.type || "", filter.countries || [], filter.from || 0, filter.to || 0, filter.genres || [], filter.sort || ""]);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36);
}
