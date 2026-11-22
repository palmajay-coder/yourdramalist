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
  // A slide's backdrop: the artwork of a title that fits it (chosen by the server), named in a small caption.
  function withArt(box, art) {
    if (!art?.backdrop) return box;
    const layer = el("div", "wrappedBackdrop");
    layer.append(image(art.backdrop));
    box.prepend(layer);
    box.append(el("p", "wrappedArtCaption", art.title));
    return box;
  }
  function slide(theme, ...children) {
    const box = el("section", "wrappedSlide " + theme);
    box.append(...children.filter(Boolean));
    return box;
  }

  // Each builder returns a slide, or null when the data isn't there. onShow runs its animations.
  function build(data) {
    const out = [];
    const c = data.statusCounts.completed;
    // 1. Opening: the featured title's backdrop.
    {
      const box = slide("isJourney");
      box.append(el("p", "wrappedKicker", "MyDramaList Wrapped"), el("h2", "wrappedTitle", "@" + data.username + ", here's everything you've watched"),
        el("p", "wrappedLine", "Every drama and movie you've completed, all time."));
      if (data.hero) box.append(el("p", "wrappedSmall", (data.hero.reason === "newly-completed" ? "Recently completed: " : "Your top-rated: ") + data.hero.title));
      out.push({ node: withArt(box, data.hero?.backdrop ? { backdrop: data.hero.backdrop, title: data.hero.title } : null) });
    }
    // 2. Time.
    if (data.viewingTime?.hours) {
      const num = el("strong", "wrappedBig");
      const box = slide("isTime", el("p", "wrappedKicker", "Time well spent"), num, el("p", "wrappedLine", "hours of dramas and movies"),
        el("p", "wrappedSmall", "That's " + fmt.format(data.viewingTime.days) + " days, across " + c + " completed titles."));
      out.push({ node: withArt(box, data.art?.time), onShow: () => countUp(num, data.viewingTime.hours, 1) });
    }
    // 3. Genres ("Drama" fits almost everything, so it's left out, as on Stats).
    const genres = (data.genres || []).filter(g => g.genre !== "Drama");
    if (genres.length) {
      const list = el("ol", "wrappedList");
      genres.slice(1, 5).forEach((g, i) => { const li = el("li", "wrappedRise", g.genre + " · " + g.count); li.style.animationDelay = 0.5 + i * 0.15 + "s"; list.append(li); });
      out.push({ node: withArt(slide("isGenres", el("p", "wrappedKicker", "Your favorite genres"), el("strong", "wrappedHuge wrappedPop", genres[0].genre),
        el("p", "wrappedLine", genres[0].count + " of your completed titles"), list), data.art?.genres) });
    }
    // 4. Countries.
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
      out.push({ node: withArt(slide("isAsia", el("p", "wrappedKicker", "Around Asia"), el("h2", "wrappedTitle", "Most of what you've completed comes from " + top[0].country), bars), data.art?.countries) });
    }
    // 5. Actors.
    if ((data.actors || []).length) {
      const [first, ...rest] = data.actors;
      const portrait = el("div", "wrappedPortrait wrappedPop");
      if (first.profile) portrait.append(image(first.profile)); else portrait.textContent = first.name.charAt(0);
      const others = el("ul", "wrappedFaces");
      rest.slice(0, 4).forEach((a, i) => {
        const li = el("li", "wrappedRise"); li.style.animationDelay = 0.6 + i * 0.12 + "s";
        const face = el("span", "wrappedFace"); if (a.profile) face.append(image(a.profile)); else face.textContent = a.name.charAt(0);
        li.append(face, el("small", "", a.name)); others.append(li);
      });
      out.push({ node: withArt(slide("isFaces", el("p", "wrappedKicker", "Familiar faces"), portrait, el("strong", "wrappedName", first.name),
        el("p", "wrappedLine", "in " + first.count + " of your completed titles"), others), data.art?.actors) });
    }
    // 6. Top rated.
    if ((data.topRated || []).length) {
      const row = el("ol", "wrappedPosters");
      data.topRated.slice(0, 5).forEach((t, i) => {
        const li = el("li", "wrappedRise"); li.style.animationDelay = 0.2 + i * 0.18 + "s";
        const poster = el("span", "wrappedPoster");
        if (t.poster) poster.append(image(t.poster)); else poster.append(el("span", "wrappedPosterName", t.title));
        const rank = el("span", "rankNumber statsRank", t.rank); rank.setAttribute("aria-hidden", "true"); poster.append(rank);
        li.append(poster, el("small", "", t.title + " · " + t.score)); row.append(li);
      });
      out.push({ node: withArt(slide("isStories", el("p", "wrappedKicker", "Your top rated"), el("h2", "wrappedTitle", data.topRated[0].title + " tops your list"),
        el("p", "wrappedLine", "The dramas and movies you scored highest on MyDramaList"), row), data.art?.top) });
    }
    // 7. Ratings: only facts the data supports.
    const r = data.ratings;
    if (r?.rated && r.average != null) {
      const num = el("strong", "wrappedBig");
      const facts = el("ul", "wrappedFacts");
      const tens = (r.distribution || []).find(d => d.score === 10)?.count || 0;
      if (tens) facts.append(el("li", "", "You gave a perfect 10 to " + tens + (tens === 1 ? " title" : " titles") + "."));
      const most = [...(r.distribution || [])].sort((a, b) => b.count - a.count)[0];
      if (most && most.score !== 10) facts.append(el("li", "", "Your most common score is " + most.score + "."));
      if (r.highestCountry && r.lowestCountry && r.highestCountry.country !== r.lowestCountry.country) {
        facts.append(el("li", "", "Titles from " + r.highestCountry.country + " were your favorite. Titles from " + r.lowestCountry.country + " were not."));
      }
      out.push({ node: withArt(slide("isRatings", el("p", "wrappedKicker", "Your rating personality"), num, el("p", "wrappedLine", "your average score, across " + r.rated + " rated titles"), facts), data.art?.ratings),
        onShow: () => countUp(num, r.average, 2) });
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
      card.append(el("p", "wrappedCardBrand", "YourDramaList"), el("p", "wrappedCardUser", "@" + data.username + " · all time"), top, lines);
      const actions = el("div", "wrappedActions");
      const replay = el("button", "secondary", "Replay"); replay.type = "button"; replay.dataset.wrappedAction = "replay";
      const done = el("button", "primary", "Close"); done.type = "button"; done.dataset.wrappedAction = "close";
      actions.append(replay, done);
      out.push({ node: withArt(slide("isCard", el("p", "wrappedKicker", "Your recap in one card"), card, actions), data.art?.card) });
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
