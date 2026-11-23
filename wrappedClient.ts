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
   * Your drama personality: the first rule that fits on the stats, never random. Genres leave out "Drama" (it fits
   * almost everything). Everyone with a completed title gets at least "The Drama Fan".
   */
  // The owner's words (wrapped-text.md), filled in by wrappedCopy; T(key) works before any data too.
  let say = {};
  const T = (key, values) => (say.t || (typeof wrappedCopy === "function" ? wrappedCopy(null, typeof WRAPPED_TEXT === "string" ? WRAPPED_TEXT : "").t : () => null))(key, values) || "";
  function dramaType(data) {
    const c = data.statusCounts.completed;
    if (!c) return null;
    const genres = (data.genres || []).filter(g => g.genre !== "Drama");
    const top = genres[0];
    const hours = data.viewingTime?.hours || 0;
    const rules = [
      { id: "romantic", fits: top?.genre === "Romance" },
      { id: "thriller", fits: ["Thriller", "Crime", "Mystery", "Horror"].includes(top?.genre) },
      { id: "hopper", fits: genres.length >= 6 && !!top && top.count / c < 0.25 },
      { id: "marathoner", fits: hours >= 300 },
    ];
    const hit = rules.find(x => x.fits) || { id: "fan" };
    return { name: T("personality." + hit.id + ".name"), line: T("personality." + hit.id + ".line") };
  }
  const plural = (n, word) => n + " " + word + (n === 1 ? "" : "s");
  const andList = list => list.length > 1 ? list.slice(0, -1).join(", ") + " and " + list[list.length - 1] : list[0];
  // A story slide: a short story line, one big statistic, one supporting line, then any extras.
  // Text with **bold** parts for emphasis (numbers, names), built from text nodes only.
  function rich(className, text, tag = "p") {
    const node = el(tag, className);
    // **bold** and __italic__ (title names); both are built as elements, never as HTML.
    String(text).split("**").forEach((part, i) => {
      const parent = i % 2 ? node.appendChild(el("strong")) : node;
      part.split("__").forEach((bit, j) => { if (bit) parent.append(j % 2 ? el("em", "", bit) : bit); });
    });
    return node;
  }
  const b = x => "**" + x + "**";
  // One flowing description: the narrator's line (which already holds the numbers), or the plain fact without it.
  const describe = (fact, comment) => { const text = comment || fact; return text ? rich("wrappedLine", text) : null; };
  // A story slide: the story line, the big stat, then the description.
  const storySlide = (theme, story, big, comment, fact, ...extra) => slide(theme, rich("wrappedStory", story), big, describe(fact, comment), ...extra);
  const huge = text => el("h2", "wrappedHuge wrappedPop" + (String(text).length > 8 ? " isLong" : ""), text); // long names shrink to stay on one or two lines
  // The countries slide's map: a pixel map of Asia with the top country (or tied countries) lit up and circled.
  // Returns null for a country that isn't on it, and the slide falls back to bars.
  function countryMap(names) {
    const map = typeof WRAPPED_MAP === "undefined" ? null : WRAPPED_MAP;
    const codes = map ? names.map(n => map.codes[n]).filter(Boolean) : [];
    if (!codes.length || !document.createElementNS) return null;
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + map.cols + " " + map.rows);
    svg.setAttribute("class", "wrappedMap");
    svg.setAttribute("aria-hidden", "true");
    const spots = new Map(codes.map(code => [code, { x: 0, y: 0, n: 0 }]));
    // Two paths (other land, the highlighted country) instead of thousands of squares: light on phones.
    let land = "", hit = "";
    map.grid.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === ".") continue;
        const square = "M" + (x + 0.07) + " " + (y + 0.07) + "h.86v.86h-.86z";
        const spot = spots.get(ch);
        if (spot) { hit += square; spot.x += x + 0.5; spot.y += y + 0.5; spot.n++; } else land += square;
      }
    });
    for (const [d, className] of [[land, "isLand"], [hit, "isHit"]]) {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", d); path.setAttribute("class", className);
      svg.append(path);
    }
    for (const spot of spots.values()) {
      if (!spot.n) continue;
      const ring = document.createElementNS(NS, "circle");
      ring.setAttribute("cx", spot.x / spot.n); ring.setAttribute("cy", spot.y / spot.n);
      ring.setAttribute("r", Math.max(3, Math.sqrt(spot.n) * 0.75 + 2).toFixed(2));
      ring.setAttribute("class", "wrappedMapRing");
      svg.append(ring);
    }
    return svg;
  }
  function bars(rows) {
    const list = el("ul", "wrappedBars");
    const max = Math.max(...rows.map(x => x.count));
    rows.forEach((x, i) => {
      const li = el("li", "wrappedBar");
      const fill = el("span", "wrappedBarFill");
      fill.style.setProperty("--w", Math.max(6, Math.round(x.count / max * 100)) + "%");
      fill.style.animationDelay = 0.2 + i * 0.12 + "s";
      const track = el("span", "wrappedBarTrack"); track.append(fill);
      li.append(el("span", "wrappedBarLabel", x.label), track, el("span", "wrappedBarValue", x.count));
      list.append(li);
    });
    return list;
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
    const rows = [];
    if (genres[0]) rows.push(["Top genre", genres[0].genre]);
    if (data.actors?.[0]) rows.push(["Most-watched actor", data.actors[0].name]);
    if (data.countries?.length) rows.push([data.countries.length > 1 ? "Top countries" : "Top country", data.countries.slice(0, 3).map(x => x.country).join(", ")]);
    if (type) rows.push(["Drama personality", type.name]);
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
    g.font = font(42, 700); g.globalAlpha = 0.8; g.fillText("So far", W / 2, 325); g.globalAlpha = 1;
    const hours = data.viewingTime?.hours;
    g.font = font(210, 900); g.fillText(hours ? fmt.format(hours) : String(data.statusCounts.completed), W / 2, 570);
    g.font = font(52, 700); g.globalAlpha = 0.9; g.fillText(hours ? "hours watched · " + data.statusCounts.completed + " completed" : "titles completed", W / 2, 645); g.globalAlpha = 1;
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
    g.textAlign = "center"; g.font = font(34, 800); g.globalAlpha = 0.9; g.fillText(T("summary.headline").replace(/\*\*/g, ""), W / 2, 1815);
    g.font = font(30, 700); g.globalAlpha = 0.6; g.fillText("MyDramaList", W / 2, 1880); g.globalAlpha = 1;
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
    try { say = typeof wrappedCopy === "function" ? wrappedCopy(data, typeof WRAPPED_TEXT === "string" ? WRAPPED_TEXT : "") || {} : {}; } catch { say = {}; } // the owner's lines (wrapped-text.md)
    const c = data.statusCounts.completed;
    // 1. Opening: the slogan over the featured title's backdrop.
    {
      const box = slide("isJourney");
      box.append(el("p", "wrappedKicker", "@" + data.username), el("h2", "wrappedTitle wrappedSlogan", T("opening.headline")),
        rich("wrappedLine", T("opening.line")));
      out.push({ node: withArt(box, data.art?.opening) });
    }
    // 2. Completed: the count, big.
    if (c) {
      const num = el("span", "wrappedNumber");
      const big = el("h2", "wrappedHuge"); big.append(num);
      const dramas = (data.types?.dramas || 0) + (data.types?.tvShows || 0), movies = data.types?.movies || 0;
      const parts = [dramas ? b(dramas) + (dramas === 1 ? " drama" : " dramas") : "", movies ? b(movies) + (movies === 1 ? " movie" : " movies") : ""].filter(Boolean);
      out.push({ node: withArt(storySlide("isCompleted", T("completed.story"), big, say.completed, parts.length ? andList(parts) + ", completed so far." : "Titles completed so far."), data.art?.completed), onShow: () => countUp(num, c) });
    }
    // 3. Time: hours, big.
    if (data.viewingTime?.hours) {
      const num = el("span", "wrappedNumber");
      const big = el("h2", "wrappedHuge"); big.append(num, el("span", "wrappedUnit", " hours"));
      const days = Math.round(data.viewingTime.days);
      out.push({ node: withArt(storySlide("isTime", T("time.story"), big, say.time, days >= 1 ? "That's " + b(plural(days, "day")) + " nonstop." : "Every minute counted."), data.art?.time),
        onShow: () => countUp(num, data.viewingTime.hours, 1) });
    }
    // 4. Genres ("Drama" fits almost everything, so it's left out, as on Stats).
    const genres = (data.genres || []).filter(g => g.genre !== "Drama");
    if (genres.length) {
      // Only the #1 genre is named.
      out.push({ node: withArt(storySlide("isGenres", T("genre.story"), huge(genres[0].genre), say.genre, "In " + b(genres[0].count) + " of your completed titles."), data.art?.genres) });
    }
    // 5. Countries, with ties said as ties.
    if ((data.countries || []).length) {
      const top = data.countries.slice(0, 6);
      const leaders = top.filter(x => x.count === top[0].count).map(x => x.country);
      const map = countryMap(leaders);
      // Only the #1 country (or the countries tied for #1) is named.
      const line = leaders.length > 1 ? b(top[0].count) + " titles each." : b(top[0].count) + " of your " + b(c) + " completed titles.";
      const box = storySlide("isAsia", T("countries.story"), huge(andList(leaders)), say.countries, line, map ? null : bars(top.map(x => ({ label: x.country, count: x.count }))));
      if (map) box.querySelector(".wrappedStory").after(map); // story line, then the map, then the country
      out.push({ node: withArt(box, data.art?.countries) });
    }
    // 6. Eras, by release decade (MyDramaList gives no watch dates, so this is when the titles came out).
    const decades = (data.decades || []).filter(d => d.count > 0);
    if (decades.length >= 2) {
      const most = Math.max(...decades.map(d => d.count));
      const leaders = decades.filter(d => d.count === most).map(d => d.decade);
      const line = leaders.length > 1 ? b(most) + " titles each, by release year." : b(most) + " of your completed titles came out in the " + b(leaders[0]) + ".";
      const rows = [...decades].sort((a, b) => b.count - a.count || b.decade.localeCompare(a.decade)).map(d => ({ label: d.decade, count: d.count })); // most first
      out.push({ node: withArt(storySlide("isEras", T("eras.story"), huge("The " + andList(leaders)), say.eras, line, bars(rows)), data.art?.eras) });
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
      out.push({ node: withArt(slide("isFaces", portrait, rich("wrappedTitle wrappedHeadline", T("actor.headline", { name: first.name }), "h2"),
        describe(b(first.count) + " of your completed titles feature " + b(first.name) + ".", say.actor), list), data.art?.actors) });
    }
    // 6. Your #1 drama and your #1 movie, each with its own ranked list and backdrop.
    const rankedSlide = (items, label, theme, art) => {
      if (!(items || []).length) return;
      const first = items[0];
      // Every row already shows the score, so the subtitle names the title's stars (or, without them, the count).
      const cast = (first.cast || []).slice(0, 2);
      const subtitle = "Your #1 " + label + (cast.length ? ". Starring " + cast.map(b).join(" and ") + "." : ", out of the " + b(label === "movie" ? data.types?.movies : (data.types?.dramas || 0) + (data.types?.tvShows || 0)) + " " + label + "s you've completed.");
      const list = el("ol", "wrappedRanked isPosters");
      items.slice(0, 5).forEach((t, i) => {
        const li = el("li", "wrappedRise"); li.style.animationDelay = 0.3 + i * 0.12 + "s";
        const thumb = el("span", "wrappedThumb"); if (t.poster) thumb.append(image(t.poster));
        const text = el("span", "wrappedRankedText"); text.append(el("strong", "", t.title), el("small", "", [t.year, "your score " + t.score].filter(Boolean).join(" · ")));
        li.append(el("span", "wrappedRankedNumber", t.rank), thumb, text); list.append(li);
      });
      out.push({ node: withArt(storySlide(theme, T(label === "movie" ? "topMovie.story" : "topDrama.story"), el("h2", "wrappedTitle wrappedHeadline wrappedPop" + (first.title.length > 24 ? " isLong" : ""), first.title), label === "movie" ? say.topMovie : say.topDrama, subtitle, list), art) });
    };
    rankedSlide(data.topDramas, "drama", "isStories", data.art?.topDrama);
    rankedSlide(data.topMovies, "movie", "isMovies", data.art?.topMovie);
    // 7. Ratings: only facts the data supports.
    const r = data.ratings;
    if (r?.rated && r.average != null) {
      const num = el("span", "wrappedNumber");
      const head = el("h2", "wrappedTitle wrappedHeadline");
      const [before, after = ""] = T("ratings.headline").split("{average}");
      head.append(before, num, after);
      const tens = (r.distribution || []).find(d => d.score === 10)?.count || 0;
      const most = [...(r.distribution || [])].sort((a, b) => b.count - a.count)[0];
      const fact = "Across " + b(r.rated) + (r.rated === 1 ? " rated title" : " rated titles") + (tens ? ", you gave " + b(tens) + " a perfect 10." : ".") +
        (most && most.score !== 10 ? " Your most common score is " + b(most.score) + "." : "");
      out.push({ node: withArt(slide("isRatings", head, describe(fact, say.ratings)), data.art?.ratings),
        onShow: () => countUp(num, r.average, 2) });
    }
    // 8. Your drama type: a label from clear rules on real numbers.
    const type = dramaType(data);
    if (type) {
      out.push({ node: withArt(storySlide("isType", T("personality.story"), huge(type.name), type.line, null), data.art?.type) });
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
      if (type) lines.append(el("li", "", "Drama personality: " + type.name));
      card.append(el("p", "wrappedCardBrand", "MyDramaList"), el("p", "wrappedCardUser", "@" + data.username + " · so far"), top, lines);
      const note = el("p", "wrappedShareNote"); note.setAttribute("role", "status");
      const share = el("button", "primary", "Share"); share.type = "button"; share.onclick = () => shareCard(data, type, genres, note);
      const save = el("button", "secondary", "Save image"); save.type = "button"; save.onclick = () => saveCard(data, type, genres, note);
      const actions = el("div", "wrappedActions");
      actions.append(share, save);
      out.push({ node: withArt(slide("isCard", rich("wrappedTitle wrappedHeadline", T("summary.headline"), "h2"), card, actions, note), data.art?.card) });
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
  // Four tracks take turns: each page load plays the next one (remembered on the device; random if storage is unavailable).
  let track = null;
  function pickTrack() {
    if (track) return track;
    const list = Array.isArray(WRAPPED_MUSIC) ? WRAPPED_MUSIC : [WRAPPED_MUSIC];
    let i;
    try {
      const last = Number(localStorage.getItem("ydl-wrapped-track"));
      i = Number.isInteger(last) && localStorage.getItem("ydl-wrapped-track") !== null ? (last + 1) % list.length : 0;
      localStorage.setItem("ydl-wrapped-track", String(i));
    } catch { i = Math.floor(Math.random() * list.length); }
    return track = list[i];
  }
  function startMusic() {
    if (muted || typeof Audio !== "function" || typeof WRAPPED_MUSIC === "undefined") return;
    try {
      if (!music) {
        music = new Audio(pickTrack());
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

  // The pop-up card that slides up from the bottom when someone logs in (once). "Let's go" opens Stats; × closes it.
  const banner = el("section", "wrappedBanner");
  banner.hidden = true;
  banner.setAttribute("aria-label", "Your Drama Wrapped");
  const bannerArt = el("div", "wrappedBannerArt");
  const copy = el("div", "wrappedBannerCopy");
  const go = el("button", "wrappedBannerGo", "Let's go"); go.type = "button";
  copy.append(el("h2", "", "Your Drama Wrapped"), el("p", "", "Jump into your years of drama from the beginning to 2026."), go);
  const hide = el("button", "wrappedBannerClose", "×"); hide.type = "button"; hide.setAttribute("aria-label", "Hide Wrapped");
  banner.append(bannerArt, el("i", "wrappedSpark isA"), el("i", "wrappedSpark isB"), el("i", "wrappedSpark isC"), copy, hide);
  let bannerData = null, bannerUser = null;
  // The pop-up shows once per login: it is armed when a username is newly connected, shown on the first page that can hold it, and used up
  // as soon as they tap either button or move on. A page reload, or opening their own lists again, does not bring it back.
  let popupUser = null, popupSeen = false, lastUser = null;
  function syncBanner() {
    const user = connectedUser;
    // It shows without waiting for the numbers (Stats loads them). Not on Stats itself.
    const known = bannerUser === user ? bannerData?.statusCounts?.completed : undefined;
    const show = !!user && popupUser === user && state.tab !== "stats" && currentPage === "selection" && known !== 0;
    if (show) popupSeen = true; else if (popupSeen) { popupUser = null; popupSeen = false; } // seen once, then they moved on
    banner.hidden = !show;
  }
  // Their stats are fetched in the background as soon as a username is connected (the server keeps what it learns), and
  // asked again every 20 seconds until the TMDB details are mostly in, so the banner is ready by the time they look.
  let pollTimer = null, polls = 0, inFlight = false;
  async function checkBanner() {
    const user = connectedUser;
    if (!user || inFlight) return;
    if (user === bannerUser && bannerData) { syncBanner(); return; }
    inFlight = true;
    let data = null;
    try {
      const response = await fetch("/api/stats?username=" + encodeURIComponent(user), { signal: AbortSignal.timeout(45e3) });
      data = response.ok ? await response.json() : null;
    } catch {}
    inFlight = false;
    if (connectedUser !== user) return;
    const completed = data?.statusCounts?.completed || 0;
    // Nothing completed is also an answer: it is recorded so the pop-up has nothing to show.
    if (data?.statusCounts && (!completed || (data.coverage?.pending || 0) <= completed * 0.1)) { learn(data); return; }
    // Not ready: a private list or none completed will not change, so only keep asking while details are coming in.
    if (data && (!completed || data.coverage?.pending === 0)) return;
    if (polls++ < 15) { clearTimeout(pollTimer); pollTimer = setTimeout(checkBanner, 20e3); }
  }
  function userChanged() {
    clearTimeout(pollTimer); polls = 0; inFlight = false; bannerData = null; bannerUser = null; banner.hidden = true;
    // Only a newly connected username arms the pop-up (not the same one looked up again).
    popupUser = connectedUser && connectedUser !== lastUser ? connectedUser : null; popupSeen = false; lastUser = connectedUser || "";
    syncBanner();
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
  const dismiss = () => { popupUser = null; popupSeen = false; banner.hidden = true; };
  // "Let's go" opens the Stats page, which loads everything.
  go.onclick = () => { dismiss(); window.openWrappedStats?.(); };
  hide.onclick = dismiss;
  function mountBanner() { lastUser = connectedUser || ""; document.body.append(banner); checkBanner(); } // the saved username is not a new login
  window.syncWrappedBanner = () => { syncBanner(); checkBanner(); };
  return { open, mountBanner, learn, syncBanner, userChanged };
}
