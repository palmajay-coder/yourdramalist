// @ts-nocheck -- installed into the setup page's browser scope.
// MyDramaList Wrapped: an optional, full-screen story of someone's all-time stats (the same /api/stats data as the
// Stats tab). Tap the right of the screen (or swipe left, or press →) to go on, the left to go back; × or Esc closes.
// Nothing advances by itself. Slides without data are left out. Reduced motion shows everything at once.
// Once a year, after someone's stats are ready, a small "Your drama recap is ready!" card offers to open it.
export function installWrapped() {
  const el = (tag, className = "", text = "") => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== "") node.textContent = String(text);
    return node;
  };
  const reduced = () => { try { return !!matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
  const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

  const dialog = el("dialog", "wrapped");
  dialog.setAttribute("aria-label", "MyDramaList Wrapped");
  const progress = el("div", "wrappedProgress");
  const close = el("button", "wrappedClose", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Close Wrapped");
  const stage = el("div", "wrappedStage");
  stage.setAttribute("aria-live", "polite");
  const hint = el("p", "wrappedHint", "Tap to continue");
  dialog.append(progress, close, stage, hint);
  document.body.append(dialog);

  let slides = [], index = 0, timers = [];
  const clearTimers = () => { timers.forEach(clearInterval); timers.forEach(clearTimeout); timers = []; };

  // A number that counts up to its value (or just shows it, with reduced motion).
  function countUp(node, value, decimals = 0) {
    const format = decimals ? new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals }) : null;
    const final = format ? format.format(value) : Math.round(value).toLocaleString("en-US");
    if (reduced() || !value) { node.textContent = final; return; }
    const started = Date.now(), duration = 1200;
    node.textContent = "0";
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / duration), eased = 1 - Math.pow(1 - t, 3);
      node.textContent = t >= 1 ? final : (format ? format.format(value * eased) : Math.round(value * eased).toLocaleString("en-US"));
      if (t >= 1) clearInterval(id);
    }, 40);
    timers.push(id);
  }
  function image(src, className) {
    const img = el("img", className || "");
    img.alt = "";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => img.remove(), { once: true });
    img.src = src;
    return img;
  }
  // A slide's backdrop: a sharp picture from a title that fits it (chosen by the server, 1920 pixels wide or more).
  function withArt(box, art) {
    if (!art?.backdrop) return box;
    const layer = el("div", "wrappedBackdrop");
    layer.append(image(art.backdrop));
    box.prepend(layer);
    return box;
  }
  function slide(theme, ...children) {
    const box = el("section", "wrappedSlide " + theme);
    box.append(...children.filter(Boolean));
    return box;
  }

  // Each builder returns a slide, or null when the data isn't there. onShow runs its animations.
  /**
   * Your drama type. Each label has a clear rule on the stats; the first that fits is yours, and any others that
   * fit are listed as "also". Everyone with a completed title fits at least "The Drama Fan".
   */
  function dramaType(data) {
    const c = data.statusCounts.completed, r = data.ratings || {}, t = data.types || {};
    if (!c) return null;
    const tens = (r.distribution || []).find(d => d.score === 10)?.count || 0;
    const countries = (data.countries || []).filter(x => x.country !== "Unknown");
    const top = countries[0];
    const hours = data.viewingTime?.hours || 0;
    const rules = [
      { name: "The Perfectionist", fits: r.rated >= 10 && tens / r.rated >= 1 / 3, line: tens + " of your " + r.rated + " scores are a perfect 10. When you love a title, you say so." },
      { name: "The Explorer", fits: countries.length >= 4, line: "You've completed titles from " + countries.length + " countries." },
      { name: "The Loyalist", fits: !!top && c >= 10 && top.count / c > 0.7, line: top ? Math.round(top.count / c * 100) + "% of what you've completed comes from " + top.country + "." : "" },
      { name: "The Movie Buff", fits: (t.movies || 0) > (t.dramas || 0) + (t.tvShows || 0), line: t.movies + " of your " + c + " completed titles are movies." },
      { name: "The Binger", fits: hours >= 300, line: fmt.format(hours) + " hours and counting." },
    ].filter(x => x.fits);
    const primary = rules[0] || { name: "The Drama Fan", line: c + " dramas and movies completed, and counting." };
    return { name: primary.name, line: primary.line, also: rules.slice(1).map(x => x.name) };
  }
  function build(data) {
    const out = [];
    const c = data.statusCounts.completed;
    // 1. Opening: the featured title's backdrop.
    {
      const box = slide("isJourney");
      box.append(el("p", "wrappedKicker", "MyDramaList Wrapped"), el("h2", "wrappedTitle", "@" + data.username + ", here's everything you've watched"),
        el("p", "wrappedLine", "Every drama and movie you've completed, all time."));
      if (data.hero) box.append(el("p", "wrappedSmall", (data.hero.reason === "newly-completed" ? "Recently completed: " : "Your top-rated: ") + data.hero.title));
      out.push({ node: withArt(box, data.art?.opening) });
    }
    // 2. Time: the answer in the sentence, then a friendly beat.
    if (data.viewingTime?.hours) {
      const num = el("span", "wrappedNumber");
      const head = el("h2", "wrappedTitle wrappedHeadline");
      head.append("You watched for ", num, " hours.");
      const days = Math.round(data.viewingTime.days);
      const box = slide("isTime", head, el("p", "wrappedLine", days >= 1 ? "That's " + days + (days === 1 ? " day" : " days") + " nonstop." : "Every minute counted."),
        el("p", "wrappedSmall", "Across " + c + " completed dramas and movies."));
      out.push({ node: withArt(box, data.art?.time), onShow: () => countUp(num, data.viewingTime.hours, 1) });
    }
    // 3. Genres ("Drama" fits almost everything, so it's left out, as on Stats).
    const genres = (data.genres || []).filter(g => g.genre !== "Drama");
    if (genres.length) {
      const rest = genres.slice(1, 5).map(g => g.genre);
      const next = rest.length ? "Then " + (rest.length > 1 ? rest.slice(0, -1).join(", ") + " and " + rest[rest.length - 1] : rest[0]) + "." : "";
      out.push({ node: withArt(slide("isGenres", el("h2", "wrappedTitle wrappedHeadline wrappedPop", "Your top genre was " + genres[0].genre + "."),
        el("p", "wrappedLine", "It's in " + genres[0].count + " of the titles you've completed."), next ? el("p", "wrappedSmall wrappedRise", next) : null), data.art?.genres) });
    }
    // 4. Countries, with ties said as ties.
    if ((data.countries || []).length) {
      const bars = el("ul", "wrappedBars");
      const top = data.countries.slice(0, 6), max = Math.max(...top.map(x => x.count));
      top.forEach((x, i) => {
        const li = el("li", "wrappedBar");
        const fill = el("span", "wrappedBarFill");
        fill.style.setProperty("--w", Math.max(6, Math.round(x.count / max * 100)) + "%");
        fill.style.animationDelay = 0.2 + i * 0.12 + "s";
        const track = el("span", "wrappedBarTrack"); track.append(fill);
        li.append(el("span", "wrappedBarLabel", x.country), track, el("span", "wrappedBarValue", x.count));
        bars.append(li);
      });
      const leaders = top.filter(x => x.count === top[0].count).map(x => x.country);
      const names = leaders.length > 1 ? leaders.slice(0, -1).join(", ") + " and " + leaders[leaders.length - 1] : leaders[0];
      const headline = leaders.length > 1 ? names + " are tied for first." : "Most of what you've completed comes from " + names + ".";
      const line = leaders.length > 1 ? top[0].count + " titles each." : top[0].count + " of your " + c + " completed titles.";
      out.push({ node: withArt(slide("isAsia", el("h2", "wrappedTitle wrappedHeadline", headline), el("p", "wrappedLine", line), bars), data.art?.countries) });
    }
    // 5. Actors: #1 big, then the top five as a ranked list.
    if ((data.actors || []).length) {
      const first = data.actors[0];
      const portrait = el("div", "wrappedPortrait wrappedPop");
      if (first.profile) portrait.append(image(first.profile)); else portrait.textContent = first.name.charAt(0);
      const list = el("ol", "wrappedRanked");
      data.actors.slice(0, 5).forEach((a, i) => {
        const li = el("li", "wrappedRise"); li.style.animationDelay = 0.5 + i * 0.12 + "s";
        const face = el("span", "wrappedFace"); if (a.profile) face.append(image(a.profile)); else face.textContent = a.name.charAt(0);
        const text = el("span", "wrappedRankedText"); text.append(el("strong", "", a.name), el("small", "", a.count + (a.count === 1 ? " title" : " titles")));
        li.append(el("span", "wrappedRankedNumber", i + 1), face, text); list.append(li);
      });
      out.push({ node: withArt(slide("isFaces", portrait, el("h2", "wrappedTitle wrappedHeadline", "Your most-watched actor is " + first.name + "."),
        el("p", "wrappedLine", first.count + " of your completed titles feature " + first.name + "."), list), data.art?.actors) });
    }
    // 6. Your #1 drama and your #1 movie, each with its own ranked list and backdrop.
    const rankedSlide = (items, label, theme, art) => {
      if (!(items || []).length) return;
      const first = items[0];
      const list = el("ol", "wrappedRanked isPosters");
      items.slice(0, 5).forEach((t, i) => {
        const li = el("li", "wrappedRise"); li.style.animationDelay = 0.3 + i * 0.12 + "s";
        const thumb = el("span", "wrappedThumb"); if (t.poster) thumb.append(image(t.poster));
        const text = el("span", "wrappedRankedText"); text.append(el("strong", "", t.title), el("small", "", [t.year, "your score " + t.score].filter(Boolean).join(" · ")));
        li.append(el("span", "wrappedRankedNumber", t.rank), thumb, text); list.append(li);
      });
      out.push({ node: withArt(slide(theme, el("h2", "wrappedTitle wrappedHeadline", "Your #1 " + label + " was " + first.title + "."), el("p", "wrappedLine", "You gave it a " + first.score + "."), list), art) });
    };
    rankedSlide(data.topDramas, "drama", "isStories", data.art?.topDrama);
    rankedSlide(data.topMovies, "movie", "isMovies", data.art?.topMovie);
    // 7. Ratings: only facts the data supports.
    const r = data.ratings;
    if (r?.rated && r.average != null) {
      const num = el("span", "wrappedNumber");
      const head = el("h2", "wrappedTitle wrappedHeadline");
      head.append("Your average score is ", num, ".");
      const facts = el("ul", "wrappedFacts");
      const tens = (r.distribution || []).find(d => d.score === 10)?.count || 0;
      if (tens) facts.append(el("li", "", "You gave a perfect 10 to " + tens + (tens === 1 ? " title" : " titles") + "."));
      const most = [...(r.distribution || [])].sort((a, b) => b.count - a.count)[0];
      if (most && most.score !== 10) facts.append(el("li", "", "Your most common score is " + most.score + "."));
      out.push({ node: withArt(slide("isRatings", head, el("p", "wrappedLine", "Across the " + r.rated + " titles you rated."), facts), data.art?.ratings),
        onShow: () => countUp(num, r.average, 2) });
    }
    // 8. Your drama type: a label from clear rules on real numbers.
    const type = dramaType(data);
    if (type) {
      const also = type.also.length ? el("p", "wrappedSmall", "You're also " + (type.also.length > 1 ? type.also.slice(0, -1).join(", ") + " and " + type.also[type.also.length - 1] : type.also[0]) + ".") : null;
      out.push({ node: withArt(slide("isType", el("p", "wrappedKicker", "Your drama type"), el("h2", "wrappedHuge wrappedPop", type.name), el("p", "wrappedLine", type.line), also), data.art?.type) });
    }
    // 8. Summary.
    {
      const card = el("div", "wrappedCard");
      const top = el("div", "wrappedCardPosters");
      (data.topRated || []).slice(0, 3).forEach(t => { const p = el("span", "wrappedCardPoster"); if (t.poster) p.append(image(t.poster)); top.append(p); });
      const lines = el("ul", "wrappedCardLines");
      if (data.viewingTime?.hours) lines.append(el("li", "", fmt.format(data.viewingTime.hours) + " hours watched"));
      lines.append(el("li", "", c + " completed"));
      if (genres[0]) lines.append(el("li", "", "Top genre: " + genres[0].genre));
      if (data.actors?.[0]) lines.append(el("li", "", "Most-watched actor: " + data.actors[0].name));
      if (data.countries?.length) lines.append(el("li", "", data.countries.slice(0, 3).map(x => x.country + " " + x.count).join(" · ")));
      if (type) lines.append(el("li", "", "Drama type: " + type.name));
      card.append(el("p", "wrappedCardBrand", "YourDramaList"), el("p", "wrappedCardUser", "@" + data.username + " · all time"), top, lines);
      const actions = el("div", "wrappedActions");
      const replay = el("button", "secondary", "Replay"); replay.type = "button"; replay.dataset.wrappedAction = "replay";
      const done = el("button", "primary", "Close"); done.type = "button"; done.dataset.wrappedAction = "close";
      actions.append(replay, done);
      out.push({ node: withArt(slide("isCard", el("h2", "wrappedTitle wrappedHeadline", "Your recap, in one card."), card, actions), data.art?.card) });
    }
    return out;
  }

  function show(i) {
    clearTimers();
    index = Math.max(0, Math.min(slides.length - 1, i));
    const current = slides[index];
    stage.replaceChildren(current.node);
    current.node.classList.remove("isActive");
    void current.node.offsetWidth; // restart the CSS animations
    current.node.classList.add("isActive");
    dialog.classList.toggle("reduceMotion", reduced());
    current.onShow?.();
    [...progress.children].forEach((bar, n) => { bar.classList.toggle("isDone", n < index); bar.classList.toggle("isCurrent", n === index); });
    hint.hidden = index === slides.length - 1;
    // Load the next slide's pictures ahead of time.
    if (typeof Image === "function") for (const img of slides[index + 1]?.node.querySelectorAll("img") || []) { const pre = new Image(); pre.referrerPolicy = "no-referrer"; pre.src = img.src; }
  }
  const next = () => { if (index < slides.length - 1) show(index + 1); };
  const back = () => { if (index > 0) show(index - 1); };
  function finish() { clearTimers(); if (dialog.open) dialog.close(); }

  stage.addEventListener("click", event => {
    const action = event.target.closest?.("[data-wrapped-action]")?.dataset.wrappedAction;
    if (action === "replay") { show(0); return; }
    if (action === "close") { finish(); return; }
    if (event.target.closest?.("button")) return;
    if (swiped) { swiped = false; return; }
    const box = stage.getBoundingClientRect?.() || {};
    const x = (event.clientX ?? 0) - (box.left || 0);
    if (box.width && x < box.width / 3) back(); else next();
  });
  let startX = null, swiped = false;
  stage.addEventListener("touchstart", e => { startX = e.touches?.[0]?.clientX ?? null; swiped = false; }, { passive: true });
  stage.addEventListener("touchend", e => {
    const endX = e.changedTouches?.[0]?.clientX;
    if (startX == null || endX == null) return;
    const dx = endX - startX;
    if (Math.abs(dx) > 40) { swiped = true; dx < 0 ? next() : back(); }
    startX = null;
  });
  dialog.addEventListener("keydown", e => {
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
  });
  close.onclick = finish;
  dialog.addEventListener("close", clearTimers);

  function open(data) {
    if (!data?.statusCounts) return;
    slides = build(data);
    progress.replaceChildren(...slides.map(() => el("span", "wrappedProgressBar")));
    if (!dialog.open) showAndroidDialog(dialog);
    show(0);
  }

  // The once-a-year "Your drama recap is ready!" card.
  const card = el("div", "wrappedPrompt");
  card.hidden = true;
  card.setAttribute("role", "status");
  const view = el("button", "primary", "View"); view.type = "button";
  const later = el("button", "secondary", "Later"); later.type = "button";
  const promptActions = el("div", "wrappedPromptActions"); promptActions.append(later, view);
  card.append(el("p", "", "Your drama recap is ready!"), promptActions);
  document.body.append(card);
  let promptData = null;
  later.onclick = () => { card.hidden = true; };
  view.onclick = () => { card.hidden = true; open(promptData); };
  const YEAR = 365 * 86400000;
  async function maybePrompt(tries = 0) {
    // Wait for the app's opening intro to finish (it shows while <html> has the ydlIntro class).
    if (document.documentElement.classList.contains("ydlIntro")) { if (tries < 10) setTimeout(() => maybePrompt(tries + 1), 1500); return; }
    const user = connectedUser;
    if (!user || currentPage !== "selection" || document.querySelector("dialog[open]")) return;
    const key = "ydl-wrapped-prompt:" + user.toLowerCase();
    let last;
    try { last = Number(localStorage.getItem(key) || 0); } catch { return; }
    if (last && Date.now() - last < YEAR) return;
    let data;
    try {
      const response = await fetch("/api/stats?username=" + encodeURIComponent(user), { signal: AbortSignal.timeout(45e3) });
      data = response.ok ? await response.json() : null;
    } catch { return; }
    const completed = data?.statusCounts?.completed || 0;
    // Ready: something completed, and TMDB details mostly in (otherwise wait for a later app open, writing nothing).
    if (!completed || (data.coverage?.pending || 0) > completed * 0.1) return;
    if (connectedUser !== user || currentPage !== "selection" || document.querySelector("dialog[open]")) return;
    try { localStorage.setItem(key, String(Date.now())); } catch { return; }
    promptData = data;
    card.hidden = false;
  }
  return { open, maybePrompt };
}
