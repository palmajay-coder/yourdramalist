// @ts-nocheck -- installed into the setup page's browser scope.
export function installDiscoverAddButtons() {
  function savedTitles() {
    try {
      const collections = JSON.parse(localStorage.getItem(userCollectionsKey) || "[]");
      if (Array.isArray(collections)) {
        return new Set(collections.flatMap(collection => collection.titles.map(title => title.url)));
      }
    } catch { /* The picker reports storage failures when opened. */ }
    return new Set();
  }

  function paint(button, added) {
    const {titleName, titleAction} = button.dataset;
    const preview = titleAction === "preview";
    button.classList.toggle("is-added", added);
    button.replaceChildren();
    if (preview && !added) {
      button.innerHTML = layeredPostersIcon;
    } else {
      const icon = document.createElement("span");
      icon.className = "discoverAddIcon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = added ? "✓" : "+";
      button.append(icon);
    }
    button.append(document.createTextNode(added ? "Added" : preview ? "Add to Collection" : "Add"));
    button.setAttribute("aria-label", added
      ? "Added: manage collections for " + titleName
      : "Add to Collection: " + titleName);
  }

  function refresh() {
    const saved = savedTitles();
    for (const button of document.querySelectorAll("button[data-title-action]")) {
      paint(button, saved.has(button.dataset.titleUrl));
    }
  }
  document.addEventListener("ydl:collections-changed", refresh);
  window.addEventListener("storage", event => {
    if (event.key === userCollectionsKey || event.key === null) refresh();
  });

  return (item, placement, open) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "discoverAddPill " + (placement === "preview" ? "discoverCollectionAction" : "discoverTitleAdd");
    button.dataset.titleUrl = item.url || "";
    button.dataset.titleName = item.title || item.name;
    button.dataset.titleAction = placement;
    button.setAttribute("aria-haspopup", "dialog");
    button.onclick = () => open(saving => {
      button.disabled = saving;
      if (saving) button.setAttribute("aria-busy", "true");
      else button.removeAttribute("aria-busy");
    });
    paint(button, savedTitles().has(item.url));
    return button;
  };
}
