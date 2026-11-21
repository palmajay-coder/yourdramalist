// Spotlight: limited-time, hand-picked catalogs at the top of Discover, also available in Nuvio.
// - "Watch this while they play GTA 6" runs until the winter list begins (midnight Pacific, December 1, 2026).
// - A holiday or seasonal list for every month, which changes by itself at midnight Pacific on the 1st.
// Both sit under one "Spotlight" heading with one timer counting to the end of the month.
// Discover's country filter applies: a country sees its own hand-picked titles first, then the list is topped up
// with that country's best-rated titles on the same theme (THEMES below).
import {blob} from "https://esm.town/v/std/blob/main.ts";
import {normalizeTitle, posterUrl} from "./collections.ts";
import {pacificDate, pacificMidnight} from "./pacificTime.ts";

type Storage = {load: () => Promise<any>; save: (value: any) => Promise<any>};
export type Country = "KR" | "JP" | "CN" | "TW" | "TH";
type Pick = {title: string; year: number; country: Country; kind: "tv" | "movie"; alt?: string[]};
export type SpecialItem = {kind: "tv" | "movie"; id: number; name: string; poster: string; overview: string; date: string; score: number};
type Spotlight = {id: string; name: string; plainName?: string; until: string; titles: Pick[]; theme?: Theme};
/** What a list is about, for topping it up: TMDB keywords (any of them), then a TMDB genre (any of "a|b") if still short. */
type Theme = {keywords?: string[]; genre?: string};
export const SPOTLIGHT_COUNTRIES: Record<string, Country> = {"3": "KR", "2": "CN", "1": "JP", "5": "TW", "6": "TH"};
/** A filtered list is topped up to this many titles; one with fewer than MIN_LIST is left out for that country. */
const FULL_LIST = 15, MIN_LIST = 5;

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

/** The theme of each list, used to top it up for a country (keyed by "gta6" or the month number). */
export const THEMES: Record<string, Theme> = {
  gta6: {genre: "35"},
  1: {genre: "18"},
  2: {keywords: ["romance", "first love"], genre: "10749|35"},
  3: {keywords: ["romantic comedy", "romance"], genre: "10749|35"},
  4: {keywords: ["romance", "cherry blossom"], genre: "10749|35"},
  5: {genre: "10751"},
  6: {keywords: ["first love", "summer", "youth"], genre: "10749|35"},
  7: {keywords: ["beach", "island", "summer vacation"], genre: "35"},
  8: {keywords: ["coming of age", "summer"], genre: "18"},
  9: {keywords: ["historical", "period drama", "joseon dynasty"], genre: "36|10768"},
  10: {keywords: ["horror", "ghost", "zombie"], genre: "27|9648"},
  11: {genre: "10751"},
  12: {keywords: ["christmas", "winter", "snow"], genre: "10749|10751"},
};
/** One list per month (1 = January), chosen for that month's holiday or season. */
/**
 * One list per month (1 = January). plainName replaces a Korea-only name when the list is shown for one country,
 * since the country is then added in brackets ("Horror Night (Japan)").
 */
export const MONTHLY: Record<number, {name: string; plainName?: string; titles: Pick[]}> = {
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
  10: {name: "K-Horror Night", plainName: "Horror Night", titles: [
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

/**
 * A country's own holiday list for a month, in place of the usual one when Discover is filtered to that country.
 * These have no hand-picks: each fills with the country's best-rated titles on its theme.
 */
export const HOLIDAYS: Partial<Record<Country, Record<number, {name: string; theme: Theme}>>> = {
  JP: {
    7: {name: "Tanabata Wishes", theme: {keywords: ["romance", "long-distance relationship", "first love"], genre: "10749|35"}},
    8: {name: "Obon Nights", theme: {keywords: ["summer", "festival", "ghost"], genre: "18|9648"}},
    9: {name: "Moon Viewing Night", theme: {keywords: ["family", "slice of life"], genre: "10751"}},
    12: {name: "Christmas Eve Date Night", theme: {keywords: ["christmas", "romance"], genre: "10749|35"}},
  },
  CN: {
    2: {name: "Spring Festival Reunion", theme: {keywords: ["chinese new year", "family"], genre: "10751"}},
    8: {name: "Qixi Sweethearts", theme: {keywords: ["romance", "first love"], genre: "10749|35"}},
    9: {name: "Mid-Autumn Reunion", theme: {keywords: ["family", "historical"], genre: "10751"}},
    11: {name: "Singles Day", theme: {keywords: ["single", "romantic comedy", "dating"], genre: "35|10749"}},
  },
  TW: {
    2: {name: "Spring Festival Reunion", theme: {keywords: ["chinese new year", "family"], genre: "10751"}},
    8: {name: "Ghost Month Chills", theme: {keywords: ["ghost", "horror", "supernatural"], genre: "27|9648"}},
    9: {name: "Mid-Autumn Reunion", theme: {keywords: ["family"], genre: "10751"}},
  },
  TH: {
    4: {name: "Songkran Splash", theme: {keywords: ["summer", "beach", "friendship"], genre: "35"}},
    11: {name: "Loy Krathong Lovers", theme: {keywords: ["romance", "first love"], genre: "10749|35"}},
  },
};
export const COUNTRY_NAMES: Record<Country, string> = {KR: "South Korea", JP: "Japan", CN: "China", TW: "Taiwan", TH: "Thailand"};
/** A list's name: as is for every country together, or "Name (Country)" for one country, as in Weekly Picks. */
export function spotlightName(list: {name: string; plainName?: string}, country?: Country) {
  return country ? (list.plainName || list.name) + " (" + COUNTRY_NAMES[country] + ")" : list.name;
}

/**
 * "Dramas With a Satisfying Ending": what the + search shows for "satisfying ending", "happy ending" and the like.
 * Hand-picked from fan roundups (Screen Rant, KbizoOm, Startefacts) and MyDramaList happy-ending lists, leaving
 * out endings those sources call divisive or sad; then topped up with TMDB titles tagged "happy ending".
 * Not a Spotlight list: it never ends and is not on Discover.
 */
export type Trope = Spotlight & {pattern: RegExp};
export const ENDINGS: Trope = {
  id: "endings",
  name: "Satisfying Endings",
  pattern: /\b(satisf\w*|happy|good|great|best|perfect)\s+end(ing|ings)?\b/i,
  until: "2100-01-01T00:00:00.000Z",
  theme: {keywords: ["happy ending"], genre: "18"},
  titles: [
    tv("Bon Appétit, Your Majesty", 2025, "KR", ["Bon Appetit, Your Majesty", "The Tyrant's Chef"]), tv("Hometown Cha-Cha-Cha", 2021), tv("Healer", 2014),
    tv("Move to Heaven", 2021), tv("Weightlifting Fairy Kim Bok-joo", 2016, "KR", ["Weightlifting Fairy Kim Bok Joo"]), tv("Misaeng", 2014, "KR", ["Misaeng: Incomplete Life"]),
    tv("Go Back Couple", 2017), tv("Itaewon Class", 2020), tv("Signal", 2016), tv("Because This Is My First Life", 2017), tv("Fight for My Way", 2017),
    tv("Another Miss Oh", 2016, "KR", ["Another Oh Hae-young"]), tv("It's Okay to Not Be Okay", 2020), tv("Flower of Evil", 2020), tv("Tomorrow", 2022),
    tv("The King in Love", 2017, "KR", ["The King Loves"]), tv("Fall in Love", 2021, "CN"), tv("Love and Redemption", 2020, "CN"),
  ],
};

/**
 * Trope search: what people type in the + search ("enemies to lovers", "second lead syndrome") and the row it brings
 * up, named with the label fans use. Phrases come from fan glossaries and trope roundups (KDramaLove's 180 clichés,
 * DRAMA MOOD, txdonut, Screen Rant, Tatler, Soompi, Pinkvilla, manhwa trope guides). Titles are TMDB's matching tags
 * (best rated, all five countries) with no genre fallback, so a row never fills with unrelated dramas; hand-picked
 * titles lead a row where fans' favorites are known. A row with fewer than five titles is not shown.
 */
const never = "2100-01-01T00:00:00.000Z";
const trope = (id: string, name: string, pattern: RegExp, keywords: string[], titles: Pick[] = []): Trope => ({id, name, pattern, until: never, theme: {keywords}, titles});
export const TROPES: Trope[] = [
  ENDINGS,
  trope("sad-ending", "Tearjerkers", /\b(sad|tragic|bittersweet|heartbreaking)\s+end(ing|ings)?\b|\btear[\s-]?jerkers?\b|\bmelodramas?\b|\bmakes?\s+(you|me)\s+cry\b/i,
    ["tragedy", "tragic love", "terminal illness", "sad ending"]),
  trope("enemies-to-lovers", "Enemies to Lovers", /\b(enem(y|ies)|rivals?)[\s-]+to[\s-]+(friends[\s-]+to[\s-]+)?lovers?\b|\bhate[\s-]+to[\s-]+love\b/i,
    ["enemies to lovers", "love-hate relationship", "rivalry"]),
  trope("contract-marriage", "Contract Marriage", /\b(contract|fake|pretend|arranged)\s+(marriage|relationship|dating|boyfriend|girlfriend|wife|husband|couple)\b|\bmarriage\s+of\s+convenience\b/i,
    ["contract marriage", "fake relationship", "marriage of convenience", "arranged marriage"]),
  trope("office-romance", "Office Romance", /\b(office|workplace)\s+romance\b|\bboss\s+(and|&|x)\s+secretary\b|\bceo\s+romance\b/i,
    ["office romance", "workplace romance"]),
  trope("second-lead", "Second Lead Syndrome", /\bsecond[\s-]+(male\s+|female\s+)?lead\b|\bsls\b/i,
    ["love triangle", "unrequited love"]),
  trope("revenge", "Revenge Dramas", /\brevenge\b|\bvengeance\b/i, ["revenge"]),
  trope("time-travel", "Time Slip and Regression", /\btime[\s-]+(travel\w*|slip|loop)\b|\bregress(ion|or|ors)\b|\breborn\b|\brebirth\b|\bsecond\s+chance\b/i,
    ["time travel", "time loop", "second chance"]),
  trope("body-swap", "Body Swap", /\b(body|soul|gender)[\s-]+swap\w*\b|\btransmigrat\w*\b/i, ["body swap"]),
  trope("slow-burn", "Slow Burn", /\bslow[\s-]+burn\b/i, ["slow burn"]),
  trope("childhood-friends", "Childhood Friends to Lovers", /\bchildhood\s+(friends?|sweethearts?|love)\b|\bfriends[\s-]+to[\s-]+lovers?\b/i,
    ["childhood friends", "childhood sweetheart", "friends to lovers"],
    [tv("Love Next Door", 2024), tv("Welcome to Samdal-ri", 2023)]),
  trope("rich-poor", "Chaebol Romance", /\bchaebol\w*\b|\brich\s+(man|guy|boy)\s+poor\s+(woman|girl)\b|\bcinderella\s+(story|romance)\b|\bcandy\s+girl\b/i,
    ["rich man poor woman", "chaebol", "cinderella", "class differences"]),
  trope("reincarnation", "Reincarnation", /\breincarnat\w*\b|\bpast\s+li(fe|ves)\b/i, ["reincarnation", "past life"]),
  trope("childhood-connection", "Childhood Connection", /\bchildhood\s+connections?\b|\bmet\s+as\s+(kids|children)\b|\bfated\s+childhood\b|\bwe'?ve\s+met\s+before\b/i,
    ["childhood friends", "childhood sweetheart"],
    [tv("Healer", 2014), tv("It's Okay to Not Be Okay", 2020), tv("What's Wrong with Secretary Kim", 2018, "KR", ["Why Secretary Kim"]), tv("While You Were Sleeping", 2017),
     tv("Tomorrow", 2022), tv("Lovely Runner", 2024), tv("Just Between Lovers", 2017, "KR", ["Rain or Shine"]), tv("Serendipity's Embrace", 2024)]),
];
export const tropeById = (id: string) => TROPES.find(t => t.id === id);

/** The current month's list: its name, titles and end (midnight Pacific on the 1st of next month). */
/** With a country that has its own holiday that month, its holiday list (no hand-picks, filled by theme). */
export function monthlySpotlight(time: number, country?: Country): Spotlight {
  const {date} = pacificDate(time);
  const month = date.getUTCMonth() + 1;
  const until = new Date(pacificMidnight(new Date(Date.UTC(date.getUTCFullYear(), month, 1)))).toISOString();
  const holiday = country && HOLIDAYS[country]?.[month];
  if (holiday) return {id: "monthly", name: holiday.name, until, titles: [], theme: holiday.theme};
  return {id: "monthly", name: MONTHLY[month].name, plainName: MONTHLY[month].plainName, until, titles: MONTHLY[month].titles, theme: THEMES[month]};
}
/** The Spotlight lists running at a given moment, GTA 6 first. */
export function activeSpotlights(time: number, gta: Spotlight = GTA6, country?: Country): Spotlight[] {
  return [...(time < Date.parse(gta.until) ? [{theme: THEMES.gta6, ...gta}] : []), monthlySpotlight(time, country)];
}
const LANGUAGE: Record<string, string> = {KR: "ko", JP: "ja", CN: "zh", TW: "zh", TH: "th"};
const DAY = 86400000;

export function createSpecialCatalog(deps: {tmdb: (path: string, params?: Record<string, string>) => Promise<any>; now?: () => number; storage?: Storage; lists?: (time: number, country?: Country) => Spotlight[];
  /** Without a country, top up from these countries together (the endings list); Spotlight leaves this out. */ fillCountries?: Country[];
  /** How many titles a topped-up list holds (15 for Spotlight). */ fullList?: number;
  /** Fewest titles a list without a country needs to show (1 for Spotlight; 5 for trope rows). */ minList?: number}) {
  const fullList = deps.fullList || FULL_LIST;
  const now = deps.now || Date.now, listsAt = deps.lists || ((time: number, country?: Country) => activeSpotlights(time, GTA6, country));
  const cache = new Map<string, {item: SpecialItem | null; expires: number}>();
  // Top-ups per list, month and country, kept a week so a country's list stays the same from day to day.
  const fills = new Map<string, {items: SpecialItem[]; expires: number}>();
  let ready: Promise<void> | undefined, saving = Promise.resolve();
  const bounded = async <T>(p: Promise<T>) => { let t: any; try { return await Promise.race([p, new Promise<undefined>(r => { t = setTimeout(r, 1000); })]); } finally { clearTimeout(t); } };
  async function init() {
    ready ??= (async () => {
      try {
        const data = deps.storage ? await bounded(deps.storage.load()) : null;
        // Older saves were just the matches; newer ones are {matches, fills}.
        const matches = Array.isArray(data) ? data : data?.matches, saved = Array.isArray(data?.fills) ? data.fills : [];
        if (Array.isArray(matches)) for (const [k, v] of matches) if (v && typeof v.expires === "number") cache.set(k, v);
        for (const [k, v] of saved) if (v && typeof v.expires === "number" && Array.isArray(v.items)) fills.set(k, v);
      } catch { /* Start empty. */ }
    })();
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

  /** A TMDB keyword's id, remembered for 90 days (null if TMDB has no such keyword). */
  async function keywordId(name: string): Promise<number | null> {
    const key = "keyword:" + name, hit = cache.get(key);
    if (hit && hit.expires > now()) return (hit.item as any)?.id ?? null;
    const data = await deps.tmdb("search/keyword", {query: name});
    const found = (Array.isArray(data?.results) ? data.results : []).find((r: any) => normalizeTitle(String(r?.name || "")) === normalizeTitle(name));
    cache.set(key, {item: found ? {id: Number(found.id)} as any : null, expires: now() + 90 * DAY});
    return found ? Number(found.id) : null;
  }

  /** The country's best-rated titles on the list's theme, leaving out titles already on the list. */
  async function topUp(theme: Theme, countries: Country[], have: SpecialItem[], count: number): Promise<SpecialItem[]> {
    const keywords = (await Promise.all((theme.keywords || []).map(name => keywordId(name).catch(() => null)))).filter(Boolean).join("|");
    if (!keywords && !theme.genre) return [];
    const today = new Date(now()).toISOString().slice(0, 10), seen = new Set(have.map(item => item.kind + ":" + item.id));
    const find = async (kind: "tv" | "movie", votes: number, average: number, by: "keywords" | "genre", sort = "vote_average.desc") => {
      const params: Record<string, string> = {with_origin_country: countries.join("|"), include_adult: "false", language: "en-US", sort_by: sort, "vote_count.gte": String(votes), "vote_average.gte": String(average), without_genres: "16,99,10763,10764,10767", [kind === "tv" ? "first_air_date.lte" : "primary_release_date.lte"]: today, page: "1"};
      if (by === "keywords") params.with_keywords = keywords; else params.with_genres = theme.genre!;
      const data = await deps.tmdb("discover/" + kind, params);
      return (Array.isArray(data?.results) ? data.results : [])
        .filter((r: any) => !r.adult && posterUrl(r.poster_path) && (kind !== "tv" || (Array.isArray(r.origin_country) && r.origin_country.some((c: string) => countries.includes(c as Country)))))
        .map((r: any): SpecialItem => ({kind, id: Number(r.id), name: String(r.name || r.title || "").trim(), poster: posterUrl(r.poster_path)!, overview: String(r.overview || ""), date: String(r.first_air_date || r.release_date || ""), score: Number(r.vote_average) || 0}))
        .filter((item: SpecialItem) => item.name);
    };
    const found: SpecialItem[] = [];
    const add = (more: SpecialItem[]) => { for (const item of more.sort((a, b) => b.score - a.score || a.id - b.id)) if (!seen.has(item.kind + ":" + item.id)) { seen.add(item.kind + ":" + item.id); found.push(item); } };
    // Well-known titles first. TMDB has few votes and tags for Chinese, Taiwanese and Thai titles, so a short
    // list then relaxes the rating floor, then takes the most popular tagged titles, then falls back to the genre.
    const tiers: [number, number, "keywords" | "genre", string?][] = [];
    if (keywords) tiers.push([20, 6.5, "keywords"], [5, 6, "keywords"], [1, 0, "keywords", "popularity.desc"]);
    if (theme.genre) tiers.push([20, 6.5, "genre"], [5, 6, "genre"], [1, 0, "genre", "popularity.desc"]);
    for (const [votes, average, by, sort] of tiers) {
      if (found.length >= count) break;
      add((await Promise.all((["tv", "movie"] as const).map(kind => find(kind, votes, average, by, sort)))).flat());
    }
    return found.slice(0, count);
  }

  /**
   * Every Spotlight list running now (GTA 6 first, then the month's list), with its titles. With a country
   * (KR, JP, CN, TW or TH), each list keeps that country's hand-picked titles and is topped up to 15 on its theme.
   */
  async function current(country?: Country) {
    await init();
    const lists = [];
    let changed = false;
    for (const list of listsAt(now(), country)) {
      const picks = country ? {...list, titles: list.titles.filter(pick => pick.country === country)} : list;
      const result = await resolve(picks);
      changed ||= result.changed;
      let items = result.items;
      const fillFrom = country ? [country] : deps.fillCountries;
      if (fillFrom?.length && list.theme && items.length < fullList) {
        const key = "v2:" + list.id + ":" + list.name + ":" + fillFrom.join("|"), hit = fills.get(key);
        let extra = hit && hit.expires > now() ? hit.items : null;
        if (!extra) {
          try {
            extra = await topUp(list.theme, fillFrom, items, fullList - items.length);
            // A full list is kept a week; a short one is tried again the next day.
            fills.set(key, {items: extra, expires: now() + (items.length + extra.length >= fullList ? 7 : 1) * DAY}); changed = true;
            console.log(JSON.stringify({specialFill: list.name, country: fillFrom.join("|"), picks: items.length, added: extra.length}));
          }
          catch { extra = hit?.items || []; }
        }
        const seen = new Set(items.map(item => item.kind + ":" + item.id));
        items = [...items, ...extra.filter(item => !seen.has(item.kind + ":" + item.id))].slice(0, fullList);
      }
      if (country ? items.length < MIN_LIST : items.length < (deps.minList || 1)) continue;
      const url = "ydl-special:" + list.id + (country ? ":" + country : "");
      lists.push({catalog: {kind: "special", id: list.id, url, name: spotlightName(list, country), type: "series", until: list.until, ...(country ? {country} : {})}, items});
    }
    if (changed && deps.storage) {
      for (const [k, v] of fills) if (v.expires <= now()) fills.delete(k);
      const rows = {matches: [...cache], fills: [...fills]};
      saving = saving.catch(() => {}).then(() => deps.storage!.save(rows)); await bounded(saving).catch(() => {});
    }
    return {lists};
  }
  return {current};
}

let shared: ReturnType<typeof createSpecialCatalog> | undefined;
/** The site's Spotlight lists right now, using the shared TMDB limits. */
export async function specialCatalog(country?: Country) {
  const {collections} = await import("./collectionService.ts");
  shared ??= createSpecialCatalog({tmdb: collections.tmdb, storage: {load: () => blob.getJSON("special:v1"), save: value => blob.setJSON("special:v1", value)}});
  return shared.current(country);
}

const tropeCatalogs = new Map<string, ReturnType<typeof createSpecialCatalog>>();
/** One trope row: its hand-picked titles, then TMDB's matching titles from all five countries, 30 in all. */
export async function tropeCatalog(id: string) {
  const list = tropeById(id);
  if (!list) return {lists: []};
  const {collections} = await import("./collectionService.ts");
  // Satisfying Endings keeps the store it had before the other tropes were added.
  const key = id === "endings" ? "special-endings:v1" : "special-trope-" + id + ":v1";
  if (!tropeCatalogs.has(id)) tropeCatalogs.set(id, createSpecialCatalog({tmdb: collections.tmdb, lists: () => [list], fillCountries: ["KR", "CN", "JP", "TW", "TH"], fullList: 30, minList: 5,
    storage: {load: () => blob.getJSON(key), save: value => blob.setJSON(key, value)}}));
  return tropeCatalogs.get(id)!.current();
}
/** Satisfying Endings (kept for callers from before the other tropes). */
export const endingsCatalog = () => tropeCatalog("endings");

/** GET /api/catalogs/special for the Discover Spotlight, with each title's usual TMDB poster; ?list=endings for the search's endings row. */
export async function handleSpecialCatalog(req: Request) {
  if (req.method !== "GET") return new Response("Method not allowed", {status: 405, headers: {Allow: "GET"}});
  const headers = {"cache-control": "no-store"};
  try {
    // ?list=<trope id> for the + search's trope rows.
    const listId = new URL(req.url).searchParams.get("list");
    if (listId !== null) return tropeById(listId) ? Response.json(await tropeCatalog(listId), {headers}) : Response.json({error: "Choose a list."}, {status: 400, headers});
    // ?country= takes Discover's filter value ("3" = South Korea); without it every country's picks show (Nuvio's original lists).
    const value = new URL(req.url).searchParams.get("country");
    if (value !== null && !SPOTLIGHT_COUNTRIES[value]) return Response.json({error: "Choose a country."}, {status: 400, headers});
    return Response.json(await specialCatalog(value === null ? undefined : SPOTLIGHT_COUNTRIES[value]), {headers});
  } catch {
    return Response.json({error: "Spotlight is temporarily unavailable."}, {status: 502, headers});
  }
}
