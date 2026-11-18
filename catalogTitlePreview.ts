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

  return async (item, {discover = false} = {}) => {
    dialog.classList.toggle("discoverTitlePreview", discover);
    close.textContent = discover ? "Back" : "×";
    close.setAttribute("aria-label", discover ? "Back" : copy.closePreview);
    dialog.scrollTop = 0;
    pending?.abort();
    const controller = new AbortController();
    pending = controller;

    const name = item.title || item.name;
    const heading = element("h2", "", name);
    heading.id = "catalogTitlePreviewHeading";
    let year = item.year || item.date?.slice(0, 4) || item.details?.match(/\b\d{4}\b/)?.[0];
    let type = item.type || item.details?.split(" - ")[0] || (item.kind === "movie" ? "Movie" : item.kind === "tv" ? "Drama" : "");
    const formatType = value => value?.match(/(?:Drama Special|TV Show|Movie|Drama)$/i)?.[0] || value;
    const formatMeta = (mediaType, releaseYear) => [formatType(mediaType), releaseYear].filter(Boolean).join(" · ");
    const meta = element("p", "", formatMeta(type, year));
    const score = element("div", "catalogTitleScore");
    const popularity = element("p");
    popularity.hidden = true;
    const info = element("div", "catalogTitleInfo");
    const genres = element("div", "discoverPreviewGenres");
    info.append(heading, meta, genres, score, popularity);
    const link = (label, href, className = "") => {
      const anchor = element("a", className, label);
      anchor.href = href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      return anchor;
    };
    const header = element("div", "catalogTitleHeader");
    const image = element("img", "catalogTitleArtwork");
    if (item.poster) {
      image.src = item.poster;
      image.alt = "";
      image.referrerPolicy = "no-referrer";
      header.append(image);
    }
    header.append(info);
    const synopsis = element("p", "dramaSynopsis");
    renderSynopsis(synopsis, item.overview);
    synopsis.hidden = !synopsis.textContent;
    const body = element("div", "discoverPreviewBody");
    const tagline = element("p", "discoverPreviewTagline");
    const facts = element("p", "discoverPreviewFacts");
    const actions = element("div", "discoverPreviewActions");
    const mdlUrl = /^https:\/\/mydramalist\.com\/\d+-[a-z0-9-]+$/i.test(item.url || "") ? item.url : "";
    const backdrop = element("img", "discoverPreviewBackdrop");
    backdrop.alt = "";
    backdrop.hidden = true;
    if (discover) {
      header.prepend(backdrop);
      const add = makeDiscoverTitleAdd(item, "preview", setSaving =>
        openCollectionPicker({...item, type, year, poster: image.getAttribute("src") || item.poster}, dialog, setSaving));
      actions.append(add);
      if (mdlUrl) actions.append(link("Open in MyDramaList", mdlUrl));
      body.append(actions, element("h3", "", "Story"), tagline, synopsis, facts);
      content.replaceChildren(header, body);
    } else {
      content.replaceChildren(header, synopsis);
    }

    showAndroidDialog(dialog);
    dialog.scrollTop = 0;
    try {
      // Saved weekly picks have a TMDB ID and media kind, but no URL.
      const isTmdbTitle = (item.kind === "tv" || item.kind === "movie") && /^[1-9]\d{0,9}$/.test(String(item.id));
      const url = item.url || (isTmdbTitle ? "https://www.themoviedb.org/" + item.kind + "/" + item.id : "");
      if (!url) throw Error("Title source unavailable");
      const endpoint = "/api/mdl/drama-details?url=" + encodeURIComponent(url) + (discover ? "&" + new URLSearchParams({
        view: "discover", title: name, year: String(year || ""), type: type || "",
      }) : "");
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
      year = details.year || year;
      type = details.type || type;
      meta.textContent = formatMeta(type, year);
      if (discover) {
        const runtime = details.duration || (details.runtime ? details.runtime + " min" : "");
        meta.textContent = [details.year || year, details.country, runtime].filter(Boolean).join(" · ");
        for (const genre of details.genres || []) genres.append(element("span", "", genre));
        if (details.poster) {
          const poster = new Image();
          poster.onload = () => {
            if (controller.signal.aborted) return;
            image.src = details.poster;
            if (!image.parentNode) header.insertBefore(image, info);
          };
          poster.src = details.poster;
        }
        if (details.backdrop) {
          backdrop.src = details.backdrop;
          backdrop.hidden = false;
          backdrop.onerror = () => { backdrop.hidden = true; };
        }
        if (details.backdrop && details.trailer && mdlUrl.endsWith("/786728-this-sucky-love")
          && new URLSearchParams(location.search).has("trailer-preview")
          && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
          const videoId = new URL(details.trailer).searchParams.get("v");
          if (/^[a-zA-Z0-9_-]{11}$/.test(videoId || "")) {
            const media = element("div", "discoverTrailerMedia");
            media.hidden = true;
            const frame = element("iframe");
            frame.title = name + " trailer";
            frame.allow = "autoplay; encrypted-media; picture-in-picture";
            frame.allowFullscreen = true;
            frame.referrerPolicy = "strict-origin-when-cross-origin";
            frame.src = "https://www.youtube.com/embed/" + videoId
              + "?enablejsapi=1&playsinline=1&origin=" + encodeURIComponent(location.origin);
            media.append(frame);
            header.before(media);
            let player;
            let timer;
            const fallback = () => {
              clearTimeout(timer);
              media.remove();
              header.classList.remove("trailerPlaying");
              player?.destroy();
              player = undefined;
            };
            controller.signal.addEventListener("abort", fallback, {once: true});
            timer = setTimeout(fallback, 8000);
            const start = () => {
              if (!media.isConnected || controller.signal.aborted) return;
              player = new window.YT.Player(frame, {events: {
                onReady: ({target}) => { target.mute(); target.playVideo(); },
                onStateChange: ({data}) => {
                  if (!media.isConnected) return;
                  if (data === window.YT.PlayerState.PLAYING) {
                    clearTimeout(timer);
                    media.hidden = false;
                    header.classList.add("trailerPlaying");
                  }
                  if (data === window.YT.PlayerState.ENDED) fallback();
                },
                onAutoplayBlocked: fallback,
                onError: fallback,
              }});
            };
            if (window.YT?.Player) start();
            else {
              window.onYouTubeIframeAPIReady = start;
              if (!document.getElementById("discoverYouTubeApi")) {
                const script = element("script");
                script.id = "discoverYouTubeApi";
                script.src = "https://www.youtube.com/iframe_api";
                document.head.append(script);
              }
            }
          }
        }
        if (details.logo) {
          const logo = element("img", "discoverPreviewLogo");
          logo.alt = name;
          logo.onload = () => { if (!controller.signal.aborted) heading.replaceChildren(logo); };
          logo.src = details.logo;
        }
        tagline.textContent = details.tagline || "";
        facts.textContent = [
          details.seasons && details.seasons + (details.seasons === 1 ? " season" : " seasons"),
          details.episodes && details.episodes + (details.episodes === 1 ? " episode" : " episodes"),
        ].filter(Boolean).join(" · ");
        if (details.titleStatus) {
          const status = ["Ended", "Released"].includes(details.titleStatus) ? "Completed" : details.titleStatus;
          facts.append(element("span", "discoverPreviewStatus", status));
        }
        if (details.cast?.length) {
          const cast = element("div", "discoverPreviewCast");
          for (const person of details.cast) {
            const card = element("div");
            if (person.image) {
              const photo = element("img");
              photo.src = person.image;
              photo.alt = "";
              photo.loading = "lazy";
              card.append(photo);
            }
            card.append(element("strong", "", person.name), element("small", "", person.role || ""));
            cast.append(card);
          }
          cast.tabIndex = 0;
          cast.setAttribute("aria-label", "Cast");
          const castHeading = element("div", "discoverPreviewSectionHead");
          castHeading.append(element("h3", "", "Cast"));
          if (mdlUrl) castHeading.append(link("See All ↗", mdlUrl + "/cast"));
          body.append(castHeading, cast);
        }
        if (details.reviews?.length || Number.isSafeInteger(details.totalReviews)) {
          const reviews = element("section", "discoverPreviewReviews");
          const heading = element("h3", "", "MyDramaList Reviews");
          if (Number.isSafeInteger(details.totalReviews)) {
            const label = details.totalReviews === 1 ? "user" : "users";
            heading.append(element("span", "discoverReviewTotal", " (" + details.totalReviews.toLocaleString() + " " + label + ")"));
          }
          reviews.append(heading);
          for (const review of details.reviews || []) {
            const card = element("article");
            if (review.score) {
              const rating = element("span", "discoverReviewScore");
              const star = element("span", "discoverRatingStar", "★");
              star.setAttribute("aria-hidden", "true");
              rating.append(star, document.createTextNode(review.score + " / 10"));
              card.append(rating);
            }
            if (review.author) card.append(element("small", "", review.author));
            if (review.spoiler) {
              const spoiler = element("details");
              spoiler.append(element("summary", "", "Show spoiler review"), element("strong", "", review.headline), element("p", "", review.body));
              card.append(spoiler);
            } else {
              card.append(element("strong", "", review.headline), element("p", "", review.body));
            }
            if (review.link) card.append(link("Read full review on MyDramaList ↗", review.link));
            reviews.append(card);
          }
          body.append(reviews);
        }
      }
      if (discover && details.score > 0) {
        const star = element("span", "discoverRatingStar", "★");
        star.setAttribute("aria-hidden", "true");
        score.append(star, element("strong", "", Number(details.score).toFixed(1) + " / 10"),
          element("span", "", " · MyDramaList"));
      } else {
        renderScore(score, details.score);
      }
      if (!score.hasChildNodes()) score.textContent = copy.catalogRatingUnavailable;
      if (!discover && details.popularity > 0) {
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
