// @ts-nocheck -- installed into the setup page's browser scope.
// The green + in the bottom bar: a full-screen search with recent searches. Results show on this screen,
// drawn by Discover's own search (peopleUI), so previews, Add / Added buttons and the picker are shared.
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
  const clearText = element("button", "quickSearchClearText");
  clearText.type = "button";
  clearText.hidden = true;
  clearText.setAttribute("aria-label", "Clear search");
  clearText.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  form.append(back, input, clearText);
  const body = element("div", "quickSearchBody");
  const recentView = element("div", "quickSearchRecentView");
  const status = element("p", "quickSearchStatus");
  status.setAttribute("role", "status");
  const list = element("div", "quickSearchResults");
  body.append(recentView, status, list);
  dialog.append(form, body);
  const where = {list: () => list, status: () => status};
  document.body.append(dialog);

  let returnFocus = null;
  let timer = 0;
  let shown = "";
  function showRecent() {
    clearTimeout(timer);
    shown = "";
    listRequest++;
    list.replaceChildren();
    status.textContent = "";
    recentView.hidden = false;
    render();
  }
  function render() {
    recentView.replaceChildren();
    const items = recent();
    if (!items.length) {
      recentView.append(element("p", "quickSearchHint",
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
    recentView.append(heading, list);
  }

  function close() {
    clearTimeout(timer);
    dialog.close();
  }
  function search(query, save = false) {
    const text = String(query || "").trim();
    clearTimeout(timer);
    if (save && text) remember(text);
    if (text === shown && list.childElementCount) return;
    if (text.length < 2 || text.length > 100) {
      if (!text) showRecent();
      else if (save) status.textContent = "Enter a title or name between 2 and 100 characters.";
      return;
    }
    shown = text;
    recentView.hidden = true;
    status.textContent = "Searching…";
    if (/^https?:/i.test(text)) peopleUI.fromUrl(text, "actor", where);
    else peopleUI.search(text, 1, "actor", where);
  }
  function submit(query) {
    input.value = String(query || "").trim();
    clearText.hidden = !input.value;
    search(input.value, true);
    input.blur();
  }
  input.addEventListener("input", () => {
    clearText.hidden = !input.value;
    clearTimeout(timer);
    if (!input.value.trim()) { showRecent(); return; }
    // Search as the person types, after a short pause, like the rest of the app's search boxes.
    timer = setTimeout(() => search(input.value), 450);
  });
  clearText.onclick = () => { input.value = ""; clearText.hidden = true; showRecent(); input.focus(); };
  // Opening a result counts as using the search, so it joins the recent searches.
  list.addEventListener("click", event => {
    if (event.target.closest?.("button") && shown) remember(shown);
  });
  form.onsubmit = event => { event.preventDefault(); submit(input.value); };
  back.onclick = () => close();
  dialog.addEventListener("close", () => {
    clearTimeout(timer);
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
      clearText.hidden = true;
      showRecent();
      showAndroidDialog(dialog);
      input.focus();
    },
  };
}
