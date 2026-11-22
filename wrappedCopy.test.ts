// Wrapped's narrator (wrappedCopy.ts): fixed rules, a stable pick, approved copy first, nothing the data doesn't support.
import {wrappedCopy} from "./wrappedCopy.ts";
let passed = 0;
const ok = (value: unknown, message: string) => { if (!value) throw Error(message); };
async function test(name: string, fn: () => unknown) { await fn(); passed++; console.log("PASS " + name); }
const plain = (s: string | null) => (s || "").replace(/\*\*/g, "");

const base = (extra: Record<string, unknown> = {}) => ({
  username: "jaesan",
  statusCounts: {completed: 79}, types: {dramas: 23, movies: 56, tvShows: 0},
  viewingTime: {hours: 388.8, days: 16.2},
  genres: [{genre: "Drama", count: 36}, {genre: "Thriller", count: 23}, {genre: "Crime", count: 18}],
  countries: [{country: "South Korea", count: 50}, {country: "Japan", count: 20}],
  decades: [{decade: "2000s", count: 40}, {decade: "2010s", count: 30}],
  actors: [{name: "Moon Lee", count: 4}],
  topDramas: [{slug: "1-d", title: "D", score: 10}], topMovies: [{slug: "1-m", title: "M", score: 9}],
  ratings: {rated: 79, average: 8.89, distribution: [{score: 10, count: 34}, {score: 8, count: 45}]},
  ...extra,
});
const countries = (list: [string, number][], extra: Record<string, unknown> = {}) => plain(wrappedCopy(base({countries: list.map(([country, count]) => ({country, count})), ...extra})).countries);

await test("the same data always gives the same lines, and every slide gets one", () => {
  const a = wrappedCopy(base()), b = wrappedCopy(base());
  ok(JSON.stringify(a) === JSON.stringify(b), "stable");
  for (const key of ["completed", "time", "genre", "countries", "eras", "actor", "topDrama", "topMovie", "ratings"]) ok(typeof (a as any)[key] === "string" && (a as any)[key].length > 10, "a line for " + key);
  const lines = Object.values(a).filter(Boolean) as string[];
  ok(new Set(lines).size === lines.length, "no line is used twice");
  ok(lines.every(l => l.split(/\s+/).length <= 22), "short lines");
});

await test("a different user or changed stats can change the wording, but only within the right category", () => {
  const seen = new Set<string>();
  for (let n = 20; n < 100; n++) seen.add(plain(wrappedCopy(base({statusCounts: {completed: n}})).completed));
  ok(seen.size > 1 && [...seen].every(l => !/Triple digits|warming up/.test(l)), "20 to 99 completed: medium lines only: " + [...seen]);
  ok(/Triple digits|legacy|credits|lived in them/.test(plain(wrappedCopy(base({statusCounts: {completed: 150}})).completed)), "100+: large");
  ok(/starts somewhere|made the cut|warming up|journey has begun/.test(plain(wrappedCopy(base({statusCounts: {completed: 5}})).completed)), "small lists");
  ok(/OST|dedication|commitment|tissues/.test(plain(wrappedCopy(base()).time)), "300+ hours");
  ok(/minute|feelings|marathon|nights/.test(plain(wrappedCopy(base({viewingTime: {hours: 40, days: 1.7}})).time)), "under 100 hours");
});

await test("countries: ties are caught first, then close races, then a clear winner", () => {
  const two = countries([["Japan", 29], ["South Korea", 29], ["Hong Kong", 14]]);
  ok(/Two countries|refuses to choose|tie|sharing the spotlight/.test(two), "a tie of two: " + two);
  ok(!/Hong Kong/.test(two), "never names third place");
  const three = countries([["Japan", 10], ["South Korea", 10], ["China", 10]]);
  ok(/no borders|several|showdown|favorites/.test(three), "a tie of three or more: " + three);
  const close = countries([["Japan", 31], ["South Korea", 29]]);
  ok(/close race|Neck and neck|friendly competition|made it interesting/.test(close) && /Japan/.test(close) && !/South Korea/.test(close), "a close race names only the winner: " + close);
  const near = countries([["Japan", 100], ["South Korea", 92]]);
  ok(/close race|Neck and neck|friendly competition|made it interesting/.test(near), "under 10% ahead is close too");
  const clear = countries([["Japan", 40], ["South Korea", 20]]);
  ok(!/close race|Neck and neck|friendly|interesting|tie/.test(clear) && !/South Korea/.test(clear), "a clear winner: " + clear);
  ok(wrappedCopy(base({countries: []})).countries === null, "no countries, no line");
});

await test("country lines only make claims the data supports (romance, episodes); unknown countries get the generic lines", () => {
  const romanceLines = /romance|love stories/i, episodeLines = /another episode|One more K-drama|long story|turned into another|enough episodes/;
  for (let i = 0; i < 40; i++) {
    const line = countries([["China", 60], ["Japan", 5]], {username: "u" + i, types: {dramas: 5, movies: 60, tvShows: 0}, genres: [{genre: "Thriller", count: 30}]});
    ok(!romanceLines.test(line) && !episodeLines.test(line), "no romance or episode claims for a film-heavy thriller fan: " + line);
  }
  const lines = new Set<string>();
  for (let i = 0; i < 40; i++) lines.add(countries([["China", 60], ["Japan", 5]], {username: "u" + i, types: {dramas: 60, movies: 5, tvShows: 0}, genres: [{genre: "Romance", count: 40}]}));
  ok([...lines].some(l => romanceLines.test(l)), "romance lines can appear for romance fans");
  const other = countries([["United States", 40], ["Japan", 2]]);
  ok(/United States/.test(other), "generic lines name the country: " + other);
});

await test("eras use the approved decade lines exactly, with a tie line and a fallback", () => {
  const approved: Record<string, string> = {
    "1960s": "Before streaming, timeless classics were already stealing the show.",
    "1970s": "Martial arts legends, real stunts, and pure movie magic.",
    "1980s": "Big action, bold soundtracks, and just the right amount of chaos.",
    "1990s": "VHS tapes, iconic dramas, and movies worth rewinding.",
    "2000s": "Flip phones, legendary OSTs, and dramas with absolutely no chill.",
    "2010s": "Bigger productions, global hits, and the rise of \"one more episode.\"",
    "2020s": "Streaming sensations, cinematic blockbusters, and plot twists heard worldwide.",
  };
  for (const [decade, line] of Object.entries(approved)) {
    const other = decade === "2000s" ? "1990s" : "2000s";
    ok(wrappedCopy(base({decades: [{decade, count: 9}, {decade: other, count: 3}]})).eras === line, decade);
  }
  ok(/Two eras/.test(wrappedCopy(base({decades: [{decade: "2000s", count: 5}, {decade: "2010s", count: 5}]})).eras!), "a tie");
  ok(/Every decade/.test(wrappedCopy(base({decades: [{decade: "1950s", count: 9}, {decade: "2000s", count: 1}]})).eras!), "outside the approved range");
  ok(wrappedCopy(base({decades: [{decade: "2000s", count: 9}]})).eras === null, "one decade: no slide, no line");
});

await test("ratings: the approved line for favorable scores, honest lines otherwise, nothing without ratings", () => {
  const ratings = (average: number, tens: number, rated = 40) => plain(wrappedCopy(base({ratings: {rated, average, distribution: [{score: 10, count: tens}]}})).ratings);
  ok(ratings(8.9, 20) === "You believe in giving credit where the drama is due.", "generous critic");
  ok(ratings(7.8, 2) === "You believe in giving credit where the drama is due.", "drama enthusiast");
  ok(/stars easily|Tough crowd|High standards|perfect score from you/.test(ratings(5.9, 0)), "tough critic");
  for (let i = 0; i < 30; i++) ok(!/perfect score from you/.test(plain(wrappedCopy(base({username: "t" + i, ratings: {rated: 40, average: 6, distribution: [{score: 10, count: 1}]}})).ratings)), "a tough critic with one 10 never hears 'a perfect score from you?'");
  ok(/hits, some misses|call it like you see it|Not every drama|balance/.test(ratings(7, 3)), "balanced reviewer");
  ok(wrappedCopy(base({ratings: {rated: 0, average: null, distribution: []}})).ratings === null, "no ratings");
});

await test("genre, actor and #1 lines respect their conditions; missing data gives null", () => {
  for (let i = 0; i < 30; i++) {
    const s = wrappedCopy(base({username: "g" + i, genres: [{genre: "Thriller", count: 20}, {genre: "Crime", count: 19}], actors: [{name: "A", count: 1}], topDramas: [{slug: "x", title: "X", score: 8}]}));
    ok(!/not even close/.test(s.genre!), "a close genre race never says 'not even close'");
    ok(!/keeps showing up|If \*\*A\*\* is in it/.test(s.actor!), "one title isn't 'keeps showing up'");
    ok(!/perfect 10/.test(s.topDrama!), "an 8 isn't a perfect 10");
  }
  ok(/Thriller/.test(wrappedCopy(base()).genre!), "the genre is named (Drama left out)");
  const empty = wrappedCopy({username: "x", statusCounts: {completed: 0}});
  ok(Object.values(empty).every(v => v === null), "an empty list: every line null");
});
console.log(JSON.stringify({passed}));
