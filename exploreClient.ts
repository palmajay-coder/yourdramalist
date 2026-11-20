// @ts-nocheck -- installed into the existing browser scope.
export function installExploreUI() {
  const root = $("exploreSearch"), label = document.createElement("label");
  label.textContent = copy.catalogCountry;
  label.htmlFor = "exploreCountry";
  const select = document.createElement("select");
  select.id = "exploreCountry";
  for (const [value, name] of exploreCountries.filter((c) => c[0])) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = name;
    select.append(option);
  }
  try {
    select.value = localStorage.getItem("ydl-catalog-country") || "3";
  } catch {
    select.value = "3";
  }
  if (!select.value) select.value = "3";
  root.append(label, select);
  const sortLabel = document.createElement("label");
  sortLabel.textContent = copy.catalogSort;
  sortLabel.htmlFor = "exploreSort";
  const sortSelect = document.createElement("select");
  sortSelect.id = "exploreSort";
  for (const [value, name] of [["", copy.catalogSortDefault], ["newest", copy.shelfSortNewest], ["oldest", copy.shelfSortOldest], ["rating", copy.shelfSortRating], ["az", copy.shelfSortAz]]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = name;
    sortSelect.append(option);
  }
  try {
    sortSelect.value = localStorage.getItem("ydl-catalog-sort") || "";
  } catch {
  }
  sortLabel.className = "catalogSortLabel";
  let observer, renderId = 0, countdown, selectedCountry = select.value, activeCatalogType = "all";
  let weeklySection, weeklyCountry, catalogSection, recsSection, recsUser = "";
  let specialSection, specialClock, specialCountry;
  let top10Section, top10Country;
  const buttons = new Map();
  let workers = 0;
  const jobs = [];
  function sync() {
    for (const [url, {button, catalog}] of buttons) {
      const on = state.selection.some((x) => x.url === url);
      const label = copy.compactCatalogAdd;
      const icon = document.createElement("span");
      icon.className = "discoverAddIcon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = on ? "✓" : "+";
      button.replaceChildren(icon, document.createTextNode(on ? "Added" : label));
      button.classList.toggle("is-added", on);
      button.setAttribute("aria-label", label + ": " + catalog.name);
      button.setAttribute("aria-pressed", String(on));
    }
  }
  function enqueue(job) {
    jobs.push(job);
    pump();
  }
  function pump() {
    while (workers < 2 && jobs.length) {
      const job = jobs.shift();
      workers++;
      job().finally(() => {
        workers--;
        pump();
      });
    }
  }
  function shelf(c, parent2) {
    const card = document.createElement("article");
    card.className = "catalogShelf";
    const head = document.createElement("div");
    head.className = "catalogShelfHead";
    const info = document.createElement("div"), h2 = document.createElement("h3");
    h2.textContent = c.name;
    info.append(h2);
    const actions = document.createElement("div");
    actions.className = "catalogRowActions";
    const add2 = document.createElement("button");
    add2.type = "button";
    add2.className = "catalogAdd discoverAddPill";
    add2.onclick = () => toggleList(c);
    buttons.set(c.url, {button:add2, catalog:c});
    actions.append(add2);
    head.append(info, actions);
    const track = document.createElement("div");
    track.className = "catalogShelfTrack";
    track.setAttribute("aria-label", c.name);
    card.append(head, track);
    parent2.append(card);
    // ranked: Netflix-style Top 10 tiles, with a big outlined number tucked behind each poster.
    function fill(items, options = {}) {
      track.replaceChildren();
      for (const [index, item] of items.entries()) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "catalogPoster" + (options.ranked ? " ranked" : "");
        button.setAttribute("aria-label", (options.ranked ? "Number " + (index + 1) + ": " : "") + copy.catalogTitlePreview + ": " + item.name);
        if (options.ranked) {
          const rank = document.createElement("span");
          rank.className = "rankNumber" + (index >= 9 ? " twoDigits" : "");
          rank.setAttribute("aria-hidden", "true");
          rank.textContent = String(index + 1);
          button.append(rank);
        }
        if (item.poster) {
          const img = document.createElement("img");
          img.src = item.poster;
          img.alt = "";
          img.loading = "lazy";
          img.decoding = "async";
          img.referrerPolicy = "no-referrer";
          button.append(img);
          img.addEventListener("error", () => {
            const blank = document.createElement("span");
            blank.className = "shelfPosterBlank";
            blank.setAttribute("aria-hidden", "true");
            img.replaceWith(blank);
          }, { once: true });
        } else {
          const blank = document.createElement("span");
          blank.className = "shelfPosterBlank";
          blank.setAttribute("aria-hidden", "true");
          button.append(blank);
        }
        const title = document.createElement("strong");
        title.textContent = item.name;
        const year = document.createElement("small");
        year.textContent = item.date?.slice(0, 4) || item.details?.match(/\b(?:19|20)\d{2}\b/)?.[0] || "";
        button.append(title, year);
        button.onclick = () => showCatalogTitle(item);
        track.append(button);
      }
      c.posters = items.map((x) => x.poster).filter(Boolean).slice(0, 5);
      const selected = state.selection.find((x) => x.url === c.url);
      if (selected) {
        Object.assign(selected, { posters: c.posters, name: c.name, description: c.description });
        renderSelection();
      }
      if (!items.length) {
        const empty2 = document.createElement("p");
        empty2.className = "catalogShelfStatus";
        empty2.textContent = copy.catalogEmpty;
        track.append(empty2);
      }
    }
    return { card, track, fill };
  }
  // Loading: shimmering poster tiles, with the loading text kept for screen readers.
  function skeleton(track) {
    const label = document.createElement("span");
    label.className = "androidScreenReader";
    label.textContent = copy.loadingLists;
    const tiles = Array.from({ length: 4 }, () => {
      const tile = document.createElement("span");
      tile.className = "catalogPoster shelfSkeleton";
      tile.setAttribute("aria-hidden", "true");
      return tile;
    });
    if (track.classList.contains("catalogShelfTrack")) {
      track.replaceChildren(label, ...tiles);
    } else {
      const row = document.createElement("div");
      row.className = "catalogShelfTrack";
      row.append(...tiles);
      track.replaceChildren(label, row);
    }
  }
  function pruneButtons() {
    for (const [url, {button}] of buttons) {
      if (!button.isConnected) buttons.delete(url);
    }
  }
  // The top of Discover always reads: Spotlight, This Week's Picks, Top 10, Recommended for you, then
  // Catalogs by Country. Each section calls this when it appears, whichever loads first.
  function arrange(parent2) {
    let anchor = null;
    for (const section of [specialSection, weeklySection, top10Section, recsSection]) {
      if (!section || section.parentNode !== parent2) continue;
      if (anchor) { if (anchor.nextElementSibling !== section) anchor.after(section); }
      else if (parent2.firstElementChild !== section) parent2.prepend(section);
      anchor = section;
    }
  }
  function mountWeekly(parent2, country, isOutdated) {
    const weekly = document.createElement("section"), heading = document.createElement("h2");
    heading.className = "catalogSectionTitle";
    heading.textContent = copy.weeklyTitle;
    const clock2 = document.createElement("span");
    clock2.className = "collectionClock";
    const header = document.createElement("div");
    header.className = "androidWeeklyHeading";
    header.append(heading, clock2);
    weekly.append(header);
    weeklySection = weekly;
    weeklyCountry = country;
    // The limited-time catalog stays the very first list; Weekly Picks comes right after it.
    parent2.prepend(weekly);
    arrange(parent2);
    const outdated = () => !weekly.isConnected || isOutdated();
    const weeklyRows = document.createElement("div");
    weekly.append(weeklyRows);
    skeleton(weeklyRows);
    async function weeklyLoad() {
      if (outdated()) return;
      try {
        let tick = function() {
          const remaining = Math.max(0, Date.parse(data2.nextRefresh) - Date.now());
          if (!remaining) {
            clock2.textContent = copy.weeklyRefreshing;
            clearInterval(countdown);
            if (data2.status !== "stale") {
              weekly.remove();
              pruneButtons();
              mountWeekly(parent2, country, isOutdated);
            }
            return;
          }
          const hours = Math.floor(remaining / 36e5);
          clock2.textContent = "\u25F7 " + Math.floor(hours / 24) + "d " + hours % 24 + "h";
          clock2.title = copy.weeklyRefreshTimezone;
        };
        const response = await fetch("/api/catalogs/weekly?country=" + country, { signal: AbortSignal.timeout(45e3) });
        const data2 = await response.json();
        if (outdated()) return;
        if (!response.ok || !Array.isArray(data2.collections) || !Number.isFinite(Date.parse(data2.nextRefresh))) throw Error();
        weeklyRows.replaceChildren();
        clock2.hidden = false;
        for (const collection of data2.collections || []) {
          const row = shelf(collection.catalog, weeklyRows);
          row.fill(collection.items);
        }
        if (data2.warning) {
          const warning = document.createElement("p");
          warning.className = "catalogShelfStatus";
          warning.textContent = copy.weeklySaved;
          weeklyRows.prepend(warning);
        }
        countdown = setInterval(tick, 6e4);
        tick();
        sync();
      } catch {
        if (outdated()) return;
        weeklyRows.replaceChildren();
        const message = document.createElement("p");
        message.className = "catalogShelfStatus";
        message.textContent = copy.weeklyUnavailable;
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "secondary catalogRetry";
        retry.textContent = copy.catalogRetry;
        retry.onclick = () => {
          retry.disabled = true;
          weeklyLoad();
        };
        weeklyRows.append(message, retry);
        clock2.hidden = true;
      }
    }
    weeklyLoad();
  }
  // "Because you watched …": up to three personal rows for a connected MyDramaList username, directly under
  // Weekly Picks. They change every Monday with Weekly Picks. Nothing shows until they are ready, and nothing
  // shows when there are none.
  function mountRecs(parent2, isOutdated) {
    if (!connectedUser) {
      recsSection?.remove();
      recsSection = null;
      recsUser = "";
      return;
    }
    if (recsSection && recsUser === connectedUser) {
      if (recsSection.isConnected) arrange(parent2);
      return;
    }
    recsSection?.remove();
    pruneButtons();
    const section = document.createElement("section");
    section.className = "recsSection";
    section.hidden = true;
    recsSection = section;
    recsUser = connectedUser;
    parent2.prepend(section);
    arrange(parent2);
    const user = connectedUser;
    fetch("/api/recommendations?username=" + encodeURIComponent(user), { signal: AbortSignal.timeout(45e3) })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        // No rows: the section stays hidden. A failed request is tried again the next time Discover opens.
        if (recsSection !== section || isOutdated()) return;
        if (!Array.isArray(data?.rows) || !data.rows.length) {
          if (!data) recsUser = "";
          return;
        }
        const header = document.createElement("div");
        header.className = "androidWeeklyHeading";
        const heading = document.createElement("h2");
        heading.className = "catalogSectionTitle";
        heading.textContent = "Recommended for you";
        header.append(heading);
        section.append(header);
        data.rows.slice(0, 3).forEach((row, slot) => {
          if (!row?.seed?.title || !Array.isArray(row.items) || !row.items.length) return;
          const catalog = { kind: "recs", slot, url: "ydl-recs:" + slot, type: "series", name: "Because you watched " + row.seed.title, description: "Titles like " + row.seed.title + ", picked from your MyDramaList watchlist. They change every Monday." };
          shelf(catalog, section).fill(row.items);
        });
        section.hidden = !section.querySelector(".catalogShelf");
        sync();
      })
      .catch(() => { if (recsSection === section) recsUser = ""; });
  }
  // A limited-time, hand-picked catalog ("Watch this while they play GTA 6"): the first list on Discover,
  // with a countdown to its end. It removes itself when the countdown runs out or the server says it ended.
  // The country filter applies: each country sees its own picks, topped up on the same theme.
  function mountSpecial(parent2) {
    if (specialSection && specialCountry !== selectedCountry) {
      clearInterval(specialClock);
      specialSection.remove();
      specialSection = null;
      pruneButtons();
    }
    if (specialSection) {
      if (specialSection.isConnected) arrange(parent2);
      return;
    }
    specialCountry = selectedCountry;
    const section = document.createElement("section");
    section.className = "specialSection";
    section.hidden = true;
    specialSection = section;
    parent2.prepend(section);
    arrange(parent2);
    const end = () => {
      clearInterval(specialClock);
      section.remove();
      pruneButtons();
    };
    fetch("/api/catalogs/special?country=" + encodeURIComponent(specialCountry), { signal: AbortSignal.timeout(45e3) })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (specialSection !== section) return;
        // Every running list (GTA 6 first, then the month's list) sits under one Spotlight heading.
        const lists = (Array.isArray(data?.lists) ? data.lists : []).filter(list => list?.catalog && Number.isFinite(Date.parse(list.catalog.until)) && Date.parse(list.catalog.until) > Date.now() && Array.isArray(list.items) && list.items.length);
        if (!lists.length) {
          // Ended or empty: nothing shows. A failed request is tried again the next time Discover opens.
          if (!data) specialSection = null;
          section.remove();
          return;
        }
        // One timer: to the end of the month, when the month's list changes (or the last list's end).
        const monthly = lists.find(list => list.catalog.id === "monthly");
        const until = Date.parse((monthly || lists[lists.length - 1]).catalog.until);
        const heading = document.createElement("h2");
        heading.className = "catalogSectionTitle";
        heading.textContent = "Spotlight";
        const clock = document.createElement("span");
        clock.className = "collectionClock";
        clock.title = "Changes at the end of the month, midnight Pacific time";
        const header = document.createElement("div");
        header.className = "androidWeeklyHeading";
        header.append(heading, clock);
        const rows = document.createElement("div");
        section.append(header, rows);
        const shelves = lists.map(list => ({ until: Date.parse(list.catalog.until), card: shelf(list.catalog, rows) }));
        lists.forEach((list, index) => shelves[index].card.fill(list.items));
        const tick = () => {
          // A list whose own end has passed goes; the section goes with the last one.
          for (const item of shelves) if (item.card.card.isConnected && item.until <= Date.now()) item.card.card.remove();
          if (!shelves.some(item => item.card.card.isConnected)) {
            end();
            // The month changed while Discover was open: fetch the new month's list a moment later.
            if (specialSection === section) specialSection = null;
            setTimeout(() => { if (!specialSection && parent2.isConnected) mountSpecial(parent2); }, 5000);
            return;
          }
          const remaining = Math.max(0, until - Date.now());
          const hours = Math.floor(remaining / 36e5);
          clock.textContent = "\u25F7 " + Math.floor(hours / 24) + "d " + hours % 24 + "h";
          pruneButtons();
        };
        tick();
        specialClock = setInterval(tick, 6e4);
        section.hidden = false;
        sync();
      })
      .catch(() => {
        if (specialSection === section) { specialSection = null; section.remove(); }
      });
  }
  // Netflix-style "Top 10 K-Dramas Today" and "Top 10 K-Movies Today", right under This Week's Picks,
  // ranked by TMDB popularity and refreshed daily. Nothing shows if there is no list.
  // The rows follow the country filter (Top 10 J-Dramas Today for Japan, and so on).
  function mountTop10(parent2) {
    if (top10Section && top10Country !== selectedCountry) {
      top10Section.remove();
      top10Section = null;
      pruneButtons();
    }
    if (top10Section) {
      if (top10Section.isConnected) arrange(parent2);
      return;
    }
    top10Country = selectedCountry;
    const section = document.createElement("section");
    section.className = "top10Section";
    section.hidden = true;
    top10Section = section;
    parent2.prepend(section);
    arrange(parent2);
    fetch("/api/catalogs/top10?country=" + encodeURIComponent(top10Country), { signal: AbortSignal.timeout(45e3) })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (top10Section !== section) return;
        const rows = Array.isArray(data?.rows) ? data.rows.filter(row => row?.catalog && Array.isArray(row.items) && row.items.length) : [];
        if (!rows.length) {
          if (!data) top10Section = null;
          section.remove();
          return;
        }
        for (const row of rows) shelf(row.catalog, section).fill(row.items.slice(0, 10), { ranked: true });
        section.hidden = false;
        if (section.parentNode) arrange(section.parentNode);
        sync();
      })
      .catch(() => {
        if (top10Section === section) { top10Section = null; section.remove(); }
      });
  }
  function render3() {
    const parent2 = $("androidCatalogs");
    const id = ++renderId;
    const outdated = () => id !== renderId;
    selectedCountry = select.value;
    try {
      localStorage.setItem("ydl-catalog-country", select.value);
      localStorage.setItem("ydl-catalog-sort", sortSelect.value);
    } catch {
    }
    observer?.disconnect();
    jobs.length = 0;
    catalogSection?.remove();
    pruneButtons();
    mountSpecial(parent2);
    if (!weeklySection?.isConnected || weeklyCountry !== selectedCountry) {
      clearInterval(countdown);
      weeklySection?.remove();
      pruneButtons();
      mountWeekly(parent2, selectedCountry, () => !parent2.isConnected);
    }
    mountTop10(parent2);
    mountRecs(parent2, () => !parent2.isConnected);
    const more = document.createElement("section");
    more.className = "catalogMore";
    const moreHeading = document.createElement("h2");
    moreHeading.className = "catalogSectionTitle";
    moreHeading.textContent = copy.catalogMore;
    more.append(moreHeading);
    parent2.append(more);
    catalogSection = more;
    function loadRow(row, c) {
      if (row.loading || row.loaded) return;
      row.loading = true;
      enqueue(async () => {
        try {
          if (outdated()) return;
          skeleton(row.track);
          const url = "/api/catalogs/shelf?category=" + c.category + "&country=" + c.country + (sortSelect.value ? "&sort=" + sortSelect.value : "");
          const options = { signal: AbortSignal.timeout(45e3) };
          let response = await fetch(url, options);
          if ([502, 503, 504].includes(response.status) && !outdated()) {
            await response.body?.cancel();
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (outdated()) return;
            response = await fetch(url, options);
          }
          const data2 = await response.json();
          if (outdated()) return;
          if (!response.ok) throw Error();
          row.fill(data2.items || []);
          if (data2.warning) {
            const warning = document.createElement("p");
            warning.className = "catalogShelfStatus";
            warning.textContent = copy.catalogSaved;
            row.card.append(warning);
          }
        } catch {
          if (outdated()) return;
          row.track.replaceChildren();
          const message = document.createElement("p");
          message.className = "catalogShelfStatus";
          message.textContent = copy.catalogUnavailable;
          const retry = document.createElement("button");
          retry.type = "button";
          retry.className = "secondary catalogRetry";
          retry.textContent = copy.catalogRetry;
          retry.onclick = () => loadRow(row, c);
          row.track.append(message, retry);
        } finally {
          row.loading = false;
        }
      });
    }
    const targets = new Map();
    for (const k of exploreCategories) {
      const c = exploreCatalog(k[0], select.value);
      if (activeCatalogType !== "all" && !c.types.includes(activeCatalogType)) continue;
      if (sortSelect.value) {
        const f = { sort: sortSelect.value };
        c.url += "?ydlf=" + shelfFilterKey(f);
        c.filter = f;
        c.filterLabel = "";
      }
      const row = shelf(c, more);
      targets.set(row.card, () => loadRow(row, c));
      skeleton(row.track);
    }
    {
      if (typeof IntersectionObserver !== "undefined") {
        observer = new IntersectionObserver((entries2) => {
          for (const entry of entries2) if (entry.isIntersecting) {
            observer.unobserve(entry.target);
            targets.get(entry.target)?.();
          }
        }, { rootMargin: "200px" });
        for (const card of targets.keys()) observer.observe(card);
      } else for (const fn of targets.values()) fn();
    }
    const credit2 = document.createElement("p");
    credit2.className = "catalogArtworkCredit";
    credit2.textContent = copy.catalogArtworkCredit;
    more.append(credit2);
    sync();
  }
  let openFilters;
  {
    const dialog = document.createElement("dialog");
    dialog.className = "androidDiscoverFilters";
    dialog.setAttribute("aria-label", "Discover filters");
    const media = document.createElement("fieldset");
    media.setAttribute("aria-label", copy.catalogMediaType);
    for (const [type, name] of [["all", "All"], ["movie", copy.catalogMovies], ["series", copy.catalogShows]]) {
      const row = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "discoverMediaType";
      radio.value = type;
      const caption = document.createElement("span");
      caption.textContent = name;
      row.append(radio, caption);
      radio.onchange = () => {
        activeCatalogType = type;
        render3();
      };
      media.append(row);
    }
    const fields = document.createElement("div");
    fields.className = "androidCatalogFilters";
    const countryField = document.createElement("div");
    const sortField = document.createElement("div");
    countryField.append(label, select);
    sortField.append(sortLabel, sortSelect);
    fields.append(countryField, sortField);
    dialog.append(media, fields);
    document.body.append(dialog);
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    openFilters = (trigger) => {
      if (dialog.open) return;
      const bounds = trigger.getBoundingClientRect();
      dialog.style.top = Math.max(8, bounds.bottom + 6) + "px";
      for (const radio of media.querySelectorAll("input")) radio.checked = radio.value === activeCatalogType;
      showAndroidDialog(dialog);
    };
  }
  // Connecting a username (Connect, or a lookup in Lists) or opening Discover again shows or updates the
  // "Recommended for you" rows straight away, without waiting for the next full render.
  const refreshPersonal = () => {
    const parent2 = $("androidCatalogs");
    if (parent2) mountRecs(parent2, () => !parent2.isConnected);
  };
  window.ydlRefreshPersonal = refreshPersonal;
  select.onchange = render3;
  sortSelect.onchange = render3;
  return {
    render: render3,
    sync,
    openFilters,
    refreshPersonal,
    resetMedia() {
      if (activeCatalogType === "all") return;
      activeCatalogType = "all";
      render3();
    },
  };
}
