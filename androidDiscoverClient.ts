// @ts-nocheck -- installed into the existing browser scope.
export function installAndroidDiscover() {
  const home = $("selection");
  const workspace = home.querySelector(".workspace");
  const toolbar = document.createElement("div");
  toolbar.className = "androidDiscoverToolbar";
  const heading = document.createElement("h1");
  heading.textContent = "Discover";
  toolbar.append(heading);
  const actions = document.createElement("div");
  actions.className = "androidHeaderActions";
  const form = $("profileForm");
  form.querySelector("label").classList.add("androidScreenReader");
  const input = $("profileInput");
  input.placeholder = "MyDramaList username or list link";
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
  document.querySelector("header").append(actions);
  input.setAttribute("aria-label", input.placeholder);
  home.insertBefore(toolbar, workspace);

  const discoverForm = $("discoverForm");
  const discoverInput = $("discoverInput");
  $("discoverSearch").querySelector(".discoverModes").classList.add("hidden");
  $("discoverLabel").textContent = "Search actors and directors";
  $("discoverLabel").classList.add("androidScreenReader");
  discoverInput.placeholder = "Search actors and directors";
  discoverInput.setAttribute("aria-label", discoverInput.placeholder);
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
    // Both credit types use the same MyDramaList people lookup.
    if (/^https?:/i.test(query)) peopleUI.fromUrl(query, "actor");
    else if (query.length >= 2 && query.length <= 100) peopleUI.search(query, 1, "actor");
    else $("results").textContent = "Enter a name between 2 and 100 characters or paste a MyDramaList person link.";
  };

  $("continue").textContent = "Build add-on";
  const bottomNav = document.createElement("nav");
  bottomNav.className = "androidBottomNav";
  bottomNav.setAttribute("aria-label", "Main navigation");
  const destinations = [
    ["connect", '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>', "Connect"],
    ["discover", "▦", "Discover"],
    ["community", "♡", "Community"],
  ];
  const navButtons = new Map();
  for (const [key, icon, label] of destinations) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "androidNavItem";
    button.dataset.destination = key;
    button.setAttribute("aria-label", label);
    button.innerHTML = `<span class="androidNavIcon" aria-hidden="true">${icon}</span><span>${label}</span>`;
    button.onclick = () => {
      if (key === "connect") navigate("connect");
      if (key === "discover") openSelection("discover");
      if (key === "community") {
        openSelection("profiles");
        if (connectedUser) {
          input.value = connectedUser;
          loadProfile(connectedUser);
        } else {
          input.value = "";
          $("results").textContent = "Search a MyDramaList username or paste a list link to explore community lists.";
        }
      }
      syncNav(currentPage, key);
    };
    navButtons.set(key, button);
    bottomNav.append(button);
  }
  document.body.append(bottomNav);
  let wasInDiscover = false;
  function syncNav(page, explicit) {
    const selected = explicit || (page === "connect" ? "connect" : state.tab === "profiles" ? "community" : "discover");
    const inDiscover = state.tab === "discover";
    heading.textContent = inDiscover ? "Discover" : "Community";
    catalogs.hidden = !inDiscover;
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
  state.filter = "catalogs";
  $("exploreSearch").classList.remove("hidden");
  switchTab("discover");
  let startPage = connectedUser ? "selection" : "connect";
  if (mobileWeb && location.pathname !== "/") startPage = pageForPath(location.pathname);
  if (startPage === "confirm" && !state.selection.length) startPage = "selection";
  const path = {connect:"/setup", selection:"/setup/lists", preferences:"/setup/preferences", confirm:"/setup/confirm"}[startPage];
  history.replaceState({ ydlPage: startPage, ydlFlowStep: 0 }, "", path);
  navigate(startPage, false);
  exploreUI.render();
  syncNav(startPage);
}
