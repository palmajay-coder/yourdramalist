// @ts-nocheck -- installed into the setup page's browser scope.
export function installMyCollections() {
  const panel = document.createElement("section");
  panel.id = "myCollections";
  panel.className = "hidden";
  panel.setAttribute("aria-label", "My Collections");
  $("listItems").after(panel);
  const feedback = document.createElement("p");
  feedback.className = "myCollectionsFeedback";
  feedback.setAttribute("role", "status");
  panel.before(feedback);
  feedback.hidden = true;

  const element = (tag, className, label = "") => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = label;
    return node;
  };
  const poster = title => {
    const tile = element("span", "myCollectionPoster");
    tile.setAttribute("aria-hidden", "true");
    if (title?.poster) {
      const image = element("img", "");
      image.src = title.poster;
      image.alt = "";
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.onerror = () => image.remove();
      tile.append(image);
    }
    return tile;
  };

  const buttons = new Map();
  const readCollections = () => {
    const collections = JSON.parse(localStorage.getItem(userCollectionsKey) || "[]");
    if (!Array.isArray(collections)) throw Error("Invalid collection data");
    return collections;
  };
  function reconcileSelection(collections) {
    const urls = new Set(collections.map(({id}) => "ydl-collection:" + id));
    const remaining = state.selection.filter(list => list.kind !== "user-collection" || urls.has(list.url));
    if (remaining.length === state.selection.length) return;
    state.selection = remaining;
    renderSelection();
  }
  const closeMenus = except => {
    for (const menu of panel.querySelectorAll("details[open]")) {
      if (menu !== except) menu.open = false;
    }
  };
  document.addEventListener("click", event => closeMenus(event.target.closest?.(".myCollectionMenu")));
  panel.addEventListener("keydown", event => {
    const menu = event.target.closest(".myCollectionMenu[open]");
    if (event.key !== "Escape" || !menu) return;
    event.preventDefault();
    menu.open = false;
    menu.querySelector("summary").focus();
  });

  const dialog = element("dialog", "catalogDialog myCollectionDeleteDialog");
  dialog.setAttribute("aria-labelledby", "deleteCollectionHeading");
  dialog.setAttribute("aria-describedby", "deleteCollectionDescription");
  document.body.append(dialog);
  let feedbackTimer;
  const focusHeading = () => {
    const heading = document.querySelector("header.mobilePageHeader > h1, .androidDiscoverToolbar h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus();
    }
  };
  function confirmDeletion({id, name}, trigger, index) {
    if (dialog.open) return;
    const heading = element("h2", "", "Delete collection?");
    heading.id = "deleteCollectionHeading";
    const description = element("p", "", "Are you sure you want to delete “" + name + "”? This will also remove it from Your Selection.");
    description.id = "deleteCollectionDescription";
    const error = element("p", "myCollectionDeleteError");
    error.setAttribute("role", "alert");
    const actions = element("div", "myCollectionDeleteActions");
    const cancel = element("button", "secondary myCollectionDeleteCancel", "Cancel");
    cancel.type = "button";
    cancel.autofocus = true;
    cancel.onclick = () => dialog.close();
    const remove = element("button", "myCollectionDeleteConfirm", "Delete Collection");
    remove.type = "button";
    let deleted = false;
    remove.onclick = () => {
      let remaining;
      let existed;
      try {
        const collections = readCollections();
        remaining = collections.filter(collection => collection.id !== id);
        existed = remaining.length !== collections.length;
        if (existed) localStorage.setItem(userCollectionsKey, JSON.stringify(remaining));
      } catch {
        error.textContent = "Could not delete this collection. Try again.";
        return;
      }
      deleted = true;
      document.dispatchEvent(new window.Event("ydl:collections-changed"));
      personalCatalogSync.changed([id]);
      reconcileSelection(remaining);
      render();
      dialog.close();
      clearTimeout(feedbackTimer);
      feedback.hidden = false;
      feedback.textContent = existed ? "Collection deleted" : "Collection already deleted";
      feedbackTimer = setTimeout(() => {
        feedback.hidden = true;
        feedback.textContent = "";
      }, 3500);
    };
    dialog.addEventListener("close", () => {
      if (!deleted && trigger.isConnected) return trigger.focus();
      const menus = panel.querySelectorAll(".myCollectionMenu summary");
      const next = menus[Math.min(index, menus.length - 1)];
      if (next) next.focus();
      else focusHeading();
    }, {once: true});
    actions.append(cancel, remove);
    dialog.replaceChildren(heading, description, error, actions);
    showAndroidDialog(dialog);
  }
  const sync = () => {
    const selected = new Set(state.selection.map(list => list.url));
    for (const [url, {button, name}] of buttons) {
      const added = selected.has(url);
      button.textContent = added ? "Added" : "Add";
      button.setAttribute("aria-pressed", String(added));
      button.setAttribute("aria-label", (added ? "Remove " : "Add ") + name +
        (added ? " from Your Selection" : " to Your Selection"));
    }
  };
  const render = () => {
    panel.replaceChildren();
    buttons.clear();
    let collections;
    try {
      collections = readCollections();
    } catch {
      panel.append(element("p", "myCollectionsMessage", "Collections are unavailable in this browser."));
      return;
    }
    if (!collections.length) {
      panel.append(element("p", "myCollectionsMessage", "Build your own custom catalog"));
      return;
    }

    for (const [index, {id, name, titles}] of collections.entries()) {
      const card = element("article", "myCollectionCard");
      const top = element("div", "myCollectionTop");
      const add = element("button", "secondary myCollectionAdd");
      add.type = "button";
      const url = "ydl-collection:" + id;
      buttons.set(url, {button: add, name});
      add.onclick = () => toggleList({kind: "user-collection", url, name});
      const actions = element("div", "myCollectionCardActions");
      const menu = element("details", "myCollectionMenu");
      const trigger = element("summary", "", "⋯");
      trigger.setAttribute("aria-label", "Manage " + name);
      const remove = element("button", "myCollectionMenuDelete", "Delete collection");
      remove.type = "button";
      remove.onclick = () => {
        menu.open = false;
        confirmDeletion({id, name}, trigger, index);
      };
      menu.append(trigger, remove);
      actions.append(add, menu);
      top.append(element("h2", "", name), actions);
      const strip = element("div", "myCollectionStrip");
      const count = element("span", "myCollectionCount");
      count.append(element("strong", "", String(titles.length)),
        element("span", "", titles.length === 1 ? "title" : "titles"));
      for (const title of titles.slice(0, 4)) strip.append(poster(title));
      const countTile = poster(titles[4]);
      countTile.removeAttribute("aria-hidden");
      countTile.classList.add("myCollectionCountTile");
      countTile.append(count);
      strip.append(countTile);
      card.append(top, strip);
      panel.append(card);
    }
    sync();
  };
  window.syncMyCollectionsSelection = sync;
  const reconcileSavedCollections = () => {
    let collections;
    try {
      collections = readCollections();
    } catch {
      return;
    }
    reconcileSelection(collections);
  };
  reconcileSavedCollections();
  window.addEventListener("storage", event => {
    if (event.key !== userCollectionsKey && event.key !== null) return;
    reconcileSavedCollections();
    if (!panel.classList.contains("hidden")) render();
  });
  return tab => {
    panel.classList.toggle("hidden", tab !== "collections");
    if (tab === "collections") render();
    else feedback.hidden = true;
  };
}
