// @ts-nocheck -- installed into the setup page's browser scope.
// The Stats tab: an all-time recap of the connected MyDramaList list, drawn from /api/stats (stats.ts).
// Every number comes from the API; nothing is estimated here. While TMDB details are still being added,
// the page asks again every 30 seconds (up to 8 times) and fills in place.
export function installStats() {
  const panel = document.createElement("section");
  panel.id = "statsPanel";
  panel.className = "statsPanel hidden";
  panel.setAttribute("aria-label", "Stats");
  $("listItems").after(panel);

  const el = (tag, className = "", text = "") => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== "") node.textContent = String(text);
    return node;
  };
  const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
  const STATUS = [["watching", "Watching"], ["completed", "Completed"], ["planToWatch", "Plan to Watch"], ["onHold", "On Hold"], ["dropped", "Dropped"]];
  let request = 0, timer = 0, polls = 0, shownUser = "", lastBackdrop = "", pendingLeft = 0;

  function card(title, ...children) {
    const box = el("section", "statsCard");
    if (title) box.append(el("h2", "statsCardTitle", title));
    box.append(...children.filter(Boolean));
    return box;
  }
  function bars(rows, total) {
    const list = el("ul", "statsBars");
    const max = Math.max(1, ...rows.map(r => r.count));
    for (const row of rows) {
      const item = el("li", "statsBar");
      const label = el("span", "statsBarLabel", row.label);
      const track = el("span", "statsBarTrack");
      const fill = el("span", "statsBarFill");
      fill.style.width = Math.max(4, Math.round(row.count / max * 100)) + "%";
      track.append(fill);
      const value = el("span", "statsBarValue", row.count);
      item.setAttribute("aria-label", row.label + ": " + row.count + (total ? " of " + total : ""));
      item.append(label, track, value);
      list.append(item);
    }
    return list;
  }
  function message(text, action) {
    const box = el("div", "statsMessage");
    box.append(el("p", "", text));
    if (action) box.append(action);
    return box;
  }
  function button(text, className, onclick) {
    const b = el("button", className, text);
    b.type = "button";
    b.onclick = onclick;
    return b;
  }

  function hero(data) {
    const box = el("section", "statsHero");
    const art = el("div", "statsHeroArt");
    const backdrop = data.hero?.backdrop || "";
    if (backdrop) {
      const img = el("img");
      img.alt = "";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      // Crossfade only when the featured title's artwork changes.
      if (backdrop !== lastBackdrop) img.className = "statsHeroFade";
      img.addEventListener("load", () => img.classList.add("isLoaded"), { once: true });
      img.addEventListener("error", () => img.remove(), { once: true });
      img.src = backdrop;
      art.append(img);
    }
    lastBackdrop = backdrop;
    const text = el("div", "statsHeroText");
    if (data.hero) {
      text.append(el("p", "statsHeroLabel", data.hero.reason === "newly-completed" ? "Recently completed" : "Your top-rated"), el("p", "statsHeroTitle", data.hero.title));
    }
    const hours = data.viewingTime?.hours;
    const big = el("p", "statsHeroHours");
    big.append(el("strong", "", hours == null ? "–" : number.format(hours)), el("span", "", hours == null ? " hours watched isn't available" : " hours watched"));
    const facts = el("p", "statsHeroFacts", data.statusCounts.completed + " completed" + (data.ratings.average != null ? " · average score " + data.ratings.average : ""));
    const source = el("p", "statsHeroSource", "All time, from your MyDramaList list");
    text.append(big, facts, source);
    box.append(art, text);
    return box;
  }

  function topTen(data) {
    if (!data.topRated.length) return null;
    const track = el("div", "statsTopTrack");
    for (const item of data.topRated) {
      const tile = el("button", "statsTopTile");
      tile.type = "button";
      tile.setAttribute("aria-label", "Number " + item.rank + ": " + item.title + ", your score " + item.score);
      const poster = el("span", "statsTopPoster");
      if (item.poster) {
        const img = el("img");
        img.src = item.poster;
        img.alt = "";
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        img.addEventListener("error", () => img.remove(), { once: true });
        poster.append(img);
      } else poster.append(el("span", "statsTopPosterName", item.title));
      const rank = el("span", "rankNumber statsRank" + (item.rank >= 10 ? " twoDigits" : ""), item.rank);
      rank.setAttribute("aria-hidden", "true");
      poster.append(rank);
      tile.append(poster, el("strong", "", item.title), el("small", "", "Your score " + item.score));
      tile.onclick = () => showCatalogTitle({ name: item.title, url: "https://mydramalist.com/" + item.slug, year: item.year, type: item.type, poster: item.poster || undefined });
      track.append(tile);
    }
    return card("Your top 10", track);
  }

  function render(data) {
    const parts = [];
    if (data.stale) parts.push(el("p", "statsBanner", "Showing your last saved stats. MyDramaList couldn't be reached just now."));
    parts.push(hero(data));
    // The optional story version of these same numbers (wrappedClient.ts).
    if (data.statusCounts.completed && typeof wrapped !== "undefined") parts.push(button("Your Drama Wrapped", "primary statsWrappedButton", () => wrapped.open(data)));
    if (!data.statusCounts.completed) {
      parts.push(message("You haven't completed anything on MyDramaList yet. Finish a drama and your stats will show up here."));
    }
    const chips = el("ul", "statsChips");
    for (const [key, label] of STATUS) chips.append(el("li", "statsChip", label + " " + data.statusCounts[key]));
    parts.push(card("Your watchlist", chips));
    if (data.statusCounts.completed) {
      const t = data.types, total = t.dramas + t.movies + t.tvShows;
      const split = el("div", "statsSplit");
      for (const [count, label, cls] of [[t.dramas, "Dramas", "isDrama"], [t.movies, "Movies", "isMovie"], [t.tvShows, "TV shows", "isShow"]]) {
        if (!count) continue;
        const part = el("span", "statsSplitPart " + cls);
        part.style.flexGrow = String(count);
        part.title = label + ": " + count;
        split.append(part);
      }
      const legend = el("p", "statsLegend", [[t.dramas, "dramas"], [t.movies, "movies"], [t.tvShows, "TV shows"]].filter(([n]) => n).map(([n, w]) => n + " " + w).join(" · "));
      parts.push(card("Dramas and movies", split, legend));
      parts.push(card("Where your dramas come from", bars(data.countries.map(c => ({ label: c.country, count: c.count })), total)));
      // "Drama" fits nearly every title, so it says little; the rest show what someone actually watches.
      const genres = data.genres.filter(g => g.genre !== "Drama").slice(0, 6);
      if (genres.length) {
        const list = el("ul", "statsChips");
        genres.forEach((g, i) => list.append(el("li", "statsChip" + (i === 0 ? " isTop" : ""), g.genre + " " + g.count)));
        parts.push(card("Your top genres", list));
      }
      if (data.actors.length) {
        const row = el("ul", "statsActors");
        for (const actor of data.actors.slice(0, 6)) {
          const item = el("li", "statsActor");
          const photo = el("span", "statsActorPhoto");
          if (actor.profile) {
            const img = el("img");
            img.src = actor.profile;
            img.alt = "";
            img.loading = "lazy";
            img.referrerPolicy = "no-referrer";
            img.addEventListener("error", () => img.remove(), { once: true });
            photo.append(img);
          } else photo.textContent = actor.name.charAt(0);
          item.append(photo, el("strong", "", actor.name), el("small", "", actor.count + (actor.count === 1 ? " title" : " titles")));
          row.append(item);
        }
        parts.push(card("Your most-watched actors", row));
      }
      parts.push(topTen(data));
      const r = data.ratings;
      if (r.rated) {
        const scoring = card("How you score",
          bars(r.distribution.map(d => ({ label: String(d.score), count: d.count })), r.rated),
          el("p", "statsLegend", r.rated + " rated" + (r.unrated ? " · " + r.unrated + " unrated" : "") + " · average " + r.average));
        if (r.highestCountry && r.lowestCountry && r.highestCountry.country !== r.lowestCountry.country) {
          scoring.append(el("p", "statsLegend", "Titles from " + r.highestCountry.country + " were your favorite (average " + r.highestCountry.average + "). Titles from " + r.lowestCountry.country + " were not (average " + r.lowestCountry.average + ")."));
        }
        parts.push(scoring);
      }
      if (data.decades.length) parts.push(card("By release decade", bars(data.decades.map(d => ({ label: d.decade, count: d.count })), total)));
      const c = data.coverage;
      const notes = [];
      if (c.pending) notes.push("Still adding genres, actors and posters (" + c.pending + (c.pending === 1 ? " title" : " titles") + " left).");
      if (notes.length) parts.push(el("p", "statsNote", notes.join(" ")));
    }
    panel.replaceChildren(...parts.filter(Boolean));
  }

  async function load(user, { quiet = false, refresh = false } = {}) {
    const id = ++request;
    clearTimeout(timer);
    if (!quiet) panel.replaceChildren(createLoadingBear("Loading your stats…"));
    try {
      const response = await fetch("/api/stats?username=" + encodeURIComponent(user) + (refresh ? "&refresh=1" : ""), { signal: AbortSignal.timeout(45e3) });
      const data = await response.json().catch(() => null);
      if (id !== request) return;
      if (!response.ok || !data?.statusCounts) {
        if (quiet) return;
        panel.replaceChildren(message(data?.error || "Your stats couldn't be loaded. Please try again.", button("Try again", "secondary", () => load(user))));
        return;
      }
      render(data);
      if (typeof wrapped !== "undefined" && data?.statusCounts?.completed) wrapped.learn(data);
      pendingLeft = data.coverage.pending;
      // TMDB details still coming: ask again quietly, a few times, so the page fills in place.
      if (data.coverage.pending && polls < 8) { polls++; timer = setTimeout(() => { if (shownUser === user && !panel.classList.contains("hidden")) load(user, { quiet: true }); }, 30e3); }
    } catch {
      if (id !== request || quiet) return;
      panel.replaceChildren(message("Your stats couldn't be loaded. Please try again.", button("Try again", "secondary", () => load(user))));
    }
  }

  function show() {
    if (!connectedUser) {
      shownUser = "";
      panel.replaceChildren(message("Connect your MyDramaList username to see your stats.", button("Connect", "primary", () => navigate("connect"))));
      return;
    }
    if (shownUser !== connectedUser) { shownUser = connectedUser; polls = 0; lastBackdrop = ""; pendingLeft = 0; load(connectedUser); }
    // Back on the tab with titles still being added: pick up where the checks left off.
    else if (pendingLeft && polls < 8) load(connectedUser, { quiet: true });
  }
  return tab => {
    panel.classList.toggle("hidden", tab !== "stats");
    if (tab === "stats") show();
    else clearTimeout(timer);
  };
}
