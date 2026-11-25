// @ts-nocheck -- installed into the existing browser scope.
export function installPeopleUI() {
  const compactButtons = new Map();
  // Results go to Discover by default; the + search screen passes its own list and status line.
  const discoverTarget = {list: () => $("listItems"), status: () => $("results")};
  let target = discoverTarget;
  function cleanup() {
    compactButtons.clear();
    for (const view of views) if (view.dialog.open && view.person) watchButton(view.person.id, view.add, () => view.filter);
  }
  // Blue "+ Add Filmography" / green "✓ Added" pill, like every other Add button.
  function paintFilmography(button, added) {
    const icon = document.createElement("span");
    icon.className = "discoverAddIcon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = added ? "✓" : "+";
    button.replaceChildren(icon, document.createTextNode(added ? "Added" : "Add Filmography"));
    button.classList.toggle("is-added", added);
    button.setAttribute("aria-pressed", String(added));
  }
  // Each button shows one catalog: search rows the plain filmography, the person page whichever sort is chosen.
  function watchButton(personId, button, filterOf = () => null) {
    if (!compactButtons.has(personId)) compactButtons.set(personId, new Map());
    compactButtons.get(personId).set(button, filterOf);
  }
  function sync() {
    for (const [personId, buttons] of compactButtons) {
      for (const [button, filterOf] of buttons) paintFilmography(button, !!selectedFilmography(personId, filterOf()));
    }
  }
  const personApi = (url, mode) => "/api/mdl/person?mode=" + mode + "&url=" + encodeURIComponent(url);
  async function json(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(15e3) });
    const data2 = await response.json();
    if (!response.ok) throw Error(data2.error || "MyDramaList lookup failed.");
    return data2;
  }
  // One filmography request per person, shared by Add Filmography and the titles screen.
  const filmographies = new Map();
  function loadFilmography(person) {
    const key = person.id + (person.enriched ? ":" + person.actorCount + ":" + person.directorCount : "");
    if (!filmographies.has(key)) {
      const request = (async () => {
        const details = person.enriched ? person : (await json(personApi(person.url, "actor"))).person;
        if (!details.actorCount && !details.directorCount) return {mode: "actor", result: {items: []}};
        // Keep existing catalog identities and use the larger body of credits for people with both roles.
        const mode = details.directorCount > details.actorCount ? "director" : "actor";
        const result = await json("/api/mdl/filmography?mode=" + mode + "&url=" + encodeURIComponent(person.url));
        return {mode, result};
      })();
      filmographies.set(key, request);
      request.catch(() => filmographies.delete(key));
      while (filmographies.size > 30) filmographies.delete(filmographies.keys().next().value);
    }
    return filmographies.get(key);
  }
  /** Adds or removes a person's filmography in Your Selection; report() shows progress or problems. */
  async function toggleFilmography(person, button, report, stale = () => false, filter = null) {
    const selected = selectedFilmography(person.id, filter);
    if (selected) {
      toggleList(selected);
      return;
    }
    button.disabled = true;
    report(copy.loadingLists);
    try {
      const {mode, result} = await loadFilmography(person);
      if (stale()) return;
      if (!result.items?.length) {
        report("No filmography credits found.");
        return;
      }
      if (!selectedFilmography(person.id, filter)) {
        toggleList(withPersonFilter({ ...result.list, posters: [], analyticsSource: "discover-" + mode + "-filmography" }, filter));
      }
      report("");
    } catch {
      if (!stale()) report(copy.popularUnavailable);
    } finally {
      button.disabled = false;
    }
  }

  // A filmography's sort and Movies/Shows choice travel with it into Nuvio, the same way Discover rows do.
  function withPersonFilter(list, filter) {
    const base = String(list.url).replace(/\?.*$/, ""), f = filter ? normalizeShelfFilter(filter) : null;
    const { filter: _old, filterLabel: _label, ...rest } = list;
    // The name follows the choice, Netflix style ("Son Ye Jin’s Top 10 All Time"); no filter keeps "…’s Filmography".
    const person = list.personName || list.personDisplayName;
    const name = person && typeof filmographyName === "function" ? filmographyName(person, f) : rest.name;
    return f ? { ...rest, name, url: base + "?ydlf=" + shelfFilterKey(f), filter: f, filterLabel: "" } : { ...rest, name, url: base };
  }
  // The person page (actor or director): one scrolling page with the photo, facts, biography and
  // filmography. Portrait screens stack it; landscape screens put the profile beside the filmography.
  // The switch is CSS only, so rotating keeps the page, its Movies/Shows choice and its sort.
  // Pages stack: a cast member opened from a preview opened from a person page gets its own page,
  // and Back returns to the previous one where it was left.
  const views = [];
  const svgIcon = paths => '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths + "</svg>";
  const ICONS = {
    back: svgIcon('<path d="M19 12H5M11 18l-6-6 6-6"/>'),
    born: svgIcon('<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>'),
    place: svgIcon('<path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
    credits: svgIcon('<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 9.5h18M3 14.5h18M8 5v14M16 5v14"/>'),
    chevron: svgIcon('<path d="M6 9l6 6 6-6"/>'),
    person: svgIcon('<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6"/>'),
  };
  const node = (tag, className = "", text = "") => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  function topDialog() {
    let top = null;
    if (typeof androidDialogs !== "undefined") for (const dialog of androidDialogs.values()) if (dialog.open) top = dialog;
    return top;
  }
  function freeView() {
    const top = topDialog();
    return views.find(view => view.dialog === top) || views.find(view => !view.dialog.open) || buildTitlesView();
  }
  function buildTitlesView() {
    const suffix = views.length ? "-" + (views.length + 1) : "";
    const dialog = node("dialog", "personProfile personTitlesDialog");
    const page = node("div", "personPage");
    const backdrop = node("div", "personBackdrop");
    backdrop.hidden = true;
    const backdropImage = node("img");
    backdropImage.alt = "";
    backdropImage.referrerPolicy = "no-referrer";
    backdropImage.decoding = "async";
    backdropImage.addEventListener("error", () => { backdrop.hidden = true; });
    backdrop.append(backdropImage);
    const back = node("button", "personBack");
    back.type = "button";
    back.innerHTML = ICONS.back;
    back.setAttribute("aria-label", "Back");
    back.onclick = () => dialog.close();
    const layout = node("div", "personLayout");
    const side = node("div", "personSide");
    const head = node("div", "personHead");
    const photoFrame = node("div", "personPhotoFrame");
    const photo = node("img", "personPhoto personTitlesPhoto");
    photo.alt = "";
    photo.referrerPolicy = "no-referrer";
    const blank = node("span", "personPhotoBlank");
    blank.innerHTML = ICONS.person;
    photo.addEventListener("error", () => { photo.hidden = true; blank.hidden = false; });
    photoFrame.append(photo, blank);
    const identity = node("div", "personIdentity");
    const name = node("h2");
    name.id = "personTitlesName" + suffix;
    // Focus starts on the name (not the Back button), so screen readers announce whose page opened.
    name.tabIndex = -1;
    name.autofocus = true;
    const native = node("p", "personNative");
    const profession = node("p", "personProfession");
    const add = node("button", "catalogAdd discoverAddPill");
    add.type = "button";
    identity.append(name, native, profession, add);
    head.append(photoFrame, identity);
    const facts = node("section", "personCard personFacts");
    facts.setAttribute("aria-label", "Personal information");
    const factList = node("dl");
    facts.append(factList);
    const bio = node("section", "personCard personBio");
    const bioText = node("p", "personBioText");
    bioText.id = "personBio" + suffix;
    const more = node("button", "personMore");
    more.type = "button";
    more.setAttribute("aria-controls", bioText.id);
    const paintMore = () => {
      const open = bio.classList.contains("expanded");
      more.innerHTML = "<span>" + (open ? "Read Less" : "Read More") + "</span>" + ICONS.chevron;
      more.setAttribute("aria-expanded", String(open));
    };
    more.onclick = () => { bio.classList.toggle("expanded"); paintMore(); };
    paintMore();
    bio.append(node("h3", "", "Biography"), bioText, more);
    side.append(head, facts, bio);
    // Read More only when the biography is longer than its preview (checked again after rotation).
    const measureBio = () => {
      if (bio.hidden || bio.classList.contains("expanded")) return;
      more.hidden = !(bioText.scrollHeight > bioText.clientHeight + 2);
    };
    if (typeof ResizeObserver === "function") new ResizeObserver(measureBio).observe(bioText);

    const works = node("section", "personWorks");
    works.setAttribute("aria-labelledby", "personWorksHeading" + suffix);
    const worksHead = node("div", "personWorksHead");
    const worksTitle = node("h3", "", "Filmography");
    worksTitle.id = "personWorksHeading" + suffix;
    const controls = node("div", "personControls");
    // The existing filters: All / Movies / Shows and the same five sorts as Discover.
    const pill = (select, label) => {
      const wrap = node("label", "personPill");
      select.setAttribute("aria-label", label);
      wrap.append(select);
      return wrap;
    };
    const optionList = (select, options) => {
      for (const [value, text] of options) {
        const option = node("option", "", text);
        option.value = value;
        select.append(option);
      }
    };
    const typeSelect = node("select");
    typeSelect.id = "personMediaType" + suffix;
    optionList(typeSelect, [["", "All"], ["movie", copy.catalogMovies], ["drama", copy.catalogShows]]);
    const sortSelect = node("select");
    sortSelect.id = "personSort" + suffix;
    // Rating uses TMDB's score; titles without one go last.
    optionList(sortSelect, [["", copy.catalogSortDefault], ["newest", copy.shelfSortNewest], ["oldest", copy.shelfSortOldest], ["rating", copy.shelfSortRating], ["az", copy.shelfSortAz]]);
    controls.append(pill(typeSelect, copy.catalogMediaType), pill(sortSelect, copy.catalogSort));
    worksHead.append(worksTitle, controls);
    const count = node("p", "personCount");
    count.setAttribute("aria-live", "polite");
    const status = node("div", "catalogShelfStatus");
    status.setAttribute("aria-live", "polite");
    const grid = node("div", "personGrid");
    works.append(worksHead, count, status, grid);
    layout.append(side, works);
    page.append(backdrop, back, layout);
    dialog.append(page);
    dialog.setAttribute("aria-labelledby", name.id);
    document.body.append(dialog);

    const view = {dialog, page, backdrop, backdropImage, photo, blank, name, native, profession, subtitle: count, add, facts, factList,
      bio, bioText, more, paintMore, measureBio, status, grid, person: null, token: 0, filter: null, credits: [], showControls};
    function showControls() {
      const pick = (select, value) => {
        for (const option of select.querySelectorAll("option")) option.toggleAttribute("selected", option.value === value);
        try { select.value = value; } catch {}
        select.classList.toggle("on", !!value);
      };
      pick(typeSelect, view.filter?.type || "");
      pick(sortSelect, view.filter?.sort || "");
    }
    const chosen = select => select.value ?? select.querySelector("option[selected]")?.value ?? "";
    typeSelect.onchange = () => setFilter({ ...view.filter, type: chosen(typeSelect) || undefined });
    sortSelect.onchange = () => setFilter({ ...view.filter, sort: chosen(sortSelect) || undefined });
    // Each choice is its own catalog: a new choice repaints the titles and shows whether that one is added.
    function setFilter(raw) {
      view.filter = normalizeShelfFilter(raw);
      showControls();
      paintTitles(view);
      if (view.person) paintFilmography(add, !!selectedFilmography(view.person.id, view.filter));
    }
    dialog.addEventListener("close", () => {
      if (dialog.open) return;
      view.token++;
      if (view.person) compactButtons.get(view.person.id)?.delete(add);
      view.person = null;
      view.credits = [];
      grid.replaceChildren();
      view.opener?.focus?.();
    });
    views.push(view);
    return view;
  }
  // "1988-02-16" from TMDB, or MyDramaList's "February 16, 1988". Invalid or partial dates give null.
  function birthDate(text) {
    const iso = String(text || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = iso ? new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3])) : /\b\d{4}\b/.test(text || "") && /[A-Za-z]{3}/.test(text || "") && /\b\d{1,2}\b/.test(text || "") ? new Date(Date.parse(text + " UTC")) : null;
    return date && !isNaN(date) && date.getUTCFullYear() > 1850 ? date : null;
  }
  const formatDate = date => date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  function ageOn(born, on) {
    let age = on.getUTCFullYear() - born.getUTCFullYear();
    if (on.getUTCMonth() < born.getUTCMonth() || on.getUTCMonth() === born.getUTCMonth() && on.getUTCDate() < born.getUTCDate()) age--;
    return age;
  }
  function paintProfile(view, details, credits, mode) {
    view.native.textContent = details.nativeName && details.nativeName !== view.name.textContent ? details.nativeName : "";
    view.native.hidden = !view.native.textContent;
    const actor = details.gender === "female" ? "Actress" : "Actor";
    const roles = mode === "director" ? ["Director", details.actorCount ? actor : ""] : [actor, details.directorCount ? "Director" : ""];
    view.profession.textContent = roles.filter(Boolean).join(" \xB7 ");
    view.profession.hidden = false;
    // Facts only when known; nothing is estimated.
    const rows = [];
    const born = birthDate(details.birthday) || birthDate(details.born);
    if (born) {
      const died = birthDate(details.deathday);
      rows.push(["born", "Born", died
        ? formatDate(born) + " – " + formatDate(died) + " (aged " + ageOn(born, died) + ")"
        : formatDate(born) + " (" + ageOn(born, new Date()) + " years)"]);
    }
    if (details.birthplace) rows.push(["place", "Birthplace", details.birthplace]);
    if (credits.length) {
      rows.push(["credits", "Credits", credits.length + (credits.length === 1 ? " title" : " titles")]);
    }
    view.factList.replaceChildren(...rows.flatMap(([icon, label, value]) => {
      const term = node("dt");
      term.innerHTML = ICONS[icon];
      term.append(node("span", "", label));
      return [term, node("dd", "", value)];
    }));
    view.facts.hidden = !rows.length;
    view.bioText.textContent = String(details.biography || "").trim();
    view.bio.hidden = !view.bioText.textContent;
    view.bio.classList.remove("expanded");
    view.paintMore();
    view.more.hidden = true;
    requestAnimationFrame(view.measureBio);
    // A wide still from one of their best-known titles; never a stretched portrait.
    const still = details.backdrops?.[mode] || details.backdrops?.actor || details.backdrops?.director;
    view.backdrop.hidden = !still;
    if (still) view.backdropImage.src = still;
    else view.backdropImage.removeAttribute("src");
  }
  function titleCard(credit, rank = 0) {
    const button = node("button", "personCredit" + (rank ? " ranked" : ""));
    button.type = "button";
    const art = node("span", "personArt", credit.name);
    const image = (src, className) => {
      const img = node("img", className);
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", () => { img.remove(); if (className === "personWide") art.classList.remove("hasWide"); }, { once: true });
      img.src = src;
      art.append(img);
    };
    // Posters on portrait screens; wide artwork on landscape ones (hidden images are not downloaded).
    if (credit.poster) image(credit.poster, "personPoster");
    if (credit.backdrop) {
      art.classList.add("hasWide");
      image(credit.backdrop, "personWide");
    }
    if (rank) {
      const number = node("span", "personRank" + (rank >= 10 ? " twoDigits" : ""), String(rank));
      number.setAttribute("aria-hidden", "true");
      art.append(number);
    }
    const text = node("span", "personCreditText");
    const facts = node("small", "", [credit.year, credit.type].filter(Boolean).join(" \xB7 "));
    text.append(node("strong", "", credit.name), facts);
    if (Number(credit.score) > 0) {
      const score = node("span", "personRating");
      const star = node("span", "personStar", "★");
      star.setAttribute("aria-hidden", "true");
      score.append(star, document.createTextNode(" " + Number(credit.score).toFixed(1)));
      text.append(score);
    }
    button.append(art, text);
    const role = credit.role && credit.role !== "Screenwriter & Director" ? ", as " + credit.role : "";
    button.setAttribute("aria-label", (rank ? "Number " + rank + ": " : "") + credit.name + (credit.year ? ", " + credit.year : "") + (credit.type ? ", " + credit.type : "") +
      (Number(credit.score) > 0 ? ", rated " + Number(credit.score).toFixed(1) : "") + role);
    button.onclick = () => showCatalogTitle({name: credit.name, url: credit.url, year: credit.year, type: credit.type, poster: credit.poster});
    return button;
  }
  function paintTitles(view) {
    const credits = view.credits || [];
    const sorted = view.filter ? applyShelfFilter(credits, view.filter) : credits;
    // Top Rated is a Netflix-style Top 10: the ten highest rated titles, with big rank numbers.
    const ranked = view.filter?.sort === "rating";
    const shown = ranked ? filmographyTop(sorted) : sorted;
    const total = credits.length + (credits.length === 1 ? " title" : " titles");
    view.subtitle.textContent = credits.length ? (ranked ? "Top " + shown.length + " of " + total : shown.length === credits.length ? total : shown.length + " of " + total) : "";
    if (credits.length) view.grid.replaceChildren(...shown.map((credit, index) => titleCard(credit, ranked ? index + 1 : 0)));
  }
  const nameKey = text => String(text || "").toLowerCase().normalize("NFKD").split(/[^\p{L}\p{N}]+/u).filter(Boolean).sort().join(" ");
  // A cast member without a MyDramaList address (TMDB-only titles): find them by name.
  async function findPerson(person) {
    const data2 = await json("/api/mdl/people-search?mode=actor&q=" + encodeURIComponent(person.name.slice(0, 100)) + "&page=1");
    const people = data2.people || [];
    const exact = people.find(match => nameKey(match.name) === nameKey(person.name));
    if (exact) return exact;
    // Stage names: MyDramaList lists "Ha Young" where TMDB has "Ahn Ha-young" (or the other way round). Without an exact match, a result whose
    // words (two or more) are all in the other name counts, but only when exactly one result does, so two similar names never get mixed up.
    const words = text => String(text || "").toLowerCase().normalize("NFKD").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const mine = words(person.name);
    const near = people.filter(match => {
      const theirs = words(match.name);
      return theirs.length >= 2 && mine.length >= 2 && (theirs.every(word => mine.includes(word)) || mine.every(word => theirs.includes(word)));
    });
    if (near.length === 1) return near[0];
    // Still nothing (a stage name such as TMDB's "Yoona" for MyDramaList's "Lim Yoon A"): the server finds them by TMDB's other names for them,
    // and only accepts a MyDramaList page that shares titles with their TMDB credits.
    try {
      const resolved = await json("/api/mdl/person-resolve?name=" + encodeURIComponent(person.name.slice(0, 100)) + (person.tmdbId ? "&tmdb=" + Number(person.tmdbId) : ""));
      return resolved?.person?.url ? resolved.person : null;
    } catch { return null; }
  }
  async function openPersonTitles(person, opener) {
    const view = freeView();
    const token = ++view.token;
    view.opener = opener;
    view.person = null;
    view.name.textContent = person.displayName || person.name;
    view.photo.hidden = !person.poster;
    view.blank.hidden = !!person.poster;
    if (person.poster) view.photo.src = person.poster;
    else view.photo.removeAttribute("src");
    view.native.hidden = view.profession.hidden = view.facts.hidden = view.bio.hidden = view.backdrop.hidden = true;
    view.subtitle.textContent = "";
    // The page opens on the plain filmography; each sort or Movies/Shows choice can be added as its own catalog.
    view.filter = null;
    view.credits = [];
    view.showControls();
    view.add.hidden = true;
    view.grid.replaceChildren(createLoadingBear("Loading filmography..."));
    view.status.textContent = "";
    showAndroidDialog(view.dialog);
    view.page.scrollTop = 0;
    try {
      if (!person.url) {
        const found = await findPerson(person);
        if (token !== view.token) return;
        if (!found) {
          view.grid.replaceChildren();
          view.status.textContent = "This profile isn't available on MyDramaList.";
          return;
        }
        person = {...found, poster: person.poster || found.poster};
      }
      person.id ??= String(person.url).match(/\/people\/(\d+)-/)?.[1];
      view.person = person;
      view.add.hidden = false;
      view.add.setAttribute("aria-label", "Add or remove filmography for " + (person.displayName || person.name));
      view.add.onclick = () => toggleFilmography(person, view.add, message => { view.status.textContent = message; },
        () => token !== view.token, view.filter);
      watchButton(person.id, view.add, () => view.filter);
      paintFilmography(view.add, !!selectedFilmography(person.id, view.filter));
      const {mode, result} = await loadFilmography(person);
      if (token !== view.token) return;
      const credits = result.items || [];
      const details = result.person || person;
      if (details.name) view.name.textContent = details.displayName || details.name;
      if (!person.poster && details.poster) {
        view.photo.src = details.poster;
        view.photo.hidden = false;
        view.blank.hidden = true;
      }
      paintProfile(view, details, credits, mode);
      view.status.textContent = credits.length ? "" : "No filmography credits found.";
      view.credits = credits;
      if (!credits.length) view.grid.replaceChildren();
      paintTitles(view);
    } catch {
      if (token !== view.token) return;
      view.grid.replaceChildren();
      view.status.textContent = copy.popularUnavailable + " ";
      const retry = node("button", "secondary catalogRetry", copy.catalogRetry);
      retry.type = "button";
      retry.onclick = () => openPersonTitles(person, opener);
      view.status.append(retry);
    }
  }
  // The added catalog for exactly this choice: the plain address, or the address plus ?ydlf=<filter key>.
  function selectedFilmography(personId, filter = null) {
    const f = filter ? normalizeShelfFilter(filter) : null, key = f ? "?ydlf=" + shelfFilterKey(f) : "";
    return state.selection.find(({ url }) =>
      url === "ydl-filmography:actor:" + personId + key || url === "ydl-filmography:director:" + personId + key
    );
  }
  function compactPerson(person) {
    const requestId = listRequest;
    const name = person.displayName || person.name;
    const card = document.createElement("article");
    card.className = "catalogShelf compactCatalogRow";
    const head = document.createElement("div");
    head.className = "catalogShelfHead";
    const identity = document.createElement("button");
    identity.type = "button";
    identity.className = "compactPersonIdentity";
    identity.setAttribute("aria-label", "See titles with " + name);
    identity.setAttribute("aria-haspopup", "dialog");
    identity.onclick = () => openPersonTitles(person, identity);
    const title = document.createElement("h3");
    title.textContent = name;
    if (person.poster) {
      const photo = document.createElement("img");
      photo.className = "compactPersonPhoto";
      photo.alt = "";
      photo.src = person.poster;
      photo.loading = "lazy";
      photo.decoding = "async";
      photo.referrerPolicy = "no-referrer";
      identity.append(photo);
    }
    const add = document.createElement("button");
    add.type = "button";
    add.className = "catalogAdd discoverAddPill";
    add.setAttribute("aria-label", "Add or remove filmography for " + name);
    watchButton(person.id, add);
    const status = document.createElement("p");
    status.className = "catalogShelfStatus";
    status.setAttribute("role", "status");
    status.hidden = true;
    identity.append(title);
    head.append(identity, add);
    card.append(head, status);

    function showStatus(message) {
      status.textContent = message;
      status.hidden = !message;
    }
    add.onclick = () => toggleFilmography(person, add, showStatus, () => requestId !== listRequest || !card.isConnected);
    return card;
  }
  function renderMatches(data2) {
    cleanup();
    const mode = data2.mode;
    const results = target.list();
    const titles = data2.titles || [];
    results.replaceChildren();
    target.status().textContent = titles.length || data2.people.length ? "" : "No matches found. Try another search.";
    if (data2.warning) target.status().append(document.createTextNode(" · " + data2.warning));
    if (titles.length) {
      const section = document.createElement("section");
      const heading = document.createElement("h3");
      heading.className = "catalogSectionTitle";
      heading.textContent = "Dramas and movies";
      const track = document.createElement("div");
      track.className = "discoverTitleRows";
      for (const item of titles) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "discoverTitleIdentity";
        const row = document.createElement("article");
        row.className = "catalogShelf discoverTitleRow";
        const artwork = document.createElement(item.poster ? "img" : "span");
        if (item.poster) {
          artwork.src = item.poster;
          artwork.alt = "";
          artwork.loading = "lazy";
          artwork.referrerPolicy = "no-referrer";
          artwork.addEventListener("error", () => {
            const blank = document.createElement("span");
            blank.className = "shelfPosterBlank";
            artwork.replaceWith(blank);
          }, { once: true });
        } else {
          artwork.className = "shelfPosterBlank";
          artwork.setAttribute("aria-hidden", "true");
        }
        const title = document.createElement("strong");
        title.textContent = item.name;
        button.append(artwork, title);
        button.onclick = () => showCatalogTitle(item);
        const add = makeDiscoverTitleAdd(item, "search",
          setSaving => openCollectionPicker(item, document.body, setSaving));
        row.append(button, add);
        track.append(row);
      }
      section.append(heading, track);
      results.append(section);
    }
    if (data2.people.length) {
      const section = document.createElement("section");
      section.className = "discoverPeopleResults";
      if (titles.length || data2.query) {
        const heading = document.createElement("h3");
        heading.className = "catalogSectionTitle";
        heading.textContent = "Actors and directors";
        section.append(heading);
      }
      for (const person of data2.people) section.append(compactPerson(person));
      // The server ranks results by how well they match; a name that matches better than any title leads.
      if (data2.peopleFirst) results.prepend(section);
      else results.append(section);
    }
    sync();
    if (data2.page > 1 || data2.hasNextPage) {
      const nav = document.createElement("nav");
      nav.className = "searchPages";
      nav.setAttribute("aria-label", "Discover search result pages");
      for (const step of [-1, 1]) {
        if (step === -1 && data2.page === 1 || step === 1 && !data2.hasNextPage) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary";
        button.textContent = step === -1 ? "Previous matches" : "More matches";
        button.onclick = () => search(data2.query, data2.page + step, mode, target);
        nav.append(button);
      }
      results.append(nav);
    }
  }
  async function search(query2, page3 = 1, mode = state.filter, where = discoverTarget) {
    target = where;
    cleanup();
    const requestId = ++listRequest;
    // Shared compact loading status is replaced by results, empty state, or error.
    target.list().replaceChildren(createLoadingBear("Searching for " + query2));
    target.status().textContent = "";
    try {
      const data2 = await json("/api/mdl/people-search?mode=" + mode + "&q=" + encodeURIComponent(query2) + "&page=" + page3);
      if (requestId !== listRequest) return;
      renderMatches(data2);
    } catch (e) {
      if (requestId !== listRequest) return;
      target.list().replaceChildren();
      target.status().textContent = "Unable to search Discover: " + (["TimeoutError", "AbortError"].includes(e.name) ? "This request took too long. Please try again." : e.message);
    }
  }
  async function fromUrl(raw, mode = state.filter, where = discoverTarget) {
    target = where;
    cleanup();
    const requestId = ++listRequest;
    target.list().replaceChildren(createLoadingBear("Searching for " + raw));
    target.status().textContent = "";
    try {
      const data2 = await json(personApi(raw, mode));
      if (requestId !== listRequest) return;
      renderMatches({ mode, people: [{ ...data2.person, enriched: true }], page: 1, hasNextPage: false });
      if (data2.warning) target.status().append(document.createTextNode(" \xB7 " + data2.warning));
    } catch (e) {
      if (requestId !== listRequest) return;
      target.list().replaceChildren();
      target.status().textContent = "Unable to load person: " + (["TimeoutError", "AbortError"].includes(e.name) ? "This request took too long. Please try again." : e.message);
    }
  }
  return { search, fromUrl, cleanup, sync, reset: cleanup, openPerson: openPersonTitles };
}
