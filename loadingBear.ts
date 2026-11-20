// @ts-nocheck -- serialized into the browser's script in app.ts.
// Shared compact, accessible loading indicator for search, title previews and filmographies.
export const LOADING_BEAR_CSS = `
.ydlLoadingBear{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:12px 12px;min-height:76px;color:#919eaf;font-size:18px;font-weight:400;line-height:1.4;text-align:center;opacity:0;animation:ydlLoadReveal .18s ease .12s forwards}
.ydlLoadingBear .ydlLoadingSpinner{display:block;width:24px;height:24px;flex:none;border:2px solid #34455c;border-top-color:#57bff2;border-radius:50%;animation:ydlLoadSpin .85s linear infinite}
.ydlLoadingBear p{margin:0;color:inherit;font:inherit;overflow-wrap:anywhere}
.quickSearchResults>.ydlLoadingBear{min-height:110px}
@keyframes ydlLoadSpin{to{transform:rotate(360deg)}}
@keyframes ydlLoadReveal{to{opacity:1}}
@media(prefers-reduced-motion:reduce){.ydlLoadingBear{animation:none;opacity:1}.ydlLoadingBear .ydlLoadingSpinner{animation:none}}
`;

export function createLoadingBear(message) {
  const box = document.createElement("div");
  box.className = "ydlLoadingBear";
  box.setAttribute("role", "status");
  box.setAttribute("aria-live", "polite");
  const spinner = document.createElement("span");
  spinner.className = "ydlLoadingSpinner";
  spinner.setAttribute("aria-hidden", "true");
  const text = document.createElement("p");
  text.textContent = String(message || "Loading...");
  box.append(spinner, text);
  return box;
}
