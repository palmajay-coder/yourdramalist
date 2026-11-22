// @ts-nocheck -- installed into the existing browser scope.
export function installAndroidDiscover() {
  const home = $("selection");
  const workspace = home.querySelector(".workspace");
  const toolbar = document.createElement("div");
  toolbar.className = "androidDiscoverToolbar";
  const heading = document.createElement("h1");
  heading.textContent = "Discover";
  toolbar.append(heading);
  const header = document.querySelector("body > header");
  const mainTitles = {profiles: "Lists", discover: "Discover", collections: "My Collections", stats: "Stats"};
  function syncHeader() {
    const mobileHeader = currentPage === "selection" && !document.body.classList.contains("wideWeb");
    header.classList.toggle("mobilePageHeader", mobileHeader);
    toolbar.hidden = mobileHeader;
    heading.textContent = mainTitles[state.tab] || "Discover";
    if (mobileHeader) header.prepend(heading);
    else toolbar.append(heading);
  }
  window.syncMobileHeaderLayout = syncHeader;
  const actions = document.createElement("div");
  actions.className = "androidHeaderActions";
  const form = $("profileForm");
  form.querySelector("label").classList.add("androidScreenReader");
  const input = $("profileInput");
  input.placeholder = "Enter username or paste a link…";
  input.setAttribute("enterkeyhint", "search");
  input.required = false;
  $("communityViews").querySelector("[data-community-view]").remove();
  const filters = document.createElement("button");
  filters.type = "button";
  filters.className = "secondary androidFilterButton";
  filters.setAttribute("aria-label", "Filter Discover results");
  filters.setAttribute("aria-haspopup", "dialog");
  filters.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M6 12h12M10 18h4"/></svg><span id="androidFilterCount" hidden></span>';
  actions.append(filters);
  filters.onclick = () => {
    if (state.tab === "discover") exploreUI.openFilters(filters);
    else communityUI.openFilters();
  };
  const selectionButton = document.createElement("button");
  selectionButton.type = "button";
  selectionButton.className = "secondary androidSelectionButton";
  selectionButton.setAttribute("aria-label", "Review selected catalogs");
  selectionButton.setAttribute("aria-haspopup", "dialog");
  selectionButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="15" height="17" rx="2"/><path d="M8 8h7M8 12h4M8 16l2 2 5-6"/></svg><span id="androidSelectionCount" hidden></span>';
  selectionButton.onclick = () => $("reviewSelection").click();
  actions.append(selectionButton);
  header.append(actions);
  input.setAttribute("aria-label", "MyDramaList username or link containing a list");
  home.insertBefore(toolbar, workspace);
  const pageDescription = document.createElement("p");
  pageDescription.className = "androidPageDescription";
  pageDescription.style.cssText = "margin:8px 16px 16px;color:#b9c1ce;font-size:14px;line-height:1.5";
  home.insertBefore(pageDescription, workspace);
  // My Collections opens from the top of Lists (its bottom-bar spot went to Stats), with a way back.
  const collectionsLink = document.createElement("button");
  collectionsLink.type = "button";
  collectionsLink.className = "secondary androidCollectionsLink";
  collectionsLink.onclick = () => switchTab(state.tab === "collections" ? "profiles" : "collections");
  home.insertBefore(collectionsLink, workspace);

  const discoverForm = $("discoverForm");
  const discoverInput = $("discoverInput");
  $("discoverSearch").querySelector(".discoverModes").classList.add("hidden");
  $("discoverLabel").classList.add("androidScreenReader");
  // Discover is curation only (Spotlight, This Week's Picks, Top 10, Browse All). Searching lives in the green +.
  discoverForm.hidden = true;
  $("discoverLabel").hidden = true;
  discoverInput.setAttribute("enterkeyhint", "search");
  discoverInput.required = false;

  function clearPeopleResults() {
    listRequest++;
    peopleUI.cleanup();
    $("results").textContent = "";
    $("listItems").replaceChildren();
  }

  discoverInput.addEventListener("input", () => {
    if (!discoverInput.value.trim()) clearPeopleResults();
  });
  discoverForm.onsubmit = (event) => {
    event.preventDefault();
    const query = discoverInput.value.trim();
    clearPeopleResults();
    if (!query) return;
    discoverInput.blur();
    if (/^https?:/i.test(query)) peopleUI.fromUrl(query, "actor");
    else if (query.length >= 2 && query.length <= 100) {
      quickSearch.remember(query);
      peopleUI.search(query, 1, "actor");
    }
    else $("results").textContent = "Enter a title or name between 2 and 100 characters, or paste a MyDramaList person link.";
  };

  $("continue").textContent = "Build add-on";
  const bottomNav = document.createElement("nav");
  bottomNav.className = "androidBottomNav";
  bottomNav.setAttribute("aria-label", "Main navigation");
  const destinations = [
    ["connect", '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>', "Connect"],
    ["community", '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>', "Lists"],
    ["search", '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 7.5v9M7.5 12h9"/></svg>', "Search titles to add"],
    ["discover", "▦", "Discover"],
    // Stats took My Collections' place; My Collections opens from a button on the Lists page.
    ["stats", '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 20V11M12 20V5M19 20v-6"/></svg>', "Stats"],
  ];
  const navButtons = new Map();
  for (const [key, icon, label] of destinations) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "androidNavItem";
    button.dataset.destination = key;
    button.setAttribute("aria-label", label);
    button.innerHTML = `<span class="androidNavIcon" aria-hidden="true">${icon}</span><span${key === "search" ? ' class="androidScreenReader"' : ""}>${label}</span>`;
    if (key === "search") {
      // The green + opens the full-screen search; it is an action, not a page, so it is never "active".
      button.classList.add("androidNavAdd");
      button.setAttribute("aria-haspopup", "dialog");
      button.onclick = () => quickSearch.open(button);
      bottomNav.append(button);
      continue;
    }
    button.onclick = () => {
      if (key === "connect") navigate("connect");
      if (key === "discover" || key === "stats") openSelection(key);
      if (key === "community") openCommunity(connectedUser);
      syncNav(currentPage, key);
    };
    navButtons.set(key, button);
    bottomNav.append(button);
  }
  document.body.append(bottomNav);
  let wasInDiscover = false;
  function syncNav(page, explicit) {
    // My Collections lives inside Lists now, so it lights up Lists.
    const selected = explicit || (page === "connect" ? "connect" : state.tab === "profiles" || state.tab === "collections" ? "community" : state.tab);
    const inDiscover = state.tab === "discover";
    const inCollections = state.tab === "collections";
    const inStats = state.tab === "stats";
    syncHeader();
    pageDescription.hidden = inDiscover || inStats;
    pageDescription.textContent = inCollections ? "Create and manage your own custom catalogs here." : "Import lists from MyDramaList by searching a username or pasting a link to a list.";
    filters.hidden = inCollections || inStats;
    collectionsLink.hidden = !(state.tab === "profiles" || inCollections) || page !== "selection";
    collectionsLink.textContent = inCollections ? "‹ Back to Lists" : "My Collections ›";
    catalogs.hidden = !inDiscover;
    window.syncWrappedBanner?.();
    actions.classList.toggle("hidden", page !== "selection");
    actions.dataset.section = inDiscover ? "discover" : "community";
    filters.setAttribute("aria-label", inDiscover ? "Filter Discover catalogs" : "Filter Community lists");
    const onDiscoverPage = inDiscover && page === "selection";
    if (onDiscoverPage && !wasInDiscover) exploreUI.resetMedia();
    wasInDiscover = onDiscoverPage;
    for (const [key, button] of navButtons) {
      const active = key === selected;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
  }
  window.syncAndroidNav = syncNav;
  window.syncAndroidSelectionCount = (count) => {
    const badge = $("androidSelectionCount");
    badge.textContent = String(count);
    badge.hidden = count < 1;
    selectionButton.setAttribute("aria-label", count ? `Review ${count} selected catalogs` : "Review selected catalogs");
  };
  window.syncAndroidSelectionCount(state.selection.length);
  const catalogs = document.createElement("div");
  catalogs.id = "androidCatalogs";
  $("listItems").after(catalogs);
  wrapped.mountBanner(workspace); // above the page, so it shows on Lists and Discover
  state.filter = "catalogs";
  $("exploreSearch").classList.remove("hidden");
  switchTab("discover");
  let startPage = hasStarted() ? "selection" : "connect";
  if (!androidApp && location.pathname !== "/") startPage = pageForPath(location.pathname);
  if (startPage === "confirm" && !state.selection.length) startPage = "selection";
  const path = {connect:"/setup", selection:"/setup/lists", preferences:"/setup/preferences", confirm:"/setup/confirm"}[startPage];
  history.replaceState({ ydlPage: startPage, ydlFlowStep: 0 }, "", path);
  navigate(startPage, false);
  exploreUI.render();
  syncNav(startPage);
}
