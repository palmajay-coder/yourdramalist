// @ts-nocheck -- installed into the existing browser scope.
export function installCommunityShelves() {
  let renderId = 0, observer = null, viewKey = "other", filter = null, panelOpen = false;
  const rows = [], facts = new Map(), factsPending = new Set(), failedRows = new Set();
  const drafts = {};
  let pendingFilter = null, filterDialog = null;
  const node = (tag, cls, text3) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text3 != null) e.textContent = text3;
    return e;
  };
  const fill = (text3, values) => Object.entries(values).reduce((s, [k, v]) => s.replaceAll("{" + k + "}", String(v)), text3);
  const posterOf = (item) => item.poster || facts.get(item.slug)?.poster || null;
  const emptyFilter = () => ({ type: "", countries: [], genres: [], from: "", to: "", sort: "" });
  const draft = () => drafts[compactAndroid ? "android" : viewKey] || (drafts[compactAndroid ? "android" : viewKey] = emptyFilter());
  const filterable = (row) => !row.list.combined;
  const details = item => showCatalogTitle({ ...item, poster: posterOf(item) });
  let workers = 0;
  const jobs = [];
  function enqueue(job) {
    jobs.push(job);
    pump();
  }
  function pump() {
    while (workers < 2 && jobs.length) {
      const job = jobs.shift();
      workers++;
      Promise.resolve().then(job).catch(() => {
      }).finally(() => {
        workers--;
        pump();
      });
    }
  }
  function skeleton(track) {
    track.innerHTML = '<div class="catalogSkeleton" aria-hidden="true" style="width:100%"><span></span><span></span><span></span><span></span><span></span></div>';
  }
  function decode2(html3) {
    const t = document.createElement("textarea");
    t.innerHTML = String(html3 || "");
    return t.value;
  }
  function refresh() {
    for (const r of rows) {
      if (r.items) r.paint();
      else r.paintThumbnails?.();
    }
    if (!compactAndroid) renderPanel();
    else if (panelOpen) updateMetadataStatus();
  }
  async function loadFacts(row, subset) {
    const id = renderId, todo = (subset || row.items).filter((x) => !facts.has(x.slug) && !factsPending.has(x.slug));
    if (!todo.length) return;
    for (const x of todo) factsPending.add(x.slug);
    refresh();
    const parts = [];
    for (let i = 0; i < todo.length; i += 40) parts.push(todo.slice(i, i + 40));
    async function fetchPart(part) {
      for (let attempt = 0, errors = 0; part.length && attempt < 6 && errors < 3; attempt++) {
        if (id !== renderId) return;
        try {
          const r = await fetch("/api/mdl/title-facts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: part.map((x) => ({ slug: x.slug, title: x.title, year: x.year, type: x.type, country: x.country })) }) });
          const data2 = await r.json();
          if (!r.ok) throw Error();
          const left = [];
          for (const x of part) {
            const f = data2.facts?.[x.slug];
            if (f) {
              facts.set(x.slug, f);
              factsPending.delete(x.slug);
            } else left.push(x);
          }
          if (left.length === part.length) errors++;
          part = left;
        } catch {
          errors++;
          await new Promise((r) => setTimeout(r, 2e3 * errors));
        }
        if (id === renderId) refresh();
      }
      if (part.length && id === renderId) failedRows.add(row);
    }
    let next2 = 0;
    await Promise.all([0, 1].map(async () => {
      while (next2 < parts.length) await fetchPart(parts[next2++]);
    }));
    for (const x of todo) if (!facts.has(x.slug)) factsPending.delete(x.slug);
    if (id === renderId) refresh();
  }
  function ensureFacts() {
    if (!filter) return;
    for (const r of rows) if (r.items && filterable(r) && shelfNeedsFacts(filter, r.items)) loadFacts(r);
  }
  const bar = node("div", "shelfFilterBar"), barHead = node("div", "shelfFilterBarHead");
  const toggle = node("button", "secondary shelfFilterToggle", copy.shelfFilter);
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");
  const summary = node("span", "shelfFilterSummary"), clear = node("button", "shelfReset", copy.shelfReset);
  clear.type = "button";
  const panel = node("div", "shelfFilters");
  panel.hidden = true;
  barHead.append(toggle, summary, clear);
  bar.append(barHead, panel);
  toggle.onclick = () => {
    panelOpen = !panelOpen;
    panel.hidden = !panelOpen;
    toggle.setAttribute("aria-expanded", String(panelOpen));
    if (panelOpen) {
      renderPanel();
      ensureGenres();
    }
  };
  clear.onclick = () => {
    drafts[viewKey] = null;
    update2();
  };
  if (compactAndroid) {
    filterDialog = node("dialog", "androidFiltersDialog");
    filterDialog.setAttribute("aria-label", "Community filters");
    const header = node("div", "androidFilterHeader");
    const reset2 = node("button", "secondary", "Clear"), dismiss = node("button", "secondary", "Close");
    reset2.type = dismiss.type = "button";
    reset2.onclick = () => {
      pendingFilter = emptyFilter();
      renderPanel();
    };
    dismiss.onclick = () => filterDialog.close();
    header.append(node("h2", null, "Community filters"), reset2, dismiss);
    const actions = node("div", "androidFilterActions");
    const apply = node("button", "primary", "Show Results");
    apply.type = "button";
    apply.onclick = () => {
      if (!pendingFilter) return;
      drafts.android = pendingFilter;
      panelOpen = false;
      update2();
      filterDialog.close();
    };
    actions.append(apply);
    filterDialog.append(header, node("p", "androidFilterScope", "Applies to MyDramaList watchlists and custom lists."), panel, actions);
    document.body.append(filterDialog);
    filterDialog.addEventListener("close", () => {
      if (filterDialog.open) return;
      panelOpen = false;
      pendingFilter = null;
      panel.hidden = true;
    });
  }
  function openFilters() {
    if (!filterDialog || filterDialog.open) return;
    const saved = draft();
    pendingFilter = { ...saved, countries: [...saved.countries], genres: [...saved.genres] };
    panelOpen = true;
    panel.hidden = false;
    renderPanel();
    showAndroidDialog(filterDialog);
    ensureGenres();
  }
  function ensureGenres() {
    for (const r of rows) if (filterable(r)) {
      if (r.items) loadFacts(r);
      else if (compactAndroid) r.load();
    }
  }
  function choiceGroup(label, values, selected, onToggle) {
    const group = node("div", "shelfChoiceGroup");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", label);
    for (const [value, text3] of values) {
      const b = node("button", "shelfChip", text3);
      b.type = "button";
      b.setAttribute("aria-pressed", String(selected.includes(value)));
      b.onclick = () => onToggle(value);
      group.append(b);
    }
    return group;
  }
  function field(label, control) {
    const wrap2 = node("label", "shelfField");
    wrap2.append(node("span", null, label), control);
    return wrap2;
  }
  function select(options, value, onChange) {
    const s = document.createElement("select");
    for (const [v, t] of options) {
      const o = node("option", null, t);
      o.value = v;
      if (String(v) === String(value ?? "")) o.setAttribute("selected", "");
      s.append(o);
    }
    s.onchange = () => onChange(s.value);
    return s;
  }
  function update2() {
    filter = normalizeShelfFilter(draft());
    for (const r of rows) {
      r.card.hidden = !!filter && !filterable(r);
      if (r.items) r.paint();
      r.sync();
    }
    renderBar();
    ensureFacts();
    if (compactAndroid && filter) {
      for (const r of rows) if (filterable(r) && !r.items) r.load();
    }
  }
  function renderBar() {
    const label = filter ? shelfFilterLabel(filter) : "";
    summary.textContent = label ? fill(copy.shelfFiltering, { label }) : "";
    clear.hidden = !filter;
    bar.hidden = compactAndroid || !rows.some(filterable);
    if (compactAndroid) {
      const badge = $("androidFilterCount");
      if (badge) {
        const count2 = Object.keys(filter || {}).length;
        badge.textContent = String(count2);
        badge.hidden = !count2;
      }
    }
    renderPanel();
  }
  function renderPanel() {
    if (!panelOpen) return;
    const d = pendingFilter || draft(), seen = new Set(), items2 = [];
    for (const r of rows) if (r.items && filterable(r)) {
      for (const x of r.items) if (!seen.has(x.slug)) {
        seen.add(x.slug);
        items2.push(x);
      }
    }
    const known = Object.fromEntries([...facts].filter(([s]) => seen.has(s)));
    const countryNames = Object.fromEntries(FILTER_COUNTRIES);
    const presentCountries = [...new Set(items2.map((x) => shelfCountry(x, known[x.slug])).filter(Boolean))];
    const countries = compactAndroid ? FILTER_COUNTRIES : FILTER_COUNTRIES.filter(([c]) => presentCountries.includes(c) || d.countries.includes(c));
    const presentGenres = new Set(items2.flatMap((x) => known[x.slug]?.genres || []));
    const genres = FILTER_GENRES.filter((g) => compactAndroid || presentGenres.has(g) || d.genres.includes(g)).map((g) => [g, g]);
    const years = [...new Set(items2.map((x) => Number(x.year)).filter(Boolean))].sort((a, b) => b - a).map((y) => [String(y), String(y)]);
    panel.replaceChildren();
    if (compactAndroid) {
      const refreshDraft = () => renderPanel();
      const media = choiceGroup(copy.shelfFilterType, [["", "All"], ["movie", "Movies"], ["drama", "Shows"]], [d.type], (v) => {
        d.type = v;
        refreshDraft();
      });
      media.classList.add("androidMediaFilter");
      const multi = (key, value) => {
        d[key] = d[key].includes(value) ? d[key].filter((item) => item !== value) : [...d[key], value];
        refreshDraft();
      };
      const grid3 = node("div", "shelfFilterGrid");
      for (const [key, label] of [["from", copy.shelfFrom], ["to", copy.shelfTo]]) {
        const input = node("input", "androidYearInput");
        input.type = "number";
        input.min = "1900";
        input.max = "2100";
        input.inputMode = "numeric";
        input.placeholder = "Any year";
        input.value = d[key];
        input.oninput = () => {
          d[key] = input.value;
        };
        grid3.append(field(label, input));
      }
      const sorts = [["", copy.shelfSortDefault], ["added", copy.shelfSortAdded], ["newest", copy.shelfSortNewest], ["oldest", copy.shelfSortOldest], ["rating", copy.shelfSortRating], ["az", copy.shelfSortAz]];
      panel.append(
        media,
        node("p", "shelfGroupLabel", copy.shelfGenre),
        choiceGroup(copy.shelfGenre, genres, d.genres, (v) => multi("genres", v)),
        node("p", "shelfGroupLabel", copy.shelfCountry),
        choiceGroup(copy.shelfCountry, countries, d.countries, (v) => multi("countries", v)),
        node("p", "shelfGroupLabel", "Release year"),
        grid3,
        field(copy.shelfSort, select(sorts, d.sort, (v) => {
          d.sort = v;
        }))
      );
      const status = node("p", "shelfHint androidFilterStatus");
      status.setAttribute("role", "status");
      panel.append(status);
      updateMetadataStatus();
      return;
    }
    panel.append(node("p", "shelfGroupLabel", copy.shelfFilterType), choiceGroup(copy.shelfFilterType, [["drama", copy.shelfDramas], ["movie", copy.shelfMovies]], d.type ? [d.type] : [], (v) => {
      d.type = d.type === v ? "" : v;
      update2();
    }));
    const grid2 = node("div", "shelfFilterGrid");
    grid2.append(field(copy.shelfFrom, select([["", copy.shelfAny], ...years], String(d.from || ""), (v) => {
      d.from = v;
      update2();
    })));
    grid2.append(field(copy.shelfTo, select([["", copy.shelfAny], ...years], String(d.to || ""), (v) => {
      d.to = v;
      update2();
    })));
    grid2.append(field(copy.shelfSort, select([["", copy.shelfSortDefault], ...rows.some((r) => r.list.kind === "watchlist" && filterable(r) && (r.items || []).some((x) => x.added > 0)) ? [["added", copy.shelfSortAdded]] : [], ["newest", copy.shelfSortNewest], ["oldest", copy.shelfSortOldest], ["az", copy.shelfSortAz]], d.sort, (v) => {
      d.sort = v;
      update2();
    })));
    panel.append(grid2);
    if (countries.length) panel.append(node("p", "shelfGroupLabel", copy.shelfCountry), choiceGroup(copy.shelfCountry, countries.map(([c]) => [c, countryNames[c] || c]), d.countries, (v) => {
      d.countries = d.countries.includes(v) ? d.countries.filter((x) => x !== v) : [...d.countries, v];
      update2();
    }));
    panel.append(node("p", "shelfGroupLabel", copy.shelfGenre));
    if (genres.length) panel.append(choiceGroup(copy.shelfGenre, genres, d.genres, (v) => {
      d.genres = d.genres.includes(v) ? d.genres.filter((x) => x !== v) : [...d.genres, v];
      update2();
    }));
    const done2 = items2.filter((x) => facts.has(x.slug)).length;
    if (done2 < items2.length) panel.append(node("p", "shelfHint", failedRows.size ? copy.shelfGenresUnavailable : fill(copy.shelfGenresLoading, { done: done2, total: items2.length })));
  }
  function updateMetadataStatus() {
    const status = panel.querySelector(".androidFilterStatus");
    if (!status) return;
    const items2 = new Set(rows.filter(filterable).flatMap((row) => (row.items || []).map((item) => item.slug)));
    const done2 = [...items2].filter((slug) => facts.has(slug)).length;
    status.textContent = failedRows.size ? copy.shelfGenresUnavailable : done2 < items2.size ? fill(copy.shelfGenresLoading, { done: done2, total: items2.size }) : "";
  }
  const watchlistDialog = node("dialog", "androidWatchlistDialog");
  const watchlistHeader = node("header", "androidWatchlistHeader");
  const watchlistBack = node("button", "secondary", "\u2039");
  watchlistBack.type = "button";
  watchlistBack.setAttribute("aria-label", "Back to list results");
  watchlistBack.onclick = () => watchlistDialog.close();
  const watchlistName = node("h2");
  watchlistName.id = "androidWatchlistName";
  const watchlistOwner = node("p", "androidWatchlistOwner");
  const heading = node("div");
  heading.append(watchlistName, watchlistOwner);
  const watchlistFilter = node("button", "secondary", "Filters");
  watchlistFilter.type = "button";
  watchlistFilter.onclick = openFilters;
  const watchlistBody = node("div", "androidWatchlistBody");
  const grid = node("div", "androidWatchlistGrid");
  const gridStatus = node("div", "catalogShelfStatus");
  gridStatus.setAttribute("aria-live", "polite");
  watchlistHeader.append(watchlistBack, heading, watchlistFilter);
  watchlistBody.append(gridStatus, grid);
  watchlistDialog.append(watchlistHeader, watchlistBody);
  watchlistDialog.setAttribute("aria-labelledby", watchlistName.id);
  if (compactAndroid) document.body.append(watchlistDialog);
  let openRow = null, gridObserver, gridCards = [], gridQueue = new Set(), gridTask;
  watchlistDialog.addEventListener("close", () => {
    if (watchlistDialog.open) return;
    gridObserver?.disconnect();
    gridQueue.clear();
    gridCards = [];
    openRow = null;
    grid.replaceChildren();
    gridStatus.replaceChildren();
  });
  function ownerLabel(list) {
    return "@" + list.profile;
  }
  function posterTile(title, src) {
    const tile = node("span", "androidWatchlistPoster", title);
    updatePoster(tile, src);
    return tile;
  }
  function updatePoster(tile, src) {
    if (!src || tile.dataset.poster === src) return;
    tile.dataset.poster = src;
    const img = node("img");
    img.alt = "";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => img.remove(), { once: true });
    img.src = src;
    tile.append(img);
  }
  function watchlistArt(row, container) {
    const items2 = row.shown || row.sample;
    const sample = items2 ? items2.slice(0, 5).map((item) => [item.title, posterOf(item)]) : (row.list.posters || []).slice(0, 5).map((url) => ["", url]);
    const total = row.total ?? row.list.count;
    const signature = JSON.stringify([sample, total]);
    if (container.dataset.sample === signature) return;
    container.dataset.sample = signature;
    const slots = Number.isInteger(total) ? Math.min(4, total) : 4;
    const tiles = Array.from({ length: slots }, (_2, i) => posterTile(sample[i]?.[0] || "", sample[i]?.[1]));
    const count2 = posterTile("", sample[4]?.[1]);
    count2.classList.add("androidWatchlistCount");
    count2.append(node("strong", null, Number.isInteger(total) ? total.toLocaleString() : "View"), node("small", null, Number.isInteger(total) ? total === 1 ? "title" : "titles" : "list"));
    container.replaceChildren(...tiles, count2);
  }
  function loadVisibleFacts() {
    if (gridTask || !openRow || !gridQueue.size) return;
    const row = openRow, items2 = [...gridQueue].slice(0, 40);
    for (const item of items2) gridQueue.delete(item);
    gridTask = loadFacts(row, items2).finally(() => {
      gridTask = null;
      loadVisibleFacts();
    });
  }
  function openWatchlist(row, title) {
    openRow = row;
    watchlistName.textContent = title;
    watchlistOwner.textContent = ownerLabel(row.list);
    watchlistFilter.hidden = !filterable(row);
    showAndroidDialog(watchlistDialog);
    watchlistBody.scrollTop = 0;
    row.load();
    paintOpenWatchlist(row);
  }
  function paintOpenWatchlist(row) {
    if (openRow !== row || !watchlistDialog.open) return;
    if (!row.items) {
      gridStatus.textContent = row.error || copy.loadingLists;
      if (row.error) {
        const retry = node("button", "secondary catalogRetry", copy.catalogRetry);
        retry.type = "button";
        retry.onclick = () => {
          row.load();
          paintOpenWatchlist(row);
        };
        gridStatus.append(" ", retry);
      }
      return;
    }
    const items2 = row.shown || row.items;
    gridStatus.textContent = items2.length ? filterable(row) && filter ? fill(copy.shelfShowing, { shown: items2.length, total: row.total }) : "" : row.factsPending() ? copy.loadingLists : row.items.length ? copy.shelfNoMatches : copy.shelfEmpty;
    if (items2.length !== gridCards.length || items2.some((item, i) => gridCards[i].item !== item)) {
      gridObserver?.disconnect();
      gridQueue.clear();
      if (typeof IntersectionObserver !== "undefined") {
        gridObserver = new IntersectionObserver((entries2) => {
          for (const entry of entries2) if (entry.isIntersecting) {
            gridObserver.unobserve(entry.target);
            gridQueue.add(entry.target.watchlistItem);
          }
          loadVisibleFacts();
        }, { root: watchlistBody, rootMargin: "200px" });
      }
      gridCards = items2.map((item) => {
        const button = node("button", "androidWatchlistTitle");
        button.type = "button";
        button.watchlistItem = item;
        const poster = posterTile(item.title, posterOf(item));
        button.append(poster, node("strong", null, item.title), node("small", null, [item.year, item.type].filter(Boolean).join(" \xB7 ")));
        button.onclick = () => details(item);
        return { item, button, poster };
      });
      grid.replaceChildren(...gridCards.map((card) => card.button));
      if (gridObserver) for (const card of gridCards) gridObserver.observe(card.button);
      else {
        for (const item of items2.slice(0, 40)) gridQueue.add(item);
        loadVisibleFacts();
      }
    }
    for (const { item, poster } of gridCards) updatePoster(poster, posterOf(item));
  }
  function shelf(l, parent2) {
    const row = { list: l, items: null };
    rows.push(row);
    const card = node("article", "catalogShelf communityShelf"), head = node("div", "catalogShelfHead"), info = node("div");
    row.card = card;
    const posterCard = compactAndroid && !!l.profile;
    const title = (posterCard ? l.originalName || l.name : userListName(l)) || copy.untitledList;
    const preview = compactAndroid && !posterCard ? compactPreviewButton(title, l.posters) : null;
    const count2 = node("p", "shelfStats");
    function showCount(total) {
      count2.hidden = typeof total !== "number";
      count2.textContent = count2.hidden ? "" : copy.filmographyTitles.replace("{count}", String(total));
    }
    if (posterCard) {
      card.classList.add("androidWatchlistCard");
      const open = node("button", "androidWatchlistOpen");
      open.type = "button";
      const art = node("span", "androidWatchlistPreview");
      open.append(node("strong", null, title), node("small", null, ownerLabel(l)), art);
      open.onclick = () => openWatchlist(row, title);
      info.append(open);
      row.paintThumbnails = () => watchlistArt(row, art);
      row.paintThumbnails();
    } else if (preview) {
      card.classList.add("compactCatalogRow");
      showCount(l.count);
      info.append(preview.button, count2);
    } else {
      const description = decode2(l.description), stats = [];
      if (typeof l.count === "number") stats.push("\u25A3 " + l.count + " titles");
      if (typeof l.loves === "number") stats.push("\u2661 " + l.loves + " loves");
      if (typeof l.comments === "number") stats.push("\u25A4 " + l.comments + " comments");
      info.append(node("h3", null, title));
      if (description) info.append(node("p", null, description));
      if (stats.length) info.append(node("p", "shelfStats", stats.join(" \xB7 ")));
    }
    const actions = node("div", "catalogRowActions"), add2 = node("button", "secondary catalogAdd");
    add2.type = "button";
    actions.append(add2);
    head.append(info, actions);
    const status = node("p", "shelfStatus");
    const track = node("div", "catalogShelfTrack");
    track.setAttribute("aria-label", userListName(l) || copy.untitledList);
    card.append(head);
    if (!posterCard) card.append(status, track);
    parent2.append(card);
    card.hidden = !!filter && !filterable(row);
    if (preview) {
      track.className = "compactPreview";
      track.hidden = true;
      preview.button.onclick = () => {
        track.hidden = !track.hidden;
        preview.button.setAttribute("aria-expanded", String(!track.hidden));
        if (!track.hidden) {
          if (row.items) row.paint();
          else row.load();
        }
      };
      row.paintThumbnails = () => {
        const items2 = row.shown || row.sample || [];
        const posters = items2.map(posterOf).filter(Boolean);
        preview.showPosters(posters.length || rowFilter() ? posters : l.posters || []);
      };
    }
    const rowFilter = () => filterable(row) ? filter : null;
    row.url = () => rowFilter() ? l.url + (l.url.includes("?") ? "&" : "?") + "ydlf=" + shelfFilterKey(rowFilter()) : l.url;
    row.selectionItem = () => {
      const posters = (row.shown || row.items || []).map(posterOf).filter(Boolean).slice(0, 5);
      const base = { ...l, posters: posters.length ? posters : l.posters || [] };
      if (!rowFilter()) return base;
      const baseName = l.originalName || l.name;
      return { ...base, url: row.url(), originalName: baseName, name: baseName, filter: rowFilter(), filterLabel: shelfFilterLabel(rowFilter()) };
    };
    row.factsPending = () => !!rowFilter() && shelfNeedsFacts(rowFilter(), row.items || []) && (row.items || []).some((x) => !facts.has(x.slug)) && !failedRows.has(row);
    add2.onclick = () => {
      if (rowFilter() && row.items && !row.shown?.length && !row.factsPending()) {
        notices.show(copy.shelfNoMatches);
        return;
      }
      toggleList(row.selectionItem());
    };
    row.sync = () => {
      const on = state.selection.some((x) => x.url === row.url());
      add2.textContent = on ? copy.catalogAdded : compactAndroid ? copy.compactCatalogAdd : copy.catalogAdd;
      add2.setAttribute("aria-pressed", String(on));
      add2.setAttribute("aria-label", (on ? copy.catalogAdded : copy.catalogSelect) + " " + userListName(row.selectionItem()));
    };
    row.paint = () => {
      if (!row.items) return;
      const f = rowFilter();
      row.shown = applyShelfFilter(row.items, f, Object.fromEntries(facts));
      if (posterCard) {
        row.paintThumbnails();
        row.sync();
        paintOpenWatchlist(row);
        return;
      }
      if (preview) {
        row.paintThumbnails();
        row.sync();
        if (track.hidden) return;
        track.replaceChildren();
        for (const item of f ? row.shown : row.shown.slice(0, 60)) {
          const button = node("button", "compactTitle", item.title);
          button.type = "button";
          button.onclick = () => details(item);
          track.append(button);
        }
        if (!row.shown.length) track.append(node("p", "catalogShelfStatus", row.factsPending() ? copy.loadingLists : row.items.length ? copy.shelfNoMatches : copy.shelfEmpty));
        return;
      }
      track.replaceChildren();
      for (const item of f ? row.shown : row.shown.slice(0, 60)) {
        const b = node("button", "catalogPoster");
        b.type = "button";
        b.setAttribute("aria-label", copy.catalogTitlePreview + ": " + item.title);
        const poster = posterOf(item);
        if (poster) {
          const img = node("img");
          img.src = poster;
          img.alt = item.title;
          img.loading = "lazy";
          img.referrerPolicy = "no-referrer";
          b.append(img);
        } else b.append(node("span", "shelfPosterBlank", item.title));
        b.append(node("strong", null, item.title), node("small", null, item.year ? String(item.year) : ""));
        b.onclick = () => details(item);
        track.append(b);
      }
      if (!row.shown.length) track.append(node("p", "catalogShelfStatus", row.factsPending() ? fill(copy.shelfGenresLoading, { done: row.items.filter((x) => facts.has(x.slug)).length, total: row.items.length }) : row.items.length ? copy.shelfNoMatches : copy.shelfEmpty));
      const arrows = actions.querySelectorAll(".catalogArrow");
      if (row.shown.length > 5 && !arrows.length) for (const [text3, amount] of [["\u2039", -1], ["\u203A", 1]]) {
        const a = node("button", "secondary catalogArrow", text3);
        a.type = "button";
        a.setAttribute("aria-label", amount < 0 ? copy.catalogPrevious : copy.catalogNext);
        a.onclick = () => track.scrollBy({ left: amount * track.clientWidth, behavior: "smooth" });
        actions.insertBefore(a, add2);
      }
      if (row.shown.length <= 5) arrows.forEach((a) => a.remove());
      status.textContent = f ? fill(copy.shelfShowing, { shown: row.shown.length, total: row.items.length }) + (row.factsPending() ? " \xB7 " + fill(copy.shelfGenresLoading, { done: row.items.filter((x) => facts.has(x.slug)).length, total: row.items.length }) : "") + " \xB7 " + fill(copy.shelfAddsAs, { name: userListName(row.selectionItem()) }) : "";
      row.sync();
    };
    row.load = () => {
      if (row.loading || row.items) return;
      row.loading = true;
      row.error = null;
      const id = renderId;
      enqueue(async () => {
        try {
          if (id !== renderId || !card.isConnected) return;
          if (l.empty) {
            if (posterCard) {
              row.items = [];
              row.total = 0;
              row.paint();
            } else track.replaceChildren(node("p", "catalogShelfStatus", copy.shelfEmpty));
            return;
          }
          if (preview) track.replaceChildren(node("p", "catalogShelfStatus", copy.loadingLists));
          else if (!posterCard) skeleton(track);
          const items2 = [], url = "/api/mdl/shelf?url=" + encodeURIComponent(l.url);
          do {
            const response = await fetch(url + (items2.length ? "&offset=" + items2.length : ""), { signal: AbortSignal.timeout(45e3) });
            const data2 = await response.json();
            if (id !== renderId || !card.isConnected) return;
            if (!response.ok) throw Error(data2.error);
            row.total = Number.isInteger(data2.total) ? data2.total : (data2.items || []).length;
            if (!data2.items?.length) break;
            items2.push(...data2.items);
          } while (posterCard && items2.length < row.total);
          row.items = items2;
          if (preview) showCount(row.total);
          row.paint();
          if (compactAndroid) updateMetadataStatus();
          else renderPanel();
          if (!compactAndroid) {
            const bare = row.items.slice(0, 60).filter((x) => !x.poster);
            if (bare.length) loadFacts(row, bare);
          }
          if (filterable(row) && (panelOpen || filter && shelfNeedsFacts(filter, row.items))) loadFacts(row);
        } catch (e) {
          if (id !== renderId || !card.isConnected) return;
          if (posterCard) {
            row.error = e?.message || copy.shelfUnavailable;
            paintOpenWatchlist(row);
            return;
          }
          track.replaceChildren();
          const p = node("p", "catalogShelfStatus", e && e.message || copy.shelfUnavailable), retry = node("button", "secondary catalogRetry", copy.catalogRetry);
          retry.type = "button";
          retry.onclick = () => row.load();
          track.append(p, retry);
        } finally {
          row.loading = false;
        }
      });
    };
    row.loadThumbnails = () => {
      if (l.empty || !posterCard && l.posters?.length) return;
      const id = renderId;
      enqueue(async () => {
        if (id !== renderId || !card.isConnected) return;
        try {
          const response = await fetch("/api/mdl/shelf?preview=" + (posterCard ? "watchlist" : "1") + "&url=" + encodeURIComponent(l.url), { signal: AbortSignal.timeout(15e3) });
          if (!response.ok) return;
          const data2 = await response.json();
          if (id !== renderId || !card.isConnected) return;
          row.sample = (data2.items || []).slice(0, posterCard ? 5 : 3);
          if (!row.items && Number.isInteger(data2.total)) row.total = data2.total;
          if (preview) showCount(data2.total);
          row.paintThumbnails();
          const missing = row.sample.filter((item) => !item.poster);
          if (missing.length) loadFacts(row, missing);
        } catch {
        }
      });
    };
    if (l.empty) add2.disabled = true;
    row.sync();
    if (!compactAndroid) skeleton(track);
    return { card, row };
  }
  function render3(lists, key) {
    renderId++;
    observer?.disconnect();
    rows.length = 0;
    jobs.length = 0;
    failedRows.clear();
    viewKey = key || "other";
    filter = normalizeShelfFilter(draft());
    const parent2 = $("listItems");
    parent2.replaceChildren(bar);
    activeLists = lists;
    const targets = new Map();
    for (const l of lists) {
      if (l.unavailable || !l.url) continue;
      const { card, row } = shelf(l, parent2);
      targets.set(card, row);
    }
    renderBar();
    function loadVisible(row) {
      if (!row || row.card.hidden) return;
      if (!compactAndroid || filter && filterable(row)) row.load();
      else row.loadThumbnails();
    }
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver((entries2) => {
        for (const entry of entries2) if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          loadVisible(targets.get(entry.target));
        }
      }, { rootMargin: "200px" });
      for (const card of targets.keys()) observer.observe(card);
    } else for (const row of targets.values()) loadVisible(row);
  }
  function sync() {
    for (const row of rows) row.sync();
  }
  function items() {
    return rows.filter((r) => !r.card.hidden).map((r) => r.selectionItem());
  }
  function reset() {
    renderId++;
    observer?.disconnect();
    rows.length = 0;
    jobs.length = 0;
    failedRows.clear();
  }
  return { render: render3, sync, items, openFilters, reset };
}
