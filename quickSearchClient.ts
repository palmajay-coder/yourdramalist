// @ts-nocheck -- installed into the setup page's browser scope.
// The green + in the bottom bar: a full-screen search with recent searches. Searching hands the text to
// Discover's own search, so results, previews, Add / Added buttons and the collection picker are shared.
export function installQuickSearch() {
  const storageKey = "ydl.recentSearches.v1";
  const limit = 8;
  const recent = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(saved) ? saved.filter(item => typeof item === "string" && item.trim()).slice(0, limit) : [];
    } catch { return []; }
  };
  const store = list => {
    try { localStorage.setItem(storageKey, JSON.stringify(list.slice(0, limit))); }
    catch { /* Recent searches are a convenience; search works without them. */ }
  };
  function remember(query) {
    const text = String(query || "").trim().slice(0, 100);
    if (!text) return;
    store([text, ...recent().filter(item => item.toLowerCase() !== text.toLowerCase())]);
  }

  const element = (tag, className = "", text = "") => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const dialog = element("dialog", "quickSearch");
  dialog.setAttribute("aria-label", "Search titles to add");
  const form = element("form", "quickSearchBar");
  form.setAttribute("role", "search");
  const back = element("button", "quickSearchBack");
  back.type = "button";
  back.setAttribute("aria-label", "Close search");
  back.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>';
  const input = element("input");
  input.type = "search";
  input.id = "quickSearchInput";
  input.placeholder = "Search a drama, movie, actor...";
  input.setAttribute("aria-label", "Search dramas, movies, actors and directors");
  input.setAttribute("enterkeyhint", "search");
  input.autocomplete = "off";
  input.maxLength = 100;
  form.append(back, input);
  const body = element("div", "quickSearchBody");
  dialog.append(form, body);
  document.body.append(dialog);

  let returnFocus = null;
  function render() {
    body.replaceChildren();
    const items = recent();
    if (!items.length) {
      body.append(element("p", "quickSearchHint",
        "Search a drama, movie, actor or director, then tap Add to put it in a collection."));
      return;
    }
    const heading = element("div", "quickSearchHeading");
    const label = element("h2", "", "Recent searches");
    const clear = element("button", "quickSearchClear", "Clear");
    clear.type = "button";
    clear.onclick = () => { store([]); render(); input.focus(); };
    heading.append(label, clear);
    const list = element("ul", "quickSearchRecent");
    for (const text of items) {
      const row = element("li");
      const run = element("button", "quickSearchItem", text);
      run.type = "button";
      run.onclick = () => submit(text);
      const remove = element("button", "quickSearchRemove", "×");
      remove.type = "button";
      remove.setAttribute("aria-label", "Remove " + text + " from recent searches");
      remove.onclick = () => {
        store(recent().filter(item => item !== text));
        render();
        input.focus();
      };
      row.append(run, remove);
      list.append(row);
    }
    body.append(heading, list);
  }

  function close(then) {
    const pending = Boolean(history.state?.ydlDialog);
    returnFocus = then ? null : returnFocus;
    dialog.close();
    if (!then) return;
    // Closing goes back one history step; wait for it so Discover's page change is not undone.
    if (!pending) return then();
    let done = false;
    const run = () => { if (done) return; done = true; window.removeEventListener("popstate", run); then(); };
    window.addEventListener("popstate", run, {once: true});
    setTimeout(run, 400);
  }
  function submit(query) {
    const text = String(query || "").trim();
    if (!text) { input.focus(); return; }
    remember(text);
    close(() => {
      openSelection("discover");
      window.syncAndroidNav?.(currentPage, "discover");
      const discoverInput = $("discoverInput");
      discoverInput.value = text;
      $("discoverForm").dispatchEvent(new window.Event("submit", {cancelable: true}));
      window.scrollTo?.({top: 0});
    });
  }
  form.onsubmit = event => { event.preventDefault(); submit(input.value); };
  back.onclick = () => close();
  dialog.addEventListener("close", () => {
    const target = returnFocus;
    returnFocus = null;
    target?.focus?.();
  });

  return {
    remember,
    recent,
    open(opener) {
      if (dialog.open) return;
      returnFocus = opener || null;
      input.value = "";
      render();
      showAndroidDialog(dialog);
      input.focus();
    },
  };
}
