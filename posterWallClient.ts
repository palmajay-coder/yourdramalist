// @ts-nocheck -- embedded into V3's browser scope.
// Connect background: straight rows of wide backdrops from the newest Korean dramas, every row gliding slowly
// left to right at its own speed (in the spirit of the Apple TV+ wall). The owner's tint sits on top.
export const POSTER_WALL_CSS="\n .motionBackdrop{display:none;position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;background:#0b0d11}\n body[data-page=connect] .motionBackdrop{display:block}\n .motionTilt{--tile:clamp(260px,62vw,540px);--gap:clamp(10px,1.2vw,16px);position:absolute;left:50%;top:50%;width:150vmax;display:flex;flex-direction:column;gap:var(--gap);transform:translate(-50%,-50%)}\n .motionRow{display:flex;gap:var(--gap);width:max-content;animation:backdropGlide var(--glide,150s) linear infinite;will-change:transform}\n .motionRow:nth-child(even){margin-left:calc(var(--tile) / -2)}\n .motionTile{flex:none;width:var(--tile);aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#1b2028;box-shadow:0 6px 18px #0006}\n .motionTile img{width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .6s ease}\n .motionTile img.ydlLoaded{opacity:1}\n .motionShade{position:absolute;inset:0;--poster-shade:linear-gradient(180deg,rgba(10,12,16,0) 45%,rgba(10,12,16,.55) 100%),radial-gradient(ellipse at center,rgba(10,12,16,.74) 0%,rgba(10,12,16,.81) 65%,rgba(10,12,16,.93) 100%);background:var(--poster-shade)}\n @keyframes backdropGlide{from{transform:translateX(-50%)}to{transform:translateX(0)}}\n body[data-page=connect] header,body[data-page=connect] main,body[data-page=connect] footer{position:relative;z-index:1}\n body[data-page=connect] .shell{display:grid;align-items:center;padding:30px 22px;min-height:0}\n body[data-page=connect] #setup{width:100%}\n body[data-page=connect] .connect{max-width:470px;margin:0 auto;padding:10px 0}\n body[data-page=connect] .connect>h1{color:#fff;font-size:43px;letter-spacing:-1px;margin:0 0 10px}\n body[data-page=connect] .connect>p{color:#d2d6dc;margin:0 0 23px;line-height:1.6}\n body[data-page=connect] .or{color:#c5cbd2;margin:18px 0}\n body[data-page=connect] footer{color:#bdc4ce;padding-top:24px}\n body[data-page=connect] .connect .panel{background:rgba(28,30,35,.88);border-color:#ffffff24;backdrop-filter:blur(14px)}\n body[data-page=connect] #skip{background:rgba(32,35,41,.85);color:#eee;border-color:#ffffff30}\n\n .motionPaused .motionRow{animation-play-state:paused}\n @media(max-width:740px){body[data-page=connect] footer{padding-bottom:45px}}\n @media(prefers-reduced-motion:reduce){.motionRow{animation:none}}\n \n.motionBackdrop:not(.motionActive) .motionRow{animation-play-state:paused}.tmdbCredits{font-size:12px;max-width:640px}.tmdbCredits summary{cursor:pointer}.tmdbCredits img{width:68px;height:auto;display:block;margin:12px auto}.tmdbCredits p{line-height:1.5}";
export function installPosterWall(seeds,enabledPages=["connect"]){
 const root=document.createElement("div");root.className="motionBackdrop";root.setAttribute("aria-hidden","true");
 const tilt=document.createElement("div");tilt.className="motionTilt";const shade=document.createElement("div");shade.className="motionShade";root.append(tilt,shade);document.body.prepend(root);
 let initialized=false;
 const valid=list=>(Array.isArray(list)?list:[]).filter(x=>{try{const u=new URL(x.image);return u.protocol==="https:"&&u.hostname==="image.tmdb.org"&&!u.username&&!u.password&&!u.port&&/^\/t\/p\/w780\/[A-Za-z0-9]+\.(jpg|png|webp)$/.test(u.pathname)}catch{return false}});
 const ROWS=6,PER_ROW=4,GLIDE=[150,132,166,141,157,127];
 // Middle rows first, so the newest shows land where people look.
 const ROW_ORDER=[3,2,4,1,5,0];
 const shuffle=list=>{const out=[...list];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out};
 function render(list){
  const items=valid(list);if(!items.length)return;
  // The list arrives newest first: the top 8 are shuffled among themselves, then the rest.
  const ordered=[...shuffle(items.slice(0,8)),...shuffle(items.slice(8))];
  const rows=Array.from({length:ROWS},()=>[]);let next=0;
  for(let slot=0;slot<ROWS*PER_ROW;slot++){const row=ROW_ORDER[Math.floor(slot/PER_ROW)];rows[row].push(ordered[next++%ordered.length])}
  tilt.replaceChildren();
  rows.forEach((tiles,r)=>{
   const row=document.createElement("div");row.className="motionRow";row.style.setProperty("--glide",GLIDE[r]+"s");
   // Each row holds its tiles twice, side by side, so the loop never shows a seam.
   for(let copy=0;copy<2;copy++)for(const item of tiles){
    const frame=document.createElement("div"),img=document.createElement("img");
    frame.className="motionTile";img.src=item.image;img.alt="";img.width=780;img.height=439;img.decoding="async";
    img.loading=Math.abs(r-2.5)<2?"eager":"lazy";img.referrerPolicy="no-referrer";
    img.onload=()=>img.classList.add("ydlLoaded");img.onerror=()=>img.remove();
    frame.append(img);row.append(frame);
   }
   tilt.append(row);
  });
 }
 function update(page){const active=enabledPages.includes(page);root.classList.toggle("motionActive",active);if(!active||initialized)return;initialized=true;render(seeds);fetch("/api/background/backdrops",{signal:AbortSignal.timeout(30000)}).then(r=>r.ok?r.json():null).then(v=>{if(valid(v?.backdrops).length>=10&&v.status!=="fallback")render(v.backdrops)}).catch(()=>{});}
 // Tint: the owner's color as a soft vignette, a little darker toward the edges and the bottom.
 function setTint(color,opacity){
  const hex=/^#([0-9a-f]{6})$/i.exec(String(color||""));const alpha=Number(opacity);
  if(!hex||!Number.isFinite(alpha)||alpha<0||alpha>1)return;
  const n=parseInt(hex[1],16),rgb=[(n>>16)&255,(n>>8)&255,n&255].join(",");
  // Everything scales with the strength: at 0% there is no darkening at all, at 74% it matches the default.
  const at=factor=>"rgba("+rgb+","+Math.min(1,alpha*factor).toFixed(2)+")";
  shade.style.setProperty("--poster-shade","linear-gradient(180deg,"+at(0)+" 45%,"+at(0.75)+" 100%),radial-gradient(ellipse at center,"+at(1)+" 0%,"+at(1.1)+" 65%,"+at(1.25)+" 100%)");
 }
 return {update,setTint};
}
