// Wrapped's narrator (wrappedCopy.ts): one owner-chosen line per situation, with the real numbers folded in.
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
  topDramas: [{slug: "1-d", title: "D", score: 10, cast: ["Lee Min-ho", "Kim Go-eun", "Third"]}], topMovies: [{slug: "1-m", title: "M", score: 9}],
  ratings: {rated: 79, average: 8.89, distribution: [{score: 10, count: 34}, {score: 8, count: 45}]},
  ...extra,
});
const say = (extra: Record<string, unknown> = {}) => wrappedCopy(base(extra)) as Record<string, string | null>;

await test("the owner's chosen lines, with the numbers folded in and no 'out of' totals", () => {
  const s = say();
  ok(plain(s.completed) === "You didn't just start 23 dramas and 56 movies. You finished every single one.", "completed: " + s.completed);
  ok(plain(s.time) === "16 days nonstop, fueled by snacks, tissues and zero regrets.", "time: " + s.time);
  ok(plain(s.genre) === "23 thrillers in, and you still never trust the nice guy.", "genre: " + s.genre);
  ok(plain(s.countries) === "South Korea practically took over your watchlist, with 50 titles.", "clear winner: " + s.countries);
  ok(s.eras === "Flip phones, legendary OSTs, and dramas with absolutely no chill.", "era: " + s.eras);
  ok(plain(s.actor) === "4 titles in, it's official: Moon Lee has a fan, and it's you.", "actor: " + s.actor);
  ok(plain(s.topDrama) === "Of everything you've finished, this one with Lee Min-ho and Kim Go-eun hit hardest.", "#1 drama: " + s.topDrama);
  ok(plain(s.topMovie) === "Of everything you've finished, this one hit hardest.", "#1 movie without cast");
  ok(plain(s.ratings) === "Out of everything you've watched, 34 titles earned a perfect 10. Now that's a standing ovation.", "ratings: " + s.ratings);
  ok(!Object.values(s).some(l => / of your \d|out of \d/i.test(plain(l))), "no totals anywhere");
  ok(/\*\*23\*\*/.test(s.completed!) && /\*\*Moon Lee\*\*/.test(s.actor!), "numbers and names are bold");
});

await test("countries: ties first, then a close race, then a clear winner; only first place is named", () => {
  const c = (list: [string, number][]) => plain(say({countries: list.map(([country, count]) => ({country, count}))}).countries);
  ok(c([["Japan", 29], ["South Korea", 29], ["Hong Kong", 14]]) === "Japan and South Korea tied at 29 each, because choosing favorites isn't your thing.", "a tie of two");
  ok(c([["Japan", 9], ["South Korea", 9], ["China", 9]]) === "Japan, South Korea and China tied at 9 each, because choosing favorites isn't your thing.", "a tie of three");
  ok(c([["South Korea", 31], ["Japan", 29]]) === "It was neck and neck, but South Korea pulled ahead with 31 titles.", "close (3 or fewer ahead)");
  ok(/neck and neck/.test(c([["Japan", 100], ["South Korea", 92]])), "close (under 10% ahead)");
  ok(c([["Japan", 40], ["South Korea", 20]]) === "Japan practically took over your watchlist, with 40 titles.", "clear winner");
  ok(c([["Japan", 1]]) === "Japan practically took over your watchlist, with 1 title.", "only one country, singular");
  ok(say({countries: []}).countries === null, "no countries");
});

await test("every genre has its own line, with a fallback for the rest", () => {
  const genres = ["Thriller", "Romance", "Comedy", "Mystery", "Crime", "Action", "Action & Adventure", "Adventure", "Fantasy", "Sci-Fi & Fantasy", "Science Fiction", "Horror", "Family", "History", "War", "War & Politics", "Music", "Animation", "Documentary"];
  const lines = genres.map(g => plain(say({genres: [{genre: "Drama", count: 50}, {genre: g, count: 12}]}).genre));
  ok(new Set(lines).size === lines.length && lines.every(l => l.startsWith("12 ")), "unique, each starting with the number: " + lines.join(" | "));
  ok(plain(say({genres: [{genre: "Western", count: 1}]}).genre) === "1 Western title, and you know exactly what you like.", "fallback, singular");
  ok(say({genres: [{genre: "Drama", count: 9}]}).genre === null, "only Drama: no line");
});

await test("eras use the approved decade lines word for word, with a tie line and a fallback", () => {
  const approved: Record<string, string> = {
    "1960s": "Before streaming, timeless classics were already stealing the show.",
    "1970s": "Martial arts legends, real stunts, and pure movie magic.",
    "1980s": "Big action, bold soundtracks, and just the right amount of chaos.",
    "1990s": "VHS tapes, iconic dramas, and movies worth rewinding.",
    "2000s": "Flip phones, legendary OSTs, and dramas with absolutely no chill.",
    "2010s": "Bigger productions, global hits, and the rise of \"one more episode.\"",
    "2020s": "Streaming sensations, cinematic blockbusters, and plot twists heard worldwide.",
  };
  for (const [decade, line] of Object.entries(approved)) ok(say({decades: [{decade, count: 9}, {decade: decade === "2000s" ? "1990s" : "2000s", count: 3}]}).eras === line, decade);
  ok(/Two eras/.test(say({decades: [{decade: "2000s", count: 5}, {decade: "2010s", count: 5}]}).eras!), "tie");
  ok(/Every decade/.test(say({decades: [{decade: "1950s", count: 9}, {decade: "2000s", count: 1}]}).eras!), "outside the approved range");
  ok(say({decades: [{decade: "2000s", count: 9}]}).eras === null, "one decade: no line");
});

await test("small numbers, missing data, and ratings without perfect 10s read correctly", () => {
  ok(plain(say({types: {dramas: 0, movies: 3, tvShows: 0}, statusCounts: {completed: 3}}).completed) === "You didn't just start 3 movies. You finished every single one.", "movies only");
  ok(plain(say({statusCounts: {completed: 1}, types: {dramas: 1, movies: 0}}).completed) === "You didn't just start it. You finished it.", "one title");
  ok(plain(say({viewingTime: {hours: 5, days: 0.2}}).time) === "5 hours nonstop, fueled by snacks, tissues and zero regrets.", "under a day");
  ok(plain(say({actors: [{name: "A", count: 1}]}).actor) === "One title in, and A already has a fan: you.", "one title with an actor");
  ok(plain(say({ratings: {rated: 5, average: 9, distribution: [{score: 10, count: 1}]}}).ratings).startsWith("Out of everything you've watched, 1 title earned a perfect 10."), "one perfect 10");
  ok(say({ratings: {rated: 20, average: 8, distribution: [{score: 8, count: 20}]}}).ratings === "You believe in giving credit where the drama is due.", "no 10s but favorable: the approved line");
  ok(/don't hand out stars easily/.test(say({ratings: {rated: 20, average: 5.5, distribution: [{score: 5, count: 20}]}}).ratings!), "tough critic");
  ok(/honest score/.test(say({ratings: {rated: 20, average: 7, distribution: [{score: 7, count: 20}]}}).ratings!), "balanced");
  ok(say({ratings: {rated: 0, average: null, distribution: []}}).ratings === null, "no ratings");
  ok(Object.values(wrappedCopy({username: "x", statusCounts: {completed: 0}})).every(v => v === null), "an empty list: every line null");
  ok(JSON.stringify(say()) === JSON.stringify(say()), "same data, same words");
});
console.log(JSON.stringify({passed}));
