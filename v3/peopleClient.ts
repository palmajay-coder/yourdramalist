/** Browser installer embedded by app.ts; no network or DOM work runs on the server. */
export function installPeopleUI(){
 let lastSearch=null;
 const personApi=(url,mode)=>'/api/mdl/person?mode='+mode+'&url='+encodeURIComponent(url);
 async function json(url){const response=await fetch(url,{signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw Error(data.error||'MyDramaList lookup failed.');return data;}
 function backButton(){if(!lastSearch)return;const back=document.createElement('button');back.type='button';back.className='secondary';back.textContent='Back';back.onclick=()=>{listRequest++;renderMatches(lastSearch)};$('results').append(document.createTextNode(' '),back);}
 async function showFilmography(person,mode){
  const requestId=++listRequest;$('listItems').replaceChildren();$('results').textContent='';
  try{const data=await json('/api/mdl/filmography?mode='+mode+'&url='+encodeURIComponent(person.url));if(requestId!==listRequest)return;
   const list=data.list;
   if(!data.sectionFound||!data.items.length){$('results').textContent=mode==='director'?'No Screenwriter & Director credits were shown for this person.':'No Drama or Movie acting credits were shown for this person.';backButton();return;}
   // Refresh metadata for an existing selection without adding or removing it.
   state.selection=state.selection.map(l=>l.url===list.url?{...l,...list}:l);try{localStorage.setItem(selectionKey,JSON.stringify(state.selection))}catch{}
   renderSelection();renderLists([list]);$('results').textContent=data.status==='stale'?'Showing saved MyDramaList data.':'';backButton();
  }catch(e){if(requestId!==listRequest)return;$('results').textContent='Unable to load filmography: '+(['TimeoutError','AbortError'].includes(e.name)?'This request took too long. Please try again.':e.message);backButton();}
 }
 function renderMatches(data){
  const requestId=listRequest,jobs=[];const mode=data.mode;
  $('listItems').replaceChildren();$('results').textContent=data.people.length?'':'No matching people found. Try another name.';
  if(data.warning)$('results').append(document.createTextNode(' · '+data.warning));
  for(const person of data.people){
   const card=document.createElement('article');card.className='dramaMatch personMatch';card.dataset.personId=person.id;
   const photo=document.createElement('img');photo.alt=person.name+' photo';photo.loading='lazy';photo.referrerPolicy='no-referrer';if(person.poster){photo.src=person.poster;card.append(photo)}
   const info=document.createElement('div');info.className='dramaMatchInfo';
   const title=document.createElement('h3');title.textContent=person.displayName||person.name;
   const meta=document.createElement('p'),bio=document.createElement('p');bio.className='dramaSynopsis';
   const status=document.createElement('p');status.className='detailsStatus';
   const choose=document.createElement('button');choose.type='button';choose.className='secondary';choose.textContent='View filmography';
   const apply=(full,notice='')=>{Object.assign(person,full);title.textContent=person.displayName||person.name;meta.textContent=person.nationality||'';renderSynopsis(bio,person.biography);choose.setAttribute('aria-label','View filmography for '+(person.displayName||person.name));status.textContent=notice;if(person.poster){photo.src=person.poster;if(!photo.isConnected)card.prepend(photo)}};
   apply(person,person.enriched?'':'');choose.onclick=()=>showFilmography(person,mode);
   info.append(title,meta,bio,status,choose);card.append(info);$('listItems').append(card);
   if(!person.enriched)jobs.push({person,apply,status});
  }
  let cursor=0;async function worker(){while(cursor<jobs.length){if(requestId!==listRequest)return;const job=jobs[cursor++];try{const result=await json(personApi(job.person.url,mode));if(requestId!==listRequest)return;job.person.enriched=true;job.apply(result.person,result.status==='stale'?'Showing saved MyDramaList details.':'')}catch{if(requestId===listRequest)job.status.textContent='Some person details are temporarily unavailable.'}}}
  Promise.all([worker(),worker()]);
  if(data.page>1||data.hasNextPage){const nav=document.createElement('nav');nav.className='searchPages';nav.setAttribute('aria-label','People search result pages');
   for(const step of [-1,1]){if(step===-1&&data.page===1||step===1&&!data.hasNextPage)continue;const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=step===-1?'← Previous matches':'More matches →';button.onclick=()=>search(data.query,data.page+step,mode);nav.append(button)}$('listItems').append(nav);}
 }
 async function search(query,page=1,mode=state.filter){
  const requestId=++listRequest;$('listItems').replaceChildren();$('results').textContent='';
  try{const data=await json('/api/mdl/people-search?mode='+mode+'&q='+encodeURIComponent(query)+'&page='+page);if(requestId!==listRequest)return;lastSearch=data;renderMatches(data)}catch(e){if(requestId===listRequest)$('results').textContent='Unable to search people: '+(['TimeoutError','AbortError'].includes(e.name)?'This request took too long. Please try again.':e.message)}
 }
 async function fromUrl(raw,mode=state.filter){
  const requestId=++listRequest;$('listItems').replaceChildren();$('results').textContent='';lastSearch=null;
  try{const data=await json(personApi(raw,mode));if(requestId!==listRequest)return;lastSearch={mode,people:[{...data.person,enriched:true}],page:1,hasNextPage:false};renderMatches(lastSearch);if(data.warning)$('results').append(document.createTextNode(' · '+data.warning))}catch(e){if(requestId===listRequest)$('results').textContent='Unable to load person: '+(['TimeoutError','AbortError'].includes(e.name)?'This request took too long. Please try again.':e.message)}
 }
 return {search,fromUrl,reset(){lastSearch=null}};
}
