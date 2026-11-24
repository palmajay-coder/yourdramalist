// Actor and director filmographies from TMDB.
// Kuryana's person data leaves out many credits (most of Park Chan Wook's films, and Takuya
// Kimura's biggest dramas such as Long Vacation), so filmographies come from TMDB's combined
// credits instead. Kuryana's credits remain as a fallback when TMDB is unavailable.
import type { Credit } from "./people.ts";
import { posterUrl } from "./collections.ts";

const TMDB = "https://api.themoviedb.org/3";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/";
const imagePath = (path: unknown) => typeof path === "string" && /^\/[\w.-]+$/.test(path) ? path : null;
const isoDate = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
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
    // Landscape artwork for the wide person page; posters are used when a title has none.
    ...(typeof c?.backdrop_path === "string" && /^\/[\w.-]+$/.test(c.backdrop_path) ? { backdrop: TMDB_IMAGE + "w500" + c.backdrop_path } : {}),
    // TMDB's rating, for the Rating sort; left out when too few people voted for it to mean much.
    ...(Number(c?.vote_count) >= 5 && Number(c?.vote_average) > 0 ? { score: Math.round(Number(c.vote_average) * 10) / 10 } : {}),
  };
};
const newestFirst = (list: Credit[]) => list.sort((a, b) => (b.year ?? -1) - (a.year ?? -1));

// Facts for the person page. Anything TMDB does not have stays null; nothing is guessed.
export type TmdbProfile = {
  birthday: string | null; deathday: string | null; birthplace: string | null; biography: string | null;
  gender: "female" | "male" | null; image: string | null; backdrops: { actor: string | null; director: string | null };
};
export type TmdbCredits = { actor: Credit[]; director: Credit[]; profile?: TmdbProfile };

// The cinematic background: a wide still from the person's best-known title (most TMDB votes) that has one.
function backdropFor(list: any[]): string | null {
  let best: any = null;
  for (const c of list) if (imagePath(c?.backdrop_path) && Number(c?.vote_count || 0) > Number(best?.vote_count ?? -1)) best = c;
  return best ? TMDB_IMAGE + "w1280" + best.backdrop_path : null;
}

// Titles as a person's two sites list them: every spelling of the title, and the year (null when unknown).
export type TitleRef = { names: string[]; year: number | null };
const yearFrom = (c: any) => Number(String(c?.first_air_date || c?.release_date || "").slice(0, 4)) || null;
const tmdbRefs = (credits: any): TitleRef[] => [...(Array.isArray(credits?.cast) ? credits.cast : []), ...(Array.isArray(credits?.crew) ? credits.crew : [])]
  .map((c: any) => ({ names: [c?.name, c?.title, c?.original_name, c?.original_title].filter(Boolean).map(String), year: yearFrom(c) }));
/** How many titles in `a` also appear in `b`: the same title name, and a year within one when both have one. */
export function sharedTitles(a: TitleRef[], b: TitleRef[]): number {
  const index = new Map<string, (number | null)[]>();
  for (const ref of b) for (const name of ref.names) { const key = normalize(name); if (key) index.set(key, [...(index.get(key) || []), ref.year]); }
  let count = 0;
  for (const ref of a) {
    if (ref.names.some(name => (index.get(normalize(name)) || []).some(year => !year || !ref.year || Math.abs(year - ref.year) <= 1))) count++;
  }
  return count;
}
// Two shared titles are enough to call two listings the same person (the names alone may differ: Lim Yoon A / Yoona).
const MIN_SHARED = 2;

/** Without a name match, look at TMDB's few best results for the person's names and aliases, and take the one whose credits share titles. */
async function personByTitles(person: { name: string; nativeName: string | null; aliases?: string[]; known?: TitleRef[] }, fetcher: typeof fetch, key: string) {
  const known = person.known || [];
  if (known.length < MIN_SHARED) return null;
  const found = new Map<number, any>();
  for (const query of [...new Set([person.name, person.nativeName, ...(person.aliases || [])].filter(Boolean) as string[])].slice(0, 5)) {
    const search = await tmdbJson("/search/person", { query, include_adult: "false" }, fetcher, key).catch(() => null);
    for (const r of (Array.isArray(search?.results) ? search.results : []).slice(0, 5)) if (Number(r?.id) && !found.has(Number(r.id))) found.set(Number(r.id), r);
    if (found.size >= 8) break;
  }
  const top = [...found.values()].sort((a, b) => (Number(b?.popularity) || 0) - (Number(a?.popularity) || 0)).slice(0, 3);
  const details = await Promise.all(top.map(r => tmdbJson(`/person/${Number(r.id)}`, { language: "en-US", append_to_response: "combined_credits" }, fetcher, key).catch(() => null)));
  let best: any = null, bestCount = MIN_SHARED - 1;
  for (const data of details) {
    const count = sharedTitles(known, tmdbRefs(data?.combined_credits));
    if (count > bestCount) { best = data; bestCount = count; }
  }
  return best;
}

/** A TMDB person's other names and credits, to find them on MyDramaList (the reverse of the above). Null when TMDB has no such person. */
export async function tmdbPersonIdentity(
  who: { name: string; id?: number | null },
  { fetcher = fetch, key = (typeof Deno < "u" && Deno.env.get("TMDB_API_KEY")) || "" } = {},
): Promise<{ names: string[]; credits: TitleRef[] } | null> {
  if (!key || !who.name) return null;
  try {
    let id = Number(who.id) || 0;
    if (!id) {
      const search = await tmdbJson("/search/person", { query: who.name, include_adult: "false" }, fetcher, key);
      const best = (Array.isArray(search?.results) ? search.results : []).filter((r: any) => sameName(r?.name, who.name))
        .sort((a: any, b: any) => (Number(b?.popularity) || 0) - (Number(a?.popularity) || 0))[0];
      id = Number(best?.id) || 0;
    }
    if (!id) return null;
    const data = await tmdbJson(`/person/${id}`, { language: "en-US", append_to_response: "combined_credits" }, fetcher, key);
    const all = [...new Set([data?.name, ...(Array.isArray(data?.also_known_as) ? data.also_known_as : [])].map(x => String(x || "").trim()).filter(x => x.length >= 2 && x.length <= 100))];
    // Names in their own script first (MyDramaList finds 임윤아 as readily as Lim Yoon A), then the rest as TMDB lists them.
    const names = [...all.filter(x => /[^\u0000-\u024f]/.test(x)), ...all.filter(x => !/[^\u0000-\u024f]/.test(x))].slice(0, 6);
    return { names, credits: tmdbRefs(data?.combined_credits) };
  } catch {
    return null;
  }
}

// Returns TMDB acting and directing credits, newest first, or null when TMDB is not configured,
// unreachable, or has no person matching this name.
export async function tmdbPersonCredits(
  person: { name: string; nativeName: string | null; aliases?: string[]; known?: TitleRef[] },
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
    let data: any = null;
    if (candidates.length) {
      // Several people can share a name (there are two Park Chan Wooks). Prefer the one with the
      // matching native name, then the most popular.
      const nativeMatch = (r: any) => (person.nativeName && sameName(r?.original_name, person.nativeName) ? 1 : 0);
      candidates.sort((a: any, b: any) => nativeMatch(b) - nativeMatch(a) || (Number(b?.popularity) || 0) - (Number(a?.popularity) || 0));
      // One request for the person's facts and their credits together.
      data = await tmdbJson(`/person/${Number(candidates[0].id)}`, { language: "en-US", append_to_response: "combined_credits" }, fetcher, key);
    } else {
      // No name matched (MyDramaList "Lim Yoon A", TMDB "Yoona"): find them by the titles they share instead.
      data = await personByTitles(person, fetcher, key);
    }
    if (!data) return null;
    const credits = data?.combined_credits && typeof data.combined_credits === "object" ? data.combined_credits : data;
    const actingUsed: any[] = [], directingUsed: any[] = [];

    const director = new Map<string, Credit>();
    for (const c of Array.isArray(credits?.crew) ? credits.crew : []) {
      if (!DIRECTOR_JOBS.has(c?.job) || c?.adult) continue;
      const item = credit(c, "Screenwriter & Director");
      if (item && !director.has(item.id)) { director.set(item.id, item); directingUsed.push(c); }
    }

    const actor = new Map<string, Credit>();
    for (const c of Array.isArray(credits?.cast) ? credits.cast : []) {
      if (c?.adult || SELF_ROLE.test(String(c?.character || ""))) continue;
      if ((Array.isArray(c?.genre_ids) ? c.genre_ids : []).some((g: number) => NON_DRAMA_GENRES.has(g))) continue;
      const item = credit(c, String(c?.character || "").trim() || null);
      if (!item) continue;
      // One card per title; a second character in the same title is kept as part of the role.
      const known = actor.get(item.id);
      if (known) { if (item.role && !String(known.role || "").split(" / ").includes(item.role)) known.role = known.role ? known.role + " / " + item.role : item.role; continue; }
      actor.set(item.id, item);
      actingUsed.push(c);
    }
    const text = (value: unknown) => String(value || "").replace(/\r\n/g, "\n").trim() || null;
    const profile: TmdbProfile = {
      birthday: isoDate(data?.birthday), deathday: isoDate(data?.deathday),
      birthplace: text(data?.place_of_birth)?.slice(0, 160) || null,
      biography: text(data?.biography)?.slice(0, 6000) || null,
      gender: data?.gender === 1 ? "female" : data?.gender === 2 ? "male" : null,
      image: imagePath(data?.profile_path) ? TMDB_IMAGE + "w342" + data.profile_path : null,
      backdrops: { actor: backdropFor(actingUsed), director: backdropFor(directingUsed) },
    };
    return { actor: newestFirst([...actor.values()]), director: newestFirst([...director.values()]), profile };
  } catch {
    return null;
  }
}

// A person's name in the chosen TMDB language (for example 木村拓哉 for ja-JP), or null.
const localizedMemo = new Map<string, { name: string | null; expires: number }>();
export async function tmdbPersonLocalizedName(
  name: string, language: string,
  { fetcher = fetch, key = (typeof Deno < "u" && Deno.env.get("TMDB_API_KEY")) || "" } = {},
): Promise<string | null> {
  if (!key || !name || !language || language === "en-US") return null;
  const memo = `${normalize(name)}|${language}`;
  const hit = localizedMemo.get(memo);
  if (hit && hit.expires > Date.now()) return hit.name;
  let localized: string | null = null;
  try {
    const search = await tmdbJson("/search/person", { query: name, include_adult: "false" }, fetcher, key);
    const chosen = (Array.isArray(search?.results) ? search.results : []).find((r: any) => sameName(r?.name, name));
    if (chosen) {
      const person = await tmdbJson(`/person/${Number(chosen.id)}`, { language }, fetcher, key);
      const text = String(person?.name || "").trim();
      if (text) localized = text;
    }
  } catch { /* Keep the name as entered. */ }
  localizedMemo.set(memo, { name: localized, expires: Date.now() + (localized ? 86400000 : 600000) });
  while (localizedMemo.size > 500) localizedMemo.delete(localizedMemo.keys().next().value!);
  return localized;
}
