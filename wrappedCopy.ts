// @ts-nocheck -- also injected into the setup page (via .toString()), so everything lives inside one function.
// Wrapped's narrator: one short, playful line per slide that reacts to the user's real stats.
// How a line is chosen (never random per open):
//   1. classify the slide's stats into one category;
//   2. keep only the variants whose claims the data supports (a variant's `when`);
//   3. pick one with a stable hash of username + slide + the stats it depends on, so unchanged data keeps its wording
//      and a change in those stats can change it;
//   4. approved copy (the ratings sentence, the seven decade lines) always wins where it applies;
//   5. a line already used on an earlier slide is skipped for the next eligible one.
// Lines may hold **bold** parts. A slide without the data it needs gets null (the slide shows no commentary).
export function wrappedCopy(data) {
  const user = String(data?.username || "").toLowerCase();
  const used = new Set();
  // FNV-1a: a small, stable hash.
  const hash = text => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const b = x => "**" + x + "**";
  const fill = (line, values) => line.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
  function choose(slide, signature, variants, values = {}) {
    const eligible = variants.filter(v => typeof v === "string" || v.when !== false).map(v => fill(typeof v === "string" ? v : v.text, values));
    if (!eligible.length) return null;
    const start = hash(user + "|" + slide + "|" + signature) % eligible.length;
    for (let i = 0; i < eligible.length; i++) {
      const line = eligible[(start + i) % eligible.length];
      if (!used.has(line)) { used.add(line); return line; }
    }
    return eligible[start];
  }
  const approved = line => { used.add(line); return line; };

  const completed = data?.statusCounts?.completed || 0;
  const types = data?.types || {};
  const dramas = (types.dramas || 0) + (types.tvShows || 0), movies = types.movies || 0;
  const genres = (data?.genres || []).filter(g => g.genre !== "Drama");
  const romance = genres.slice(0, 3).some(g => g.genre === "Romance");
  const out = {};

  // Completed.
  if (completed) {
    const bucket = completed < 20 ? "small" : completed < 100 ? "medium" : "large";
    out.completed = choose("completed", bucket + completed, {
      small: ["Every great watchlist starts somewhere, and yours is off to a strong start.", "A small list, but every title made the cut.",
        "Quality over quantity. Your watchlist is just warming up.", "The drama journey has begun, and it's only getting better."],
      medium: ["That's a lot of finales, plot twists and late nights.", "You don't just start stories. You finish them.",
        "Episode after episode, film after film, you saw it through.", "Your completed list is officially impressive."],
      large: ["At this point, the credits should thank you personally.", "That's not a watchlist. That's a legacy.",
        "Some people watch dramas. You've practically lived in them.", "Triple digits. The drama world salutes you."],
    }[bucket]);
  } else out.completed = null;

  // Watch time.
  const hours = data?.viewingTime?.hours || 0;
  if (hours) {
    const bucket = hours < 100 ? "short" : hours < 300 ? "mid" : "long";
    out.time = choose("time", bucket + Math.round(hours), {
      short: ["Every minute counted, and every story left a mark.", "Short on time, big on feelings.", "Not a marathon, but definitely a great run.", "A few good nights, well spent."],
      mid: ["That's a lot of \"just one more episode.\"", "Sleep schedule? Never heard of it.", "Your couch deserves a thank-you note.", "Hours well spent. Mostly."],
      long: ["That's dedication worthy of its own drama.", "At this point, the OSTs are your soundtrack.", "Some call it binge-watching. You call it commitment.", "Snacks, tissues and zero regrets."],
    }[bucket]);
  } else out.time = null;

  // Top genre ("Drama" fits almost everything, so it's left out).
  if (genres.length) {
    const top = genres[0], second = genres[1];
    out.genre = choose("genre", top.genre + top.count, [
      "{genre} keeps calling, and you keep answering.",
      "When it comes to {genre}, you know exactly what you like.",
      "Your watchlist has a favorite flavor, and it's {genre}.",
      { text: "{genre} wins again. It's not even close.", when: !second || top.count > second.count * 1.2 },
    ], { genre: b(top.genre) });
  } else out.genre = null;

  // Countries. Ties first, then a close race, then a clear winner.
  // A close race: the leader is ahead of second place by 3 titles or fewer, or by under 10% of its own count.
  const countries = (data?.countries || []).filter(x => x.country && x.country !== "Unknown" && x.count > 0);
  if (countries.length) {
    const top = countries[0].count;
    const leaders = countries.filter(x => x.count === top).map(x => x.country);
    const country = leaders[0], gap = top - (countries[leaders.length]?.count || 0);
    const signature = leaders.join("+") + top + "/" + completed;
    const values = { country: b(country), A: b(leaders[0]), B: b(leaders[1] || "") };
    const PER_COUNTRY = {
      "South Korea": ["Your heart clearly speaks fluent K-drama.", { text: "From slow-burn romances to unforgettable plot twists, South Korea has you hooked.", romance: true },
        { text: "Seoul called. You answered with another episode.", episodes: true }, { text: "One more K-drama? We both know how that ends.", episodes: true }],
      "Japan": ["J-dramas clearly know the way to your heart.", { text: "From heartfelt romances to wonderfully chaotic stories, Japan has your attention.", romance: true },
        "Plot twists, quiet moments, and all the feels. Japan understood the assignment.", "Your watch history has officially entered its J-drama era."],
      "China": [{ text: "Historical romances, epic adventures, and enough episodes to last a lifetime.", romance: true, episodes: true },
        { text: "One C-drama turned into another. And another. And another.", episodes: true },
        { text: "From palace intrigue to modern love stories, you've been living in your C-drama era.", romance: true },
        { text: "China knows how to tell a long story. And you know how to finish one.", episodes: true }],
      "Taiwan": ["Small island, big feelings. Taiwan clearly left an impression.", "Taiwanese dramas have a special place in your watch history.",
        "Some of the sweetest stories come from unexpected places. Taiwan proved it.", "Your heart took a little detour to Taiwan and decided to stay."],
      "Hong Kong": ["Action, suspense, and unmistakable Hong Kong energy. You know what you like.", "Your watch history has a flair for Hong Kong storytelling.",
        "From iconic classics to unforgettable characters, Hong Kong delivers.", "Lights, camera, Hong Kong. You've clearly found your kind of drama."],
      "Thailand": ["Thailand brought the chemistry, and you kept coming back.", { text: "From sweet romances to unexpected twists, Thai dramas won you over.", romance: true },
        "Your watch history has a serious case of Thai drama fever.", "Thailand understood the assignment: make you fall for the characters."],
      "Philippines": ["Big emotions, heartfelt stories, and a little Filipino flair.", "The Philippines knows how to deliver a story with heart.",
        { text: "From romance to family drama, Filipino storytelling has your attention.", romance: true }, "Your drama journey found a little extra heart in the Philippines."],
    };
    const GENERIC = ["{country} clearly knows how to keep you entertained.", "Your watch history has found a special place in {country}.",
      "Looks like {country} knows exactly what you like.", "Every drama journey takes you somewhere. Yours keeps returning to {country}."];
    let pool;
    if (leaders.length === 2) pool = ["Two countries. One heart. Apparently, choosing favorites isn't your thing.", "{A} or {B}? Your watch history refuses to choose.",
      "It's a tie! Both countries clearly understood the assignment.", "Two countries sharing the spotlight. Your drama journey has room for both."];
    else if (leaders.length > 2) pool = ["Your heart has no borders, and neither does your watch history.", "Why choose one country when several can share the spotlight?",
      "It's an international showdown, and everybody wins.", "Apparently, your drama passport doesn't believe in favorites."];
    else if (countries.length > 1 && (gap <= 3 || gap < top * 0.1)) pool = ["It was a close race, but {country} stole the spotlight.",
      "Neck and neck for a while, but {country} claimed the crown.", "A little friendly competition, and {country} came out on top.",
      "Your watch history made it interesting, but {country} took the lead."];
    else {
      // A line about romance needs Romance in the top 3 genres; one about episodes needs more dramas than movies.
      const own = (PER_COUNTRY[country] || GENERIC).map(v => typeof v === "string" ? v : { text: v.text, when: (!v.romance || romance) && (!v.episodes || dramas >= movies) });
      const dominant = completed && top / completed >= 0.5 ? ["{country} didn't just win. It practically took over your watchlist.", "Your drama passport has one very obvious favorite: {country}.",
        "Other countries had their moments, but {country} stole the show.", "At this point, {country} deserves its own section in your watch history."] : [];
      pool = [...own, ...dominant];
    }
    out.countries = choose("countries", signature, pool, values);
  } else out.countries = null;

  // Eras, by release decade of completed titles (MyDramaList gives no watch dates).
  const decades = (data?.decades || []).filter(d => d.count > 0);
  if (decades.length >= 2) {
    const most = Math.max(...decades.map(d => d.count));
    const leaders = decades.filter(d => d.count === most).map(d => d.decade);
    const APPROVED = {
      "1960s": "Before streaming, timeless classics were already stealing the show.",
      "1970s": "Martial arts legends, real stunts, and pure movie magic.",
      "1980s": "Big action, bold soundtracks, and just the right amount of chaos.",
      "1990s": "VHS tapes, iconic dramas, and movies worth rewinding.",
      "2000s": "Flip phones, legendary OSTs, and dramas with absolutely no chill.",
      "2010s": "Bigger productions, global hits, and the rise of \"one more episode.\"",
      "2020s": "Streaming sensations, cinematic blockbusters, and plot twists heard worldwide.",
    };
    out.eras = leaders.length > 1 ? approved("Two eras, one watchlist. Great stories never go out of style.")
      : approved(APPROVED[leaders[0]] || "Every decade brings its own drama, and you've found yours.");
  } else out.eras = null;

  // Most-watched actor.
  const actor = data?.actors?.[0];
  out.actor = actor ? choose("actor", actor.name + actor.count, [
    { text: "{name} keeps showing up, and you keep pressing play.", when: actor.count >= 3 },
    { text: "If {name} is in it, you're watching it.", when: actor.count >= 3 },
    "Your watchlist has a favorite face, and it's {name}.",
    "{name} has a fan, and it's you.",
  ], { name: b(actor.name) }) : null;

  // #1 drama and #1 movie.
  const number1 = (slide, item) => item ? choose(slide, item.slug + item.score, [
    "Some endings stay with you long after the credits.",
    "The one you'd recommend to anyone who'll listen.",
    { text: "A perfect 10, and it earned every point.", when: item.score === 10 },
    "Of everything you've finished, this one hit hardest.",
  ]) : null;
  out.topDrama = number1("topDrama", data?.topDramas?.[0]);
  out.topMovie = number1("topMovie", data?.topMovies?.[0]);

  // Ratings (personal MyDramaList scores).
  const r = data?.ratings;
  if (r?.rated && r.average != null) {
    const tens = (r.distribution || []).find(d => d.score === 10)?.count || 0, share = tens / r.rated;
    if (r.average >= 7.5) out.ratings = approved("You believe in giving credit where the drama is due."); // generous critic or drama enthusiast
    else if (r.average < 6.5 && share <= 0.05) out.ratings = choose("ratings", "tough" + r.average.toFixed(1), [
      "You don't hand out stars easily. Every point here was earned.", "Tough crowd. The dramas had to work for this one.",
      "High standards, honest scores. Writers fear you a little.", { text: "A perfect score from you? That would make headlines.", when: tens === 0 }]);
    else out.ratings = choose("ratings", "balanced" + r.average.toFixed(1), [
      "Some hits, some misses, and an honest score for every one.", "You call it like you see it, one title at a time.",
      "Not every drama is a 10, and you're not afraid to say it.", "A little praise, a little critique. The perfect balance."]);
  } else out.ratings = null;
  return out;
}
