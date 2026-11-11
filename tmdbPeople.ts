// Actor and director filmographies from TMDB.
// Kuryana's person data leaves out many credits (most of Park Chan Wook's films, and Takuya
// Kimura's biggest dramas such as Long Vacation), so filmographies come from TMDB's combined
// credits instead. Kuryana's credits remain as a fallback when TMDB is unavailable.
import type { Credit } from "./people.ts";
import { posterUrl } from "./collections.ts";

const TMDB = "https://api.themoviedb.org/3";
// Jobs that MyDramaList lists under "Screenwriter & Director".
const DIRECTOR_JOBS = new Set(["Director", "Co-Director", "Screenplay", "Writer", "Teleplay"]);
// TMDB genre ids that are not scripted dramas or films: Animation, Documentary, News, Reality, Talk.
// MyDramaList's Drama and Movie sections do not list these, so acting credits in them are skipped.
const NON_DRAMA_GENRES = new Set([16, 99, 10763, 10764, 10767]);
// "Self" credits are appearances as themselves (talk shows, award ceremonies, interviews).
const SELF_ROLE = /\b(self|himself|herself|themselves)\b/i;

const normalize = (s: unknown) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "");
// Names may be written family-name-first (MyDramaList: "Kimura Takuya") or given-name-first
// (TMDB: "Takuya Kimura"), so also compare the words in sorted order.
const sortedWords = (s: unknown) => String(s || "").toLowerCase().normalize("NFKD").split(/[^\p{L}\p{N}]+/u).filter(Boolean).sort().join(" ");
const sameName = (a: unknown, b: unknown) => !!normalize(a) && (normalize(a) === normalize(b) || (!!sortedWords(a) && sortedWords(a) === sortedWords(b)));

async function tmdbJson(path: string, params: Record<string, string>, fetcher: typeof fetch, key: string) {
  const url = new URL(TMDB + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("api_key", key);
  const response = await fetcher(url, { redirect: "error", signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } });
  if (!response.ok) {
    await response.body?.cancel();
    throw Error("TMDB responded " + response.status);
  }
  return response.json();
}

const yearOf = (c: any) => {
  const date = String(c?.release_date || c?.first_air_date || "");
  return /^\d{4}-/.test(date) ? Number(date.slice(0, 4)) : null;
};
const credit = (c: any, role: string | null): Credit | null => {
  const name = String(c?.title || c?.name || "").replace(/\s+/g, " ").trim();
  if (!name || !["movie", "tv"].includes(c?.media_type)) return null;
  return {
    id: `tmdb-${c.media_type}-${Number(c.id)}`,
    name,
    url: `https://www.themoviedb.org/${c.media_type}/${Number(c.id)}`,
    year: yearOf(c),
    // Same type words the MyDramaList parser produced; the add-on treats anything
    // containing "movie" as a film and everything else as a series.
    type: c.media_type === "movie" ? "Movie" : "Drama",
    role,
    poster: posterUrl(c.poster_path),
  };
};
const newestFirst = (list: Credit[]) => list.sort((a, b) => (b.year ?? -1) - (a.year ?? -1));

export type TmdbCredits = { actor: Credit[]; director: Credit[] };

// Returns TMDB acting and directing credits, newest first, or null when TMDB is not configured,
// unreachable, or has no person matching this name.
export async function tmdbPersonCredits(
  person: { name: string; nativeName: string | null },
  { fetcher = fetch, key = (typeof Deno < "u" && Deno.env.get("TMDB_API_KEY")) || "" } = {},
): Promise<TmdbCredits | null> {
  if (!key || !person.name) return null;
  try {
    // Search by the name as written, then by the native-script name (for example 木村拓哉),
    // which TMDB stores as the person's original name.
    let candidates: any[] = [];
    for (const query of [...new Set([person.name, person.nativeName].filter(Boolean) as string[])]) {
      const search = await tmdbJson("/search/person", { query, include_adult: "false" }, fetcher, key);
      candidates = (Array.isArray(search?.results) ? search.results : []).filter((r: any) =>
        sameName(r?.name, person.name) || sameName(r?.original_name, person.nativeName) || sameName(r?.name, person.nativeName));
      if (candidates.length) break;
    }
    if (!candidates.length) return null;
    // Several people can share a name (there are two Park Chan Wooks). Prefer the one with the
    // matching native name, then the most popular.
    const nativeMatch = (r: any) => (person.nativeName && sameName(r?.original_name, person.nativeName) ? 1 : 0);
    candidates.sort((a: any, b: any) => nativeMatch(b) - nativeMatch(a) || (Number(b?.popularity) || 0) - (Number(a?.popularity) || 0));
    const credits = await tmdbJson(`/person/${Number(candidates[0].id)}/combined_credits`, { language: "en-US" }, fetcher, key);

    const director = new Map<string, Credit>();
    for (const c of Array.isArray(credits?.crew) ? credits.crew : []) {
      if (!DIRECTOR_JOBS.has(c?.job) || c?.adult) continue;
      const item = credit(c, "Screenwriter & Director");
      if (item && !director.has(item.id)) director.set(item.id, item);
    }

    const actor = new Map<string, Credit>();
    for (const c of Array.isArray(credits?.cast) ? credits.cast : []) {
      if (c?.adult || SELF_ROLE.test(String(c?.character || ""))) continue;
      if ((Array.isArray(c?.genre_ids) ? c.genre_ids : []).some((g: number) => NON_DRAMA_GENRES.has(g))) continue;
      const item = credit(c, String(c?.character || "").trim() || null);
      if (item && !actor.has(item.id)) actor.set(item.id, item);
    }
    return { actor: newestFirst([...actor.values()]), director: newestFirst([...director.values()]) };
  } catch {
    return null;
  }
}
