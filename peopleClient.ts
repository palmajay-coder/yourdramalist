/** Browser installer embedded by app.ts; no network or DOM work runs on the server. */
export function installPeopleUI(){
 let lastSearch=null,shelfState=null;
 const compactButtons=new Map();
 function cleanup(){compactButtons.clear();if(shelfState){shelfState.observer?.disconnect();shelfState.abort.abort();shelfState.dialog.remove();shelfState=null}}
 function sync(){
  for(const [url,button] of compactButtons){
   const added=state.selection.some(item=>item.url===url);
   button.textContent=added?copy.catalogAdded:copy.addFilmography;
   button.setAttribute('aria-pressed',String(added));
  }
  if(!shelfState)return;
  const selected=state.selection.some(x=>x.url===shelfState.list.url);
  shelfState.add.setAttribute('aria-pressed',String(selected));
  shelfState.add.textContent=selected?copy.catalogAdded:copy.addFilmography;
 }
 const personApi=(url,mode)=>'/api/mdl/person?mode='+mode+'&url='+encodeURIComponent(url);
 async function json(url){const response=await fetch(url,{signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw Error(data.error||'MyDramaList lookup failed.');return data;}
 function backButton(){if(!lastSearch)return;const back=document.createElement('button');back.type='button';back.className='secondary';back.textContent=copy.filmographyBack;back.onclick=()=>{listRequest++;renderMatches(lastSearch)};$('results').append(document.createTextNode(' '),back);}
 async function showFilmography(person,mode){
  cleanup();const requestId=++listRequest;$('listItems').replaceChildren();$('results').textContent='';
  try{const data=await json('/api/mdl/filmography?mode='+mode+'&url='+encodeURIComponent(person.url));if(requestId!==listRequest)return;
   const list={...data.list,analyticsSource:mode==='director'?'discover-director-filmography':'discover-actor-filmography'};
   if(!data.sectionFound||!data.items.length){$('results').textContent=mode==='director'?'No Screenwriter & Director credits were shown for this person.':'No Drama or Movie acting credits were shown for this person.';backButton();return;}
   // Refresh metadata for an existing selection without adding or removing it.
   state.selection=state.selection.map(l=>l.url===list.url?{...l,...list}:l);try{localStorage.setItem(selectionKey,JSON.stringify(state.selection))}catch{}
   renderSelection();renderFilmShelf(data,mode,requestId);$('results').textContent=data.status==='stale'?'Showing saved MyDramaList data.':'';backButton();
  }catch(e){if(requestId!==listRequest)return;$('results').textContent='Unable to load filmography: '+(['TimeoutError','AbortError'].includes(e.name)?'This request took too long. Please try again.':e.message);backButton();}
 }
 function renderFilmShelf(data,mode,requestId){
  cleanup();
  const list=data.list,abort=new AbortController(),shelf=document.createElement('article');shelf.className='catalogShelf filmographyShelf';
  const head=document.createElement('div');head.className='catalogShelfHead';const info=document.createElement('div'),title=document.createElement('h3'),subtitle=document.createElement('p');title.textContent=list.name;
  subtitle.append(document.createTextNode(list.description+' '));const count=document.createElement('span');count.className='filmographyCount';
  const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');icon.dataset.icon=mode==='director'?'movie-camera':'filmstrip';
  icon.innerHTML=mode==='director'?'<rect x="3" y="9" width="12" height="12" rx="2"/><path d="m15 13 6-3v10l-6-3"/><circle cx="6" cy="5" r="3"/><circle cx="12" cy="5" r="3"/>':'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4m-4 8h4M17 8h4m-4 8h4M7 12h10"/>';
  count.append(icon,document.createTextNode(copy.filmographyTitles.replace('{count}',String(data.items.length))));subtitle.append(count);info.append(title,subtitle);
  const actions=document.createElement('div');actions.className='catalogRowActions';const add=document.createElement('button');add.type='button';add.className='secondary catalogAdd';add.setAttribute('aria-label',copy.selectFilmography+' '+list.name);add.onclick=()=>toggleList(list);actions.append(add);head.append(info,actions);
  const track=document.createElement('div');track.className='catalogShelfTrack';track.setAttribute('aria-label',list.name);
  for(const [text,amount]of [['‹',-1],['›',1]]){const b=document.createElement('button');b.type='button';b.className='secondary catalogArrow';b.textContent=text;b.setAttribute('aria-label',amount<0?copy.catalogPrevious:copy.catalogNext);b.onclick=()=>track.scrollBy({left:amount*track.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});actions.insertBefore(b,add)}
  const dialog=document.createElement('dialog');dialog.className='catalogDialog';dialog.setAttribute('aria-label',copy.catalogTitlePreview);const close=document.createElement('button');close.type='button';close.className='secondary catalogDialogClose';close.textContent='×';close.setAttribute('aria-label',copy.closePreview);const body=document.createElement('div');dialog.append(close,body);document.body.append(dialog);close.onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});let detailId=0;
  async function preview(item){const id=++detailId;body.replaceChildren();if(item.poster){const img=document.createElement('img');img.src=item.poster;img.alt=item.name;body.append(img)}const h=document.createElement('h2');h.textContent=item.name;const meta=document.createElement('p');meta.textContent=[item.year,item.type].filter(Boolean).join(' · ');const score=document.createElement('div'),pop=document.createElement('p'),synopsis=document.createElement('p');synopsis.className='dramaSynopsis';body.append(h,meta,score,pop,synopsis);dialog.showModal();try{const d=await json('/api/mdl/drama-details?url='+encodeURIComponent(item.url));if(id!==detailId||!dialog.open||requestId!==listRequest)return;renderScore(score,d.score);if(d.popularity)pop.textContent=copy.catalogPopularity+' #'+d.popularity.toLocaleString();renderSynopsis(synopsis,d.synopsis);if(d.status==='unavailable'&&!d.synopsis)synopsis.textContent=copy.catalogDetailsUnavailable}catch{if(id===detailId&&dialog.open)synopsis.textContent=copy.catalogDetailsUnavailable}}
  const images=new Map(),buttons=[];
  for(const item of data.items){const b=document.createElement('button');b.type='button';b.className='catalogPoster';b.setAttribute('aria-label',copy.catalogTitlePreview+': '+item.name);const img=document.createElement('img');if(item.poster)img.src=item.poster;img.alt=item.name;img.loading='lazy';img.className='filmographyArtworkPending';const fallback=item.poster;img.onerror=()=>{img.onerror=null;if(fallback)img.src=fallback};images.set(item.id,img);b.append(img);const name=document.createElement('strong'),year=document.createElement('small');name.textContent=item.name;year.textContent=[item.year,item.type].filter(Boolean).join(' · ');b.append(name,year);b.onclick=()=>preview(item);track.append(b);buttons.push(b)}
  shelf.append(head,track);$('listItems').replaceChildren(shelf);
  shelfState={list,add,abort,dialog,observer:null};sync();requestAnimationFrame(alignSelection);
  const requested=new Set(),queue=[];let active=0;
  function load(offset){if(requested.has(offset)||abort.signal.aborted)return;requested.add(offset);queue.push(offset);pump()}
  function pump(){while(active<2&&queue.length){const offset=queue.shift();active++;(async()=>{try{
   const response=await fetch('/api/mdl/filmography-artwork?mode='+mode+'&url='+encodeURIComponent(list.personUrl)+'&offset='+offset,{signal:AbortSignal.any([abort.signal,AbortSignal.timeout(25000)])});
   if(!response.ok)throw Error();const payload=await response.json();if(abort.signal.aborted||requestId!==listRequest)return;
   for(const record of payload.items||[]){const item=data.items.find(x=>x.id===record.id),img=images.get(record.id);if(!item||!img)continue;let u;try{u=new URL(record.poster)}catch{continue}if(u.protocol!=='https:'||!['image.tmdb.org','i.mydramalist.com'].includes(u.hostname))continue;item.poster=u.href;img.src=u.href;img.dataset.source=record.posterSource;}
   list.posters=data.items.map(x=>x.poster).filter(Boolean).slice(0,5);const selected=state.selection.find(x=>x.url===list.url);if(selected){selected.posters=list.posters;renderSelection()}
  }catch{/* Keep original artwork if a match/provider is unavailable. */}finally{for(const item of data.items.slice(offset,offset+5))images.get(item.id)?.classList.remove('filmographyArtworkPending');active--;if(!abort.signal.aborted)pump()}})()}}
  if(typeof IntersectionObserver!=='undefined'){shelfState.observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){shelfState?.observer?.unobserve(entry.target);load(Math.floor(buttons.indexOf(entry.target)/5)*5)}},{root:track,rootMargin:'0px 100px'});buttons.forEach(b=>shelfState.observer.observe(b));}
  load(0);
 }

 function compactPerson(person,mode){
  const requestId=listRequest;
  const url='ydl-filmography:'+mode+':'+person.id;
  const name=person.displayName||person.name;
  const card=document.createElement('article');
  card.className='catalogShelf compactCatalogRow';
  const head=document.createElement('div');
  head.className='catalogShelfHead';
  const {button:preview}=compactPreviewButton(name,[]);
  if(person.poster){
   const photo=document.createElement('img');
   photo.className='compactPersonPhoto';
   photo.alt='';
   photo.src=person.poster;
   photo.loading='lazy';
   photo.decoding='async';
   photo.referrerPolicy='no-referrer';
   preview.prepend(photo);
  }
  const add=document.createElement('button');
  add.type='button';
  add.className='secondary catalogAdd';
  add.setAttribute('aria-label',copy.selectFilmography+' '+name);
  compactButtons.set(url,add);
  const credits=document.createElement('div');
  credits.className='compactPreview';
  credits.hidden=true;
  const status=document.createElement('p');
  status.className='catalogShelfStatus';
  status.setAttribute('role','status');
  status.hidden=true;
  head.append(preview,add);
  card.append(head,status,credits);
  let request;
  function load(){
   return request??=json('/api/mdl/filmography?mode='+mode+'&url='+encodeURIComponent(person.url))
    .catch(error=>{request=undefined;throw error});
  }
  function showStatus(message){
   status.textContent=message;
   status.hidden=!message;
  }
  const empty=mode==='director'?'No directing credits found.':'No acting credits found.';
  add.onclick=async()=>{
   const selected=state.selection.find(item=>item.url===url);
   if(selected){toggleList(selected);return}
   add.disabled=true;
   showStatus(copy.loadingLists);
   try{
    const data=await load();
    if(requestId!==listRequest||!card.isConnected)return;
    if(!data.sectionFound||!data.items.length){showStatus(empty);return}
    toggleList({...data.list,posters:[],analyticsSource:mode==='director'?'discover-director-filmography':'discover-actor-filmography'});
    showStatus('');
   }catch{if(requestId===listRequest&&card.isConnected)showStatus(copy.popularUnavailable)}
   finally{add.disabled=false}
  };
  preview.onclick=async()=>{
   credits.hidden=!credits.hidden;
   preview.setAttribute('aria-expanded',String(!credits.hidden));
   if(credits.hidden)return;
   credits.textContent=copy.loadingLists;
   try{
    const data=await load();
    if(requestId!==listRequest||!card.isConnected||credits.hidden)return;
    if(!data.items.length){credits.textContent=empty;return}
    const list=document.createElement('ul');
    list.className='compactPersonCredits';
    for(const credit of data.items.slice(0,5)){
     const item=document.createElement('li');
     item.textContent=[credit.name,credit.year].filter(Boolean).join(' · ');
     list.append(item);
    }
    credits.replaceChildren(list);
   }catch{if(requestId===listRequest&&!credits.hidden)credits.textContent=copy.popularUnavailable}
  };
  return card;
 }

 function renderMatches(data){
  cleanup();
  const requestId=listRequest,jobs=[];const mode=data.mode;
  $('listItems').replaceChildren();$('results').textContent=data.people.length?'':'No matching people found. Try another name.';
  if(data.warning)$('results').append(document.createTextNode(' · '+data.warning));
  for(const person of data.people){
   if(compactAndroid){$('listItems').append(compactPerson(person,mode));continue}
   const card=document.createElement('article');card.className='dramaMatch personMatch';card.dataset.personId=person.id;
   const photo=document.createElement('img');photo.alt=person.name+' photo';photo.loading='lazy';photo.referrerPolicy='no-referrer';if(person.poster){photo.src=person.poster;card.append(photo)}
   const info=document.createElement('div');info.className='dramaMatchInfo';
   const title=document.createElement('h3');title.textContent=person.displayName||person.name;
   const meta=document.createElement('p'),bio=document.createElement('p');bio.className='dramaSynopsis';
   const status=document.createElement('p');status.className='detailsStatus';
   const choose=document.createElement('button');choose.type='button';choose.className='secondary';choose.textContent=copy.viewFilmography;
   const apply=(full,notice='')=>{Object.assign(person,full);title.textContent=person.displayName||person.name;meta.textContent=person.nationality||'';renderSynopsis(bio,person.biography);choose.setAttribute('aria-label',copy.viewFilmography+' '+(person.displayName||person.name));status.textContent=notice;if(person.poster){photo.src=person.poster;if(!photo.isConnected)card.prepend(photo)}};
   apply(person,person.enriched?'':'');choose.onclick=()=>showFilmography(person,mode);
   info.append(title,meta,bio,status,choose);card.append(info);$('listItems').append(card);
   if(!person.enriched)jobs.push({person,apply,status});
  }
  let cursor=0;async function worker(){while(cursor<jobs.length){if(requestId!==listRequest)return;const job=jobs[cursor++];try{const result=await json(personApi(job.person.url,mode));if(requestId!==listRequest)return;job.person.enriched=true;job.apply(result.person,result.status==='stale'?'Showing saved MyDramaList details.':'')}catch{if(requestId===listRequest)job.status.textContent='Some person details are temporarily unavailable.'}}}
  if(compactAndroid)sync();else Promise.all([worker(),worker()]);
  if(data.page>1||data.hasNextPage){const nav=document.createElement('nav');nav.className='searchPages';nav.setAttribute('aria-label','People search result pages');
   for(const step of [-1,1]){if(step===-1&&data.page===1||step===1&&!data.hasNextPage)continue;const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=step===-1?'Previous matches':'More matches';button.onclick=()=>search(data.query,data.page+step,mode);nav.append(button)}$('listItems').append(nav);}
 }
 async function search(query,page=1,mode=state.filter){
  cleanup();const requestId=++listRequest;$('listItems').replaceChildren();$('results').textContent='';
  try{const data=await json('/api/mdl/people-search?mode='+mode+'&q='+encodeURIComponent(query)+'&page='+page);if(requestId!==listRequest)return;lastSearch=data;renderMatches(data)}catch(e){if(requestId===listRequest)$('results').textContent='Unable to search people: '+(['TimeoutError','AbortError'].includes(e.name)?'This request took too long. Please try again.':e.message)}
 }
 async function fromUrl(raw,mode=state.filter){
  cleanup();const requestId=++listRequest;$('listItems').replaceChildren();$('results').textContent='';lastSearch=null;
  try{const data=await json(personApi(raw,mode));if(requestId!==listRequest)return;lastSearch={mode,people:[{...data.person,enriched:true}],page:1,hasNextPage:false};renderMatches(lastSearch);if(data.warning)$('results').append(document.createTextNode(' · '+data.warning))}catch(e){if(requestId===listRequest)$('results').textContent='Unable to load person: '+(['TimeoutError','AbortError'].includes(e.name)?'This request took too long. Please try again.':e.message)}
 }
 return {search,fromUrl,cleanup,sync,reset(){cleanup();lastSearch=null}};
}
