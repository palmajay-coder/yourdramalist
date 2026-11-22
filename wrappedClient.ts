// @ts-nocheck -- installed into the setup page's browser scope.
// MyDramaList Wrapped: an optional, full-screen story of someone's all-time stats (the same /api/stats data as the
// Stats tab). Tap the right of the screen (or swipe left, or press →) to go on, the left to go back; × or Esc closes.
// Nothing advances by itself. Slides without data are left out. Reduced motion shows everything at once.
// On the Lists page, a pop-up card (the banner) invites people whose stats are ready to open it; × hides it for a year.
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
  const sound = el("button", "wrappedSound", "🔊");
  sound.type = "button";
  dialog.append(progress, close, sound, stage, hint);
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
   * Your drama type: the first rule that fits on the stats. Everyone with a completed title fits at least
   * "The Drama Fan". Only that one type is shown, with what it means and a real number from the list.
   */
  function dramaType(data) {
    const c = data.statusCounts.completed, r = data.ratings || {}, t = data.types || {};
    if (!c) return null;
    const tens = (r.distribution || []).find(d => d.score === 10)?.count || 0;
    const countries = (data.countries || []).filter(x => x.country !== "Unknown");
    const top = countries[0];
    const hours = data.viewingTime?.hours || 0;
    const rules = [
      { name: "The Superfan", fits: r.rated >= 10 && tens / r.rated >= 1 / 3, line: "When you love a title, you go all in. " + tens + " of your " + r.rated + " scores are a perfect 10." },
      { name: "The Explorer", fits: countries.length >= 4, line: "Your watchlist has no borders. You've completed titles from " + countries.length + " countries." },
      { name: "The Loyalist", fits: !!top && c >= 10 && top.count / c > 0.7, line: top ? "You know what you love. " + Math.round(top.count / c * 100) + "% of what you've completed comes from " + top.country + "." : "" },
      { name: "The Movie Buff", fits: (t.movies || 0) > (t.dramas || 0) + (t.tvShows || 0), line: "You like a whole story in one sitting. " + t.movies + " of your " + c + " completed titles are movies." },
      { name: "The Binger", fits: hours >= 300, line: "You don't just watch, you disappear into a story. " + fmt.format(hours) + " hours and counting." },
    ].filter(x => x.fits);
    const primary = rules[0] || { name: "The Drama Fan", line: "Dramas and movies are part of your everyday. " + c + " titles completed and counting." };
    return { name: primary.name, line: primary.line };
  }
  // The share card: a 1080x1920 picture drawn in the page (no server), for stories and posts. Pictures that fail to
  // load are skipped, so the card always comes out.
  const loadPicture = src => new Promise(resolve => {
    if (!src || typeof Image !== "function") { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  function cardRows(data, type, genres) {
    const rows = [["Completed", String(data.statusCounts.completed)]];
    if (genres[0]) rows.push(["Top genre", genres[0].genre]);
    if (data.actors?.[0]) rows.push(["Most-watched actor", data.actors[0].name]);
    if (data.countries?.length) rows.push([data.countries.length > 1 ? "Top countries" : "Top country", data.countries.slice(0, 3).map(x => x.country).join(", ")]);
    if (type) rows.push(["Drama type", type.name]);
    return rows;
  }
  async function drawCard(data, type, genres, withPictures = true) {
    const W = 1080, H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext?.("2d");
    if (!g) return null;
    const font = (size, weight = 800) => weight + " " + size + "px Lato, system-ui, sans-serif";
    const bg = g.createLinearGradient(0, 0, W * 0.4, H);
    bg.addColorStop(0, "#3a1566"); bg.addColorStop(0.45, "#173f93"); bg.addColorStop(1, "#0d0f14");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const [hero, ...posters] = withPictures ? await Promise.all([loadPicture(data.art?.card?.backdrop || data.hero?.backdrop), ...(data.topRated || []).slice(0, 3).map(t => loadPicture(t.poster))]) : [null, null, null, null];
    if (hero) {
      // The backdrop fades out into the background on its own layer, so there is no seam.
      const layer = document.createElement("canvas");
      layer.width = W; layer.height = 900;
      const l = layer.getContext("2d");
      const scale = Math.max(W / hero.width, 900 / hero.height);
      l.drawImage(hero, (W - hero.width * scale) / 2, (900 - hero.height * scale) / 2, hero.width * scale, hero.height * scale);
      l.globalCompositeOperation = "destination-in";
      const mask = l.createLinearGradient(0, 0, 0, 900);
      mask.addColorStop(0, "#000"); mask.addColorStop(0.55, "#000000b3"); mask.addColorStop(1, "#00000000");
      l.fillStyle = mask; l.fillRect(0, 0, W, 900);
      g.globalAlpha = 0.6; g.drawImage(layer, 0, 0); g.globalAlpha = 1;
    }
    g.textAlign = "center"; g.fillStyle = "#fff";
    g.font = font(38, 900); g.globalAlpha = 0.85; g.fillText("MYDRAMALIST WRAPPED", W / 2, 150); g.globalAlpha = 1;
    g.font = font(84, 900); g.fillText("@" + data.username, W / 2, 260);
    g.font = font(42, 700); g.globalAlpha = 0.8; g.fillText("All time", W / 2, 325); g.globalAlpha = 1;
    const hours = data.viewingTime?.hours;
    g.font = font(210, 900); g.fillText(hours ? fmt.format(hours) : String(data.statusCounts.completed), W / 2, 570);
    g.font = font(52, 700); g.globalAlpha = 0.9; g.fillText(hours ? "hours watched" : "titles completed", W / 2, 645); g.globalAlpha = 1;
    // Three posters in a row.
    const pw = 270, ph = 405, gap = 40, left = (W - (pw * 3 + gap * 2)) / 2;
    posters.forEach((img, i) => {
      const x = left + i * (pw + gap), y = 730;
      g.save();
      g.beginPath(); g.roundRect ? g.roundRect(x, y, pw, ph, 20) : g.rect(x, y, pw, ph); g.clip();
      g.fillStyle = "#ffffff22"; g.fillRect(x, y, pw, ph);
      if (img) { const sc = Math.max(pw / img.width, ph / img.height); g.drawImage(img, x + (pw - img.width * sc) / 2, y + (ph - img.height * sc) / 2, img.width * sc, img.height * sc); }
      g.restore();
    });
    // The facts, label over value.
    g.textAlign = "left";
    let y = 1275;
    for (const [label, value] of cardRows(data, type, genres)) {
      g.font = font(30, 700); g.globalAlpha = 0.65; g.fillText(label.toUpperCase(), 90, y); g.globalAlpha = 1;
      let size = 54; g.font = font(size);
      while (g.measureText(value).width > W - 180 && size > 30) { size -= 2; g.font = font(size); }
      g.fillText(value, 90, y + 58);
      y += 122;
    }
    g.textAlign = "center"; g.font = font(30, 700); g.globalAlpha = 0.6; g.fillText("MyDramaList", W / 2, 1880); g.globalAlpha = 1;
    return new Promise(resolve => { try { canvas.toBlob(blob => resolve(blob), "image/png"); } catch { resolve(null); } });
  }
  // Share through the phone's own share sheet (Instagram, Facebook, TikTok and so on); save the picture if it can't open.
  async function shareCard(data, type, genres, note) {
    note.textContent = "Making your card…";
    let blob = await drawCard(data, type, genres);
    if (!blob) blob = await drawCard(data, type, genres, false); // a picture blocked the canvas: draw without pictures
    if (!blob) { note.textContent = "Your card couldn't be made. Please try again."; return; }
    const file = new File([blob], "my-drama-wrapped.png", { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "My MyDramaList Wrapped" }); note.textContent = ""; return; }
    } catch (error) { if (error?.name === "AbortError") { note.textContent = ""; return; } }
    const link = el("a"); link.href = URL.createObjectURL(blob); link.download = "my-drama-wrapped.png";
    document.body.append(link); link.click(); link.remove();
    note.textContent = "Saved to your device. Post it from your gallery.";
  }
  async function saveCard(data, type, genres, note) {
    note.textContent = "Making your card…";
    const blob = (await drawCard(data, type, genres)) || (await drawCard(data, type, genres, false));
    if (!blob) { note.textContent = "Your card couldn't be made. Please try again."; return; }
    const link = el("a"); link.href = URL.createObjectURL(blob); link.download = "my-drama-wrapped.png";
    document.body.append(link); link.click(); link.remove();
    note.textContent = "Saved to your device.";
  }
  function build(data) {
    const out = [];
    const c = data.statusCounts.completed;
    // 1. Opening: the featured title's backdrop.
    {
      const box = slide("isJourney");
      box.append(el("p", "wrappedKicker", "MyDramaList Wrapped"), el("h2", "wrappedTitle", "@" + data.username + ", here's everything you've watched"),
        el("p", "wrappedLine", "Every drama and movie you've completed, all time."));
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
      // Every row already shows the score, so the subtitle names the title's stars (or, without them, the count).
      const cast = (first.cast || []).slice(0, 2);
      const subtitle = cast.length ? "Starring " + cast.join(" and ") + "." : "Out of the " + (label === "movie" ? data.types?.movies : (data.types?.dramas || 0) + (data.types?.tvShows || 0)) + " " + label + "s you've completed.";
      const list = el("ol", "wrappedRanked isPosters");
      items.slice(0, 5).forEach((t, i) => {
        const li = el("li", "wrappedRise"); li.style.animationDelay = 0.3 + i * 0.12 + "s";
        const thumb = el("span", "wrappedThumb"); if (t.poster) thumb.append(image(t.poster));
        const text = el("span", "wrappedRankedText"); text.append(el("strong", "", t.title), el("small", "", [t.year, "your score " + t.score].filter(Boolean).join(" · ")));
        li.append(el("span", "wrappedRankedNumber", t.rank), thumb, text); list.append(li);
      });
      out.push({ node: withArt(slide(theme, el("h2", "wrappedTitle wrappedHeadline" + (first.title.length > 24 ? " isLong" : ""), "Your #1 " + label + " was " + first.title + "."), el("p", "wrappedLine", subtitle), list), art) });
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
      out.push({ node: withArt(slide("isType", el("p", "wrappedKicker", "Your drama type"), el("h2", "wrappedHuge wrappedPop", type.name), el("p", "wrappedLine", type.line)), data.art?.type) });
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
      card.append(el("p", "wrappedCardBrand", "MyDramaList"), el("p", "wrappedCardUser", "@" + data.username + " · all time"), top, lines);
      const note = el("p", "wrappedShareNote"); note.setAttribute("role", "status");
      const share = el("button", "primary", "Share"); share.type = "button"; share.onclick = () => shareCard(data, type, genres, note);
      const save = el("button", "secondary", "Save image"); save.type = "button"; save.onclick = () => saveCard(data, type, genres, note);
      const actions = el("div", "wrappedActions");
      actions.append(share, save);
      out.push({ node: withArt(slide("isCard", el("h2", "wrappedTitle wrappedHeadline", "Your recap, in one card."), card, actions, note), data.art?.card) });
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

  // The soundtrack: one looping track that starts from the tap that opens Wrapped. Muting is remembered, and if the
  // file can't load the button simply isn't shown.
  let music = null, fading = null, muted = false;
  try { muted = localStorage.getItem("ydl-wrapped-muted") === "1"; } catch {}
  const paintSound = () => { sound.textContent = muted ? "🔇" : "🔊"; sound.setAttribute("aria-label", muted ? "Turn the music on" : "Turn the music off"); sound.setAttribute("aria-pressed", String(!muted)); };
  paintSound();
  function fadeTo(volume, ms, then) {
    clearInterval(fading);
    if (!music) return;
    const from = music.volume, started = Date.now();
    if (reduced() || !ms) { music.volume = volume; then?.(); return; }
    fading = setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / ms);
      try { music.volume = from + (volume - from) * t; } catch {}
      if (t >= 1) { clearInterval(fading); then?.(); }
    }, 50);
  }
  function startMusic() {
    if (muted || typeof Audio !== "function" || typeof WRAPPED_MUSIC === "undefined") return;
    try {
      if (!music) {
        music = new Audio(WRAPPED_MUSIC);
        music.loop = true;
        music.preload = "auto";
        music.addEventListener("error", () => { music = null; sound.hidden = true; }, { once: true });
      }
      music.volume = 0;
      const playing = music.play?.();
      playing?.catch?.(() => {});
      fadeTo(0.7, 1500);
    } catch {}
  }
  function stopMusic() { fadeTo(0, 600, () => { try { music?.pause(); } catch {} }); }
  sound.onclick = () => {
    muted = !muted;
    try { localStorage.setItem("ydl-wrapped-muted", muted ? "1" : "0"); } catch {}
    paintSound();
    if (muted) stopMusic(); else startMusic();
  };
  document.addEventListener("visibilitychange", () => { if (document.hidden && dialog.open) { try { music?.pause(); } catch {} } else if (dialog.open && !muted) startMusic(); });
  dialog.addEventListener("close", stopMusic);

  function open(data) {
    if (!data?.statusCounts) return;
    sound.hidden = false;
    startMusic();
    slides = build(data);
    progress.replaceChildren(...slides.map(() => el("span", "wrappedProgressBar")));
    if (!dialog.open) showAndroidDialog(dialog);
    show(0);
  }

  // The pop-up card that slides up from the bottom of the Lists page. It shows once someone's stats are ready, stays after "Let's go" so the recap
  // can be replayed, and × hides it for a year (or until they have completed more titles).
  const YEAR = 365 * 86400000;
  const banner = el("section", "wrappedBanner");
  banner.hidden = true;
  banner.setAttribute("aria-label", "MyDramaList Wrapped");
  const bannerArt = el("div", "wrappedBannerArt");
  const copy = el("div", "wrappedBannerCopy");
  const go = el("button", "wrappedBannerGo", "Let's go"); go.type = "button";
  copy.append(el("h2", "", "Your MyDramaList Wrapped"), el("p", "", "Jump into your drama story so far."), go);
  const hide = el("button", "wrappedBannerClose", "×"); hide.type = "button"; hide.setAttribute("aria-label", "Hide Wrapped");
  banner.append(bannerArt, el("i", "wrappedSpark isA"), el("i", "wrappedSpark isB"), el("i", "wrappedSpark isC"), copy, hide);
  let bannerData = null, bannerUser = null;
  const bannerKey = user => "ydl-wrapped-banner:" + user.toLowerCase();
  const readDismissal = user => { try { return JSON.parse(localStorage.getItem(bannerKey(user)) || "null"); } catch { return null; } };
  const dismissedNow = (user, completed) => {
    const d = readDismissal(user);
    return !!d && Date.now() - (d.dismissedAt || 0) < YEAR && completed <= (d.completed || 0);
  };
  function syncBanner() {
    const user = connectedUser;
    // A pop-up on the Lists page only (not Discover, Stats, My Collections or the other pages).
    const show = !!bannerData && !!user && user === bannerUser && state.tab === "profiles" && currentPage === "selection" && !dismissedNow(user, bannerData.statusCounts.completed);
    banner.hidden = !show;
  }
  // Their stats are fetched in the background as soon as a username is connected (the server keeps what it learns), and
  // asked again every 20 seconds until the TMDB details are mostly in, so the banner is ready by the time they look.
  let pollTimer = null, polls = 0, inFlight = false;
  async function checkBanner() {
    const user = connectedUser;
    if (!user || inFlight) return;
    if (user === bannerUser && bannerData) { syncBanner(); return; }
    // None while the banner is hidden for a year.
    const d = readDismissal(user);
    if (d && Date.now() - (d.dismissedAt || 0) < YEAR) return;
    inFlight = true;
    let data = null;
    try {
      const response = await fetch("/api/stats?username=" + encodeURIComponent(user), { signal: AbortSignal.timeout(45e3) });
      data = response.ok ? await response.json() : null;
    } catch {}
    inFlight = false;
    if (connectedUser !== user) return;
    const completed = data?.statusCounts?.completed || 0;
    if (completed && (data.coverage?.pending || 0) <= completed * 0.1) { learn(data); return; }
    // Not ready: a private list or none completed will not change, so only keep asking while details are coming in.
    if (data && (!completed || data.coverage?.pending === 0)) return;
    if (polls++ < 15) { clearTimeout(pollTimer); pollTimer = setTimeout(checkBanner, 20e3); }
  }
  function userChanged() {
    clearTimeout(pollTimer); polls = 0; inFlight = false; bannerData = null; bannerUser = null; banner.hidden = true;
    if (connectedUser) checkBanner();
  }
  // Called with the numbers whenever they are fresh (here, or when Stats loads them).
  function learn(data) {
    const user = connectedUser;
    if (!user || data?.username?.toLowerCase?.() !== user.toLowerCase()) return;
    bannerData = data; bannerUser = user;
    bannerArt.replaceChildren(...(data.hero?.backdrop ? [image(data.hero.backdrop)] : []));
    syncBanner();
  }
  go.onclick = () => { if (bannerData) open(bannerData); };
  hide.onclick = () => {
    if (bannerData) try { localStorage.setItem(bannerKey(bannerUser), JSON.stringify({ dismissedAt: Date.now(), completed: bannerData.statusCounts.completed })); } catch {}
    banner.hidden = true;
  };
  function mountBanner() { document.body.append(banner); checkBanner(); }
  window.syncWrappedBanner = () => { syncBanner(); checkBanner(); };
  return { open, mountBanner, learn, syncBanner, userChanged };
}
