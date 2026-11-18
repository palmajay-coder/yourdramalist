export const stickyLoveDemo = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Our Sticky Love · Trailer preview</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#111522;color:#f3f4fb;font:16px system-ui}
main{max-width:940px;margin:auto;padding:20px}a{color:#bddbff}
.hero{position:relative;aspect-ratio:16/9;min-height:200px;margin-top:16px;overflow:hidden;border-radius:16px;background:linear-gradient(135deg,#372944,#131926)}
.hero img,.hero iframe,.player{position:absolute;inset:0;width:100%;height:100%;border:0}.hero img{object-fit:cover}
h1{margin:.6em 0 .2em;font-size:clamp(28px,6vw,54px)}p{color:#c4cbe0}
.actions{display:flex;gap:10px;flex-wrap:wrap}button{font:inherit;color:inherit;background:#222b40;border:1px solid #65708b;border-radius:99px;padding:8px 14px;cursor:pointer}
</style></head>
<body><main><a href="/setup/lists">← Discover</a>
<div class="hero"><img id="backdrop" alt="" hidden></div>
<h1>Our Sticky Love</h1><p>2026 · South Korea</p>
<div class="actions"><button id="play">Try autoplay</button><button id="still">Show static backdrop</button></div>
<p id="status" role="status">Loading artwork…</p>
<a id="trailer" href="https://www.youtube.com/watch?v=m3ZfkoEZx4o" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a>
</main><script>
const hero = document.querySelector('.hero');
const status = document.querySelector('#status');
const still = document.querySelector('#still');
let videoId = 'm3ZfkoEZx4o';
let player, mount, timer, cancelReady;
let attempt = 0;
function fallback(message) {
  attempt++;
  clearTimeout(timer);
  if (cancelReady) cancelReady();
  player?.destroy();
  mount?.remove();
  player = mount = cancelReady = undefined;
  status.textContent = message;
}
function play() {
  fallback('Trying muted autoplay…');
  const run = attempt;
  timer = setTimeout(() => fallback('Autoplay did not start. Showing the static backdrop.'), 7000);
  const start = () => {
    if (run !== attempt) return;
    const iframe = document.createElement('iframe');
    mount = iframe;
    iframe.title = 'Our Sticky Love trailer';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.src = 'https://www.youtube.com/embed/' + videoId + '?enablejsapi=1&playsinline=1&origin=' + encodeURIComponent(location.origin);
    hero.append(iframe);
    player = new YT.Player(iframe, {events:{
      onReady: ({target}) => { if (run === attempt) { target.mute(); target.playVideo(); } },
      onStateChange: ({data}) => {
        if (run !== attempt) return;
        if (data === YT.PlayerState.PLAYING) {
          clearTimeout(timer);
          status.textContent = 'Trailer playing. It starts muted.';
        }
        if (data === YT.PlayerState.ENDED) fallback('Trailer ended. Showing the static backdrop.');
      },
      onAutoplayBlocked: () => { if (run === attempt) fallback('Autoplay was blocked. Showing the static backdrop.'); },
      onError: () => { if (run === attempt) fallback('The trailer cannot play here. Showing the static backdrop.'); }
    }});
  };
  if (window.YT?.Player) start();
  else window.onYouTubeIframeAPIReady = start;
  cancelReady = () => { if (window.onYouTubeIframeAPIReady === start) window.onYouTubeIframeAPIReady = null; };
  if (!document.querySelector('#youtube-api')) {
    const script = document.createElement('script');
    script.id = 'youtube-api';
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.append(script);
  }
}
document.querySelector('#play').onclick = play;
still.onclick = () => fallback('Showing the static backdrop.');
const initial = attempt;
const query = new URLSearchParams({
  url:'https://mydramalist.com/786728-this-sucky-love',view:'discover',title:'Our Sticky Love',year:'2026',type:'Drama'
});
fetch('/api/mdl/drama-details?' + query, {signal:AbortSignal.timeout(6000)})
  .then(response => response.json()).then(data => {
    if (data.backdrop) {
      const img = document.querySelector('#backdrop');
      img.onload = () => { img.hidden = false; };
      img.src = data.backdrop;
    }
    const match = data.trailer?.match(/v=([A-Za-z0-9_-]{11})$/);
    if (match) {
      videoId = match[1];
      document.querySelector('#trailer').href = 'https://www.youtube.com/watch?v=' + videoId;
    }
  }).catch(() => {}).finally(() => {
    if (attempt !== initial) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) fallback('Showing the static backdrop for reduced motion.');
    else play();
  });
</script></body></html>`;
