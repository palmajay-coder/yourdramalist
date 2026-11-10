// @ts-nocheck -- installed into the existing browser scope, like exploreClient.ts.
/** "Popular this month" card under Your Selection on the Discover tab. It lists the built-in catalogs and the
 * actors and directors people added most over the last 30 days, each with a one-tap Add button.
 * It stays hidden until there is enough data, and each list appears only when it has entries. */
export function installPopularCard(){
 const root=$('popularCard');let data=null,loading=false,visible=false,tab='catalogs';const pending=new Set();
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e};
 const personUrl=slug=>'https://mydramalist.com/people/'+slug;
 const catalogItem=row=>({...exploreCatalog(row.category,row.country),analyticsSource:'popular-this-month'});
 const selectedCatalog=row=>state.selection.find(x=>x.url===exploreCatalog(row.category,row.country).url);
 const selectedPerson=row=>state.selection.find(x=>x.kind==='filmography'&&String(x.personUrl||'').replace(/\/$/,'').endsWith('/people/'+row.slug));
 async function load(){
  loading=true;
  try{const r=await fetch('/api/popular');const d=await r.json();if(r.ok)data=d}catch{/* The card simply stays hidden. */}
  loading=false;render();
 }
 async function addPerson(row){
  const existing=selectedPerson(row);if(existing){toggleList(existing);return}
  pending.add(row.slug);render();
  try{
   const r=await fetch('/api/mdl/filmography?mode='+row.mode+'&url='+encodeURIComponent(personUrl(row.slug)),{signal:AbortSignal.timeout(30000)});const d=await r.json();
   if(!r.ok||!d.list)throw Error(d.error||copy.popularUnavailable);
   toggleList({...d.list,analyticsSource:'popular-this-month'});
  }catch(e){notices.show((e&&e.message)||copy.popularUnavailable)}
  finally{pending.delete(row.slug);render()}
 }
 function render(){
  const catalogs=data?.catalogs||[],people=data?.people||[];
  root.hidden=!visible||!catalogs.length&&!people.length;
  if(root.hidden)return;
  if(tab==='people'&&!people.length)tab='catalogs';
  if(tab==='catalogs'&&!catalogs.length)tab='people';
  root.replaceChildren(node('h3',null,copy.popularTitle));
  // The tabs only appear once both lists have entries.
  if(catalogs.length&&people.length){
   const tabs=node('div','popularTabs');tabs.setAttribute('role','group');
   for(const [key,label] of [['catalogs',copy.popularCatalogs],['people',copy.popularPeople]]){const b=node('button','popularTab',label);b.type='button';b.setAttribute('aria-pressed',String(tab===key));b.onclick=()=>{tab=key;render()};tabs.append(b)}
   root.append(tabs);
  }
  const list=node('ol','popularList');
  for(const row of tab==='people'?people:catalogs){
   const li=node('li','popularRow');
   if(tab==='people'){
    const face=node('span','popularFace');
    if(row.photo){const img=node('img');img.src=row.photo;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=()=>{img.remove();face.textContent=row.name.charAt(0).toUpperCase()};face.append(img)}else face.textContent=row.name.charAt(0).toUpperCase();
    li.append(face);
   }
   const text=node('span','popularName',tab==='people'?row.name:row.label);
   if(row.count)text.append(node('small','popularCount',copy.popularAdds.replace('{count}',String(row.count))));
   const on=tab==='people'?!!selectedPerson(row):!!selectedCatalog(row),busy=tab==='people'&&pending.has(row.slug);
   const add=node('button','secondary popularAdd',busy?'…':on?copy.popularAdded:copy.popularAddShort);add.type='button';add.disabled=busy;add.setAttribute('aria-pressed',String(on));
   add.setAttribute('aria-label',(on?copy.catalogAdded:copy.catalogSelect)+' '+(tab==='people'?row.name:row.label));
   add.onclick=()=>{if(tab==='people')addPerson(row);else{const existing=selectedCatalog(row);toggleList(existing||catalogItem(row))}};
   li.append(text,add);list.append(li);
  }
  root.append(list);
 }
 function show(on){visible=on;if(on&&!data&&!loading)load();render()}
 return{show,sync:render};
}