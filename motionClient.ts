// @ts-nocheck -- installed into the setup page's browser scope.
// Subtle, quick motion in the spirit of Letterboxd: a gliding bottom-bar highlight, a short fade between
// tabs, posters that fade in as they load, and a small check "pop" when something turns Added.
// Screen and sheet slides are pure CSS (catalogShelves.css). Everything here is skipped when the phone
// asks for reduced motion.
export function installMotion() {
  const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  // Motion is an enhancement: browsers without these APIs simply skip it.
  const Watch = window.MutationObserver || globalThis.MutationObserver;
  const Resize = window.ResizeObserver || globalThis.ResizeObserver;

  // Posters fade in once loaded (CSS hides poster images until they carry ydlLoaded).
  const markLoaded = event => {
    if (event.target?.tagName === "IMG") event.target.classList.add("ydlLoaded");
  };
  document.addEventListener("load", markLoaded, true);
  document.addEventListener("error", markLoaded, true);
  for (const image of document.images || []) if (image.complete) image.classList.add("ydlLoaded");
  // Images that finished loading before they were added to the page (like title logos) never send a
  // load event the page can hear, so mark those as soon as they appear.
  const markAdded = node => {
    if (node.nodeType !== 1) return;
    const images = node.tagName === "IMG" ? [node] : node.querySelectorAll?.("img") || [];
    for (const image of images) if (image.complete && image.naturalWidth) image.classList.add("ydlLoaded");
  };

  // The bottom bar's blue highlight glides to the selected tab, and the page fades in.
  const nav = document.querySelector(".androidBottomNav");
  if (nav && Watch) {
    const indicator = document.createElement("span");
    indicator.className = "androidNavIndicator";
    indicator.setAttribute("aria-hidden", "true");
    nav.prepend(indicator);
    nav.classList.add("hasIndicator");
    let active = null;
    const place = () => {
      const icon = nav.querySelector(".androidNavItem.active .androidNavIcon");
      if (!icon || !icon.getBoundingClientRect) {
        indicator.hidden = true;
        return;
      }
      const box = icon.getBoundingClientRect(), frame = nav.getBoundingClientRect();
      if (!box.width) return;
      indicator.hidden = false;
      indicator.style.width = box.width + "px";
      indicator.style.height = box.height + "px";
      indicator.style.transform = "translate(" + (box.left - frame.left) + "px," + (box.top - frame.top) + "px)";
    };
    const update = () => {
      const now = nav.querySelector(".androidNavItem.active");
      if (now !== active) {
        const first = active === null;
        active = now;
        if (!first && !reduced()) document.querySelector("main.shell")?.animate?.(
          [{opacity: 0.35}, {opacity: 1}], {duration: 180, easing: "cubic-bezier(.2,0,0,1)"});
      }
      place();
    };
    new Watch(update).observe(nav, {subtree: true, attributes: true, attributeFilter: ["class"]});
    window.addEventListener("resize", place);
    if (Resize) new Resize(place).observe(nav);
    update();
    // Glide only after the first placement, so the highlight never flies in from the corner.
    const frame = window.requestAnimationFrame || (callback => setTimeout(callback, 16));
    frame(() => frame(() => nav.classList.add("indicatorReady")));
  }

  // A short pop on the check when a tapped Add button turns Added (not when a page first renders).
  let lastTap = 0;
  document.addEventListener("click", () => { lastTap = Date.now(); }, true);
  if (Watch) new Watch(records => {
    for (const record of records) for (const node of record.addedNodes) markAdded(node);
  }).observe(document.body, {subtree: true, childList: true});
  if (Watch) new Watch(records => {
    if (reduced() || Date.now() - lastTap > 1500) return;
    for (const {target, oldValue} of records) {
      if (!target.classList?.contains("discoverAddPill") || !target.classList.contains("is-added")) continue;
      if (String(oldValue || "").split(" ").includes("is-added")) continue;
      target.classList.remove("ydlPop");
      void target.offsetWidth;
      target.classList.add("ydlPop");
      setTimeout(() => target.classList.remove("ydlPop"), 400);
    }
  }).observe(document.body, {subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true});
}
