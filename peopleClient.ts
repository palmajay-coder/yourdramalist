// @ts-nocheck -- installed into the existing browser scope.
export function installPeopleUI() {
  const compactButtons = new Map();
  // Results go to Discover by default; the + search screen passes its own list and status line.
  const discoverTarget = {list: () => $("listItems"), status: () => $("results")};
  let target = discoverTarget;
  function cleanup() {
    compactButtons.clear();
    if (titlesView?.dialog.open && titlesView.person) watchButton(titlesView.person.id, titlesView.add, () => titlesView.filter);
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
  // Tapping an actor or director opens their titles; tapping a title opens the full drama preview.
  let titlesView;
  function buildTitlesView() {
    const dialog = document.createElement("dialog");
    dialog.className = "androidWatchlistDialog personTitlesDialog";
    const header = document.createElement("header");
    header.className = "androidWatchlistHeader";
    const back = document.createElement("button");
    back.type = "button";
    back.className = "secondary";
    back.textContent = "\u2039";
    back.setAttribute("aria-label", "Back to search results");
    back.onclick = () => dialog.close();
    const photo = document.createElement("img");
    photo.className = "personTitlesPhoto";
    photo.alt = "";
    photo.referrerPolicy = "no-referrer";
    const heading = document.createElement("div");
    const name = document.createElement("h2");
    name.id = "personTitlesName";
    const subtitle = document.createElement("p");
    subtitle.className = "androidWatchlistOwner";
    heading.append(name, subtitle);
    const add = document.createElement("button");
    add.type = "button";
    add.className = "catalogAdd discoverAddPill";
    // Filter icon right of Add: All / Movies / Shows and a sort, like Discover's filters.
    const filterButton = document.createElement("button");
    filterButton.type = "button";
    filterButton.className = "personTitlesFilter";
    filterButton.setAttribute("aria-label", "Sort and filter titles");
    filterButton.setAttribute("aria-haspopup", "dialog");
    filterButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M6 12h12M10 18h4"/></svg><span class="personTitlesFilterDot" hidden></span>';
    header.append(back, photo, heading, add, filterButton);
    const sheet = document.createElement("dialog");
    sheet.className = "androidDiscoverFilters personFilters";
    sheet.setAttribute("aria-label", "Sort and filter titles");
    const media = document.createElement("fieldset");
    media.setAttribute("aria-label", copy.catalogMediaType);
    for (const [value, text] of [["", "All"], ["movie", copy.catalogMovies], ["drama", copy.catalogShows]]) {
      const row = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "personMediaType";
      radio.value = value;
      const caption = document.createElement("span");
      caption.textContent = text;
      row.append(radio, caption);
      radio.onchange = () => setFilter({ ...view.filter, type: value || undefined });
      media.append(row);
    }
    const fields = document.createElement("div");
    fields.className = "androidCatalogFilters";
    const sortLabel = document.createElement("label");
    sortLabel.textContent = copy.catalogSort;
    sortLabel.htmlFor = "personSort";
    const sortSelect = document.createElement("select");
    sortSelect.id = "personSort";
    // The same sorts as Discover. Rating uses TMDB's score; titles without one go last.
    for (const [value, text] of [["", copy.catalogSortDefault], ["newest", copy.shelfSortNewest], ["oldest", copy.shelfSortOldest], ["rating", copy.shelfSortRating], ["az", copy.shelfSortAz]]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      sortSelect.append(option);
    }
    sortSelect.onchange = () => setFilter({ ...view.filter, sort: sortSelect.value || undefined });
    const sortField = document.createElement("div");
    sortField.append(sortLabel, sortSelect);
    fields.append(sortField);
    sheet.append(media, fields);
    document.body.append(sheet);
    sheet.addEventListener("click", (event) => {
      if (event.target !== sheet) return;
      const bounds = sheet.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) sheet.close();
    });
    filterButton.onclick = () => {
      if (sheet.open) return;
      const bounds = filterButton.getBoundingClientRect();
      sheet.style.top = Math.max(8, bounds.bottom + 6) + "px";
      showControls();
      showAndroidDialog(sheet);
    };
    function showControls() {
      for (const radio of media.querySelectorAll("input")) radio.checked = radio.value === (view.filter?.type || "");
      for (const option of sortSelect.querySelectorAll("option")) option.toggleAttribute("selected", option.value === (view.filter?.sort || ""));
      try { sortSelect.value = view.filter?.sort || ""; } catch {}
      const on = !!view.filter;
      filterButton.querySelector(".personTitlesFilterDot").hidden = !on;
      filterButton.setAttribute("aria-pressed", String(on));
    }
    // Each choice is its own catalog: a new choice repaints the titles and shows whether that one is added.
    function setFilter(raw) {
      view.filter = normalizeShelfFilter(raw);
      showControls();
      paintTitles(view);
      if (view.person) paintFilmography(add, !!selectedFilmography(view.person.id, view.filter));
    }
    const body = document.createElement("div");
    body.className = "androidWatchlistBody";
    const status = document.createElement("div");
    status.className = "catalogShelfStatus";
    status.setAttribute("aria-live", "polite");
    const grid = document.createElement("div");
    grid.className = "androidWatchlistGrid";
    body.append(status, grid);
    dialog.append(header, body);
    dialog.setAttribute("aria-labelledby", name.id);
    document.body.append(dialog);
    const view = {dialog, photo, name, subtitle, add, body, status, grid, person: null, token: 0, filter: null, credits: [], showControls};
    dialog.addEventListener("close", () => {
      if (dialog.open) return;
      view.token++;
      if (view.person) compactButtons.get(view.person.id)?.delete(add);
      view.person = null;
      view.credits = [];
      if (sheet.open) sheet.close();
      grid.replaceChildren();
      view.opener?.focus?.();
    });
    return view;
  }
  function titleCard(credit, rank = 0) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "androidWatchlistTitle" + (rank ? " ranked" : "");
    const tile = document.createElement("span");
    tile.className = "androidWatchlistPoster";
    tile.textContent = credit.name;
    if (credit.poster) {
      const img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", () => img.remove(), { once: true });
      img.src = credit.poster;
      tile.append(img);
    }
    if (rank) {
      const number = document.createElement("span");
      number.className = "rankNumber" + (rank >= 10 ? " twoDigits" : "");
      number.setAttribute("aria-hidden", "true");
      number.textContent = String(rank);
      tile.append(number);
      button.setAttribute("aria-label", "Number " + rank + ": " + credit.name);
    }
    const title = document.createElement("strong");
    title.textContent = credit.name;
    const facts = document.createElement("small");
    facts.textContent = [credit.year, credit.type].filter(Boolean).join(" \xB7 ");
    button.append(tile, title, facts);
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
  async function openPersonTitles(person, opener) {
    titlesView ??= buildTitlesView();
    const view = titlesView;
    const token = ++view.token;
    view.person = person;
    view.opener = opener;
    view.name.textContent = person.displayName || person.name;
    view.photo.hidden = !person.poster;
    if (person.poster) view.photo.src = person.poster;
    view.subtitle.textContent = "";
    view.add.setAttribute("aria-label", "Add or remove filmography for " + (person.displayName || person.name));
    // The page opens on the plain filmography; each sort or Movies/Shows choice can be added as its own catalog.
    view.filter = null;
    view.credits = [];
    view.showControls();
    view.add.onclick = () => toggleFilmography(person, view.add, message => { view.status.textContent = message; },
      () => token !== view.token, view.filter);
    watchButton(person.id, view.add, () => view.filter);
    paintFilmography(view.add, !!selectedFilmography(person.id, view.filter));
    view.grid.replaceChildren(createLoadingBear("Loading filmography..."));
    view.status.textContent = "";
    showAndroidDialog(view.dialog);
    view.body.scrollTop = 0;
    try {
      const {result} = await loadFilmography(person);
      if (token !== view.token) return;
      const credits = result.items || [];
      view.status.textContent = credits.length ? "" : "No filmography credits found.";
      view.credits = credits;
      paintTitles(view);
    } catch {
      if (token !== view.token) return;
      view.status.textContent = copy.popularUnavailable + " ";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "secondary catalogRetry";
      retry.textContent = copy.catalogRetry;
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
  return { search, fromUrl, cleanup, sync, reset: cleanup };
}
