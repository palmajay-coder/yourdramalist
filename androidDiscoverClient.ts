// @ts-nocheck -- installed into the existing browser scope.
export function installAndroidDiscover() {
  const home = $("selection");
  const workspace = home.querySelector(".workspace");
  const toolbar = document.createElement("div");
  toolbar.className = "androidDiscoverToolbar";
  const heading = document.createElement("h1");
  heading.textContent = "Discover";
  toolbar.append(heading);
  const form = $("profileForm");
  form.querySelector("label").classList.add("androidScreenReader");
  const input = $("profileInput");
  input.placeholder = "MyDramaList username or list link";
  input.setAttribute("enterkeyhint", "search");
  input.required = false;
  const customLists = document.createElement("button");
  customLists.type = "button";
  customLists.dataset.communityView = "custom";
  customLists.textContent = copy.communityCustomLists;
  customLists.setAttribute("aria-pressed", "false");
  customLists.onclick = () => showCommunityView("custom");
  $("communityViews").insertBefore(customLists, $("communitySelectAll"));
  const filters = document.createElement("button");
  filters.type = "button";
  filters.className = "secondary androidFilterButton";
  filters.setAttribute("aria-label", "Filters for community lists");
  filters.setAttribute("aria-haspopup", "dialog");
  filters.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18l-7 8v5l-4 2v-7z"/></svg><span id="androidFilterCount" hidden></span>';
  form.querySelector(".searchrow").append(filters);
  filters.onclick = () => communityUI.openFilters();
  const modes = document.createElement("div");
  modes.className = "androidSearchModes";
  modes.setAttribute("role", "group");
  modes.setAttribute("aria-label", "Search for");
  const browse = document.createElement("button");
  browse.type = "button";
  browse.className = "secondary androidBackToBrowse";
  browse.textContent = "Back to Discover";
  browse.hidden = true;
  const sources = [["lists", "Lists", "MyDramaList username or list link"], ["actor", "Actors", "Actor name or MyDramaList URL"], ["director", "Directors", "Director name or MyDramaList URL"]];
  let mode = "lists", browsePosition = 0;
  function resetResults(restoreScroll = false) {
    communityUI.reset();
    switchTab("discover");
    $("androidCatalogs").hidden = false;
    browse.hidden = true;
    if (restoreScroll) requestAnimationFrame(() => window.scrollTo(0, browsePosition));
  }
  for (const [key, label, placeholder] of sources) {
    const button = document.createElement("button");
    button.className = "shelfChip";
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-pressed", String(key === mode));
    button.onclick = () => {
      if (mode === key) return;
      mode = key;
      for (const item of modes.children) item.setAttribute("aria-pressed", String(item === button));
      input.placeholder = placeholder;
      input.setAttribute("aria-label", placeholder);
      input.value = "";
      resetResults();
      input.focus();
    };
    modes.append(button);
  }
  input.setAttribute("aria-label", input.placeholder);
  home.insertBefore(toolbar, workspace);
  home.insertBefore(form, workspace);
  home.insertBefore(modes, workspace);
  home.insertBefore(browse, workspace);
  browse.onclick = () => {
    input.value = "";
    resetResults(true);
  };
  input.addEventListener("input", () => {
    if (!input.value.trim() && !browse.hidden) resetResults(true);
  });
  form.onsubmit = (event) => {
    event.preventDefault();
    const query2 = input.value.trim();
    if (!query2) {
      resetResults(true);
      return;
    }
    input.blur();
    if (browse.hidden) browsePosition = window.scrollY;
    browse.hidden = false;
    $("androidCatalogs").hidden = true;
    communityUI.reset();
    if (mode === "lists") {
      switchTab("profiles");
      const source = parseSource(query2);
      if (!source) {
        $("results").textContent = copy.invalidProfile;
        return;
      }
      state.source = source;
      if (source.type === "profile") loadProfile(source.value);
      else loadDirectList(source.value);
      return;
    }
    switchTab("discover");
    switchFilter(mode);
    $("discoverInput").value = query2;
    $("discoverForm").requestSubmit();
  };
  document.body.append($("mobileSelectionBar"));
  $("mobileContinue").textContent = "Build add-on";
  $("continue").textContent = "Build add-on";
  const catalogs = document.createElement("div");
  catalogs.id = "androidCatalogs";
  $("listItems").after(catalogs);
  switchTab("discover");
  history.replaceState({ ydlPage: "selection", ydlFlowStep: 0 }, "", "/setup/lists" + (androidPreview ? location.search : ""));
  navigate("selection", false);
  exploreUI.render();
}
