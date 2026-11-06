// @ts-nocheck -- installed into the existing V3 browser scope.
export function installExploreUI(){
 const categories=exploreCategories,countries=exploreCountries;
 const root=$('exploreSearch'),label=document.createElement('label');label.textContent='Country';label.htmlFor='exploreCountry';
 const select=document.createElement('select');select.id='exploreCountry';
 for(const [value,name] of countries){const o=document.createElement('option');o.value=value;o.textContent=name;select.append(o)}
 root.append(label,select);const controls=document.createElement('div');controls.className='filters';root.append(controls);
 function catalog(k){return exploreCatalog(k[0],select.value)}
 function render(){
  if(state.tab!=='discover'||state.filter!=='catalogs')return;
  listRequest++;$('results').textContent='';
  renderLists(categories.map(catalog));
  // Previews are optional; selecting a catalog never depends on a live fetch.
  for(const [i,card] of [...$('listItems').children].entries()){
   const c=catalog(categories[i]),button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='View titles';
   button.onclick=()=>titles(c,1);card.querySelector('.listinfo').append(button);
  }
  requestAnimationFrame(alignSelection);
 }
 async function titles(c,page){
  const request=++listRequest;$('listItems').replaceChildren();$('results').textContent='';
  try{
   const response=await fetch(c.catalogEndpoint+'&page='+page,{signal:AbortSignal.timeout(15000)}),data=await response.json();
   if(request!==listRequest)return;if(!response.ok)throw Error(data.error||'Unable to load titles.');
   $('results').replaceChildren();const back=document.createElement('button');back.className='secondary';back.textContent='Back';back.onclick=render;$('results').append(back);
   if(data.warning){const p=document.createElement('p');p.textContent=data.warning;$('results').append(p)}
   c.posters=data.items.map(x=>x.poster).filter(Boolean).slice(0,5);
   renderLists([c]);
   const selected=state.basket.find(x=>x.url===c.url);if(selected){selected.posters=c.posters;try{localStorage.setItem(basketKey,JSON.stringify(state.basket))}catch{}renderBasket()}
   renderDramaMatches({dramas:data.items,page:1,hasNextPage:false},{append:true,relatedLists:false});
   if(!data.items.length){const p=document.createElement('p');p.textContent='No titles were returned for this catalog.';$('listItems').append(p)}
   const nav=document.createElement('nav');nav.className='searchPages';
   for(const [name,n] of [['← Previous',page-1],['More titles →',page+1]])if(n>0&&(n<page||data.hasNextPage)){const b=document.createElement('button');b.className='secondary';b.textContent=name;b.onclick=()=>titles(c,n);nav.append(b)}
   $('listItems').append(nav);
  }catch(e){if(request!==listRequest)return;$('results').textContent=e.message;const back=document.createElement('button');back.className='secondary';back.textContent='Back';back.onclick=render;$('results').append(back)}
 }
 select.onchange=render;return {render};
}
