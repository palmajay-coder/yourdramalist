// @ts-nocheck -- also injected into the setup page (via .toString()), so everything lives inside one function.
// Wrapped's words. The owner writes every line in wrapped-text.md (rules at the top of that file); the build copies it
// into wrappedText.ts. This picks the right line for each slide by fixed rules on the stats (never random: the same
// data always reads the same) and fills in the user's numbers. A slide without the data it needs gets null.
// Lines may hold **bold** parts. No "out of N" totals: only the number that matters is shown.
export function wrappedCopy(data, raw) {
  // "name: words" lines; the comment block, ## headings and blank lines are skipped.
  const text = {};
  String(raw || "").replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/).forEach(line => {
    const m = /^([^#\s][^:]*?):\s+(.+)$/.exec(line.trim());
    if (m) text[m[1].trim()] = m[2].trim();
  });
  const b = x => "**" + x + "**";
  // t("key", values): the owner's line with {placeholders} filled; numbers are bold, and {count|one|many} adds a word.
  const t = (key, values = {}) => {
    const line = text[key];
    if (!line) return null;
    return line.replace(/\{(\w+)(?:\|([^|}]*)\|([^}]*))?\}/g, (whole, name, one, many) => {
      if (!(name in values)) return whole;
      const value = values[name];
      return one !== undefined ? b(value) + " " + (Number(value) === 1 ? one : many) : typeof value === "number" ? b(value) : String(value);
    });
  };
  const and = list => list.length > 1 ? list.slice(0, -1).join(", ") + " and " + list[list.length - 1] : list[0];
  const plural = (count, one, many) => b(count) + " " + (count === 1 ? one : many);
  const out = { t };

  // Completed.
  const completed = data?.statusCounts?.completed || 0;
  const types = data?.types || {};
  const dramas = (types.dramas || 0) + (types.tvShows || 0), movies = types.movies || 0;
  const parts = [dramas ? plural(dramas, "drama", "dramas") : "", movies ? plural(movies, "movie", "movies") : ""].filter(Boolean);
  out.completed = !completed ? null : completed === 1 ? t("completed.one")
    : t("completed.line", { list: parts.length ? and(parts) : plural(completed, "title", "titles") });

  // Watch time.
  const hours = data?.viewingTime?.hours || 0, days = Math.round(data?.viewingTime?.days || 0);
  out.time = !hours ? null : days >= 1 ? t("time.days", { days }) : t("time.hours", { hours: Math.round(hours) || 1 });

  // Top genre: a line of its own for each genre ("Drama" fits almost everything, so it's left out).
  const genre = (data?.genres || []).find(g => g.genre !== "Drama");
  out.genre = !genre ? null : t("genre." + genre.genre, { count: genre.count, genre: b(genre.genre) }) || t("genre.other", { count: genre.count, genre: b(genre.genre) });

  // Countries. Ties first, then a close race, then a clear winner. Only first place is named.
  // A close race: the leader is ahead of second place by 3 titles or fewer, or by under 10% of its own count.
  const countries = (data?.countries || []).filter(x => x.country && x.country !== "Unknown" && x.count > 0);
  if (countries.length) {
    const top = countries[0].count;
    const leaders = countries.filter(x => x.count === top).map(x => b(x.country));
    const gap = top - (countries[leaders.length]?.count || 0);
    const values = { count: top, country: leaders[0], countries: and(leaders) };
    out.countries = leaders.length > 1 ? t("countries.tie", values)
      : countries.length > 1 && (gap <= 3 || gap < top * 0.1) ? t("countries.close", values) : t("countries.clear", values);
  } else out.countries = null;

  // Eras, by release decade (MyDramaList gives no watch dates).
  const decades = (data?.decades || []).filter(d => d.count > 0);
  if (decades.length >= 2) {
    const most = Math.max(...decades.map(d => d.count));
    const leaders = decades.filter(d => d.count === most).map(d => d.decade);
    out.eras = t("eras.line", { decade: b(and(leaders)) });
  } else out.eras = null;

  // Most-watched actor.
  const actor = data?.actors?.[0];
  out.actor = !actor ? null : actor.count > 1 ? t("actor.line", { count: actor.count, name: b(actor.name) }) : t("actor.one", { name: b(actor.name) });

  // #1 drama and #1 movie.
  const number1 = item => {
    if (!item) return null;
    const cast = (item.cast || []).slice(0, 2).map(b);
    return cast.length ? t("top.withCast", { cast: and(cast) }) : t("top.noCast");
  };
  out.topDrama = number1(data?.topDramas?.[0]);
  out.topMovie = number1(data?.topMovies?.[0]);

  // Ratings (personal MyDramaList scores).
  const r = data?.ratings;
  if (r?.rated && r.average != null) {
    const tens = (r.distribution || []).find(d => d.score === 10)?.count || 0;
    out.ratings = tens ? t("ratings.tens", { count: tens }) : r.average >= 7.5 ? t("ratings.generous") : r.average < 6.5 ? t("ratings.tough") : t("ratings.balanced");
  } else out.ratings = null;
  return out;
}
