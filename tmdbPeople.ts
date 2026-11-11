// Director filmographies from TMDB.
// Kuryana's person data leaves out many directing credits (for example most of Park Chan Wook's
// films), so the director filmography comes from TMDB's combined credits instead.
// Actor filmographies still come from Kuryana, which matched MyDramaList in testing.
import type { Credit } from "./people.ts";
import { posterUrl } from "./collections.ts";

const TMDB = "https://api.themoviedb.org/3";
// Jobs that MyDramaList lists under "Screenwriter & Director".
const DIRECTOR_JOBS = new Set(["Director", "Co-Director", "Screenplay", "Writer", "Teleplay"]);

const normalize = (s: unknown) => String(s || "").toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "");

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

// Returns TMDB directing and screenwriting credits, newest first, or null when TMDB
// is not configured, unreachable, or has no person matching this name.
export async function tmdbDirectorCredits(
  person: { name: string; nativeName: string | null },
  { fetcher = fetch, key = (typeof Deno < "u" && Deno.env.get("TMDB_API_KEY")) || "" } = {},
): Promise<Credit[] | null> {
  if (!key || !person.name) return null;
  try {
    const search = await tmdbJson("/search/person", { query: person.name, include_adult: "false" }, fetcher, key);
    const wanted = normalize(person.name), native = normalize(person.nativeName);
    const candidates = (Array.isArray(search?.results) ? search.results : []).filter((r: any) =>
      normalize(r?.name) === wanted || (native && normalize(r?.original_name) === native));
    if (!candidates.length) return null;
    // Several people can share a name (there are two Park Chan Wooks); prefer the one TMDB
    // knows for directing or writing, then the most popular.
    const rank = (r: any) => (["Directing", "Writing"].includes(r?.known_for_department) ? 1 : 0);
    candidates.sort((a: any, b: any) => rank(b) - rank(a) || (Number(b?.popularity) || 0) - (Number(a?.popularity) || 0));
    const chosen = candidates[0];
    const credits = await tmdbJson(`/person/${Number(chosen.id)}/combined_credits`, { language: "en-US" }, fetcher, key);
    const unique = new Map<string, Credit>();
    for (const c of Array.isArray(credits?.crew) ? credits.crew : []) {
      if (!DIRECTOR_JOBS.has(c?.job) || c?.adult || !["movie", "tv"].includes(c?.media_type)) continue;
      const id = `tmdb-${c.media_type}-${Number(c.id)}`;
      if (unique.has(id)) continue;
      const name = String(c.title || c.name || "").replace(/\s+/g, " ").trim();
      if (!name) continue;
      const date = String(c.release_date || c.first_air_date || "");
      const year = /^\d{4}-/.test(date) ? Number(date.slice(0, 4)) : null;
      unique.set(id, {
        id,
        name,
        url: `https://www.themoviedb.org/${c.media_type}/${Number(c.id)}`,
        year,
        // Same type words the MyDramaList parser produced; the add-on treats anything
        // containing "movie" as a film and everything else as a series.
        type: c.media_type === "movie" ? "Movie" : "Drama",
        role: "Screenwriter & Director",
        poster: posterUrl(c.poster_path),
      });
    }
    return [...unique.values()].sort((a, b) => (b.year ?? -1) - (a.year ?? -1));
  } catch {
    return null;
  }
}
