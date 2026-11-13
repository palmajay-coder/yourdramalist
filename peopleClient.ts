// @ts-nocheck -- installed into the existing browser scope.
export function installPeopleUI() {
  let lastSearch = null, shelfState = null;
  const compactButtons = new Map();
  function cleanup() {
    compactButtons.clear();
    if (shelfState) {
      shelfState.observer?.disconnect();
      shelfState.abort.abort();
      shelfState = null;
    }
  }
  function sync() {
    for (const [url, button] of compactButtons) {
      const added = state.selection.some((item) => item.url === url);
      button.textContent = added ? copy.catalogAdded : copy.addFilmography;
      button.setAttribute("aria-pressed", String(added));
    }
    if (!shelfState) return;
    const selected = state.selection.some((x) => x.url === shelfState.list.url);
    shelfState.add.setAttribute("aria-pressed", String(selected));
    shelfState.add.textContent = selected ? copy.catalogAdded : copy.addFilmography;
  }
  const personApi = (url, mode) => "/api/mdl/person?mode=" + mode + "&url=" + encodeURIComponent(url);
  async function json(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(15e3) });
    const data2 = await response.json();
    if (!response.ok) throw Error(data2.error || "MyDramaList lookup failed.");
    return data2;
  }
  function backButton() {
    if (!lastSearch) return;
    const back = document.createElement("button");
    back.type = "button";
    back.className = "secondary";
    back.textContent = copy.filmographyBack;
    back.onclick = () => {
      listRequest++;
      renderMatches(lastSearch);
    };
    $("results").append(document.createTextNode(" "), back);
  }
  async function showFilmography(person, mode) {
    cleanup();
    const requestId = ++listRequest;
    $("listItems").replaceChildren();
    $("results").textContent = "";
    try {
      const data2 = await json("/api/mdl/filmography?mode=" + mode + "&url=" + encodeURIComponent(person.url));
      if (requestId !== listRequest) return;
      const list = { ...data2.list, analyticsSource: mode === "director" ? "discover-director-filmography" : "discover-actor-filmography" };
      if (!data2.sectionFound || !data2.items.length) {
        $("results").textContent = mode === "director" ? "No Screenwriter & Director credits were shown for this person." : "No Drama or Movie acting credits were shown for this person.";
        backButton();
        return;
      }
      state.selection = state.selection.map((l) => l.url === list.url ? { ...l, ...list } : l);
      try {
        localStorage.setItem(selectionKey, JSON.stringify(state.selection));
      } catch {
      }
      renderSelection();
      renderFilmShelf(data2, mode, requestId);
      $("results").textContent = data2.status === "stale" ? "Showing saved MyDramaList data." : "";
      backButton();
    } catch (e) {
      if (requestId !== listRequest) return;
      $("results").textContent = "Unable to load filmography: " + (["TimeoutError", "AbortError"].includes(e.name) ? "This request took too long. Please try again." : e.message);
      backButton();
    }
  }
  function renderFilmShelf(data2, mode, requestId) {
    cleanup();
    const list = data2.list, abort = new AbortController(), shelf = document.createElement("article");
    shelf.className = "catalogShelf filmographyShelf";
    const head = document.createElement("div");
    head.className = "catalogShelfHead";
    const info = document.createElement("div"), title = document.createElement("h3"), subtitle = document.createElement("p");
    title.textContent = list.name;
    subtitle.append(document.createTextNode(list.description + " "));
    const count2 = document.createElement("span");
    count2.className = "filmographyCount";
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    icon.dataset.icon = mode === "director" ? "movie-camera" : "filmstrip";
    icon.innerHTML = mode === "director" ? '<rect x="3" y="9" width="12" height="12" rx="2"/><path d="m15 13 6-3v10l-6-3"/><circle cx="6" cy="5" r="3"/><circle cx="12" cy="5" r="3"/>' : '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4m-4 8h4M17 8h4m-4 8h4M7 12h10"/>';
    count2.append(icon, document.createTextNode(copy.filmographyTitles.replace("{count}", String(data2.items.length))));
    subtitle.append(count2);
    info.append(title, subtitle);
    const actions = document.createElement("div");
    actions.className = "catalogRowActions";
    const add2 = document.createElement("button");
    add2.type = "button";
    add2.className = "secondary catalogAdd";
    add2.setAttribute("aria-label", copy.selectFilmography + " " + list.name);
    add2.onclick = () => toggleList(list);
    actions.append(add2);
    head.append(info, actions);
    const track = document.createElement("div");
    track.className = "catalogShelfTrack";
    track.setAttribute("aria-label", list.name);
    for (const [text3, amount] of [["\u2039", -1], ["\u203A", 1]]) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "secondary catalogArrow";
      b.textContent = text3;
      b.setAttribute("aria-label", amount < 0 ? copy.catalogPrevious : copy.catalogNext);
      b.onclick = () => track.scrollBy({ left: amount * track.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      actions.insertBefore(b, add2);
    }
    const images = new Map(), buttons = [];
    for (const item of data2.items) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "catalogPoster";
      b.setAttribute("aria-label", copy.catalogTitlePreview + ": " + item.name);
      const img = document.createElement("img");
      if (item.poster) img.src = item.poster;
      img.alt = item.name;
      img.loading = "lazy";
      img.className = "filmographyArtworkPending";
      const fallback = item.poster;
      img.onerror = () => {
        img.onerror = null;
        if (fallback) img.src = fallback;
      };
      images.set(item.id, img);
      b.append(img);
      const name = document.createElement("strong"), year = document.createElement("small");
      name.textContent = item.name;
      year.textContent = [item.year, item.type].filter(Boolean).join(" \xB7 ");
      b.append(name, year);
      b.onclick = () => showCatalogTitle(item);
      track.append(b);
      buttons.push(b);
    }
    shelf.append(head, track);
    $("listItems").replaceChildren(shelf);
    shelfState = { list, add: add2, abort, observer: null };
    sync();
    requestAnimationFrame(alignSelection);
    const requested = new Set(), queue = [];
    let active2 = 0;
    function load2(offset) {
      if (requested.has(offset) || abort.signal.aborted) return;
      requested.add(offset);
      queue.push(offset);
      pump();
    }
    function pump() {
      while (active2 < 2 && queue.length) {
        const offset = queue.shift();
        active2++;
        (async () => {
          try {
            const response = await fetch("/api/mdl/filmography-artwork?mode=" + mode + "&url=" + encodeURIComponent(list.personUrl) + "&offset=" + offset, { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(25e3)]) });
            if (!response.ok) throw Error();
            const payload = await response.json();
            if (abort.signal.aborted || requestId !== listRequest) return;
            for (const record of payload.items || []) {
              const item = data2.items.find((x) => x.id === record.id), img = images.get(record.id);
              if (!item || !img) continue;
              let u;
              try {
                u = new URL(record.poster);
              } catch {
                continue;
              }
              if (u.protocol !== "https:" || !["image.tmdb.org", "i.mydramalist.com"].includes(u.hostname)) continue;
              item.poster = u.href;
              img.src = u.href;
              img.dataset.source = record.posterSource;
            }
            list.posters = data2.items.map((x) => x.poster).filter(Boolean).slice(0, 5);
            const selected = state.selection.find((x) => x.url === list.url);
            if (selected) {
              selected.posters = list.posters;
              renderSelection();
            }
          } catch {
          } finally {
            for (const item of data2.items.slice(offset, offset + 5)) images.get(item.id)?.classList.remove("filmographyArtworkPending");
            active2--;
            if (!abort.signal.aborted) pump();
          }
        })();
      }
    }
    if (typeof IntersectionObserver !== "undefined") {
      shelfState.observer = new IntersectionObserver((entries2) => {
        for (const entry of entries2) if (entry.isIntersecting) {
          shelfState?.observer?.unobserve(entry.target);
          load2(Math.floor(buttons.indexOf(entry.target) / 5) * 5);
        }
      }, { root: track, rootMargin: "0px 100px" });
      buttons.forEach((b) => shelfState.observer.observe(b));
    }
    load2(0);
  }
  function compactPerson(person, mode) {
    const requestId = listRequest;
    const url = "ydl-filmography:" + mode + ":" + person.id;
    const name = person.displayName || person.name;
    const card = document.createElement("article");
    card.className = "catalogShelf compactCatalogRow";
    const head = document.createElement("div");
    head.className = "catalogShelfHead";
    const identity = document.createElement("div");
    identity.className = "compactPersonIdentity";
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
    const add2 = document.createElement("button");
    add2.type = "button";
    add2.className = "secondary catalogAdd";
    add2.setAttribute("aria-label", copy.selectFilmography + " " + name);
    compactButtons.set(url, add2);
    const status = document.createElement("p");
    status.className = "catalogShelfStatus";
    status.setAttribute("role", "status");
    status.hidden = true;
    identity.append(title);
    head.append(identity, add2);
    card.append(head, status);
    let request;
    function load2() {
      return request ??= json("/api/mdl/filmography?mode=" + mode + "&url=" + encodeURIComponent(person.url)).catch((error) => {
        request = void 0;
        throw error;
      });
    }
    function showStatus(message) {
      status.textContent = message;
      status.hidden = !message;
    }
    const empty2 = mode === "director" ? "No directing credits found." : "No acting credits found.";
    add2.onclick = async () => {
      const selected = state.selection.find((item) => item.url === url);
      if (selected) {
        toggleList(selected);
        return;
      }
      add2.disabled = true;
      showStatus(copy.loadingLists);
      try {
        const data2 = await load2();
        if (requestId !== listRequest || !card.isConnected) return;
        if (!data2.sectionFound || !data2.items.length) {
          showStatus(empty2);
          return;
        }
        toggleList({ ...data2.list, posters: [], analyticsSource: mode === "director" ? "discover-director-filmography" : "discover-actor-filmography" });
        showStatus("");
      } catch {
        if (requestId === listRequest && card.isConnected) showStatus(copy.popularUnavailable);
      } finally {
        add2.disabled = false;
      }
    };
    return card;
  }
  function renderMatches(data2) {
    cleanup();
    const requestId = listRequest, jobs = [];
    const mode = data2.mode;
    $("listItems").replaceChildren();
    $("results").textContent = data2.people.length ? "" : "No matching people found. Try another name.";
    if (data2.warning) $("results").append(document.createTextNode(" \xB7 " + data2.warning));
    for (const person of data2.people) {
      if (compactAndroid) {
        $("listItems").append(compactPerson(person, mode));
        continue;
      }
      const card = document.createElement("article");
      card.className = "dramaMatch personMatch";
      card.dataset.personId = person.id;
      const photo = document.createElement("img");
      photo.alt = person.name + " photo";
      photo.loading = "lazy";
      photo.referrerPolicy = "no-referrer";
      if (person.poster) {
        photo.src = person.poster;
        card.append(photo);
      }
      const info = document.createElement("div");
      info.className = "dramaMatchInfo";
      const title = document.createElement("h3");
      title.textContent = person.displayName || person.name;
      const meta = document.createElement("p"), bio = document.createElement("p");
      bio.className = "dramaSynopsis";
      const status = document.createElement("p");
      status.className = "detailsStatus";
      const choose = document.createElement("button");
      choose.type = "button";
      choose.className = "secondary";
      choose.textContent = copy.viewFilmography;
      const apply = (full, notice = "") => {
        Object.assign(person, full);
        title.textContent = person.displayName || person.name;
        meta.textContent = person.nationality || "";
        renderSynopsis(bio, person.biography);
        choose.setAttribute("aria-label", copy.viewFilmography + " " + (person.displayName || person.name));
        status.textContent = notice;
        if (person.poster) {
          photo.src = person.poster;
          if (!photo.isConnected) card.prepend(photo);
        }
      };
      apply(person, person.enriched ? "" : "");
      choose.onclick = () => showFilmography(person, mode);
      info.append(title, meta, bio, status, choose);
      card.append(info);
      $("listItems").append(card);
      if (!person.enriched) jobs.push({ person, apply, status });
    }
    let cursor = 0;
    async function worker() {
      while (cursor < jobs.length) {
        if (requestId !== listRequest) return;
        const job = jobs[cursor++];
        try {
          const result = await json(personApi(job.person.url, mode));
          if (requestId !== listRequest) return;
          job.person.enriched = true;
          job.apply(result.person, result.status === "stale" ? "Showing saved MyDramaList details." : "");
        } catch {
          if (requestId === listRequest) job.status.textContent = "Some person details are temporarily unavailable.";
        }
      }
    }
    if (compactAndroid) sync();
    else Promise.all([worker(), worker()]);
    if (data2.page > 1 || data2.hasNextPage) {
      const nav = document.createElement("nav");
      nav.className = "searchPages";
      nav.setAttribute("aria-label", "People search result pages");
      for (const step of [-1, 1]) {
        if (step === -1 && data2.page === 1 || step === 1 && !data2.hasNextPage) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary";
        button.textContent = step === -1 ? "Previous matches" : "More matches";
        button.onclick = () => search(data2.query, data2.page + step, mode);
        nav.append(button);
      }
      $("listItems").append(nav);
    }
  }
  async function search(query2, page3 = 1, mode = state.filter) {
    cleanup();
    const requestId = ++listRequest;
    $("listItems").replaceChildren();
    $("results").textContent = "";
    try {
      const data2 = await json("/api/mdl/people-search?mode=" + mode + "&q=" + encodeURIComponent(query2) + "&page=" + page3);
      if (requestId !== listRequest) return;
      lastSearch = data2;
      renderMatches(data2);
    } catch (e) {
      if (requestId === listRequest) $("results").textContent = "Unable to search people: " + (["TimeoutError", "AbortError"].includes(e.name) ? "This request took too long. Please try again." : e.message);
    }
  }
  async function fromUrl(raw, mode = state.filter) {
    cleanup();
    const requestId = ++listRequest;
    $("listItems").replaceChildren();
    $("results").textContent = "";
    lastSearch = null;
    try {
      const data2 = await json(personApi(raw, mode));
      if (requestId !== listRequest) return;
      lastSearch = { mode, people: [{ ...data2.person, enriched: true }], page: 1, hasNextPage: false };
      renderMatches(lastSearch);
      if (data2.warning) $("results").append(document.createTextNode(" \xB7 " + data2.warning));
    } catch (e) {
      if (requestId === listRequest) $("results").textContent = "Unable to load person: " + (["TimeoutError", "AbortError"].includes(e.name) ? "This request took too long. Please try again." : e.message);
    }
  }
  return { search, fromUrl, cleanup, sync, reset() {
    cleanup();
    lastSearch = null;
  } };
}
