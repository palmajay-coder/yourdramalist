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
  dialog.setAttribute("aria-label", "Search");
  const form = element("form", "quickSearchBar");
  form.setAttribute("role", "search");
  const back = element("button", "quickSearchBack");
  back.type = "button";
  back.setAttribute("aria-label", "Close search");
  back.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>';
  const input = element("input");
  input.type = "search";
  input.id = "quickSearchInput";
  input.placeholder = "Dramas, movies, actors, directors...";
  input.setAttribute("aria-label", "Search dramas, movies, actors and directors");
  input.setAttribute("enterkeyhint", "search");
  input.autocomplete = "off";
  input.maxLength = 100;
  const clearText = element("button", "quickSearchClearText");
  clearText.type = "button";
  clearText.hidden = true;
  clearText.setAttribute("aria-label", "Clear search");
  clearText.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  // Shown above the search box until the first search; after that, recent searches take its place.
  const intro = element("div", "quickSearchIntro");
  intro.append(element("strong", "", "Search"));
  const field = element("div", "quickSearchField");
  field.append(input, clearText);
  form.append(back, intro, field);
  const body = element("div", "quickSearchBody");
  const recentView = element("div", "quickSearchRecentView");
  const status = element("p", "quickSearchStatus");
  status.setAttribute("role", "status");
  const list = element("div", "quickSearchResults");
  body.append(recentView, status, list);
  dialog.append(form, body);
  // The only search in the app: titles go into the person's own collections, people add a filmography.
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
  // Before the first search: how a single drama becomes your own catalog in Nuvio.
  function tip() {
    const box = element("div", "quickSearchTip");
    const steps = element("ol", "quickSearchSteps");
    const icons = {
      search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
      add: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
      tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
      person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    };
    const iconMark = icon => {
      const mark = element("span", "quickSearchStepIcon");
      mark.setAttribute("aria-hidden", "true");
      mark.innerHTML = '<svg viewBox="0 0 24 24">' + icons[icon] + "</svg>";
      return mark;
    };
    for (const [icon, text] of [["search", "Search a drama or movie"], ["add", "Add it to your own collection"], ["tv", "Install the collection in Nuvio"]]) {
      const step = element("li");
      step.append(iconMark(icon), element("span", "", text));
      steps.append(step);
    }
    const people = element("p", "quickSearchPeopleTip");
    people.append(iconMark("person"), element("span", "", "Or search an actor or director to add their whole filmography."));
    box.append(steps, people);
    return box;
  }
  function render() {
    recentView.replaceChildren();
    form.classList.remove("withIntro");
    const items = recent();
    if (!items.length) {
      form.classList.add("withIntro");
      recentView.append(tip());
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
