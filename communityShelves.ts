// @ts-nocheck -- installed into the existing browser scope, like exploreClient.ts.
/** Community watchlists, custom lists, direct links and drama-related lists shown as Discover-style shelves.
 * One filter bar above the shelves narrows every shelf at once; each shelf's Add button then adds that list
 * with the filter, and the live preview matches what the filtered Nuvio catalog will contain. */
export function installCommunityShelves(){
 const dialog=document.createElement('dialog');dialog.className='catalogDialog';dialog.setAttribute('aria-label',copy.catalogTitlePreview);
 const close=document.createElement('button');close.type='button';close.className='secondary catalogDialogClose';close.textContent='×';close.setAttribute('aria-label',copy.closePreview);
 const content=document.createElement('div');dialog.append(close,content);document.body.append(dialog);close.onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 let detailRequest=0,renderId=0,observer=null,viewKey='other',filter=null,panelOpen=false;
 const rows=[],facts=new Map(),factsPending=new Set(),failedRows=new Set();
 // Watchlists, custom lists and other pages (direct links, drama-related lists) each keep their own filter.
 const drafts={};
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e};
 const fill=(text,values)=>Object.entries(values).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),text);
 // Watchlist rows have no MyDramaList artwork, so their posters come from the TMDB lookup.
 const posterOf=item=>item.poster||facts.get(item.slug)?.poster||null;
 const draft=()=>drafts[viewKey]||(drafts[viewKey]={type:'',countries:[],genres:[],from:'',to:'',sort:''});
 // The full list of every drama and film is never filtered; it hides while a filter is on.
 const filterable=row=>!row.list.combined;
 async function details(item){
  const request=++detailRequest;content.replaceChildren();
  const poster=posterOf(item);if(poster){const img=node('img');img.src=poster;img.alt=item.title;img.referrerPolicy='no-referrer';content.append(img)}
  const meta=node('p',null,[item.type,item.year].filter(Boolean).join(' · '));const score=node('div'),pop=node('p'),synopsis=node('p','dramaSynopsis');
  content.append(node('h2',null,item.title),meta,score,pop,synopsis);dialog.showModal();
  try{const response=await fetch('/api/mdl/drama-details?url='+encodeURIComponent(item.url),{signal:AbortSignal.timeout(15000)});const data=await response.json();if(request!==detailRequest||!dialog.open)return;if(!response.ok)throw Error();renderScore(score,data.score);renderSynopsis(synopsis,data.synopsis);if(data.popularity)pop.textContent=copy.catalogPopularity+' #'+data.popularity.toLocaleString();if(data.status==='unavailable'&&!data.synopsis)synopsis.textContent=copy.catalogDetailsUnavailable}
  catch{if(request===detailRequest)synopsis.textContent=copy.catalogDetailsUnavailable}
 }
 // Two rows load at a time so a big profile does not flood MyDramaList.
 let workers=0;const jobs=[];
 function enqueue(job){jobs.push(job);pump()}
 function pump(){while(workers<2&&jobs.length){const job=jobs.shift();workers++;Promise.resolve().then(job).catch(()=>{}).finally(()=>{workers--;pump()})}}
 function skeleton(track){track.innerHTML='<div class="catalogSkeleton" aria-hidden="true" style="width:100%"><span></span><span></span><span></span><span></span><span></span></div>'}
 function decode(html){const t=document.createElement('textarea');t.innerHTML=String(html||'');return t.value}
 function refresh(){for(const r of rows){if(r.items)r.paint();else r.paintThumbnails?.()}renderPanel()}
 async function loadFacts(row,subset){
  // Genres and posters come from TMDB in batches of 40, two at a time; shelves and filter choices update as they arrive.
  // Titles a batch could not finish in time are asked for again, so the filter covers the whole list.
  const id=renderId,todo=(subset||row.items).filter(x=>!facts.has(x.slug)&&!factsPending.has(x.slug));
  if(!todo.length)return;
  for(const x of todo)factsPending.add(x.slug);
  refresh();
  const parts=[];for(let i=0;i<todo.length;i+=40)parts.push(todo.slice(i,i+40));
  async function fetchPart(part){
   for(let attempt=0,errors=0;part.length&&attempt<6&&errors<3;attempt++){
    if(id!==renderId)return;
    try{const r=await fetch('/api/mdl/title-facts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items:part.map(x=>({slug:x.slug,title:x.title,year:x.year,type:x.type,country:x.country}))})});const data=await r.json();if(!r.ok)throw Error();
     const left=[];for(const x of part){const f=data.facts?.[x.slug];if(f){facts.set(x.slug,f);factsPending.delete(x.slug)}else left.push(x)}
     if(left.length===part.length)errors++;part=left;}
    catch{errors++;await new Promise(r=>setTimeout(r,2000*errors))}
    if(id===renderId)refresh();
   }
   if(part.length&&id===renderId)failedRows.add(row);
  }
  let next=0;
  await Promise.all([0,1].map(async()=>{while(next<parts.length)await fetchPart(parts[next++])}));
  for(const x of todo)if(!facts.has(x.slug))factsPending.delete(x.slug);
  if(id===renderId)refresh();
 }
 function ensureFacts(){if(!filter)return;for(const r of rows)if(r.items&&filterable(r)&&shelfNeedsFacts(filter,r.items))loadFacts(r)}
 // Filter bar above the shelves.
 const bar=node('div','shelfFilterBar'),barHead=node('div','shelfFilterBarHead');
 const toggle=node('button','secondary shelfFilterToggle',copy.shelfFilter);toggle.type='button';toggle.setAttribute('aria-expanded','false');
 const summary=node('span','shelfFilterSummary'),clear=node('button','shelfReset',copy.shelfReset);clear.type='button';
 const panel=node('div','shelfFilters');panel.hidden=true;
 barHead.append(toggle,summary,clear);bar.append(barHead,panel);
 toggle.onclick=()=>{panelOpen=!panelOpen;panel.hidden=!panelOpen;toggle.setAttribute('aria-expanded',String(panelOpen));if(panelOpen){renderPanel();ensureGenres()}};
 clear.onclick=()=>{drafts[viewKey]=null;update()};
 // Opening the panel loads genres so the genre choices can appear.
 function ensureGenres(){for(const r of rows)if(filterable(r)){if(r.items)loadFacts(r);else if(compactAndroid)r.load()}}
 function choiceGroup(label,values,selected,onToggle){
  const group=node('div','shelfChoiceGroup');group.setAttribute('role','group');group.setAttribute('aria-label',label);
  for(const [value,text] of values){const b=node('button','shelfChip',text);b.type='button';b.setAttribute('aria-pressed',String(selected.includes(value)));b.onclick=()=>onToggle(value);group.append(b)}
  return group;
 }
 function field(label,control){const wrap=node('label','shelfField');wrap.append(node('span',null,label),control);return wrap}
 function select(options,value,onChange){const s=document.createElement('select');for(const [v,t] of options){const o=node('option',null,t);o.value=v;if(String(v)===String(value??''))o.setAttribute('selected','');s.append(o)}s.onchange=()=>onChange(s.value);return s}
 function update(){filter=normalizeShelfFilter(draft());for(const r of rows){r.card.hidden=!!filter&&!filterable(r);if(r.items)r.paint();r.sync()}renderBar();ensureFacts();if(compactAndroid&&filter)for(const r of rows)if(filterable(r)&&!r.items)r.load()}
 function renderBar(){
  const label=filter?shelfFilterLabel(filter):'';
  summary.textContent=label?fill(copy.shelfFiltering,{label}):'';clear.hidden=!filter;
  bar.hidden=!rows.some(filterable);renderPanel();
 }
 function renderPanel(){
  if(!panelOpen)return;
  const d=draft(),seen=new Set(),items=[];
  for(const r of rows)if(r.items&&filterable(r))for(const x of r.items)if(!seen.has(x.slug)){seen.add(x.slug);items.push(x)}
  const known=Object.fromEntries([...facts].filter(([s])=>seen.has(s)));
  const countryNames=Object.fromEntries(FILTER_COUNTRIES);
  const presentCountries=[...new Set(items.map(x=>shelfCountry(x,known[x.slug])).filter(Boolean))];
  const countries=FILTER_COUNTRIES.filter(([c])=>presentCountries.includes(c)||d.countries.includes(c));
  const presentGenres=new Set(items.flatMap(x=>known[x.slug]?.genres||[]));
  const genres=FILTER_GENRES.filter(g=>presentGenres.has(g)||d.genres.includes(g)).map(g=>[g,g]);
  const years=[...new Set(items.map(x=>Number(x.year)).filter(Boolean))].sort((a,b)=>b-a).map(y=>[String(y),String(y)]);
  panel.replaceChildren();
  panel.append(node('p','shelfGroupLabel',copy.shelfFilterType),choiceGroup(copy.shelfFilterType,[['drama',copy.shelfDramas],['movie',copy.shelfMovies]],d.type?[d.type]:[],v=>{d.type=d.type===v?'':v;update()}));
  const grid=node('div','shelfFilterGrid');
  grid.append(field(copy.shelfFrom,select([['',copy.shelfAny],...years],String(d.from||''),v=>{d.from=v;update()})));
  grid.append(field(copy.shelfTo,select([['',copy.shelfAny],...years],String(d.to||''),v=>{d.to=v;update()})));
  grid.append(field(copy.shelfSort,select([['',copy.shelfSortDefault],...(rows.some(r=>r.list.kind==='watchlist'&&filterable(r)&&(r.items||[]).some(x=>x.added>0))?[['added',copy.shelfSortAdded]]:[]),['newest',copy.shelfSortNewest],['oldest',copy.shelfSortOldest],['az',copy.shelfSortAz]],d.sort,v=>{d.sort=v;update()})));
  panel.append(grid);
  if(countries.length)panel.append(node('p','shelfGroupLabel',copy.shelfCountry),choiceGroup(copy.shelfCountry,countries.map(([c])=>[c,countryNames[c]||c]),d.countries,v=>{d.countries=d.countries.includes(v)?d.countries.filter(x=>x!==v):[...d.countries,v];update()}));
  panel.append(node('p','shelfGroupLabel',copy.shelfGenre));
  if(genres.length)panel.append(choiceGroup(copy.shelfGenre,genres,d.genres,v=>{d.genres=d.genres.includes(v)?d.genres.filter(x=>x!==v):[...d.genres,v];update()}));
  const done=items.filter(x=>facts.has(x.slug)).length;
  if(done<items.length)panel.append(node('p','shelfHint',failedRows.size?copy.shelfGenresUnavailable:fill(copy.shelfGenresLoading,{done,total:items.length})));
 }
 function shelf(l,parent){
  const row={list:l,items:null};rows.push(row);
  const card=node('article','catalogShelf communityShelf'),head=node('div','catalogShelfHead'),info=node('div');row.card=card;
  const title=userListName(l)||copy.untitledList;
  const preview=compactAndroid?compactPreviewButton(title,l.posters):null;
  const count=node('p','shelfStats');
  function showCount(total){
   count.hidden=typeof total!=='number';
   count.textContent=count.hidden?'':copy.filmographyTitles.replace('{count}',String(total));
  }
  if(preview){
   card.classList.add('compactCatalogRow');
   showCount(l.count);
   info.append(preview.button,count);
  }else{
   const description=decode(l.description),stats=[];
   if(typeof l.count==='number')stats.push('▣ '+l.count+' titles');if(typeof l.loves==='number')stats.push('♡ '+l.loves+' loves');if(typeof l.comments==='number')stats.push('▤ '+l.comments+' comments');
   info.append(node('h3',null,title));
   if(description)info.append(node('p',null,description));
   if(stats.length)info.append(node('p','shelfStats',stats.join(' · ')));
  }
  const actions=node('div','catalogRowActions'),add=node('button','secondary catalogAdd');add.type='button';
  actions.append(add);head.append(info,actions);
  const status=node('p','shelfStatus');const track=node('div','catalogShelfTrack');track.setAttribute('aria-label',userListName(l)||copy.untitledList);
  card.append(head,status,track);parent.append(card);card.hidden=!!filter&&!filterable(row);
  if(preview){
   track.className='compactPreview';
   track.hidden=true;
   preview.button.onclick=()=>{
    track.hidden=!track.hidden;
    preview.button.setAttribute('aria-expanded',String(!track.hidden));
    if(!track.hidden){if(row.items)row.paint();else row.load()}
   };
   row.paintThumbnails=()=>{
    const items=row.shown||row.sample||[];
    const posters=items.map(posterOf).filter(Boolean);
    preview.showPosters(posters.length||rowFilter()?posters:(l.posters||[]));
   };
  }
  const rowFilter=()=>filterable(row)?filter:null;
  row.url=()=>rowFilter()?l.url+(l.url.includes('?')?'&':'?')+'ydlf='+shelfFilterKey(rowFilter()):l.url;
  row.selectionItem=()=>{
   const posters=(row.shown||row.items||[]).map(posterOf).filter(Boolean).slice(0,5);
   const base={...l,posters:posters.length?posters:(l.posters||[])};
   if(!rowFilter())return base;
   const baseName=l.originalName||l.name;
   return{...base,url:row.url(),originalName:baseName,name:baseName,filter:rowFilter(),filterLabel:shelfFilterLabel(rowFilter())};
  };
  row.factsPending=()=>!!rowFilter()&&shelfNeedsFacts(rowFilter(),row.items||[])&&(row.items||[]).some(x=>!facts.has(x.slug))&&!failedRows.has(row);
  add.onclick=()=>{if(rowFilter()&&row.items&&!row.shown?.length&&!row.factsPending()){notices.show(copy.shelfNoMatches);return}toggleList(row.selectionItem())};
  row.sync=()=>{const on=state.selection.some(x=>x.url===row.url());add.textContent=on?copy.catalogAdded:compactAndroid?copy.compactCatalogAdd:copy.catalogAdd;add.setAttribute('aria-pressed',String(on));add.setAttribute('aria-label',(on?copy.catalogAdded:copy.catalogSelect)+' '+userListName(row.selectionItem()))};
  row.paint=()=>{
   if(!row.items)return;
   const f=rowFilter();
   row.shown=applyShelfFilter(row.items,f,Object.fromEntries(facts));
   if(preview){
    row.paintThumbnails();
    row.sync();
    if(track.hidden)return;
    track.replaceChildren();
    for(const item of (f?row.shown:row.shown.slice(0,60))){
     const button=node('button','compactTitle',item.title);
     button.type='button';
     button.onclick=()=>details(item);
     track.append(button);
    }
    if(!row.shown.length)track.append(node('p','catalogShelfStatus',row.factsPending()?copy.loadingLists:row.items.length?copy.shelfNoMatches:copy.shelfEmpty));
    return;
   }
   track.replaceChildren();
   // Unfiltered shelves show a sample; a filter shows every match.
   for(const item of (f?row.shown:row.shown.slice(0,60))){
    const b=node('button','catalogPoster');b.type='button';b.setAttribute('aria-label',copy.catalogTitlePreview+': '+item.title);
    const poster=posterOf(item);if(poster){const img=node('img');img.src=poster;img.alt=item.title;img.loading='lazy';img.referrerPolicy='no-referrer';b.append(img)}else b.append(node('span','shelfPosterBlank',item.title));
    b.append(node('strong',null,item.title),node('small',null,item.year?String(item.year):''));b.onclick=()=>details(item);track.append(b);
   }
   if(!row.shown.length)track.append(node('p','catalogShelfStatus',row.factsPending()?fill(copy.shelfGenresLoading,{done:row.items.filter(x=>facts.has(x.slug)).length,total:row.items.length}):(row.items.length?copy.shelfNoMatches:copy.shelfEmpty)));
   const arrows=actions.querySelectorAll('.catalogArrow');
   if(row.shown.length>5&&!arrows.length)for(const [text,amount] of [['‹',-1],['›',1]]){const a=node('button','secondary catalogArrow',text);a.type='button';a.setAttribute('aria-label',amount<0?copy.catalogPrevious:copy.catalogNext);a.onclick=()=>track.scrollBy({left:amount*track.clientWidth,behavior:'smooth'});actions.insertBefore(a,add)}
   if(row.shown.length<=5)arrows.forEach(a=>a.remove());
   status.textContent=f?fill(copy.shelfShowing,{shown:row.shown.length,total:row.items.length})+(row.factsPending()?' · '+fill(copy.shelfGenresLoading,{done:row.items.filter(x=>facts.has(x.slug)).length,total:row.items.length}):'')+' · '+fill(copy.shelfAddsAs,{name:userListName(row.selectionItem())}):'';
   row.sync();
  };
  row.load=()=>{
   if(row.loading||row.items)return;
   row.loading=true;
   const id=renderId;
   enqueue(async()=>{
    try{
     if(id!==renderId||!card.isConnected)return;
     if(l.empty){track.replaceChildren(node('p','catalogShelfStatus',copy.shelfEmpty));return}
     if(preview)track.replaceChildren(node('p','catalogShelfStatus',copy.loadingLists));
     else skeleton(track);
     const response=await fetch('/api/mdl/shelf?url='+encodeURIComponent(l.url),{signal:AbortSignal.timeout(45000)});
     const data=await response.json();
     if(id!==renderId||!card.isConnected)return;
     if(!response.ok)throw Error(data.error);
     row.items=data.items||[];
     if(preview)showCount(data.total);
     row.paint();renderPanel();
     if(!preview){
      const bare=row.items.slice(0,60).filter(x=>!x.poster);
      if(bare.length)loadFacts(row,bare);
     }
     if(filterable(row)&&(panelOpen||filter&&shelfNeedsFacts(filter,row.items)))loadFacts(row);
    }catch(e){
     if(id!==renderId||!card.isConnected)return;
     track.replaceChildren();
     const p=node('p','catalogShelfStatus',(e&&e.message)||copy.shelfUnavailable),retry=node('button','secondary catalogRetry',copy.catalogRetry);
     retry.type='button';retry.onclick=()=>row.load();track.append(p,retry);
    }finally{row.loading=false}
   });
  };
  row.loadThumbnails=()=>{
   if(l.empty||l.posters?.length)return;
   const id=renderId;
   enqueue(async()=>{
    if(id!==renderId||!card.isConnected)return;
    try{
     const response=await fetch('/api/mdl/shelf?preview=1&url='+encodeURIComponent(l.url),{signal:AbortSignal.timeout(15000)});
     if(!response.ok)return;
     const data=await response.json();
     if(id!==renderId||!card.isConnected)return;
     row.sample=(data.items||[]).slice(0,3);
     showCount(data.total);
     row.paintThumbnails();
     const missing=row.sample.filter(item=>!item.poster);
     if(missing.length)loadFacts(row,missing);
    }catch{/* The catalog remains usable if its thumbnail is unavailable. */}
   });
  };
  if(l.empty)add.disabled=true;
  row.sync();if(!preview)skeleton(track);
  return{card,row};
 }
 function render(lists,key){
  renderId++;observer?.disconnect();rows.length=0;jobs.length=0;failedRows.clear();
  viewKey=key||'other';filter=normalizeShelfFilter(draft());
  const parent=$('listItems');parent.replaceChildren(bar);activeLists=lists;
  const targets=new Map();
  for(const l of lists){if(l.unavailable||!l.url)continue;const {card,row}=shelf(l,parent);targets.set(card,row)}
  renderBar();
  if(typeof IntersectionObserver!=='undefined'){observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);(compactAndroid?targets.get(entry.target)?.loadThumbnails:targets.get(entry.target)?.load)?.()}},{rootMargin:'200px'});for(const card of targets.keys())observer.observe(card)}
  else if(!compactAndroid)for(const row of targets.values())row.load();
 }
 function sync(){for(const row of rows)row.sync()}
 // What Select all adds: every shelf on screen, with the current filter.
 function items(){return rows.filter(r=>!r.card.hidden).map(r=>r.selectionItem())}
 return{render,sync,items};
}
