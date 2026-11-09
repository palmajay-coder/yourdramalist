// @ts-nocheck -- installed into the existing browser scope, like exploreClient.ts.
/** Community watchlists, custom lists, direct links and drama-related lists shown as Discover-style shelves,
 * with a filter bar whose live preview matches what the filtered Nuvio catalog will contain. */
export function installCommunityShelves(){
 const dialog=document.createElement('dialog');dialog.className='catalogDialog';dialog.setAttribute('aria-label',copy.catalogTitlePreview);
 const close=document.createElement('button');close.type='button';close.className='secondary catalogDialogClose';close.textContent='×';close.setAttribute('aria-label',copy.closePreview);
 const content=document.createElement('div');dialog.append(close,content);document.body.append(dialog);close.onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 let detailRequest=0,renderId=0,observer=null;const rows=[];const facts=new Map();const factsPending=new Set();
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e};
 const fill=(text,values)=>Object.entries(values).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),text);
 async function details(item){
  const request=++detailRequest;content.replaceChildren();
  if(item.poster){const img=node('img');img.src=item.poster;img.alt=item.title;img.referrerPolicy='no-referrer';content.append(img)}
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
 async function loadFacts(row){
  // Genres come from TMDB in small batches; the shelf and genre choices update as they arrive.
  const id=renderId,todo=row.items.filter(x=>!facts.has(x.slug)&&!factsPending.has(x.slug));
  for(const x of todo)factsPending.add(x.slug);
  row.factsDone=row.items.length-todo.length;row.paint();
  for(let i=0;i<todo.length;i+=40){
   if(id!==renderId)return;
   const part=todo.slice(i,i+40);
   try{const r=await fetch('/api/mdl/title-facts',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items:part.map(x=>({slug:x.slug,title:x.title,year:x.year,type:x.type}))})});const data=await r.json();if(!r.ok)throw Error();for(const x of part){facts.set(x.slug,data.facts?.[x.slug]||{genres:[]});factsPending.delete(x.slug)}}
   catch{for(const x of part)factsPending.delete(x.slug);row.factsFailed=true}
   row.factsDone=row.items.filter(x=>facts.has(x.slug)).length;for(const r of rows)if(r.items)r.paint()
  }
 }
 function shelf(l,parent){
  const row={list:l,items:null,filter:null,factsDone:0,factsFailed:false};rows.push(row);
  const card=node('article','catalogShelf communityShelf'),head=node('div','catalogShelfHead'),info=node('div');
  const description=decode(l.description);const stats=[];
  if(typeof l.count==='number')stats.push('▣ '+l.count+' titles');if(typeof l.loves==='number')stats.push('♡ '+l.loves+' loves');if(typeof l.comments==='number')stats.push('▤ '+l.comments+' comments');
  info.append(node('h3',null,userListName(l)||copy.untitledList));
  if(description)info.append(node('p',null,description));
  if(stats.length)info.append(node('p','shelfStats',stats.join(' · ')));
  const actions=node('div','catalogRowActions'),add=node('button','secondary catalogAdd');add.type='button';
  const filterButton=node('button','secondary shelfFilterToggle',copy.shelfFilter);filterButton.type='button';filterButton.setAttribute('aria-expanded','false');filterButton.hidden=true;
  actions.append(filterButton,add);head.append(info,actions);
  const panel=node('div','shelfFilters');panel.hidden=true;const status=node('p','shelfStatus');const track=node('div','catalogShelfTrack');track.setAttribute('aria-label',userListName(l)||copy.untitledList);
  card.append(head,panel,status,track);parent.append(card);
  const keyOf=()=>row.filter?shelfFilterKey(row.filter):'';
  row.url=()=>row.filter?l.url+(l.url.includes('?')?'&':'?')+'ydlf='+keyOf():l.url;
  row.selectionItem=()=>{
   const posters=(row.shown||row.items||[]).map(x=>x.poster).filter(Boolean).slice(0,5);
   const base={...l,posters:posters.length?posters:(l.posters||[])};
   if(!row.filter)return base;
   const baseName=l.originalName||l.name;
   return{...base,url:row.url(),originalName:baseName,name:baseName,filter:row.filter,filterLabel:shelfFilterLabel(row.filter)};
  };
  add.onclick=()=>{if(row.filter&&row.items&&!row.shown?.length&&!row.factsPending()){notices.show(copy.shelfNoMatches);return}toggleList(row.selectionItem())};
  row.sync=()=>{const on=state.selection.some(x=>x.url===row.url());add.textContent=on?copy.catalogAdded:copy.catalogAdd;add.setAttribute('aria-pressed',String(on));add.setAttribute('aria-label',(on?copy.catalogAdded:copy.catalogSelect)+' '+(row.filter?userListName(row.selectionItem()):userListName(l)))};
  row.factsPending=()=>!!row.filter&&shelfNeedsFacts(row.filter,row.items||[])&&row.factsDone<(row.items||[]).length&&!row.factsFailed;
  const controls={};
  function choiceGroup(label,values,selected,onToggle){
   const group=node('div','shelfChoiceGroup');group.setAttribute('role','group');group.setAttribute('aria-label',label);
   for(const [value,text] of values){const b=node('button','shelfChip',text);b.type='button';b.setAttribute('aria-pressed',String(selected.includes(value)));b.onclick=()=>onToggle(value);group.append(b)}
   return group;
  }
  function field(label,control){const wrap=node('label','shelfField');wrap.append(node('span',null,label),control);return wrap}
  function select(options,value,onChange){const s=document.createElement('select');for(const [v,t] of options){const o=node('option',null,t);o.value=v;if(String(v)===String(value??''))o.setAttribute('selected','');s.append(o)}s.onchange=()=>onChange(s.value);return s}
  function draft(){return row.draft||(row.draft={type:'',countries:[],genres:[],from:'',to:'',sort:''})}
  function update(){row.filter=normalizeShelfFilter(draft());renderPanel();row.paint();row.sync();if(row.filter&&shelfNeedsFacts(row.filter,row.items||[]))loadFacts(row)}
  function renderPanel(){
   if(panel.hidden||!row.items)return;
   const d=draft(),items=row.items,known=Object.fromEntries([...facts].filter(([s])=>items.some(x=>x.slug===s)));
   const countryNames=Object.fromEntries(FILTER_COUNTRIES);
   const presentCountries=[...new Set(items.map(x=>shelfCountry(x,known[x.slug])).filter(Boolean))];
   const countries=FILTER_COUNTRIES.filter(([c])=>presentCountries.includes(c)||d.countries.includes(c));
   const presentGenres=new Set(items.flatMap(x=>known[x.slug]?.genres||[]));
   const genres=FILTER_GENRES.filter(g=>presentGenres.has(g)||d.genres.includes(g)).map(g=>[g,g]);
   const years=[...new Set(items.map(x=>Number(x.year)).filter(Boolean))].sort((a,b)=>b-a).map(y=>[String(y),String(y)]);
   panel.replaceChildren();
   const grid=node('div','shelfFilterGrid');
   grid.append(field(copy.shelfFilterType,select([['',copy.shelfAllTypes],['drama',copy.shelfDramas],['movie',copy.shelfMovies]],d.type,v=>{d.type=v;update()})));
   grid.append(field(copy.shelfFrom,select([['',copy.shelfAny],...years],String(d.from||''),v=>{d.from=v;update()})));
   grid.append(field(copy.shelfTo,select([['',copy.shelfAny],...years],String(d.to||''),v=>{d.to=v;update()})));
   grid.append(field(copy.shelfSort,select([['',copy.shelfSortDefault],['newest',copy.shelfSortNewest],['oldest',copy.shelfSortOldest],['az',copy.shelfSortAz]],d.sort,v=>{d.sort=v;update()})));
   panel.append(grid);
   if(countries.length){panel.append(node('p','shelfGroupLabel',copy.shelfCountry),choiceGroup(copy.shelfCountry,countries.map(([c])=>[c,countryNames[c]||c]),d.countries,v=>{d.countries=d.countries.includes(v)?d.countries.filter(x=>x!==v):[...d.countries,v];update()}))}
   panel.append(node('p','shelfGroupLabel',copy.shelfGenre));
   if(genres.length)panel.append(choiceGroup(copy.shelfGenre,genres,d.genres,v=>{d.genres=d.genres.includes(v)?d.genres.filter(x=>x!==v):[...d.genres,v];update()}));
   const done=items.filter(x=>facts.has(x.slug)).length;
   if(done<items.length)panel.append(node('p','shelfHint',row.factsFailed?copy.shelfGenresUnavailable:fill(copy.shelfGenresLoading,{done,total:items.length})));
   const reset=node('button','shelfReset',copy.shelfReset);reset.type='button';reset.onclick=()=>{row.draft=null;update()};panel.append(reset);
  }
  row.paint=()=>{
   if(!row.items)return;
   const known=Object.fromEntries(facts);
   row.shown=applyShelfFilter(row.items,row.filter,known);
   track.replaceChildren();
   for(const item of row.shown.slice(0,60)){
    const b=node('button','catalogPoster');b.type='button';b.setAttribute('aria-label',copy.catalogTitlePreview+': '+item.title);
    if(item.poster){const img=node('img');img.src=item.poster;img.alt=item.title;img.loading='lazy';img.referrerPolicy='no-referrer';b.append(img)}else b.append(node('span','shelfPosterBlank',item.title));
    b.append(node('strong',null,item.title),node('small',null,item.year?String(item.year):''));b.onclick=()=>details(item);track.append(b);
   }
   if(!row.shown.length)track.append(node('p','catalogShelfStatus',row.factsPending()?fill(copy.shelfGenresLoading,{done:row.factsDone,total:row.items.length}):(row.items.length?copy.shelfNoMatches:copy.shelfEmpty)));
   if(row.shown.length>5&&!actions.querySelector('.catalogArrow'))for(const [text,amount] of [['‹',-1],['›',1]]){const a=node('button','secondary catalogArrow',text);a.type='button';a.setAttribute('aria-label',amount<0?copy.catalogPrevious:copy.catalogNext);a.onclick=()=>track.scrollBy({left:amount*track.clientWidth,behavior:'smooth'});actions.insertBefore(a,filterButton)}
   status.textContent=row.filter?fill(copy.shelfShowing,{shown:row.shown.length,total:row.items.length})+' · '+fill(copy.shelfAddsAs,{name:userListName(row.selectionItem())}):'';
   renderPanel();
  };
  filterButton.onclick=()=>{panel.hidden=!panel.hidden;filterButton.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){renderPanel();loadFacts(row)}};
  row.load=()=>enqueue(async()=>{
   const id=renderId;if(l.empty){track.replaceChildren(node('p','catalogShelfStatus',copy.shelfEmpty));return}
   skeleton(track);
   try{const response=await fetch('/api/mdl/shelf?url='+encodeURIComponent(l.url),{signal:AbortSignal.timeout(45000)});const data=await response.json();if(id!==renderId)return;if(!response.ok)throw Error(data.error);row.items=data.items||[];filterButton.hidden=!row.items.length;row.paint()}
   catch(e){if(id!==renderId)return;track.replaceChildren();const p=node('p','catalogShelfStatus',(e&&e.message)||copy.shelfUnavailable);const retry=node('button','secondary catalogRetry',copy.catalogRetry);retry.type='button';retry.onclick=()=>row.load();track.append(p,retry)}
  });
  if(l.empty)add.disabled=true;
  row.sync();skeleton(track);
  return{card,row};
 }
 function render(lists){
  renderId++;observer?.disconnect();rows.length=0;jobs.length=0;
  const parent=$('listItems');parent.replaceChildren();activeLists=lists;
  const targets=new Map();
  for(const l of lists){if(l.unavailable||!l.url)continue;const {card,row}=shelf(l,parent);targets.set(card,row)}
  if(typeof IntersectionObserver!=='undefined'){observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);targets.get(entry.target)?.load()}},{rootMargin:'200px'});for(const card of targets.keys())observer.observe(card)}
  else for(const row of targets.values())row.load();
 }
 function sync(){for(const row of rows)row.sync()}
 return{render,sync};
}
