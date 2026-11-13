// @ts-nocheck -- installed into the existing browser scope.
export function installCatalogTitlePreview() {
  const element = (tag, className = "", text = "") => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  };
  const dialog = element("dialog", "catalogDialog catalogTitleDialog");
  dialog.setAttribute("aria-labelledby", "catalogTitlePreviewHeading");
  const close = element("button", "secondary catalogDialogClose", "×");
  close.type = "button";
  close.setAttribute("aria-label", copy.closePreview);
  const content = element("div");
  dialog.append(close, content);
  document.body.append(dialog);
  close.onclick = () => dialog.close();
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
  let pending;
  dialog.addEventListener("close", () => {
    if (!dialog.open) pending?.abort();
  });

  return async item => {
    pending?.abort();
    const controller = new AbortController();
    pending = controller;

    const name = item.title || item.name;
    const heading = element("h2", "", name);
    heading.id = "catalogTitlePreviewHeading";
    const year = item.year || item.date?.slice(0, 4) || item.details?.match(/\b\d{4}\b/)?.[0];
    const type = item.type || item.details?.split(" - ")[0] || (item.kind === "movie" ? "Movie" : item.kind === "tv" ? "Drama" : "");
    const formatType = value => value?.match(/(?:Drama Special|TV Show|Movie|Drama)$/i)?.[0] || value;
    const formatMeta = (mediaType, releaseYear) => [formatType(mediaType), releaseYear].filter(Boolean).join(" · ");
    const meta = element("p", "", formatMeta(type, year));
    const score = element("div", "catalogTitleScore");
    const popularity = element("p");
    popularity.hidden = true;
    const info = element("div", "catalogTitleInfo");
    info.append(heading, meta, score, popularity);
    const header = element("div", "catalogTitleHeader");
    if (item.poster) {
      const image = element("img", "catalogTitleArtwork");
      image.src = item.poster;
      image.alt = "";
      image.referrerPolicy = "no-referrer";
      header.append(image);
    }
    header.append(info);
    const synopsis = element("p", "dramaSynopsis");
    renderSynopsis(synopsis, item.overview);
    synopsis.hidden = !synopsis.textContent;
    content.replaceChildren(header, synopsis);

    if (compactAndroid) showAndroidDialog(dialog);
    else if (!dialog.open) dialog.showModal();
    try {
      // Saved weekly picks have a TMDB ID and media kind, but no URL.
      const isTmdbTitle = (item.kind === "tv" || item.kind === "movie") && /^[1-9]\d{0,9}$/.test(String(item.id));
      const url = item.url || (isTmdbTitle ? "https://www.themoviedb.org/" + item.kind + "/" + item.id : "");
      if (!url) throw Error("Title source unavailable");
      const endpoint = "/api/mdl/drama-details?url=" + encodeURIComponent(url);
      const lookup = async () => {
        const response = await fetch(endpoint, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(22000)]),
        });
        if (!response.ok) throw Error("Title details unavailable");
        return response.json();
      };
      let details = await lookup();
      if (details.status === "retry" && !controller.signal.aborted) details = await lookup();
      if (controller.signal.aborted || !dialog.open) return;
      meta.textContent = formatMeta(details.type || type, details.year || year);
      renderScore(score, details.score);
      if (!score.hasChildNodes()) score.textContent = copy.catalogRatingUnavailable;
      if (details.popularity > 0) {
        popularity.textContent = copy.catalogPopularity + " #" + details.popularity.toLocaleString();
        popularity.hidden = false;
      }
      renderSynopsis(synopsis, details.synopsis || item.overview);
      if (["unavailable", "retry"].includes(details.status) && !synopsis.textContent) synopsis.textContent = copy.catalogDetailsUnavailable;
      synopsis.hidden = !synopsis.textContent;
    } catch {
      if (controller.signal.aborted || !dialog.open) return;
      score.textContent = copy.catalogRatingUnavailable;
      if (!synopsis.textContent) synopsis.textContent = copy.catalogDetailsUnavailable;
      synopsis.hidden = false;
    }
  };
}
