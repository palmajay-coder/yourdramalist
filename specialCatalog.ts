// Spotlight: limited-time, hand-picked catalogs at the top of Discover, also available in Nuvio.
// - "Watch this while they play GTA 6" runs until the winter list begins (midnight Pacific, December 1, 2026).
// - A holiday or seasonal list for every month, which changes by itself at midnight Pacific on the 1st.
// Both sit under one "Spotlight" heading with one timer counting to the end of the month.
import {blob} from "https://esm.town/v/std/blob/main.ts";
import {normalizeTitle, posterUrl} from "./collections.ts";
import {pacificDate, pacificMidnight} from "./pacificTime.ts";

type Storage = {load: () => Promise<any>; save: (value: any) => Promise<any>};
type Country = "KR" | "JP" | "CN" | "TW" | "TH";
type Pick = {title: string; year: number; country: Country; kind: "tv" | "movie"; alt?: string[]};
export type SpecialItem = {kind: "tv" | "movie"; id: number; name: string; poster: string; overview: string; date: string; score: number};
type Spotlight = {id: string; name: string; until: string; titles: Pick[]};

const tv = (title: string, year: number, country: Country = "KR", alt?: string[]): Pick => ({title, year, country, kind: "tv", ...(alt ? {alt} : {})});
const film = (title: string, year: number, country: Country = "KR", alt?: string[]): Pick => ({title, year, country, kind: "movie", ...(alt ? {alt} : {})});

export const GTA6: Spotlight = {
  id: "gta6",
  name: "Watch this while they play GTA 6",
  until: new Date(pacificMidnight(new Date(Date.UTC(2026, 11, 1)))).toISOString(),
  titles: [
    tv("Strong Woman Do Bong Soon", 2017, "KR", ["Strong Girl Bong-soon"]),
    tv("Business Proposal", 2022, "KR", ["A Business Proposal"]),
    tv("What's Wrong with Secretary Kim", 2018, "KR", ["Why Secretary Kim"]),
    tv("Welcome to Waikiki", 2018, "KR", ["Eulachacha Waikiki"]),
    film("Extreme Job", 2019),
    tv("Hometown Cha-Cha-Cha", 2021),
    tv("Prison Playbook", 2017, "KR", ["Wise Prison Life"]),
    tv("Legal High", 2012, "JP"),
    tv("Go Go Squid!", 2019, "CN", ["Go Go Squid"]),
    tv("Lovely Runner", 2024),
    film("Bad Genius", 2017, "TH"),
    tv("King the Land", 2023),
    tv("Love O2O", 2016, "CN", ["Just One Smile Is Very Alluring"]),
    tv("Fight for My Way", 2017, "KR", ["Fight My Way"]),
    film("Sunny", 2011),
    tv("Boys Over Flowers", 2005, "JP", ["Hana Yori Dango"]),
    tv("Extraordinary Attorney Woo", 2022),
    tv("Hidden Love", 2023, "CN"),
    tv("F4 Thailand: Boys Over Flowers", 2021, "TH", ["F4 Thailand"]),
    tv("Hospital Playlist", 2020, "KR", ["Wise Doctor Life"]),
  ],
};
/** Kept for older callers: the GTA 6 list. */
export const SPECIAL = GTA6;

/** One list per month (1 = January), chosen for that month's holiday or season. */
export const MONTHLY: Record<number, {name: string; titles: Pick[]}> = {
  1: {name: "New Year, New Obsession", titles: [
    tv("Squid Game", 2021), tv("Queen of Tears", 2024), tv("Moving", 2023), tv("The Glory", 2022), tv("Itaewon Class", 2020),
    tv("Vincenzo", 2021), tv("Alchemy of Souls", 2022), tv("Weak Hero Class 1", 2022), tv("Signal", 2016), tv("Mr. Sunshine", 2018),
    tv("Reborn Rich", 2022), tv("SKY Castle", 2018), tv("Twenty-Five Twenty-One", 2022), tv("Mouse", 2021), tv("Juvenile Justice", 2022)]},
  2: {name: "Fall in Love This February", titles: [
    tv("My Love from the Star", 2013, "KR", ["You Who Came from the Stars"]), tv("Descendants of the Sun", 2016), tv("W: Two Worlds", 2016, "KR", ["W"]),
    tv("It's Okay to Not Be Okay", 2020), tv("Hotel del Luna", 2019), tv("The King: Eternal Monarch", 2020), tv("Encounter", 2018),
    tv("Tell Me That You Love Me", 2023), tv("Moon Lovers: Scarlet Heart Ryeo", 2016), tv("Uncontrollably Fond", 2016),
    film("The Classic", 2003), film("Be With You", 2018), tv("Love Between Fairy and Devil", 2022, "CN"), film("More Than Blue", 2018, "TW"),
    film("I Want to Eat Your Pancreas", 2017, "JP", ["Let Me Eat Your Pancreas"])]},
  3: {name: "White Day Sweethearts", titles: [
    tv("Weightlifting Fairy Kim Bok-joo", 2016), tv("Her Private Life", 2019), tv("Romance Is a Bonus Book", 2019), tv("Touch Your Heart", 2019),
    tv("Because This Is My First Life", 2017), tv("Doctor Slump", 2024), tv("My Demon", 2023), tv("Love to Hate You", 2023),
    tv("Love Next Door", 2024), tv("Fated to Love You", 2014), tv("Shopping King Louie", 2016), tv("Oh My Venus", 2015),
    tv("Put Your Head on My Shoulder", 2019, "CN"), tv("A Love So Beautiful", 2017, "CN"), tv("My Love Mix-Up!", 2021, "JP", ["Kieta Hatsukoi"])]},
  4: {name: "Spring Into Love", titles: [
    tv("Something in the Rain", 2018, "KR", ["Pretty Noona Who Buys Me Food"]), tv("One Spring Night", 2019), tv("Spring Waltz", 2006),
    tv("When the Camellia Blooms", 2019), tv("Run On", 2020), tv("Forecasting Love and Weather", 2022), tv("Navillera", 2021),
    tv("The Liar and His Lover", 2017), tv("Lovestruck in the City", 2020), tv("Start-Up", 2020), tv("Seasons of Blossom", 2022),
    film("Your Lie in April", 2016, "JP"), film("Hana and Alice", 2004, "JP"), tv("Cherry Magic! Thirty Years of Virginity Can Make You a Wizard?!", 2020, "JP", ["Cherry Magic"]),
    tv("Meteor Garden", 2018, "CN")]},
  5: {name: "Watch With Mom", titles: [
    tv("Dear My Friends", 2016), tv("Mother", 2018), tv("The Good Bad Mother", 2023), tv("Daily Dose of Sunshine", 2023), tv("Doctor Cha", 2023),
    tv("My Unfamiliar Family", 2020), tv("Reply 1997", 2012), film("Miss Granny", 2014), film("Her Love Boils Bathwater", 2016, "JP"),
    film("Tokyo Tower: Mom and Me, and Sometimes Dad", 2007, "JP"), film("Hi, Mom", 2021, "CN")]},
  6: {name: "Summer Crush", titles: [
    tv("Our Beloved Summer", 2021), tv("Twinkling Watermelon", 2023), tv("Summer Strike", 2022), tv("My Lovely Liar", 2023), tv("Love Alarm", 2019),
    tv("True Beauty", 2020), tv("Extraordinary You", 2019), tv("Crash Course in Romance", 2023), tv("See You in My 19th Life", 2023), tv("The Heirs", 2013),
    tv("When I Fly Towards You", 2023, "CN"), film("Our Times", 2015, "TW"), film("You Are the Apple of My Eye", 2011, "TW"), tv("2gether: The Series", 2020, "TH", ["2gether"])]},
  7: {name: "Beach Brain", titles: [
    tv("Warm and Cozy", 2015), tv("Summer Scent", 2003), tv("Castaway Diva", 2023), tv("Strong Girl Nam-soon", 2023), tv("Coffee Prince", 2007),
    tv("The Fabulous", 2022), tv("Mr. Queen", 2020), tv("Hospital Ship", 2017), tv("Beach Boys", 1997, "JP"), tv("Bad Buddy", 2021, "TH"),
    tv("Count Your Lucky Stars", 2020, "CN")]},
  8: {name: "Last Days of Summer", titles: [
    tv("Reply 1994", 2013), tv("Racket Boys", 2021), tv("Be Melodramatic", 2019), tv("Youth of May", 2021), tv("Hello, My Twenties!", 2016, "KR", ["Age of Youth"]),
    film("20th Century Girl", 2022), film("Twenty", 2015), film("Secret", 2007, "TW"), film("Little Forest: Summer/Autumn", 2014, "JP"),
    film("Swing Girls", 2004, "JP"), film("Waterboys", 2001, "JP"), tv("Hormones", 2013, "TH")]},
  9: {name: "Chuseok at Home", titles: [
    tv("Under the Queen's Umbrella", 2022), tv("The Red Sleeve", 2021), tv("Love in the Moonlight", 2016), tv("Rookie Historian Goo Hae-ryung", 2019),
    tv("The Crowned Clown", 2019), tv("Jewel in the Palace", 2003, "KR", ["Dae Jang Geum"]), tv("Joseon Attorney: A Morality", 2023, "KR", ["Joseon Attorney"]),
    tv("Poong, the Joseon Psychiatrist", 2022), tv("Captivating the King", 2024), film("The Throne", 2015), film("Masquerade", 2012),
    film("Detective K: Secret of the Virtuous Widow", 2011)]},
  10: {name: "K-Horror Night", titles: [
    tv("Kingdom", 2019), tv("All of Us Are Dead", 2022), tv("Sweet Home", 2020), tv("Hellbound", 2021), tv("Gyeongseong Creature", 2023),
    tv("The Guest", 2018), tv("Strangers from Hell", 2019), tv("The Uncanny Counter", 2020), film("Train to Busan", 2016), film("The Wailing", 2016),
    film("#Alive", 2020), film("Ju-on: The Grudge", 2002, "JP"), film("Ring", 1998, "JP", ["Ringu"]), film("Shutter", 2004, "TH"), film("The Medium", 2021, "TH")]},
  11: {name: "Thankful for Family", titles: [
    tv("Reply 1988", 2015), tv("When Life Gives You Tangerines", 2025), tv("My Mister", 2018, "KR", ["My Ajusshi"]), tv("Our Blues", 2022),
    tv("My Father Is Strange", 2017), tv("Once Again", 2020), tv("Go Back Couple", 2017), tv("Welcome to Samdal-ri", 2023),
    film("Little Forest", 2018), film("Ode to My Father", 2014), film("Miracle in Cell No. 7", 2013), film("Shoplifters", 2018, "JP"),
    film("Our Little Sister", 2015, "JP"), film("Like Father, Like Son", 2013, "JP"), film("Little Big Women", 2020, "TW")]},
  12: {name: "Snowed In for Christmas", titles: [
    tv("Goblin", 2016, "KR", ["Guardian: The Lonely and Great God"]), tv("Crash Landing on You", 2019), tv("Snowdrop", 2021), tv("Winter Sonata", 2002),
    tv("That Winter, the Wind Blows", 2013), tv("The Snow Queen", 2006), tv("When the Weather Is Fine", 2020, "KR", ["I'll Go to You When the Weather Is Nice"]),
    film("Moonlit Winter", 2019), tv("First Love", 2022, "JP"), film("Love Letter", 1995, "JP")]},
};

/** The current month's list: its name, titles and end (midnight Pacific on the 1st of next month). */
export function monthlySpotlight(time: number): Spotlight {
  const {date} = pacificDate(time);
  const month = date.getUTCMonth() + 1;
  const until = new Date(pacificMidnight(new Date(Date.UTC(date.getUTCFullYear(), month, 1)))).toISOString();
  return {id: "monthly", name: MONTHLY[month].name, until, titles: MONTHLY[month].titles};
}
/** The Spotlight lists running at a given moment, GTA 6 first. */
export function activeSpotlights(time: number, gta: Spotlight = GTA6): Spotlight[] {
  return [...(time < Date.parse(gta.until) ? [gta] : []), monthlySpotlight(time)];
}
const LANGUAGE: Record<string, string> = {KR: "ko", JP: "ja", CN: "zh", TW: "zh", TH: "th"};
const DAY = 86400000;

export function createSpecialCatalog(deps: {tmdb: (path: string, params?: Record<string, string>) => Promise<any>; now?: () => number; storage?: Storage; lists?: (time: number) => Spotlight[]}) {
  const now = deps.now || Date.now, listsAt = deps.lists || ((time: number) => activeSpotlights(time));
  const cache = new Map<string, {item: SpecialItem | null; expires: number}>();
  let ready: Promise<void> | undefined, saving = Promise.resolve();
  const bounded = async <T>(p: Promise<T>) => { let t: any; try { return await Promise.race([p, new Promise<undefined>(r => { t = setTimeout(r, 1000); })]); } finally { clearTimeout(t); } };
  async function init() {
    ready ??= (async () => { try { const rows = deps.storage ? await bounded(deps.storage.load()) : null; if (Array.isArray(rows)) for (const [k, v] of rows) if (v && typeof v.expires === "number") cache.set(k, v); } catch { /* Start empty. */ } })();
    await ready;
  }

  /** The TMDB title for a pick: same title (or one of its other names), year within one, and its country. */
  async function find(pick: Pick): Promise<SpecialItem | null> {
    const data = await deps.tmdb("search/" + pick.kind, {query: pick.title, include_adult: "false", language: "en-US"});
    const yearOf = (r: any) => Number(String(r?.first_air_date || r?.release_date || "").slice(0, 4)) || 0;
    const fromCountry = (r: any) => pick.kind === "tv" ? Array.isArray(r?.origin_country) && r.origin_country.includes(pick.country) : r?.original_language === LANGUAGE[pick.country];
    const results = (Array.isArray(data?.results) ? data.results : []).filter((r: any) => !r.adult && posterUrl(r.poster_path) && Math.abs(yearOf(r) - pick.year) <= 1 && fromCountry(r));
    const names = new Set([pick.title, ...(pick.alt || [])].map(normalizeTitle));
    const exact = results.filter((r: any) => [r.name, r.title, r.original_name, r.original_title].some(n => n && names.has(normalizeTitle(n))));
    const r = exact[0] || (results.length === 1 ? results[0] : null);
    if (!r) return null;
    return {kind: pick.kind, id: Number(r.id), name: String(r.name || r.title).trim(), poster: posterUrl(r.poster_path)!, overview: String(r.overview || ""), date: String(r.first_air_date || r.release_date || ""), score: Number(r.vote_average) || 0};
  }

  /** The catalog while it runs (titles in the hand-picked order), or null once it has ended. */
  /** One list's titles, matched on TMDB in the hand-picked order (unmatched titles are left out). */
  async function resolve(list: Spotlight) {
    const items: (SpecialItem | null)[] = Array(list.titles.length).fill(null);
    let cursor = 0, changed = false;
    async function worker() {
      while (cursor < list.titles.length) {
        const index = cursor++, pick = list.titles[index], key = pick.kind + ":" + pick.title + ":" + pick.year;
        const hit = cache.get(key);
        if (hit && hit.expires > now()) { items[index] = hit.item; continue; }
        try {
          const item = await find(pick);
          if (!item) console.log(JSON.stringify({specialCatalog: list.id, unmatched: pick.title}));
          // A match is kept for 30 days; a title TMDB could not match is tried again the next day.
          cache.set(key, {item, expires: now() + (item ? 30 : 1) * DAY});
          changed = true;
          items[index] = item;
        } catch { items[index] = hit?.item || null; }
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    const seen = new Set<string>();
    return {changed, items: items.filter((item): item is SpecialItem => !!item && !seen.has(item.kind + ":" + item.id) && !!seen.add(item.kind + ":" + item.id))};
  }

  /** Every Spotlight list running now (GTA 6 first, then the month's list), with its titles. */
  async function current() {
    await init();
    const lists = [];
    let changed = false;
    for (const list of listsAt(now())) {
      const result = await resolve(list);
      changed ||= result.changed;
      if (result.items.length) lists.push({catalog: {kind: "special", id: list.id, url: "ydl-special:" + list.id, name: list.name, type: "series", until: list.until}, items: result.items});
    }
    if (changed && deps.storage) { const rows = [...cache]; saving = saving.catch(() => {}).then(() => deps.storage!.save(rows)); await bounded(saving).catch(() => {}); }
    return {lists};
  }
  return {current};
}

let shared: ReturnType<typeof createSpecialCatalog> | undefined;
/** The site's Spotlight lists right now, using the shared TMDB limits. */
export async function specialCatalog() {
  const {collections} = await import("./collectionService.ts");
  shared ??= createSpecialCatalog({tmdb: collections.tmdb, storage: {load: () => blob.getJSON("special:v1"), save: value => blob.setJSON("special:v1", value)}});
  return shared.current();
}

/** GET /api/catalogs/special for the Discover Spotlight: posters rotate every 12 hours, as in Weekly Picks. */
export async function handleSpecialCatalog(req: Request) {
  if (req.method !== "GET") return new Response("Method not allowed", {status: 405, headers: {Allow: "GET"}});
  const headers = {"cache-control": "no-store"};
  try {
    const data = await specialCatalog();
    const {collections} = await import("./collectionService.ts");
    const withPosters = await collections.withPosterChoices({collections: data.lists});
    return Response.json({lists: withPosters.collections}, {headers});
  } catch {
    return Response.json({error: "Spotlight is temporarily unavailable."}, {status: 502, headers});
  }
}
