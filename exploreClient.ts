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
  let observer, renderId = 0, countdown, selectedCountry = select.value, activeCatalogType = "series";
  const buttons = new Map();
  let workers = 0;
  const jobs = [];
  function sync() {
    for (const [url, button] of buttons) {
      const on = state.selection.some((x) => x.url === url);
      button.textContent = on ? copy.catalogAdded : compactAndroid ? copy.compactCatalogAdd : copy.catalogAdd;
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
    const info = document.createElement("div"), h2 = document.createElement("h3"), p = document.createElement("p");
    h2.textContent = c.name;
    if (c.description && !compactAndroid) {
      p.textContent = c.description;
      info.append(h2, p);
    } else info.append(h2);
    const actions = document.createElement("div");
    actions.className = "catalogRowActions";
    const add2 = document.createElement("button");
    add2.type = "button";
    add2.className = "secondary catalogAdd";
    add2.setAttribute("aria-label", copy.catalogSelect + " " + c.name);
    add2.onclick = () => toggleList(c);
    buttons.set(c.url, add2);
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
          img.alt = compactAndroid ? "" : item.name;
          img.loading = "lazy";
          if (compactAndroid) img.decoding = "async";
          img.referrerPolicy = "no-referrer";
          button.append(img);
          if (compactAndroid) img.addEventListener("error", () => {
            const blank = document.createElement("span");
            blank.className = "shelfPosterBlank";
            blank.setAttribute("aria-hidden", "true");
            img.replaceWith(blank);
          }, { once: true });
        } else if (compactAndroid) {
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
      if (!compactAndroid && items.length > 5 && !actions.querySelector(".catalogArrow")) for (const [text3, amount] of [["\u2039", -1], ["\u203A", 1]]) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "secondary catalogArrow";
        b.textContent = text3;
        b.setAttribute("aria-label", amount < 0 ? copy.catalogPrevious : copy.catalogNext);
        b.onclick = () => track.scrollBy({ left: amount * track.clientWidth, behavior: "smooth" });
        actions.insertBefore(b, add2);
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
  function skeleton(track) {
    if (compactAndroid) {
      track.textContent = copy.loadingLists;
      return;
    }
    track.innerHTML = '<div class="catalogSkeleton" aria-hidden="true" style="width:100%"><span></span><span></span><span></span><span></span><span></span></div>';
  }
  function render3() {
    if (!compactAndroid && (state.tab !== "discover" || state.filter !== "catalogs")) return;
    const parent2 = $(compactAndroid ? "androidCatalogs" : "listItems");
    const id = ++renderId, request = compactAndroid ? null : ++listRequest;
    const outdated = () => id !== renderId || !compactAndroid && request !== listRequest;
    selectedCountry = select.value;
    try {
      localStorage.setItem("ydl-catalog-country", select.value);
      localStorage.setItem("ydl-catalog-sort", sortSelect.value);
    } catch {
    }
    observer?.disconnect();
    clearInterval(countdown);
    jobs.length = 0;
    buttons.clear();
    if (!compactAndroid) $("results").replaceChildren();
    parent2.replaceChildren();
    const weekly = document.createElement("section"), heading = document.createElement("h2");
    heading.className = "catalogSectionTitle";
    heading.textContent = copy.weeklyTitle;
    const note = document.createElement("div");
    note.className = "catalogSectionNote";
    const caption = document.createElement("span");
    caption.textContent = copy.weeklyDescription;
    const clock2 = document.createElement("span");
    clock2.className = "collectionClock";
    if (compactAndroid) {
      const header = document.createElement("div");
      header.className = "androidWeeklyHeading";
      header.append(heading, clock2);
      weekly.append(header);
    } else {
      note.append(caption, clock2);
      weekly.append(heading, note);
    }
    parent2.append(weekly);
    const weeklyRows = document.createElement("div");
    weekly.append(weeklyRows);
    skeleton(weeklyRows);
    function weeklyLoad() {
      enqueue(async () => {
        if (outdated()) return;
        try {
          let tick = function() {
            const remaining = Math.max(0, Date.parse(data2.nextRefresh) - Date.now());
            if (!remaining) {
              clock2.textContent = copy.weeklyRefreshing;
              clearInterval(countdown);
              if (data2.status !== "stale") render3();
              return;
            }
            const hours = Math.floor(remaining / 36e5);
            clock2.textContent = "\u25F7 " + Math.floor(hours / 24) + "d " + hours % 24 + "h";
            clock2.title = copy.weeklyRefreshTimezone;
          };
          const response = await fetch("/api/catalogs/weekly?country=" + selectedCountry, { signal: AbortSignal.timeout(45e3) });
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
          tick();
          countdown = setInterval(tick, 6e4);
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
      });
    }
    weeklyLoad();
    const more = document.createElement("section");
    more.className = "catalogMore";
    const moreHeading = document.createElement("h2");
    moreHeading.className = "catalogSectionTitle";
    moreHeading.textContent = copy.catalogMore;
    const moreNote = document.createElement("div");
    moreNote.className = "catalogSectionNote";
    const moreCaption = document.createElement("span");
    moreCaption.textContent = copy.catalogMoreNote;
    if (!compactAndroid) moreNote.append(moreCaption);
    moreNote.append(sortLabel, sortSelect);
    more.append(moreHeading, moreNote);
    parent2.append(more);
    const catalogPanels = new Map();
    if (compactAndroid) {
      let syncType = function() {
        for (const [type, button] of tabs) {
          const active2 = type === activeCatalogType;
          button.setAttribute("aria-pressed", String(active2));
          catalogPanels.get(type).hidden = !active2;
        }
      };
      const switcher = document.createElement("div");
      switcher.className = "catalogTypeSwitch";
      switcher.setAttribute("role", "group");
      switcher.setAttribute("aria-label", copy.catalogMediaType);
      const tabs = new Map();
      for (const [type, name] of [["series", copy.catalogShows], ["movie", copy.catalogMovies]]) {
        const panel = document.createElement("div");
        panel.id = "exploreCatalogType-" + type;
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = name;
        button.setAttribute("aria-controls", panel.id);
        button.onclick = () => {
          activeCatalogType = type;
          syncType();
        };
        tabs.set(type, button);
        catalogPanels.set(type, panel);
        switcher.append(button);
        more.append(panel);
      }
      more.insertBefore(switcher, moreNote);
      const countryField = document.createElement("div"), sortField = document.createElement("div");
      countryField.append(label, select);
      sortField.append(sortLabel, sortSelect);
      moreNote.classList.add("androidCatalogFilters");
      moreNote.append(countryField, sortField);
      syncType();
    }
    function loadRow(row, c) {
      if (row.loading || row.loaded) return;
      row.loading = true;
      enqueue(async () => {
        try {
          if (outdated()) return;
          skeleton(row.track);
          const response = await fetch("/api/catalogs/shelf?category=" + c.category + "&country=" + c.country + (sortSelect.value ? "&sort=" + sortSelect.value : ""), { signal: AbortSignal.timeout(45e3) });
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
      if (sortSelect.value) {
        const f = { sort: sortSelect.value };
        c.url += "?ydlf=" + shelfFilterKey(f);
        c.filter = f;
        c.filterLabel = "";
      }
      const row = shelf(c, catalogPanels.get(c.types[0]) || more);
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
    requestAnimationFrame(alignSelection);
  }
  select.onchange = render3;
  sortSelect.onchange = render3;
  return { render: render3, sync };
}
