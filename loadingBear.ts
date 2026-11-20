// @ts-nocheck -- serialized into the browser's script in app.ts.
// Uses the actual approved blue mascot artwork, not an approximate SVG redraw.
// Keep the image URL inside createLoadingBear: app.ts injects the function via .toString().
export const LOADING_BEAR_CSS = `
.ydlLoadingBear{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:min(62vh,440px);padding:24px 16px;text-align:center;opacity:0;animation:ydlBearIn .28s ease .15s forwards}
.ydlLoadingBear .ydlBearArt{display:block;width:clamp(64px,19vw,82px);max-width:82px;height:auto;object-fit:contain;transform-origin:50% 80%;animation:ydlBearSway 3.2s ease-in-out infinite;filter:drop-shadow(0 2px 3px #0002)}
.ydlLoadingBear p{margin:0;max-width:22em;color:#f4f6fa;font-size:clamp(13px,3.6vw,15px);font-weight:400;letter-spacing:.01em;line-height:1.45;overflow-wrap:anywhere}
.ydlBearDots{display:flex;gap:7px;align-items:center;justify-content:center}
.ydlBearDots i{display:block;width:6px;height:6px;border-radius:50%;background:#245782;animation:ydlBearDot 1.2s ease-in-out infinite}
.ydlBearDots i:nth-child(2){animation-delay:.2s}.ydlBearDots i:nth-child(3){animation-delay:.4s}
@keyframes ydlBearIn{to{opacity:1}}
@keyframes ydlBearSway{0%,100%{transform:rotate(-1.4deg) translateY(0)}50%{transform:rotate(1.4deg) translateY(-2px)}}
@keyframes ydlBearDot{0%,60%,100%{background:#245782;transform:scale(1)}20%{background:#58caff;transform:scale(1.15)}}
@media(prefers-reduced-motion:reduce){.ydlLoadingBear{opacity:1;animation:none}.ydlLoadingBear .ydlBearArt,.ydlBearDots i{animation:none}.ydlBearDots i:nth-child(2){background:#58caff}}
`;

export function createLoadingBear(message) {
  const box = document.createElement("div");
  box.className = "ydlLoadingBear";
  box.setAttribute("role", "status");
  box.setAttribute("aria-live", "polite");
  const art = document.createElement("img");
  art.className = "ydlBearArt";
  art.alt = "";
  art.setAttribute("aria-hidden", "true");
  art.width = 82;
  art.height = 87;
  art.decoding = "async";
  art.src = "https://raw.githubusercontent.com/palmajay-coder/yourdramalist/main/assets/ydl-loading-bear.webp";
  const text = document.createElement("p");
  text.textContent = String(message || "Loading");
  const dots = document.createElement("span");
  dots.className = "ydlBearDots";
  dots.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 3; i++) dots.appendChild(document.createElement("i"));
  box.append(art, text, dots);
  return box;
}
