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
  let specialSection, specialClock;
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
    function fill(items) {
      track.replaceChildren();
      for (const item of items) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "catalogPoster";
        button.setAttribute("aria-label", copy.catalogTitlePreview + ": " + item.name);
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
    if (specialSection?.isConnected) specialSection.after(weekly);
    else parent2.prepend(weekly);
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
          // The server picks each title's poster for the current 12 hours (Weekly Picks rotate posters).
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
      if (weeklySection?.isConnected && recsSection.previousElementSibling !== weeklySection) weeklySection.after(recsSection);
      return;
    }
    recsSection?.remove();
    pruneButtons();
    const section = document.createElement("section");
    section.className = "recsSection";
    section.hidden = true;
    recsSection = section;
    recsUser = connectedUser;
    if (weeklySection?.isConnected) weeklySection.after(section);
    else parent2.prepend(section);
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
        data.rows.slice(0, 3).forEach((row, slot) => {
          if (!row?.seed?.title || !Array.isArray(row.items) || !row.items.length) return;
          const catalog = { kind: "recs", slot, url: "ydl-recs:" + slot, type: "series", name: "Because you watched " + row.seed.title, description: "Titles like " + row.seed.title + ", picked from your MyDramaList watchlist. They change every Monday." };
          shelf(catalog, section).fill(row.items);
        });
        section.hidden = !section.childElementCount;
        sync();
      })
      .catch(() => { if (recsSection === section) recsUser = ""; });
  }
  // A limited-time, hand-picked catalog ("Watch this while they play GTA 6"): the first list on Discover,
  // with a countdown to its end. It removes itself when the countdown runs out or the server says it ended.
  function mountSpecial(parent2) {
    if (specialSection) {
      if (specialSection.isConnected && parent2.firstElementChild !== specialSection) parent2.prepend(specialSection);
      return;
    }
    const section = document.createElement("section");
    section.className = "specialSection";
    section.hidden = true;
    specialSection = section;
    parent2.prepend(section);
    const end = () => {
      clearInterval(specialClock);
      section.remove();
      pruneButtons();
    };
    fetch("/api/catalogs/special", { signal: AbortSignal.timeout(45e3) })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (specialSection !== section) return;
        const until = Date.parse(data?.catalog?.until);
        if (!data?.catalog || !Number.isFinite(until) || until <= Date.now() || !Array.isArray(data.items) || !data.items.length) {
          // Ended or empty: nothing shows. A failed request is tried again the next time Discover opens.
          if (!data) specialSection = null;
          section.remove();
          return;
        }
        const heading = document.createElement("h2");
        heading.className = "catalogSectionTitle";
        heading.textContent = "Spotlight";
        const clock = document.createElement("span");
        clock.className = "collectionClock";
        clock.title = "Until January 1, midnight Pacific time";
        const header = document.createElement("div");
        header.className = "androidWeeklyHeading";
        header.append(heading, clock);
        const rows = document.createElement("div");
        section.append(header, rows);
        shelf(data.catalog, rows).fill(data.items);
        const tick = () => {
          const remaining = until - Date.now();
          if (remaining <= 0) return end();
          const hours = Math.floor(remaining / 36e5);
          clock.textContent = "\u25F7 " + Math.floor(hours / 24) + "d " + hours % 24 + "h";
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
  select.onchange = render3;
  sortSelect.onchange = render3;
  return {
    render: render3,
    sync,
    openFilters,
    resetMedia() {
      if (activeCatalogType === "all") return;
      activeCatalogType = "all";
      render3();
    },
  };
}
