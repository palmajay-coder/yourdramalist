// @ts-nocheck -- installed into the setup page's browser scope.
export function installCollectionPicker() {
  const element = (tag, className = "", label = "") => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = label;
    return node;
  };
  const button = (label, className = "") => {
    const node = element("button", className, label);
    node.type = "button";
    return node;
  };
  const poster = (source, className = "") => {
    const frame = element("span", "collectionPickerPoster " + className);
    frame.setAttribute("aria-hidden", "true");
    if (source) {
      const image = element("img");
      image.alt = "";
      image.src = source;
      image.referrerPolicy = "no-referrer";
      image.onerror = () => image.remove();
      frame.append(image);
    }
    return frame;
  };
  const read = () => {
    const stored = JSON.parse(localStorage.getItem(userCollectionsKey) || "[]");
    if (!Array.isArray(stored)) throw Error("Invalid collection data");
    return stored;
  };

  const dialog = element("dialog", "catalogDialog collectionPicker");
  dialog.setAttribute("aria-labelledby", "collectionPickerHeading");
  document.body.append(dialog);
  const viewport = window.visualViewport;
  const fitViewport = () => {
    if (!viewport) return;
    dialog.style.setProperty("--picker-visible-height", viewport.height + "px");
    dialog.style.setProperty("--picker-visible-bottom",
      Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) + "px");
  };
  dialog.addEventListener("close", () => {
    viewport?.removeEventListener("resize", fitViewport);
    viewport?.removeEventListener("scroll", fitViewport);
  });
  let feedbackTimer;
  let feedback;
  const announce = (parent, message) => {
    clearTimeout(feedbackTimer);
    feedback?.remove();
    feedback = element("div", "collectionPickerSuccess");
    feedback.setAttribute("role", "status");
    parent.append(feedback);
    feedback.textContent = message;
    feedbackTimer = setTimeout(() => feedback.remove(), 3200);
  };

  return (item, returnSurface = document.body) => {
    if (dialog.open) return;
    const title = {url: item.url, name: item.title || item.name, poster: item.poster || null,
      year: item.year || item.date?.slice(0, 4) || item.details?.match(/\b\d{4}\b/)?.[0], type: item.type};
    const header = element("div", "collectionPickerHeader");
    const heading = element("h2", "", "Add to Collection");
    heading.id = "collectionPickerHeading";
    const close = button("×", "secondary collectionPickerClose");
    close.setAttribute("aria-label", "Close");
    close.setAttribute("autofocus", "");
    close.onclick = () => dialog.close();
    const titleInfo = element("div");
    titleInfo.append(element("strong", "", title.name));
    if (title.year) titleInfo.append(element("p", "", title.year));
    const titleCard = element("div", "collectionPickerTitle");
    titleCard.append(poster(title.poster), titleInfo);
    header.append(heading, close, titleCard);

    const form = element("form", "collectionPickerForm");
    const body = element("div", "collectionPickerBody");
    const list = element("div", "collectionPickerList");
    const createSection = element("details", "collectionPickerNew");
    const createSummary = element("summary", "", "+ Create New Collection");
    const nameField = element("input");
    nameField.id = "newCollectionName";
    nameField.maxLength = 80;
    nameField.placeholder = "Collection name";
    nameField.setAttribute("aria-label", "Collection name");
    nameField.enterKeyHint = "done";
    createSection.append(createSummary, nameField);
    const status = element("p", "collectionPickerStatus");
    status.setAttribute("role", "status");
    body.append(list, createSection, status);
    const footer = element("div", "collectionPickerFooter");
    const cancel = button("Cancel", "secondary");
    cancel.onclick = close.onclick;
    const save = element("button", "collectionPickerSave", "Save");
    save.type = "submit";
    footer.append(cancel, save);
    form.append(body, footer);

    const changes = new Map();
    const pendingName = () => createSection.open ? nameField.value.trim() : "";
    const updateSave = () => {
      const count = [...changes.values()].filter(Boolean).length + Number(Boolean(pendingName()));
      const hasRemovals = [...changes.values()].includes(false);
      save.disabled = !count && !hasRemovals;
      save.textContent = hasRemovals ? "Save changes" :
        count ? "Save to " + count + (count === 1 ? " Collection" : " Collections") : "Save";
      status.textContent = "";
    };
    nameField.oninput = updateSave;
    createSection.ontoggle = updateSave;
    try {
      const collections = read();
      if (collections.length) list.append(element("h3", "", "My Collections"));
      for (const collection of collections) {
        const alreadyAdded = collection.titles.some(entry => entry.url === title.url);
        const row = element("label", "collectionPickerRow");
        const artwork = element("span", "collectionPickerStrip");
        const images = collection.titles.filter(entry => entry.poster).slice(0, 3);
        if (!images.length) artwork.append(poster(null));
        for (const entry of images) artwork.append(poster(entry.poster));
        const info = element("span", "collectionPickerRowInfo");
        const count = collection.titles.length;
        const caption = element("small", "", count + (count === 1 ? " title" : " titles"));
        info.append(element("strong", "", collection.name), caption);
        const membership = element("span", "collectionPickerMember", alreadyAdded ? "Already added" : "");
        caption.append(membership);
        const check = element("input");
        check.type = "checkbox";
        check.checked = alreadyAdded;
        check.onchange = () => {
          if (check.checked === alreadyAdded) changes.delete(collection.id);
          else changes.set(collection.id, check.checked);
          membership.textContent = check.checked
            ? (alreadyAdded ? "Already added" : "Will add")
            : (alreadyAdded ? "Will remove" : "");
          updateSave();
        };
        row.append(artwork, info, check);
        list.append(row);
      }
      updateSave();
    } catch {
      status.textContent = "Collections are unavailable in this browser.";
      createSection.hidden = true;
      save.disabled = true;
    }

    form.onsubmit = event => {
      event.preventDefault();
      const name = pendingName();
      if (!changes.size && !name) return;
      try {
        const collections = read();
        if (name && collections.some(collection => collection.name.toLowerCase() === name.toLowerCase())) {
          status.textContent = "A collection with that name already exists.";
          nameField.focus();
          return;
        }
        const targets = collections.filter(collection => changes.has(collection.id));
        if (targets.length !== changes.size) {
          status.textContent = "A collection is no longer available. Reopen the picker to refresh the list.";
          return;
        }
        let added = 0;
        let removed = 0;
        for (const collection of targets) {
          const containsTitle = collection.titles.some(entry => entry.url === title.url);
          if (changes.get(collection.id) && !containsTitle) {
            collection.titles.push(title);
            added++;
          } else if (!changes.get(collection.id) && containsTitle) {
            collection.titles = collection.titles.filter(entry => entry.url !== title.url);
            removed++;
          }
        }
        if (name) {
          collections.push({id: crypto.randomUUID(), name, titles: [title]});
          added++;
        }
        if (added || removed) {
          localStorage.setItem(userCollectionsKey, JSON.stringify(collections));
          personalCatalogSync.changed(changes.keys());
        }
        dialog.close();
        const collectionCount = count => count + (count === 1 ? " collection" : " collections");
        const messages = [];
        if (added) messages.push("Added to " + collectionCount(added));
        if (removed) messages.push("Removed from " + collectionCount(removed));
        announce(returnSurface, messages.join(" · ") || "Collections are up to date");
      } catch {
        status.textContent = "Could not save your collections. Try again.";
      }
    };

    dialog.replaceChildren(header, form);
    fitViewport();
    viewport?.addEventListener("resize", fitViewport);
    viewport?.addEventListener("scroll", fitViewport);
    showAndroidDialog(dialog);
    body.scrollTop = 0;
  };
}
