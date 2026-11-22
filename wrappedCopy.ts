// @ts-nocheck -- also injected into the setup page (via .toString()), so everything lives inside one function.
// Wrapped's narrator: one description per slide that folds the user's real numbers into a single, flowing thought.
// Lines were chosen by the owner, one per situation. They follow fixed rules on the stats, never randomly, so the
// same data always reads the same. A slide without the data it needs gets null. Lines may hold **bold** parts.
// No "out of N" totals: only the number that matters is shown.
export function wrappedCopy(data) {
  const b = x => "**" + x + "**";
  const n = (count, one, many) => b(count) + " " + (count === 1 ? one : many);
  const and = list => list.length > 1 ? list.slice(0, -1).join(", ") + " and " + list[list.length - 1] : list[0];
  const out = {};

  // Completed: "You didn't just start 23 dramas and 56 movies. You finished every single one."
  const completed = data?.statusCounts?.completed || 0;
  const types = data?.types || {};
  const dramas = (types.dramas || 0) + (types.tvShows || 0), movies = types.movies || 0;
  const parts = [dramas ? n(dramas, "drama", "dramas") : "", movies ? n(movies, "movie", "movies") : ""].filter(Boolean);
  out.completed = !completed ? null : completed === 1 ? "You didn't just start it. You finished it."
    : "You didn't just start " + (parts.length ? and(parts) : n(completed, "title", "titles")) + ". You finished every single one.";

  // Watch time: "16 days nonstop, fueled by snacks, tissues and zero regrets."
  const hours = data?.viewingTime?.hours || 0, days = Math.round(data?.viewingTime?.days || 0);
  out.time = !hours ? null : (days >= 1 ? n(days, "day", "days") : n(Math.round(hours) || 1, "hour", "hours")) + " nonstop, fueled by snacks, tissues and zero regrets.";

  // Top genre: a line of its own for each genre ("Drama" fits almost everything, so it's left out).
  const genre = (data?.genres || []).find(g => g.genre !== "Drama");
  if (genre) {
    const c = genre.count;
    const GENRES = {
      "Thriller": () => n(c, "thriller", "thrillers") + " in, and you still never trust the nice guy.",
      "Romance": () => n(c, "love story", "love stories") + ", and your heart still falls for every confession.",
      "Comedy": () => n(c, "comedy", "comedies") + " in, and you're still laughing at the same jokes.",
      "Mystery": () => n(c, "mystery", "mysteries") + ", and you still can't resist a good whodunit.",
      "Crime": () => n(c, "crime story", "crime stories") + " in, and you could probably pass the detective exam.",
      "Action": () => n(c, "action title", "action titles") + ", and not one fight scene too many.",
      "Action & Adventure": () => n(c, "action-packed adventure", "action-packed adventures") + ", and not one fight scene too many.",
      "Adventure": () => n(c, "adventure", "adventures") + ", and you're always up for the next journey.",
      "Fantasy": () => n(c, "fantasy story", "fantasy stories") + ", and you're always ready for another world.",
      "Sci-Fi & Fantasy": () => n(c, "otherworldly story", "otherworldly stories") + ", and you're always ready for another world.",
      "Science Fiction": () => n(c, "sci-fi story", "sci-fi stories") + ", and the future has never looked more dramatic.",
      "Horror": () => n(c, "horror title", "horror titles") + ", and you still watched with the lights on. Probably.",
      "Family": () => n(c, "family story", "family stories") + ", and every one hit close to home.",
      "History": () => n(c, "historical story", "historical stories") + ", and you've practically lived through every dynasty.",
      "War": () => n(c, "war story", "war stories") + ", and every one left its mark.",
      "War & Politics": () => n(c, "story", "stories") + " of war and power, and every one left its mark.",
      "Music": () => n(c, "music story", "music stories") + ", and the soundtrack never left your head.",
      "Animation": () => n(c, "animated story", "animated stories") + ", proof that big feelings come in every style.",
      "Documentary": () => n(c, "documentary", "documentaries") + ", because real life has the best drama.",
    };
    out.genre = (GENRES[genre.genre] || (() => n(c, genre.genre + " title", genre.genre + " titles") + ", and you know exactly what you like."))();
  } else out.genre = null;

  // Countries. Ties first, then a close race, then a clear winner. Only first place is named.
  // A close race: the leader is ahead of second place by 3 titles or fewer, or by under 10% of its own count.
  const countries = (data?.countries || []).filter(x => x.country && x.country !== "Unknown" && x.count > 0);
  if (countries.length) {
    const top = countries[0].count;
    const leaders = countries.filter(x => x.count === top).map(x => b(x.country));
    const gap = top - (countries[leaders.length]?.count || 0);
    out.countries = leaders.length > 1 ? and(leaders) + " tied at " + b(top) + " each, because choosing favorites isn't your thing."
      : countries.length > 1 && (gap <= 3 || gap < top * 0.1) ? "It was neck and neck, but " + leaders[0] + " pulled ahead with " + n(top, "title", "titles") + "."
      : leaders[0] + " practically took over your watchlist, with " + n(top, "title", "titles") + ".";
  } else out.countries = null;

  // Eras, by release decade (MyDramaList gives no watch dates). The approved lines, word for word.
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
    out.eras = leaders.length > 1 ? "Two eras, one watchlist. Great stories never go out of style."
      : APPROVED[leaders[0]] || "Every decade brings its own drama, and you've found yours.";
  } else out.eras = null;

  // Most-watched actor: "4 titles in, it's official: Moon Lee has a fan, and it's you."
  const actor = data?.actors?.[0];
  out.actor = !actor ? null : actor.count > 1 ? n(actor.count, "title", "titles") + " in, it's official: " + b(actor.name) + " has a fan, and it's you."
    : "One title in, and " + b(actor.name) + " already has a fan: you.";

  // #1 drama and #1 movie: "Of everything you've finished, this one with A and B hit hardest."
  const number1 = item => {
    if (!item) return null;
    const cast = (item.cast || []).slice(0, 2).map(b);
    return "Of everything you've finished, this one" + (cast.length ? " with " + and(cast) : "") + " hit hardest.";
  };
  out.topDrama = number1(data?.topDramas?.[0]);
  out.topMovie = number1(data?.topMovies?.[0]);

  // Ratings (personal MyDramaList scores): "Out of everything you've watched, 34 titles earned a perfect 10. Now that's a standing ovation."
  const r = data?.ratings;
  if (r?.rated && r.average != null) {
    const tens = (r.distribution || []).find(d => d.score === 10)?.count || 0;
    out.ratings = tens ? "Out of everything you've watched, " + n(tens, "title", "titles") + " earned a perfect 10. Now that's a standing ovation."
      : r.average >= 7.5 ? "You believe in giving credit where the drama is due."
      : r.average < 6.5 ? "No perfect 10s yet, because you don't hand out stars easily. Every point here was earned."
      : "No perfect 10s yet, just an honest score for every hit and every miss.";
  } else out.ratings = null;
  return out;
}
