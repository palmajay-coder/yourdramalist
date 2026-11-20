// @ts-nocheck -- createLoadingBear is embedded into the page's browser scope.
// The YourDramaList loading bear: a light-brown bear in blue headphones holding a movie clapperboard, swaying
// gently while three blue dots pulse below a message ("Searching for Wong Kar Wai"). Reusable for any wait:
// put the returned element where the content will appear and replace it when the content arrives.
// Pure SVG and CSS. It fades in after a short pause, so a fast search never flashes it.
export const LOADING_BEAR_CSS = `
.ydlLoadingBear{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;min-height:min(62vh,440px);padding:24px 16px;text-align:center;opacity:0;animation:ydlBearIn .3s ease .15s forwards}
.ydlLoadingBear svg{width:min(52vw,210px);height:auto;overflow:visible}
.ydlLoadingBear p{margin:0;max-width:22em;color:#f4f6fa;font-size:20px;font-weight:700;line-height:1.3;overflow-wrap:anywhere}
.ydlBearBody{transform-box:fill-box;transform-origin:50% 100%;animation:ydlBearSway 2.6s ease-in-out infinite}
.ydlBearEyes{transform-box:fill-box;transform-origin:50% 50%;animation:ydlBearBlink 5.2s ease-in-out infinite}
.ydlBearSparks{animation:ydlBearSpark 2.6s ease-in-out infinite}
.ydlBearDots{display:flex;gap:12px}
.ydlBearDots i{width:13px;height:13px;border-radius:50%;background:#1f4f7d;animation:ydlBearDot 1.2s ease-in-out infinite}
.ydlBearDots i:nth-child(2){animation-delay:.2s}.ydlBearDots i:nth-child(3){animation-delay:.4s}
@keyframes ydlBearIn{to{opacity:1}}
@keyframes ydlBearSway{0%,100%{transform:rotate(-3.5deg)}50%{transform:rotate(3.5deg)}}
@keyframes ydlBearBlink{0%,90%,100%{transform:scaleY(1)}93%{transform:scaleY(.1)}96%{transform:scaleY(1)}}
@keyframes ydlBearSpark{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes ydlBearDot{0%,60%,100%{background:#1f4f7d;transform:scale(1)}20%{background:#4cc3ff;transform:scale(1.18)}}
@media(prefers-reduced-motion:reduce){
 .ydlLoadingBear{animation-duration:.01s}
 .ydlBearBody,.ydlBearEyes,.ydlBearSparks{animation:none}
 .ydlBearDots i{animation-name:ydlBearDotFade}
}
@keyframes ydlBearDotFade{0%,60%,100%{background:#1f4f7d}20%{background:#4cc3ff}}
`;

/** Returns the loading bear with the given message, for example "Searching for Wong Kar Wai". */
export function createLoadingBear(message) {
  const box = document.createElement("div");
  box.className = "ydlLoadingBear";
  box.setAttribute("role", "status");
  box.setAttribute("aria-live", "polite");
  const line = "#1b2333";
  const fur = "#f4bf8f";
  box.innerHTML = `<svg viewBox="0 0 220 214" aria-hidden="true" focusable="false">
<g class="ydlBearSparks" stroke="#4cc3ff" stroke-width="7" stroke-linecap="round">
<path d="M54 22 L60 36"/><path d="M36 40 L48 46"/><path d="M28 62 L42 62"/></g>
<g class="ydlBearBody" stroke="${line}" stroke-width="3.5" stroke-linejoin="round">
<circle cx="74" cy="56" r="17" fill="${fur}"/><circle cx="146" cy="56" r="17" fill="${fur}"/>
<circle cx="74" cy="56" r="8" fill="#e8a27a" stroke="none"/><circle cx="146" cy="56" r="8" fill="#e8a27a" stroke="none"/>
<ellipse cx="110" cy="154" rx="46" ry="34" fill="${fur}"/>
<ellipse cx="110" cy="92" rx="50" ry="43" fill="${fur}"/>
<path d="M60 96 C56 30 164 30 160 96" fill="none" stroke="${line}" stroke-width="15"/>
<path d="M60 96 C56 30 164 30 160 96" fill="none" stroke="#2f62a8" stroke-width="9"/>
<rect x="48" y="76" width="22" height="38" rx="10" fill="#3d7fd6"/><rect x="150" y="76" width="22" height="38" rx="10" fill="#3d7fd6"/>
<rect x="53" y="83" width="7" height="24" rx="3.5" fill="#8fc8ff" stroke="none"/><rect x="160" y="83" width="7" height="24" rx="3.5" fill="#8fc8ff" stroke="none"/>
<ellipse cx="110" cy="106" rx="17" ry="12" fill="#fde3c8" stroke="none"/>
<ellipse cx="84" cy="106" rx="9" ry="6" fill="#f49a9a" stroke="none" opacity=".85"/><ellipse cx="136" cy="106" rx="9" ry="6" fill="#f49a9a" stroke="none" opacity=".85"/>
<g class="ydlBearEyes" fill="none" stroke-width="4" stroke-linecap="round"><path d="M88 94 Q95 85 102 94"/><path d="M118 94 Q125 85 132 94"/></g>
<ellipse cx="110" cy="102" rx="5" ry="3.6" fill="${line}" stroke="none"/>
<path d="M103 108 Q106.5 113 110 108 Q113.5 113 117 108" fill="none" stroke-width="3" stroke-linecap="round"/>
<g transform="translate(0 14)"><rect x="66" y="138" width="88" height="54" rx="8" fill="#1e3a66"/>
<path d="M104 152 L104 178 L126 165 Z" fill="#5cc8ff" stroke="#5cc8ff" stroke-width="5"/>
<g transform="rotate(-9 66 136)"><rect x="64" y="118" width="92" height="18" rx="4" fill="#e9eef6"/>
<path d="M76 118 L88 118 L80 136 L68 136 Z M100 118 L112 118 L104 136 L92 136 Z M124 118 L136 118 L128 136 L116 136 Z M148 118 L156 118 L156 120 L152 136 L140 136 Z" fill="#1e3a66" stroke="none"/>
<rect x="64" y="118" width="92" height="18" rx="4" fill="none"/></g>
<ellipse cx="66" cy="128" rx="13" ry="11" fill="${fur}"/><ellipse cx="156" cy="132" rx="13" ry="11" fill="${fur}"/></g>
</g></svg><p></p><span class="ydlBearDots" aria-hidden="true"><i></i><i></i><i></i></span>`;
  box.querySelector("p").textContent = String(message || "Loading");
  return box;
}
