// @ts-nocheck -- installed into the existing browser scope.
export function installPeopleUI() {
  const compactButtons = new Map();
  function cleanup() {
    compactButtons.clear();
  }
  function sync() {
    for (const [personId, button] of compactButtons) {
      const added = !!selectedFilmography(personId);
      button.textContent = added ? copy.catalogAdded : "Add Filmography";
      button.setAttribute("aria-pressed", String(added));
    }
  }
  const personApi = (url, mode) => "/api/mdl/person?mode=" + mode + "&url=" + encodeURIComponent(url);
  async function json(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(15e3) });
    const data2 = await response.json();
    if (!response.ok) throw Error(data2.error || "MyDramaList lookup failed.");
    return data2;
  }
  function selectedFilmography(personId) {
    return state.selection.find(({ url }) =>
      url === "ydl-filmography:actor:" + personId || url === "ydl-filmography:director:" + personId
    );
  }
  function compactPerson(person) {
    const requestId = listRequest;
    const name = person.displayName || person.name;
    const card = document.createElement("article");
    card.className = "catalogShelf compactCatalogRow";
    const head = document.createElement("div");
    head.className = "catalogShelfHead";
    const identity = document.createElement("div");
    identity.className = "compactPersonIdentity";
    const title = document.createElement("h3");
    title.textContent = name;
    if (person.poster) {
      const photo = document.createElement("img");
      photo.className = "compactPersonPhoto";
      photo.alt = "";
      photo.src = person.poster;
      photo.loading = "lazy";
      photo.decoding = "async";
      photo.referrerPolicy = "no-referrer";
      identity.append(photo);
    }
    const add = document.createElement("button");
    add.type = "button";
    add.className = "secondary catalogAdd";
    add.setAttribute("aria-label", "Add or remove filmography for " + name);
    compactButtons.set(person.id, add);
    const status = document.createElement("p");
    status.className = "catalogShelfStatus";
    status.setAttribute("role", "status");
    status.hidden = true;
    identity.append(title);
    head.append(identity, add);
    card.append(head, status);

    function showStatus(message) {
      status.textContent = message;
      status.hidden = !message;
    }
    add.onclick = async () => {
      const selected = selectedFilmography(person.id);
      if (selected) {
        toggleList(selected);
        return;
      }
      add.disabled = true;
      showStatus(copy.loadingLists);
      try {
        const details = person.enriched ? person : (await json(personApi(person.url, "actor"))).person;
        if (requestId !== listRequest || !card.isConnected) return;
        if (!details.actorCount && !details.directorCount) {
          showStatus("No filmography credits found.");
          return;
        }
        // Keep existing catalog identities and use the larger body of credits for people with both roles.
        const mode = details.directorCount > details.actorCount ? "director" : "actor";
        const result = await json("/api/mdl/filmography?mode=" + mode + "&url=" + encodeURIComponent(person.url));
        if (requestId !== listRequest || !card.isConnected) return;
        if (!result.items.length) {
          showStatus("No filmography credits found.");
          return;
        }
        if (!selectedFilmography(person.id)) {
          toggleList({ ...result.list, posters: [], analyticsSource: "discover-" + mode + "-filmography" });
        }
        showStatus("");
      } catch {
        if (requestId === listRequest && card.isConnected) showStatus(copy.popularUnavailable);
      } finally {
        add.disabled = false;
      }
    };
    return card;
  }
  function renderMatches(data2) {
    cleanup();
    const mode = data2.mode;
    const results = $("listItems");
    const titles = data2.titles || [];
    results.replaceChildren();
    $("results").textContent = titles.length || data2.people.length ? "" : "No matches found. Try another search.";
    if (data2.warning) $("results").append(document.createTextNode(" · " + data2.warning));
    if (titles.length) {
      const section = document.createElement("section");
      const heading = document.createElement("h3");
      heading.className = "catalogSectionTitle";
      heading.textContent = "Dramas and movies";
      const track = document.createElement("div");
      track.className = "discoverTitleRows";
      for (const item of titles) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "discoverTitleIdentity";
        const row = document.createElement("article");
        row.className = "catalogShelf discoverTitleRow";
        const artwork = document.createElement(item.poster ? "img" : "span");
        if (item.poster) {
          artwork.src = item.poster;
          artwork.alt = "";
          artwork.loading = "lazy";
          artwork.referrerPolicy = "no-referrer";
          artwork.addEventListener("error", () => {
            const blank = document.createElement("span");
            blank.className = "shelfPosterBlank";
            artwork.replaceWith(blank);
          }, { once: true });
        } else {
          artwork.className = "shelfPosterBlank";
          artwork.setAttribute("aria-hidden", "true");
        }
        const title = document.createElement("strong");
        title.textContent = item.name;
        button.append(artwork, title);
        button.onclick = () => showCatalogTitle(item, {discover: true});
        const add = document.createElement("button");
        add.type = "button";
        add.className = "secondary discoverTitleAdd";
        add.textContent = "+ Add to Collection";
        add.onclick = () => openCollectionPicker(item);
        row.append(button, add);
        track.append(row);
      }
      section.append(heading, track);
      results.append(section);
    }
    if (data2.people.length && (titles.length || data2.query)) {
      const heading = document.createElement("h3");
      heading.className = "catalogSectionTitle";
      heading.textContent = "Actors and directors";
      results.append(heading);
    }
    for (const person of data2.people) results.append(compactPerson(person));
    sync();
    if (data2.page > 1 || data2.hasNextPage) {
      const nav = document.createElement("nav");
      nav.className = "searchPages";
      nav.setAttribute("aria-label", "Discover search result pages");
      for (const step of [-1, 1]) {
        if (step === -1 && data2.page === 1 || step === 1 && !data2.hasNextPage) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary";
        button.textContent = step === -1 ? "Previous matches" : "More matches";
        button.onclick = () => search(data2.query, data2.page + step, mode);
        nav.append(button);
      }
      $("listItems").append(nav);
    }
  }
  async function search(query2, page3 = 1, mode = state.filter) {
    cleanup();
    const requestId = ++listRequest;
    $("listItems").replaceChildren();
    $("results").textContent = "";
    try {
      const data2 = await json("/api/mdl/people-search?mode=" + mode + "&q=" + encodeURIComponent(query2) + "&page=" + page3);
      if (requestId !== listRequest) return;
      renderMatches(data2);
    } catch (e) {
      if (requestId === listRequest) $("results").textContent = "Unable to search Discover: " + (["TimeoutError", "AbortError"].includes(e.name) ? "This request took too long. Please try again." : e.message);
    }
  }
  async function fromUrl(raw, mode = state.filter) {
    cleanup();
    const requestId = ++listRequest;
    $("listItems").replaceChildren();
    $("results").textContent = "";
    try {
      const data2 = await json(personApi(raw, mode));
      if (requestId !== listRequest) return;
      renderMatches({ mode, people: [{ ...data2.person, enriched: true }], page: 1, hasNextPage: false });
      if (data2.warning) $("results").append(document.createTextNode(" \xB7 " + data2.warning));
    } catch (e) {
      if (requestId === listRequest) $("results").textContent = "Unable to load person: " + (["TimeoutError", "AbortError"].includes(e.name) ? "This request took too long. Please try again." : e.message);
    }
  }
  return { search, fromUrl, cleanup, sync, reset: cleanup };
}
