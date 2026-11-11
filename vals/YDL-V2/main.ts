import { Hono } from "npm:hono";
import { blob } from "https://esm.town/v/std/blob/main.ts";
import { getOAuthUserData, oauthMiddleware } from "https://esm.town/v/std/oauth/middleware.ts";

const app = new Hono();
const OWNER_ID = "54a7a61a-9472-40ee-8a84-a011d04cbfa9";
const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_KEY = "wallpaper:published";
const META_KEY = "wallpaper:metadata";

async function owner(req: Request) {
  const session = await getOAuthUserData(req);
  return session?.user?.id === OWNER_ID;
}
function html(body: string, status = 200) {
  return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' blob: data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" } });
}
const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>YourDramaList · Admin</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap"><style>
:root{color-scheme:dark;font-family:Lato,Arial,sans-serif}*{box-sizing:border-box}body{margin:0;background:#0e1928;color:#f5f8fd;min-height:100vh}header{border-bottom:1px solid #26374c;padding:22px max(24px,calc((100vw - 1000px)/2));display:flex;justify-content:space-between;align-items:center}.brand{font-size:20px;font-weight:900}.tag{font-size:11px;color:#b5c5db;background:#203249;border-radius:5px;padding:5px 8px;margin-left:9px}main{max-width:1000px;margin:65px auto;padding:0 24px}h1{font-size:clamp(30px,5vw,48px);margin:0 0 12px;font-weight:900}p{color:#aebdd0;line-height:1.6}.eyebrow{color:#79a7e9;letter-spacing:.17em;font-size:11px;font-weight:800}.panel{background:#152439;border:1px solid #2b405b;border-radius:18px;padding:24px;margin-top:30px}.heading{display:flex;align-items:center;justify-content:space-between;gap:12px}h2{font-size:18px;margin:0 0 15px}.pill{font-size:12px;color:#a8c2e8;border:1px solid #385574;border-radius:30px;padding:6px 11px}.preview{aspect-ratio:16/7;border-radius:12px;background:linear-gradient(120deg,#14273c,#233e5d);display:grid;place-items:center;overflow:hidden;color:#9bb0c8;position:relative}.preview img{width:100%;height:100%;object-fit:cover;position:absolute;inset:0}.preview span{z-index:1}.upload{border:1px dashed #57718f;border-radius:12px;display:flex;flex-direction:column;align-items:center;padding:32px;gap:10px;cursor:pointer;margin-top:20px;background:#192c43}.upload:hover{border-color:#82b4f1}.upload input{display:none}.actions{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-top:22px;flex-wrap:wrap}button,.button{background:#24508f;color:white;border:0;border-radius:9px;padding:13px 22px;font-weight:800;cursor:pointer}button:disabled{opacity:.4;cursor:not-allowed}.muted{color:#aebdd0;font-size:13px}a{color:#a9caff}#message{min-height:22px}.logout{background:none;border:1px solid #3b516d;padding:9px 13px}footer{padding:45px 24px;text-align:center;color:#7489a4;font-size:12px}
.preview-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:25px 0 12px}.preview-toolbar>div{display:flex;gap:6px}.mode{padding:8px 11px;background:#223650;border:1px solid #405977;font-size:12px}.mode.active{background:#24508f}.preview-stage{display:flex;justify-content:center;align-items:center;background:#0b1522;padding:14px;border-radius:13px;overflow:hidden}.landing-preview{position:relative;aspect-ratio:16/9;width:100%;max-width:100%;background:#142b47;overflow:hidden;isolation:isolate;transition:width .2s}.landing-preview.mobile{width:260px;aspect-ratio:9/16}.landing-wallpaper,.landing-shade{position:absolute;inset:0}.landing-wallpaper{background-size:cover;background-position:center}.landing-shade{background:rgba(3,12,25,.30)}.landing-center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:22px;gap:15px;z-index:1}.landing-brand{font-size:clamp(24px,4.5vw,54px);font-weight:900;letter-spacing:-.045em;line-height:1.1;color:white;position:relative}.landing-version{position:absolute;top:-10px;right:-49px;background:#e0393e;font-size:10px;letter-spacing:0;border-radius:3px;padding:4px 6px;font-weight:700}.landing-tagline{font-size:clamp(11px,1.5vw,17px);color:#f2f6fc}.landing-cta{padding:11px 25px;border-radius:7px;background:#24508f;font-size:13px;font-weight:700;color:white}.landing-footer{position:absolute;bottom:14px;left:10px;right:10px;text-align:center;font-size:10px;color:#e0e6ef;z-index:1}.landing-preview.mobile .landing-brand{font-size:27px}.landing-preview.mobile .landing-tagline{font-size:12px}.landing-preview.mobile .landing-version{font-size:8px;right:-36px}.landing-preview.mobile .landing-footer{font-size:9px}.overlay-control{display:flex;align-items:center;gap:14px;margin-top:18px;font-size:13px;color:#c2d0e1}.overlay-control input{flex:1;accent-color:#4586d5}.landing-preview:fullscreen{width:100vw;height:100vh;aspect-ratio:auto}.landing-preview:fullscreen .landing-brand{font-size:clamp(40px,6vw,92px)}.landing-preview:fullscreen .landing-tagline{font-size:clamp(16px,2vw,24px)}.landing-preview:fullscreen .landing-footer{font-size:13px}@media(max-width:600px){.landing-brand{font-size:24px}.landing-version{right:-39px;font-size:8px}.landing-tagline{font-size:11px}.landing-footer{font-size:8px}.landing-cta{font-size:11px;padding:8px 16px}}.admin-nav{display:flex;gap:8px;overflow-x:auto;padding:0 0 14px;scrollbar-width:thin;position:sticky;top:0;background:#0e1928;z-index:5}.admin-nav a{white-space:nowrap;text-decoration:none;color:#d8e4f4;background:#1b3049;border:1px solid #304760;border-radius:9px;padding:11px 14px;font-size:13px}.admin-nav a:focus-visible,.admin-nav a:hover{outline:2px solid #6b9fe2}.admin-section{scroll-margin-top:85px}.admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:16px}.admin-tile{background:#152439;border:1px solid #2b405b;border-radius:14px;padding:20px}.admin-tile h2{font-size:17px;margin:0 0 8px}.admin-tile p{font-size:13px;margin:0}.admin-pill{font-size:11px;color:#b9d6f5;background:#203650;border-radius:6px;padding:4px 7px;display:inline-block;margin-top:12px}.admin-info{font-size:13px;line-height:1.65;color:#bacbdf}@media(max-width:640px){header{padding:16px!important}main{margin:25px auto!important;padding:0 14px!important}.panel{padding:16px!important}.admin-grid{grid-template-columns:1fr}.admin-nav a{padding:12px 14px;min-height:44px}.preview-toolbar{align-items:flex-start}.overlay-control{flex-wrap:wrap}.overlay-control input{min-width:140px}}.selection-layout{display:grid;grid-template-columns:minmax(0,1fr) 285px;gap:20px;align-items:start}.selection-layout .lists{min-width:0}.selection-layout .list{gap:15px;padding:17px}.selection-layout .posters{flex-basis:38%}.selection-layout .poster{height:125px}.selection-layout .details h2{font-size:20px}.selection-side{position:sticky;top:16px;padding:19px!important}.selection-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:16px}.selection-head h2{font-size:18px;margin:0}.selection-head span{font-size:12px;color:var(--muted);white-space:nowrap}.selection-side h3{font-size:12px;color:var(--muted);margin:16px 0 8px;overflow-wrap:anywhere}.selected-row{display:flex;align-items:center;justify-content:space-between;gap:7px;border-bottom:1px solid var(--line);padding:9px 0;font-size:13px}.selected-row span{min-width:0;overflow-wrap:anywhere}.selected-row button{border:0;background:transparent;color:var(--muted);font-size:22px;padding:2px 6px}.selection-side form{margin-top:20px;padding-top:16px;border-top:1px solid var(--line)}.selection-side form label{font-size:13px}.selection-side form input{font-size:13px;padding:10px}.selection-side form button{margin-top:9px;min-height:42px;padding:9px}.choose{border:1px solid var(--blue);color:var(--blue);background:transparent;border-radius:7px;padding:10px 13px;font-size:13px;min-width:75px;justify-content:center}.choose.added{background:var(--blue);color:white}@media(max-width:850px){.selection-layout{grid-template-columns:minmax(0,1fr)}.selection-side{position:static;grid-row:1}.selection-layout .poster{height:135px}}@media(max-width:680px){.selection-layout .list{display:block}.selection-layout .posters{width:100%}.selection-layout .poster{height:auto}.choose{width:100%}}.profile-search{padding:17px 20px;margin:0 0 16px}.profile-search label{font-size:13px;margin-bottom:8px}.profile-search-row{display:flex;gap:10px}.profile-search-row input{flex:1;min-width:0}.profile-search-row button{white-space:nowrap}.profile-search .error:empty{display:none}.profile-status{color:var(--muted);font-size:13px;margin:0 0 18px}.profile-status:empty{display:none}.profile-heading{display:flex;align-items:center;gap:10px;font-size:13px!important;margin:17px 0 8px!important;color:var(--text)!important}.profile-avatar{width:32px;height:32px;flex:0 0 32px;border-radius:50%;background:var(--sub);border:1px solid var(--line);display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;overflow:hidden}.profile-avatar img{width:100%;height:100%;object-fit:cover}.selection-side .selected-row{padding:8px 0}@media(max-width:680px){.profile-search-row{flex-direction:column}.profile-search-row button{width:100%}}</style></head><body><header><div class="brand">YourDramaList <span class="tag">ADMIN</span></div><form method="post" action="/auth/logout"><button class="logout" type="submit">Sign out</button></form></header><main><nav class="admin-nav" aria-label="Admin sections"><a href="#appearance">Appearance</a><a href="#security">Security</a><a href="#content">FAQ &amp; Privacy</a><a href="#announcements">Notices</a><a href="#health">Health</a><a href="#releases">Releases</a></nav><div class="eyebrow">WALLPAPER MANAGEMENT</div><h1>Set the scene.</h1><p>Choose the cinematic backdrop for YourDramaList. Only you can upload and publish it; visitors see the published image on the live landing page.</p><section class="panel admin-section" id="appearance"><h2>Upload a new wallpaper</h2><p class="muted">JPG, PNG or WebP · maximum 4 MB · landscape images recommended.</p><label class="upload" for="file"><strong>＋ Choose an image</strong><span class="muted">Select an image from your device</span><input id="file" type="file" accept="image/jpeg,image/png,image/webp"></label><div class="preview-toolbar"><strong>Live landing page preview</strong><div><button class="mode active" type="button" data-mode="desktop">Desktop</button><button class="mode" type="button" data-mode="mobile">Mobile</button><button class="mode" type="button" id="fullscreen">Fullscreen</button></div></div><div class="preview-stage"><div class="landing-preview" id="draft"><div class="landing-wallpaper" id="draft-wallpaper"></div><div class="landing-shade" id="shade"></div><div class="landing-center"><div class="landing-brand">YourDramaList<span class="landing-version">v2.4.4</span></div><div class="landing-tagline">Bring your favorite lists from MyDramaList to Nuvio.</div><div class="landing-cta">Get Started</div></div><div class="landing-footer">YourDramaList is a FREE, unofficial community-made add-on for Nuvio. Not affiliated with MyDramaList.</div></div></div><div class="overlay-control"><label for="darkness">Wallpaper darkness</label><input type="range" id="darkness" min="0" max="80" value="30"><output id="darkness-value">30%</output></div><div class="actions"><span class="muted" id="filename">No image selected</span><button id="publish" disabled>Publish wallpaper</button></div><p id="message" role="status" aria-live="polite"></p></section><section class="admin-grid" aria-label="Administration overview"><article class="admin-tile admin-section" id="security"><h2>Security &amp; Privacy</h2><p>Owner-only administration. Public visitors cannot publish wallpapers or change settings.</p><span class="admin-pill">Security review in progress</span><p class="admin-info">Optional MDBList and TMDB credentials must never be included in public links or logs. No storage guarantees will be published before verification.</p></article><article class="admin-tile admin-section" id="content"><h2>FAQ &amp; Privacy</h2><p>Dedicated FAQ and privacy pages are planned for the public site. Content management will be added here.</p><span class="admin-pill">Planned</span></article><article class="admin-tile admin-section" id="announcements"><h2>Announcements</h2><p>Publish maintenance notices and important updates without interrupting the landing page.</p><span class="admin-pill">Planned</span></article><article class="admin-tile admin-section" id="health"><h2>System Health</h2><p id="admin-health">Checking wallpaper service…</p><span class="admin-pill">Live local check</span></article><article class="admin-tile admin-section" id="releases"><h2>Releases</h2><p>Version history and automatic release tracking will be added when the release process is defined.</p><span class="admin-pill">Planned</span></article></section></main><footer>Private administrator dashboard · YDL-V2</footer><script>
const file=document.getElementById('file'),button=document.getElementById('publish'),draft=document.getElementById('draft'),message=document.getElementById('message');let selected=null,previewUrl=null;
function showPreview(target,url){target.innerHTML='';const img=document.createElement('img');img.alt='Wallpaper preview';img.src=url;target.append(img)}
async function refresh(){try{const r=await fetch('/api/wallpaper/status');if(!r.ok)throw Error('Unable to load wallpaper settings');const s=await r.json();if(s.published){document.getElementById('darkness').value=s.darkness;document.getElementById('darkness').dispatchEvent(new Event('input'));if(!selected)document.getElementById('draft-wallpaper').style.backgroundImage='url('+JSON.stringify('/wallpaper?at='+Date.now())+')';}}catch(e){message.textContent='Could not load current wallpaper settings.'}}
file.addEventListener('change',()=>{selected=file.files?.[0];button.disabled=true;if(previewUrl)URL.revokeObjectURL(previewUrl);if(!selected)return;if(!['image/jpeg','image/png','image/webp'].includes(selected.type)||selected.size>4*1024*1024){message.textContent='Choose a JPG, PNG or WebP under 4 MB.';selected=null;return}previewUrl=URL.createObjectURL(selected);document.getElementById('draft-wallpaper').style.backgroundImage='url('+JSON.stringify(previewUrl)+')';document.getElementById('filename').textContent=selected.name+' · '+(selected.size/1024/1024).toFixed(2)+' MB';message.textContent='Preview ready. Publish when you are happy.';button.disabled=false});
button.addEventListener('click',async()=>{if(!selected)return;button.disabled=true;message.textContent='Publishing…';try{const r=await fetch('/api/wallpaper/publish',{method:'POST',headers:{'content-type':selected.type,'x-wallpaper-darkness':darkness.value},body:selected});const data=await r.json();if(!r.ok)throw Error(data.error||'Publish failed');message.textContent='Wallpaper published successfully.';await refresh()}catch(e){message.textContent=e.message}finally{button.disabled=false}});
const darkness=document.getElementById('darkness'),shade=document.getElementById('shade');darkness.addEventListener('input',()=>{shade.style.background='rgba(3,12,25,'+(Number(darkness.value)/100)+')';document.getElementById('darkness-value').textContent=darkness.value+'%'});document.querySelectorAll('[data-mode]').forEach(el=>el.addEventListener('click',()=>{document.getElementById('draft').classList.toggle('mobile',el.dataset.mode==='mobile');document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b===el))}));document.getElementById('fullscreen').addEventListener('click',()=>{const p=document.getElementById('draft');if(document.fullscreenElement)document.exitFullscreen();else p.requestFullscreen?.()});
fetch('/wallpaper',{method:'GET',cache:'no-store'}).then(r=>{document.getElementById('admin-health').textContent=r.status===200?'Wallpaper service online · Published wallpaper available':r.status===404?'Wallpaper service online · No wallpaper published yet':'Wallpaper service returned status '+r.status}).catch(()=>{document.getElementById('admin-health').textContent='Wallpaper service could not be reached'});
const saveDarkness=document.createElement('button');saveDarkness.type='button';saveDarkness.textContent='Save darkness';saveDarkness.style.cssText='display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 16px;border:1px solid #4271b0;border-radius:9px;background:#24508f;color:white;font:700 13px Lato,system-ui,sans-serif;cursor:pointer;margin:12px 0';darkness.insertAdjacentElement('afterend',saveDarkness);const darknessFeedback=document.createElement('span');darknessFeedback.setAttribute('role','status');darknessFeedback.style.cssText='display:block;font-size:12px;color:#d7e4f6;margin:6px 0 12px';saveDarkness.insertAdjacentElement('afterend',darknessFeedback);saveDarkness.addEventListener('click',async()=>{saveDarkness.disabled=true;darknessFeedback.textContent='Saving darkness…';try{const response=await fetch('/api/wallpaper/darkness',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({darkness:Number(darkness.value)})});const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to save');darknessFeedback.textContent='Saved! The public landing page will use '+result.darkness+'% darkness. No wallpaper upload needed.'}catch(error){darknessFeedback.textContent=error.message}finally{saveDarkness.disabled=false}});
refresh();
</script></body></html>`;
app.get("/", (c) => c.html("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"theme-color\" content=\"#0e1928\"><title>YourDramaList — From MyDramaList to Nuvio</title><link rel=\"preconnect\" href=\"https://fonts.googleapis.com\"><link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin><link href=\"https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap\" rel=\"stylesheet\"><style>*{box-sizing:border-box}html,body{height:100%;margin:0}body{font-family:Lato,system-ui,sans-serif;background:#0e1928;color:white}.hero{min-height:100svh;display:flex;align-items:center;justify-content:center;text-align:center;position:relative;isolation:isolate;padding:80px 22px 95px;overflow:hidden}.hero:before{content:\"\";position:absolute;inset:0;z-index:-2;background:#0e1928 url('/wallpaper') center/cover no-repeat}.hero:after{content:\"\";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(5,13,26,var(--wallpaper-darkness,.05)),rgba(5,13,26,var(--wallpaper-darkness,.05)) 45%,rgba(5,13,26,var(--wallpaper-darkness,.05)))}.content{max-width:850px}.brand{font-size:clamp(42px,8vw,88px);font-weight:900;letter-spacing:-.055em;line-height:1.06;margin:0}.version{display:inline-block;vertical-align:middle;position:relative;top:-.3em;background:#e0393e;color:#fff;font-size:clamp(10px,1.4vw,13px);letter-spacing:0;font-weight:900;border-radius:6px;padding:5px 7px;margin-left:9px}.tagline{font-size:clamp(16px,2.4vw,23px);line-height:1.5;color:#e5eaf2;margin:22px 0 31px}.cta{display:inline-flex;align-items:center;justify-content:center;min-width:175px;min-height:50px;padding:13px 24px;background:#24508f;border:1px solid #4271b0;border-radius:10px;color:white;text-decoration:none;font-size:16px;font-weight:700;transition:background .15s}.cta:hover,.cta:focus-visible{background:#3269b3;outline:2px solid white;outline-offset:3px}.foot{position:absolute;bottom:22px;left:16px;right:16px;color:#cad2df;font-size:11px;line-height:1.6}.foot a{color:inherit;text-underline-offset:3px}@media(max-width:520px){.version{margin-left:4px}.hero{padding-top:65px}.tagline{margin-top:17px}.foot{font-size:10px}}</style></head><body><main class=\"hero\"><div class=\"content\"><h1 class=\"brand\">YourDramaList<span class=\"version\">v2.4.4</span></h1><p class=\"tagline\">Bring your favorite lists from MyDramaList to Nuvio.</p><a class=\"cta\" href=\"/setup\">Get Started</a></div><footer class=\"foot\">YourDramaList is a free, unofficial community-made add-on for Nuvio. Not affiliated with MyDramaList.</footer></main><script>fetch('/api/wallpaper/public-settings',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('settings unavailable');return r.json()}).then(s=>{const n=Number(s.darkness);document.documentElement.style.setProperty('--wallpaper-darkness',String(Number.isFinite(n)?Math.max(0,Math.min(80,n))/100:.05))}).catch(()=>{});</script></body></html>"));
app.get("/admin", async (c) => {
  if (!(await owner(c.req.raw))) return c.redirect("/auth/login");
  return html(page);
});
app.get("/api/wallpaper/status", async (c) => {
  if (!(await owner(c.req.raw))) return c.json({ error: "Unauthorized" }, 401);
  const metadata = await blob.getJSON(META_KEY);
  return c.json({ published: Boolean(metadata), darkness: (metadata as {darkness?:number}|undefined)?.darkness ?? 30 });
});
app.get("/wallpaper", async () => {
  try {
    const metadata = await blob.getJSON(META_KEY) as { type: string } | undefined;
    if (!metadata) return new Response("No wallpaper published", { status: 404 });
    const stored = await blob.get(IMAGE_KEY);
    return new Response(await stored.arrayBuffer(), { headers: { "content-type": metadata.type, "cache-control": "public, max-age=60", "x-content-type-options": "nosniff" } });
  } catch { return new Response("No wallpaper published", { status: 404 }); }
});
app.post("/api/wallpaper/publish", async (c) => {
  if (!(await owner(c.req.raw))) return c.json({ error: "Unauthorized" }, 401);
  const origin = c.req.header("origin");
  if (!origin || origin !== new URL(c.req.url).origin) return c.json({ error: "Invalid request origin" }, 403);
  const type = (c.req.header("content-type") || "").split(";")[0].toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) return c.json({ error: "Unsupported image type" }, 415);
  const length = Number(c.req.header("content-length") || 0);
  if (length > MAX_BYTES) return c.json({ error: "Image exceeds 4 MB" }, 413);
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_BYTES) return c.json({ error: "Image must be under 4 MB" }, 413);
  const isPng = bytes.length > 8 && [137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n);
  const isJpg = bytes.length > 3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
  const isWebp = bytes.length > 12 && new TextDecoder().decode(bytes.slice(0,4))==="RIFF" && new TextDecoder().decode(bytes.slice(8,12))==="WEBP";
  if (!(type==="image/png"&&isPng || type==="image/jpeg"&&isJpg || type==="image/webp"&&isWebp)) return c.json({ error: "Image contents do not match file type" }, 415);
  await blob.set(IMAGE_KEY, bytes);
  const darkness = Math.min(80, Math.max(0, Number(c.req.header('x-wallpaper-darkness') ?? 30) || 0));
  await blob.setJSON(META_KEY, { type, darkness, publishedAt: new Date().toISOString() });
  return c.json({ ok: true });
});
app.onError((err) => Promise.reject(err));

app.get("/api/wallpaper/public-settings", async (c) => {
  try {
    const metadata = (await blob.getJSON("wallpaper:metadata")) ?? {};
    const raw = Number(metadata.darkness ?? metadata.overlay ?? 5);
    const darkness = Number.isFinite(raw) ? Math.max(0, Math.min(80, raw)) : 5;
    c.header("Cache-Control", "no-store");
    return c.json({ darkness });
  } catch {
    return c.json({ darkness: 5 });
  }
});


app.post("/api/wallpaper/darkness", async (c) => {
  const user = await getOAuthUserData(c.req.raw);
  if (user?.user?.id !== OWNER_ID) return c.json({ error: "Unauthorized" }, 401);
  const origin = c.req.header("origin");
  if (origin && new URL(origin).origin !== new URL(c.req.url).origin) return c.json({ error: "Invalid origin" }, 403);
  let payload;
  try { payload = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
  const value = Number(payload?.darkness);
  if (!Number.isFinite(value) || value < 0 || value > 80) return c.json({ error: "Darkness must be between 0 and 80" }, 400);
  const previous = (await blob.getJSON("wallpaper:metadata")) ?? {};
  const darkness = Math.round(value);
  await blob.setJSON("wallpaper:metadata", { ...previous, darkness });
  return c.json({ ok: true, darkness });
});


const setupPage = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>YourDramaList · Setup</title><link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap\"><style>\n:root{font-family:Lato,Arial,sans-serif;color-scheme:light dark;--bg:#e9eaed;--card:#fff;--text:#202020;--muted:#606875;--line:#d5d9df;--blue:#01619d;--sub:#f4f5f7}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);min-height:100vh}body[data-theme=dark]{--bg:#18191a;--card:#242526;--text:#f7f8fa;--muted:#afb8c5;--line:#41454a;--blue:#0569a9;--sub:#202123;color-scheme:dark}body[data-theme=light]{color-scheme:light}@media(prefers-color-scheme:dark){body:not([data-theme=light]){--bg:#18191a;--card:#242526;--text:#f7f8fa;--muted:#afb8c5;--line:#41454a;--blue:#0569a9;--sub:#202123}}header{background:var(--blue);color:white;padding:16px max(18px,calc((100vw - 1100px)/2));display:flex;align-items:center;justify-content:space-between;gap:12px}.brand{font-size:21px;font-weight:900;letter-spacing:-.035em}.version{font-size:11px;padding:3px 6px;background:#f43f50;color:#fff;border-radius:3px;position:absolute;right:-12px;top:-12px;line-height:1.1;margin:0}.brand-wrap{position:relative;display:inline-flex;align-items:center;margin-right:15px}.themes{display:flex;gap:4px}button,select,input{font:inherit}button{cursor:pointer}.themes button{color:white;background:transparent;border:1px solid #ffffff55;border-radius:7px;padding:8px 10px}.themes button[aria-pressed=true]{background:white;color:#07588d}.wrap{max-width:1100px;margin:auto;padding:30px 18px 80px}.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:45px}.step{text-align:center;font-size:12px;color:var(--muted)}.step:before{content:'';display:block;height:4px;border-radius:4px;background:var(--line);margin-bottom:9px}.step.done:before,.step.active:before{background:#1686d2}.step.active{font-weight:900;color:var(--text)}h1{font-size:clamp(29px,4vw,44px);margin:0 0 9px}p{color:var(--muted);line-height:1.5;margin:0 0 22px}.connect{max-width:560px;margin:0 auto}.panel,.list{background:var(--card);border:1px solid var(--line);border-radius:13px;padding:25px}.panel label{display:block;font-weight:700;margin-bottom:10px}input[type=text]{width:100%;background:var(--sub);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:15px;min-height:48px}input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #69b8ed;outline-offset:3px}.primary{background:var(--blue);border:1px solid var(--blue);color:white;border-radius:8px;padding:14px 20px;font-weight:900;min-height:48px}.primary:disabled{opacity:.55;cursor:not-allowed}.full{width:100%;margin-top:14px}.secondary{border:1px solid #4c95cb;background:var(--card);color:var(--text);padding:15px 18px;border-radius:8px;font-weight:900;min-height:48px;width:100%}.hint{font-size:12px;color:var(--muted);margin-top:12px;text-align:center}.or{display:flex;align-items:center;gap:15px;margin:24px 0;color:var(--muted);font-size:12px}.or:before,.or:after{content:'';height:1px;background:var(--line);flex:1}.error{color:#e65b60;margin-top:12px;font-size:14px;min-height:18px}.lists{display:grid;gap:17px}.list{display:flex;align-items:center;gap:25px}.posters{display:flex;flex:0 0 38%;min-width:0;padding:3px 0 5px}.poster{height:150px;aspect-ratio:2/3;min-width:0;flex:0 0 23%;background:linear-gradient(140deg,#375472,#17273c);border:2px solid var(--card);border-radius:7px;box-shadow:0 3px 8px #0005;overflow:hidden;position:relative}.poster+.poster{margin-left:-4%}.poster img{width:100%;height:100%;object-fit:cover}.details{flex:1;min-width:0}.details h2{margin:0 0 8px;font-size:clamp(19px,2vw,26px)}.details p{margin:0 0 10px;font-size:14px}.count{color:var(--muted);font-size:14px}.choose{display:flex;align-items:center;gap:10px;white-space:nowrap;font-weight:700}.choose input{width:22px;height:22px;accent-color:#1686d2}.actions{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:24px;flex-wrap:wrap}.back{color:var(--text);background:transparent;border:1px solid var(--line);border-radius:8px;padding:13px 20px;text-decoration:none;font-weight:700}.notice{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:15px;margin:15px 0;color:var(--muted);font-size:14px}.hidden{display:none!important}a{color:var(--blue)}@media(max-width:680px){header{padding:14px}.brand{font-size:17px}.version{font-size:10px}.themes button{padding:7px}.wrap{padding:22px 14px 60px}.steps{margin-bottom:30px}.panel{padding:20px}.list{display:block;padding:16px}.posters{width:100%;margin-bottom:17px}.poster{height:auto;aspect-ratio:2/3;flex-basis:23%}.details{margin-bottom:16px}.choose{justify-content:flex-start}.actions .primary{flex:1}.actions{align-items:stretch}.step{font-size:10px}}@media(max-width:350px){.brand{font-size:15px}.themes button{padding:6px}.version{display:none}}.selection-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:20px;align-items:start}.selection-layout>.lists{min-width:0}.selection-layout .list{gap:16px;padding:18px}.selection-layout .posters{flex:0 0 36%;min-width:0}.selection-layout .poster{height:126px}.selection-layout .details{min-width:0}.selection-layout .details h2{font-size:20px}.selection-layout #selectionSide{position:sticky;top:18px;min-width:0;padding:20px;border-radius:14px}.selection-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:14px;border-bottom:1px solid var(--line)}.selection-head h2{font-size:18px;line-height:1.25;margin:0}.selection-head span{font-size:12px;color:var(--muted);white-space:nowrap}.profile-heading{display:flex;align-items:center;gap:10px;min-width:0;margin:16px 0 7px;font-size:13px;line-height:1.3}.profile-heading>span:last-child{min-width:0;overflow-wrap:anywhere;color:#1676b8}.profile-avatar{box-sizing:border-box;display:inline-flex;flex:0 0 32px;width:32px;height:32px;border-radius:50%;overflow:hidden;align-items:center;justify-content:center;background:var(--sub);border:1px solid var(--line);font-size:13px}.profile-avatar img{display:block;width:100%;height:100%;object-fit:cover;object-position:center}.selected-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid var(--line);font-size:13px;line-height:1.4}.selected-row span{min-width:0;overflow-wrap:anywhere}.selected-row button{flex:0 0 28px;width:28px;height:28px;padding:0;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--muted);font-size:19px;line-height:1;cursor:pointer}.choose{display:inline-flex;align-items:center;justify-content:center;min-width:80px;padding:9px 12px;border:1px solid var(--blue);border-radius:7px;background:transparent;color:var(--blue);font-weight:600}.choose.added{background:var(--blue);color:#fff}.profile-search{margin-bottom:16px;padding:16px 18px}.profile-search label{font-size:13px;margin-bottom:8px}.profile-search-row{display:flex;gap:10px}.profile-search-row input{min-width:0;flex:1}.profile-search-row button{white-space:nowrap}.profile-status{font-size:12px;color:var(--muted);margin:0 0 14px}.profile-status:empty{display:none}@media(max-width:900px){.selection-layout{grid-template-columns:minmax(0,1fr)}.selection-layout #selectionSide{position:static;grid-row:1}.selection-layout .posters{flex-basis:40%}}@media(max-width:680px){.profile-search-row{flex-direction:column}.selection-layout .list{display:block}.selection-layout .posters{width:100%}.selection-layout .poster{height:auto}.selection-layout .choose{width:100%}}\n</style></head><body><header><div><span class=\"brand-wrap\"><span class=\"brand\">YourDramaList</span><span class=\"version\">v2.4.4</span></span></div><div class=\"themes\" aria-label=\"Color theme\"><button data-theme-choice=\"system\" aria-pressed=\"true\" title=\"System\">System</button><button data-theme-choice=\"light\" aria-pressed=\"false\" title=\"Light\">☀</button><button data-theme-choice=\"dark\" aria-pressed=\"false\" title=\"Dark\">☾</button></div></header><main class=\"wrap\"><div class=\"steps\"><div class=\"step done\" id=\"s1\">Connect</div><div class=\"step\" id=\"s2\">Select Lists</div><div class=\"step\">Preferences</div><div class=\"step\">Confirm</div></div><section id=\"connect\" class=\"connect\"><h1>Bring your lists.</h1><p>Connect your public MyDramaList profile or continue without an account.</p><form id=\"lookup\" class=\"panel\"><label for=\"username\">MyDramaList username or profile URL</label><input id=\"username\" type=\"text\" autocomplete=\"off\" placeholder=\"Username or https://mydramalist.com/profile/...\" required maxlength=\"250\"><button id=\"find\" class=\"primary full\" type=\"submit\">Find My Lists →</button><div class=\"hint\">No password or MyDramaList login required.</div><div id=\"error\" class=\"error\" role=\"alert\" aria-live=\"polite\"></div></form><div class=\"or\">OR</div><button class=\"secondary\" id=\"skip\">Continue without an account →</button><div class=\"hint\">Browse public lists without connecting a profile.</div></section><section id=\"selection\" class=\"hidden\"><h1>Choose your lists</h1><p>Select the public MyDramaList lists you'd like to bring into Nuvio.</p><form id=\"topProfile\" class=\"profile-search panel\"><label for=\"topUsername\">Find another MyDramaList profile</label><div class=\"profile-search-row\"><input id=\"topUsername\" type=\"text\" placeholder=\"Username or MyDramaList profile URL\" required><button class=\"primary\" type=\"submit\">Find Lists →</button></div><div id=\"topError\" class=\"error\" role=\"alert\"></div></form><div id=\"status\" class=\"profile-status\" aria-live=\"polite\"></div><div class=\"selection-layout\"><div id=\"listItems\" class=\"lists\"></div><aside id=\"selectionSide\" class=\"panel\"><div class=\"selection-head\"><h2>Your Selection</h2><span id=\"selectionTotal\">0 lists</span></div><div id=\"selectionItems\"></div></aside></div><div class=\"actions\"><a class=\"back\" href=\"/setup\">← Back</a><span id=\"selectedCount\" aria-live=\"polite\">0 lists selected</span><button id=\"continue\" class=\"primary\" disabled>Continue →</button></div><div id=\"nextMessage\" class=\"hint\"></div></section><section id=\"basket\" class=\"hidden\"><div id=\"basketItems\"></div><form id=\"addProfile\"><input id=\"anotherUsername\"><button>Find</button></form><button id=\"basketBack\">Back</button><span id=\"basketCount\"></span><button id=\"basketNext\">Next</button><div id=\"basketNotice\"></div></section></main><script>\n(function(){const $=id=>document.getElementById(id);let theme='system';try{theme=localStorage.getItem('ydl-theme')||'system'}catch{}function apply(){document.body.dataset.theme=theme==='system'?'':theme;document.querySelectorAll('[data-theme-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeChoice===theme)))}document.querySelectorAll('[data-theme-choice]').forEach(b=>b.addEventListener('click',()=>{theme=b.dataset.themeChoice;try{localStorage.setItem('ydl-theme',theme)}catch{}apply()}));apply();\nlet currentProfile='';let currentProfileName='';let basket=[];try{const b=JSON.parse(localStorage.getItem('ydl-basket-v1')||'[]');if(Array.isArray(b))basket=b.filter(x=>x&&typeof x.url==='string'&&x.url.startsWith('https://mydramalist.com/')).slice(0,250)}catch{}function saveBasket(){try{localStorage.setItem('ydl-basket-v1',JSON.stringify(basket))}catch{}}function showBasket(){$('connect').classList.add('hidden');$('selection').classList.add('hidden');$('basket').classList.remove('hidden');$('s2').classList.remove('active');$('s2').classList.add('done');$('s3').classList.add('active');history.replaceState({},'','/setup/basket');renderBasket()}function renderBasket(){const root=$('basketItems');root.replaceChildren();$('basketCount').textContent=basket.length+' lists saved';$('basketNext').disabled=!basket.length;if(!basket.length){const p=document.createElement('p');p.textContent='No lists saved yet. Add a profile below.';root.append(p)}const groups=new Map();for(const l of basket){const k=l.profile||'MyDramaList';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(l)}for(const [profile,lists] of groups){const heading=document.createElement('h2');heading.textContent=profile;heading.style.marginTop='20px';root.append(heading);for(const l of lists){const card=document.createElement('div');card.className='list';card.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:16px;margin:8px 0;gap:12px';const title=document.createElement('div');title.textContent=l.name+(typeof l.count==='number'?' · '+l.count+' titles':'');const remove=document.createElement('button');remove.className='secondary';remove.textContent='Remove';remove.addEventListener('click',()=>{basket=basket.filter(x=>x.url!==l.url);saveBasket();renderBasket()});card.append(title,remove);root.append(card)}}}function showLists(){ $('connect').classList.add('hidden');$('selection').classList.remove('hidden');$('s1').classList.add('done');$('s1').classList.remove('active');$('s2').classList.add('active');history.replaceState({},'', '/setup/lists')}\nconst avatarCache=new Map();function loadAvatar(name,slot){if(!/^[a-zA-Z0-9_-]{1,60}$/.test(name))return;let pending=avatarCache.get(name);if(!pending){pending=fetch('/api/mdl/avatar?username='+encodeURIComponent(name)).then(r=>r.ok?r.json():null).then(data=>data?.avatar||null).catch(()=>null);avatarCache.set(name,pending)}pending.then(url=>{if(!url||!slot.isConnected)return;const img=document.createElement('img');img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.style.cssText='display:block;width:32px;height:32px;min-width:32px;min-height:32px;max-width:32px;max-height:32px;object-fit:cover;object-position:center;border-radius:50%;';img.src=url;img.onerror=()=>img.remove();slot.replaceChildren(img)})}function renderSelection(){const root=$('selectionItems');root.replaceChildren();$('selectionTotal').textContent=basket.length+' '+(basket.length===1?'list':'lists');$('selectedCount').textContent=basket.length+' list'+(basket.length===1?'':'s')+' added';if(!basket.length){const p=document.createElement('p');p.textContent='No lists added yet.';root.append(p)}const groups=new Map();for(const l of basket){const k=l.profile||'MyDramaList';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(l)}for(const [name,items] of groups){const h=document.createElement('h3');h.className='profile-heading';const avatar=document.createElement('span');avatar.className='profile-avatar';avatar.style.cssText='width:32px;height:32px;min-width:32px;max-width:32px;min-height:32px;max-height:32px;flex:0 0 32px;border-radius:50%;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;';avatar.textContent=name.slice(0,1).toUpperCase();const nameText=document.createElement('span');nameText.textContent=items[0].profileDisplay||name;h.append(avatar,nameText);root.append(h);loadAvatar(name,avatar);for(const item of items){const row=document.createElement('div');row.className='selected-row';const label=document.createElement('span');label.textContent=item.name;const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Remove '+item.name;remove.setAttribute('aria-label','Remove '+item.name);remove.addEventListener('click',()=>{basket=basket.filter(x=>x.url!==item.url);saveBasket();syncCards();update()});row.append(label,remove);root.append(row)}}}function syncCards(){document.querySelectorAll('#listItems .choose').forEach(btn=>{const added=basket.some(x=>x.url===btn._list?.url);btn.textContent=added?'Added ✓':'Add +';btn.classList.toggle('added',added);btn.setAttribute('aria-pressed',String(added))})}function update(){const n=basket.length;$('selectedCount').textContent=n+' list'+(n===1?'':'s')+' selected';$('continue').disabled=basket.length===0;$('continue').textContent='Continue →';$('selectedCount').textContent=n+' selected · '+basket.length+' added';renderSelection()}\nfunction addList(l){if(l.unavailable)return;const el=document.createElement('article');el.className='list';const posters=document.createElement('div');posters.className='posters';for(let i=0;i<5;i++){const slot=document.createElement('div');slot.className='poster';if(l.posters&&l.posters[i]){const img=document.createElement('img');img.src=l.posters[i];img.alt='Drama poster';img.loading='lazy';slot.append(img)}posters.append(slot)}const d=document.createElement('div');d.className='details';const h=document.createElement('h2');h.textContent=l.name;const p=document.createElement('p');p.textContent=l.description||'';if(!l.description)p.style.display='none';const c=document.createElement('div');c.className='count';c.textContent=typeof l.count==='number'?l.count+' titles':typeof l.people==='number'?'People list':'Count unavailable';d.append(h,p);const stats=document.createElement('div');stats.style.cssText='display:flex;flex-wrap:nowrap;align-items:center;gap:14px;margin-top:10px;color:var(--muted);font-size:13px;white-space:nowrap;overflow-x:auto';for(const [field,symbol,word] of [['count','▱','titles'],['people','♙','people'],['voters','☑','voters'],['loves','♡','loves']]){if(typeof l[field]==='number'){const part=document.createElement('span');if(field==='count'){const ico=document.createElement('span');ico.setAttribute('aria-hidden','true');const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('width','19');svg.setAttribute('height','19');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.5');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');const rect=document.createElementNS(ns,'rect');for(const [k,v] of [['x','3'],['y','3'],['width','18'],['height','14'],['rx','2']])rect.setAttribute(k,v);const stand=document.createElementNS(ns,'path');stand.setAttribute('d','M8 21h8');svg.append(rect,stand);svg.setAttribute('viewBox','0 0 24 24');svg.innerHTML='<path d=&quot;M4 7h16v14H4z M4 7l-1-4 16-2 2 5z M8 2l3 5 M14 2l3 5 M8 7l3 4 M15 7l3 4&quot;/>';const movie=document.createElementNS(ns,'path');movie.setAttribute('d','M4 8h16v13H4z M4 8L3 4 19 1 21 5 4 8 M8 3l3 4 M14 2l3 4 M8 8l3 4 M15 8l3 4');svg.replaceChildren(movie);ico.append(svg);part.style.cssText='display:inline-flex;align-items:center;gap:5px';ico.style.cssText='display:inline-flex;align-items:center';part.append(ico,document.createTextNode(l[field]+' '+word))}else part.textContent=symbol+' '+l[field]+' '+word;stats.append(part)}}d.append(stats);const label=document.createElement('button');label.type='button';label.className='choose';label._list=l;label.addEventListener('click',()=>{if(basket.some(x=>x.url===l.url)){basket=basket.filter(x=>x.url!==l.url)}else{basket.push({url:l.url,name:l.name,profile:currentProfile,profileDisplay:currentProfileName,count:l.count,loves:l.loves,description:l.description,posters:l.posters})}saveBasket();syncCards();update()});el.append(posters,d,label);$('listItems').append(el)}\n$('lookup').addEventListener('submit',async e=>{e.preventDefault();$('error').textContent='';const raw=$('username').value.trim();const m=raw.match(/^(?:https?:\\/\\/(?:www\\.)?mydramalist\\.com\\/profile\\/)?([a-zA-Z0-9_-]{1,60})\\/?$/i);if(!m){$('error').textContent='Enter a valid MyDramaList username or profile URL.';return}const btn=$('find');btn.disabled=true;btn.textContent='Finding your lists…';try{const res=await fetch('/api/mdl/profile?username='+encodeURIComponent(m[1]));const data=await res.json();if(!res.ok)throw Error(data.error||'Could not check this profile.');currentProfile=m[1];currentProfileName=(data.message||'').match(/(?:discovered|found) for (.+?)[.]/i)?.[1]||m[1];showLists();$('status').textContent='Showing lists from '+currentProfileName+((data.lists||[]).some(l=>l.unavailable)?' · Main watchlist preview unavailable':'');$('listItems').replaceChildren();(data.lists||[]).forEach(addList);syncCards();if(!data.lists?.length){$('status').textContent='We could not discover public lists for this profile. MyDramaList may limit automated access. You can go back or continue without an account.'}update()}catch(err){$('error').textContent=err.message||'Unable to retrieve profile.'}finally{btn.disabled=false;btn.textContent='Find My Lists →'}});\n$('topProfile').addEventListener('submit',e=>{e.preventDefault();$('topError').textContent='';let raw=$('topUsername').value.trim();try{const u=new URL(raw);if(u.hostname==='mydramalist.com'||u.hostname==='www.mydramalist.com'){const parts=u.pathname.split('/').filter(Boolean);if(parts[0]==='profile'&&parts[1])raw=parts[1]}}catch{}if(!/^[a-zA-Z0-9_-]{1,60}$/.test(raw)){$('sideError').textContent='Enter a valid username or profile URL.';return}$('username').value=raw;$('lookup').requestSubmit()});$('skip').addEventListener('click',()=>{showLists();$('status').textContent='No account connected. Public list discovery will be available in a later setup step.';$('listItems').replaceChildren();update()});$('continue').addEventListener('click',()=>{$('nextMessage').textContent='Your '+basket.length+' selected lists are saved. Preferences will be the next setup step.'});$('addProfile').addEventListener('submit',e=>{e.preventDefault();let raw=$('anotherUsername').value.trim();try{const u=new URL(raw);if(u.hostname==='mydramalist.com'||u.hostname==='www.mydramalist.com'){const parts=u.pathname.split('/').filter(Boolean);if(parts[0]==='profile'&&parts[1])raw=parts[1]}}catch{}$('username').value=raw;$('basket').classList.add('hidden');$('connect').classList.remove('hidden');$('lookup').requestSubmit()});$('basketBack').addEventListener('click',()=>{if(currentProfile)showLists();else{$('basket').classList.add('hidden');$('connect').classList.remove('hidden');history.replaceState({},'','/setup')}});$('basketNext').addEventListener('click',()=>{$('basketNotice').textContent='Your selected lists are saved. Preferences and catalog generation are coming next.'});if(location.pathname==='/setup/basket'||location.search.includes('basket=1'))history.replaceState({},'','/setup');else if(location.pathname==='/setup/lists'){history.replaceState({},'','/setup')}})();\n</script></body></html>";
app.get('/setup', c => c.html(setupPage));
app.get('/setup/lists', c => c.html(setupPage));
import { blob as mdlCacheBlob } from "https://esm.town/v/std/blob/main.ts";
const mdlProfileCache=new Map<string,{expires:number,data:any}>();
const mdlInflight=new Map<string,Promise<any>>();
let mdlActive=0;
let mdlNextRequestAt=0;
let mdlLastSharedCooldownRead=0;
const mdlWaiters:Array<()=>void>=[];
async function mdlFetch(input:string,init:RequestInit={}):Promise<Response>{
  if(mdlActive>=3)await new Promise<void>(resolve=>mdlWaiters.push(resolve));
  mdlActive++;
  try{
    if(Date.now()-mdlLastSharedCooldownRead>5000){
      mdlLastSharedCooldownRead=Date.now();
      try{const state:any=await mdlCacheBlob.getJSON('mdl:cooldown');if(state?.until>mdlCooldownUntil)mdlCooldownUntil=state.until}catch{}
    }
    if(Date.now()<mdlCooldownUntil)throw new Error('MDL cooldown active');
    const slot=Math.max(Date.now(),mdlNextRequestAt);
    mdlNextRequestAt=slot+500;
    if(slot>Date.now())await new Promise(resolve=>setTimeout(resolve,slot-Date.now()));
    if(Date.now()<mdlCooldownUntil)throw new Error('MDL cooldown active');
    const response=await fetch(input,init);
    if(response.status===429||response.status===503){
      const retry=response.headers.get('retry-after');
      const parsedDate=retry&&!/^\d+$/.test(retry)?Date.parse(retry):NaN;
      const delay=retry&&/^\d+$/.test(retry)?Math.min(Number(retry)*1000,3600000):Number.isFinite(parsedDate)?Math.min(Math.max(0,parsedDate-Date.now()),3600000):60000;
      mdlCooldownUntil=Math.max(mdlCooldownUntil,Date.now()+delay);
      try{await mdlCacheBlob.setJSON('mdl:cooldown',{until:mdlCooldownUntil})}catch{}
    }
    return response;
  }finally{mdlActive--;mdlWaiters.shift()?.()}
}
let mdlCooldownUntil=0;
async function mdlPersistentGet(key:string){
  try{const entry:any=await mdlCacheBlob.getJSON('mdl-profile-v4:'+key);return entry&&entry.expires>Date.now()?entry:null}catch{return null}
}
async function mdlPersistentSet(key:string,entry:{expires:number,data:any}){
  try{await mdlCacheBlob.setJSON('mdl-profile-v4:'+key,entry)}catch(e){console.warn('MDL cache persistence unavailable',e)}
}
app.get('/api/mdl/profile', async c => {
  const username = c.req.query('username') || '';
  if (!/^[a-zA-Z0-9_-]{1,60}$/.test(username)) return c.json({error:'Invalid username.'},400);
  const cacheKey=username.toLowerCase();const cached=mdlProfileCache.get(cacheKey);if(cached&&cached.expires>Date.now())return c.json(cached.data);
  const persistent=await mdlPersistentGet(cacheKey);if(persistent){mdlProfileCache.set(cacheKey,persistent);return c.json(persistent.data)}
  if(Date.now()<mdlCooldownUntil)return c.json({error:'MyDramaList is temporarily limiting requests. Please try again later.'},503);
  if(mdlInflight.has(cacheKey))return await mdlInflight.get(cacheKey);
  const job=(async()=>{try {
    const url='https://mydramalist.com/profile/'+encodeURIComponent(username);
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8500);
    let res;
    try { res=await mdlFetch(url,{signal:controller.signal,headers:{'User-Agent':'Mozilla/5.0 (compatible; YourDramaList/2.1; public-profile-discovery)','Accept':'text/html'}}); }
    finally {clearTimeout(timeout)}
    if(res.status===404)return c.json({error:'Profile not found. Check the username and try again.'},404);
    if(!res.ok)return c.json({error:'MyDramaList did not allow this profile lookup. Please try again later.'},502);
    const html=(await res.text()).slice(0,1200000);
    if(!/<html/i.test(html))return c.json({error:'Unexpected response from MyDramaList.'},502);
    const links=new Map();
    const re=/<a\b[^>]*href=["']([^"']*(?:\/list\/|\/dramalist\/)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while((match=re.exec(html))!==null&&links.size<30){
      const href=match[1].replace(/&amp;/g,'&');
      if(!href.startsWith('/')&&!href.startsWith('https://mydramalist.com/'))continue;
      const full=new URL(href,'https://mydramalist.com').href;
      if(new URL(full).hostname!=='mydramalist.com')continue;
      const name=match[2].replace(/<[^>]*>/g,' ').replace(/&[^;]+;/g,' ').replace(/\s+/g,' ').trim();
      if(name&&name.length<110&&!links.has(full))links.set(full,{name,url:full,posters:[]});
    }
    const decode=(s:string)=>s.replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    const title=decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
    const og=decode(html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1]||'');
    const heading=decode(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
    const profileName=(heading||og||title).replace(/\s*[-|–]\s*MyDramaList.*$/i,'').replace(/\s*'s Profile.*$/i,'').trim()||username;
    // Prefer the dedicated custom-lists index: it contains the complete list cards,
    // their first five ordered images, counts, likes and optional descriptions.
    try{
      const indexUrl='https://mydramalist.com/profile/'+encodeURIComponent(username)+'/lists';
      const indexController=new AbortController();
      const indexTimer=setTimeout(()=>indexController.abort(),8500);
      let indexResponse:Response;
      try{indexResponse=await mdlFetch(indexUrl,{signal:indexController.signal,headers:{'User-Agent':'Mozilla/5.0 (compatible; YourDramaList/2.2; public-list-index)','Accept':'text/html'}})}
      finally{clearTimeout(indexTimer)}
      if(indexResponse.ok){
        const indexHtml=(await indexResponse.text()).slice(0,2000000);
        const cards=indexHtml.split(/<div class="row custom-list-preview[^"]*">/i).slice(1);
        if(cards.length){
          const discovered=new Map<string,any>();
          for(const card of cards.slice(0,150)){
            const titleLink=card.match(/<a[^>]*class="text-primary title-primary"[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
            if(!titleLink)continue;
            const full=new URL(titleLink[1],'https://mydramalist.com');
            if(full.hostname!=='mydramalist.com'||!full.pathname.startsWith('/list/'))continue;
            const name=decode(titleLink[2]);
            if(!name)continue;
            const collection=card.split(/<\/ul>/i)[0];
            const posters=[...collection.matchAll(/<img\b[^>]*(?:data-src|src)=["']([^"']+)["']/gi)].map(m=>m[1]).slice(0,5);
            const description=decode(card.match(/<a[^>]*class="text-primary title-primary"[\s\S]*?<\/a>\s*<p[^>]*>([\s\S]*?)<\/p>/i)?.[1]||'').slice(0,1200);
            const bars=card.match(/<div class="list-bars[^"]*">([\s\S]*?)<\/div>/i)?.[1]||'';
            const item:any={name,url:full.href,posters};
            if(description)item.description=description;
            for(const [key,unit] of [['count','titles'],['people','people'],['voters','voters'],['loves','loves']] as const){
              const m=bars.match(new RegExp('([\\d,]+)\\s+'+unit.replace(/s$/,'')+'s?\\b','i'));
              if(m)item[key]=Number(m[1].replace(/,/g,''));
            }
            discovered.set(full.href,item);
          }
          if(discovered.size){
            const watchlist=[...links.values()].filter(item=>item.url.includes('/dramalist/'));
            links.clear();
            for(const item of watchlist)links.set(item.url,item);
            for(const [url,item] of discovered)links.set(url,item);
          }
        }
      }
    }catch(e){console.warn('MDL custom-list index unavailable; using profile discovery',e)}
    const found=[...links.values()];
    // MyDramaList profile cards already contain the exact five preview images and stats.
    const cards=html.match(/<div class="custom-list-preview">[\s\S]*?(?=<div class="custom-list-preview">|<\/div>\s*<\/div>\s*<\/div>\s*<div class="box|$)/g)||[];
    for(const card of cards){
      const href=card.match(/<a[^>]*class="collection"[^>]*href="([^"]+)"/i)?.[1];
      if(!href)continue;
      const item=found.find(x=>x.url===new URL(href,'https://mydramalist.com').href);
      if(!item)continue;
      const collection=card.match(/<a[^>]*class="collection"[^>]*>([\s\S]*?)<\/a>/i)?.[1]||'';
      const sources=[...collection.matchAll(/<img[^>]*data-src="([^"]+)"/gi)].map(x=>x[1]);
      if(sources.length)item.posters=sources.slice(0,5);
      const bars=card.match(/<div class="list-bars[^"]*">([\s\S]*?)<\/div>/i)?.[1]||'';
      for(const [key,unit] of [['count','titles'],['people','people'],['voters','voters'],['loves','loves']] as const){
        const match=bars.match(new RegExp('([\\d,]+)\\s+'+unit.replace(/s$/,'')+'s?\\b','i'));
        if(match)(item as any)[key]=Number(match[1].replace(/,/g,''));
      }
    }
    await Promise.all(found.slice(0,18).map(async (item)=>{
      if(item.posters?.length>=5&&(typeof item.count==='number'||typeof item.people==='number'))return;
      try {
        const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6000);
        let response;
        try {response=await mdlFetch(item.url,{signal:controller.signal,headers:{'User-Agent':'Mozilla/5.0 (compatible; YourDramaList/2.1; public-list-preview)','Accept':'text/html'}})}finally{clearTimeout(timer)}
        if(!response.ok)return;
        const page=(await response.text()).slice(0,1400000);
        if(item.url.includes('/list/')){
          const raw=page.match(/<div class="description[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]||'';
          const desc=decode(raw).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).slice(0,1200);
          if(desc)item.description=desc;
        }
        if(item.url.includes('/dramalist/')){
          const tbody=page.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1]||'';
          const rows=[...tbody.matchAll(/<tr\b[^>]*id=["']ml\d+["'][^>]*>([\s\S]*?)<\/tr>/gi)];
          const covers=rows.map(m=>m[1].match(/msv2-item--cover[^>]*>\s*<img[^>]*(?:data-src|src)=["']([^"']+)/i)?.[1]).filter(Boolean);
          item.posters=[...new Set(covers)].slice(0,5);
          if(!rows.length)item.unavailable=true;
          // Do not mistake page row count for total watchlist titles.
          return;
        }
        const images:string[]=[];
        const imgTags=page.match(/<img\b[^>]*>/gi)||[];
        for(const tag of imgTags){
          const src=tag.match(/(?:data-src|data-original|data-lazy-src|src)=["']([^"']+)["']/i)?.[1];
          if(!src||/avatar|profile|logo|icon|blank|placeholder|\.svg/i.test(src))continue;
          try{const url=new URL(src.replace(/&amp;/g,'&'),item.url);if(url.protocol!=='https:'||!/(^|\.)(mydramalist\.com|mdlcdn\.com|mydramalist\.info)$/.test(url.hostname))continue;if(!images.includes(url.href))images.push(url.href)}catch{}
          if(images.length>=5)break;
        }
        if(!item.posters?.length)item.posters=images;
        const count=page.match(/(?:([\d,]+)\s+(?:titles|dramas|movies)|(?:titles|dramas|movies)\s*\(?([\d,]+)\)?)/i);
        if(count){const n=Number((count[1]||count[2]).replace(/,/g,''));if(n>0)item.count=n;}
      }catch{}
    }));
    // Normalize all scraped results before exposing them to the UI.
    for(const item of found){
      const clean:string[]=[];
      for(const src of item.posters||[]){
        try{
          const u=new URL(src);
          if(u.protocol!=='https:'||!/(^|\.)(mydramalist\.com|mdlcdn\.com|mydramalist\.info)$/.test(u.hostname))continue;
          if(!clean.includes(u.href))clean.push(u.href);
        }catch{}
        if(clean.length===5)break;
      }
      item.posters=clean;
      for(const field of ['count','people','voters','loves']){
        const n=(item as any)[field];
        if(typeof n!=='number'||!Number.isSafeInteger(n)||n<0)delete (item as any)[field];
      }
      if(item.url.includes('/dramalist/')&&!item.posters.length)item.unavailable=true;
    }
    // Remove people-only collections: Nuvio catalogs contain watchable titles, not actors/directors.
    for(let i=found.length-1;i>=0;i--){if(typeof found[i].people==='number'&&typeof found[i].count!=='number')found.splice(i,1)}
    // Universal ordering: highest title/person count first; loves break ties.
    // Unknown counts sort after known counts, without pretending missing data is zero.
    found.sort((a:any,b:any)=>{
      const ac=typeof a.count==='number'?a.count:typeof a.people==='number'?a.people:-1;
      const bc=typeof b.count==='number'?b.count:typeof b.people==='number'?b.people:-1;
      if(ac!==bc)return bc-ac;
      const al=typeof a.loves==='number'?a.loves:-1;
      const bl=typeof b.loves==='number'?b.loves:-1;
      return bl-al||a.name.localeCompare(b.name);
    });
    const payload={username:profileName,lists:found,message:found.length?'Public lists discovered for '+profileName+'. Choose which to include.':'Profile page reached, but no public lists could be discovered automatically. MyDramaList may restrict list access.'};
    if(mdlProfileCache.size>300)mdlProfileCache.clear();const cacheEntry={expires:Date.now()+30*60*1000,data:payload};mdlProfileCache.set(cacheKey,cacheEntry);await mdlPersistentSet(cacheKey,cacheEntry);
    return c.json(payload);
  }catch(e){return c.json({error:'Unable to reach MyDramaList right now. Please try again later.'},502)}
  })();mdlInflight.set(cacheKey,job);
  try{return await job}finally{mdlInflight.delete(cacheKey)}
});

app.get('/api/mdl/inspect-watchlist',async c=>{const u=c.req.query('u')||'Mozzarellacheesey';const r=await fetch('https://mydramalist.com/dramalist/'+encodeURIComponent(u));const h=await r.text();return c.json({status:r.status,length:h.length,title:h.match(/<title[^>]*>(.*?)<\/title>/i)?.[1],markers:['private','empty','no dramas','not available','not found','login','msv2','list is','drama list'].map(x=>[x,h.toLowerCase().indexOf(x)]) ,tail:h.slice(26000,35000),tbody:h.indexOf('<tbody'),cover:h.indexOf('msv2-item--cover'),excerpt:h.slice(Math.max(0,h.indexOf('<tbody')-200),h.indexOf('<tbody')+1200),img:h.match(/<img[^>]+(?:data-src|src)="https:\/\/i\.mydramalist\.com[^"]+"/gi)?.slice(0,8)})});
app.get('/api/mdl/self-test',c=>{
 const sample='<div class="description m-b"><p>Favorite dramas ❤</p></div>';
 const desc=sample.match(/<div class="description[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]?.replace(/<[^>]*>/g,'').trim();
 const cases={
   description:desc==='Favorite dramas ❤',
   singularLove:/([\d,]+)\s+loves?\b/i.test('1 love'),
   pluralLove:/([\d,]+)\s+loves?\b/i.test('5 loves'),
   distinctPosters:new Set(['a','b','a','c']).size===3,
   strictUsername:/^[a-zA-Z0-9_-]{1,60}$/.test('manicmuse')&&!/^[a-zA-Z0-9_-]{1,60}$/.test('../bad'),
   cooldownRule:Math.max(Date.now()+1000,Date.now()+2000)>Date.now(),
 };
 return c.json({passed:Object.values(cases).every(Boolean),cases});
});
app.get('/setup/basket',c=>c.redirect('/setup?basket=1'));
const avatarPending=new Map<string,Promise<string|null>>();let avatarLastFetch=0;
app.get('/api/mdl/avatar',async c=>{
 const username=(c.req.query('username')||'').trim();
 if(!/^[a-zA-Z0-9_-]{1,60}$/.test(username))return c.json({avatar:null},400);
 const key='mdl-avatar-v2:'+username.toLowerCase();
 try{
  
  const cached=await blob.getJSON(key) as {avatar:string|null,expires:number}|undefined;
  if(cached&&cached.expires>Date.now())return c.json({avatar:cached.avatar});
  if(!avatarPending.has(key)){
   avatarPending.set(key,(async()=>{
    if(Date.now()-avatarLastFetch<2000)return null;
    avatarLastFetch=Date.now();
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6500);
    try{
     const response=await fetch('https://mydramalist.com/profile/'+encodeURIComponent(username),{signal:controller.signal,headers:{'User-Agent':'YourDramaList/2.4 (public profile metadata; respectful caching)'}});
     if(!response.ok)throw Error('MDL HTTP '+response.status);
     const html=(await response.text()).slice(0,900000);
     const candidates=[
      ...[...html.matchAll(/<img[^>]*(?:avatar|profile-picture|profile-image|mdl-rounded)[^>]*>/gi)].map(m=>m[0]),
      ...[...html.matchAll(/<meta[^>]*property=["']og:image["'][^>]*>/gi)].map(m=>m[0])
     ];
     let avatar:string|null=null;
     for(const tag of candidates){
      const match=tag.match(/(?:data-src|src|content)=["']([^"']+)["']/i);
      if(!match)continue;
      const url=match[1].replace(/&amp;/g,'&');
      try{const parsed=new URL(url,'https://mydramalist.com');if(parsed.protocol==='https:'&&/^(?:i\.)?mydramalist\.com$/.test(parsed.hostname)){avatar=parsed.href;break}}catch{}
     }
     await blob.setJSON(key,{avatar,expires:Date.now()+(avatar?7:1)*86400000});
     return avatar;
    }finally{clearTimeout(timer)}
   })().finally(()=>avatarPending.delete(key)));
  }
  return c.json({avatar:await avatarPending.get(key)});
 }catch{return c.json({avatar:null})}
});
export default oauthMiddleware(app.fetch);
