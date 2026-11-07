import {parseHTML} from 'npm:linkedom@0.18.12';
import {installPeopleUI} from './peopleClient.ts';
import {handlePeople} from './peopleApi.ts';
import {TEXT} from './text.ts';
import {matchArtwork} from './collections.ts';
import {extractPerson,makeFilmography} from './people.ts';
import {actorHtml,directorHtml} from './peopleFixtures.ts';
const assert=(v:any,m:string)=>{if(!v)throw Error(m)};
const {document,window}=parseHTML('<html><body><div id="results"></div><div id="listItems"></div></body></html>');
const state={filter:'actor',selection:[]as any[]};let listRequest=0;
const person={id:'1',name:'Example Person',displayName:'Example Person',url:'https://mydramalist.com/people/1-example',enriched:true};
const items=Array.from({length:7},(_,i)=>({id:String(i+10),name:'Title '+i,url:'https://mydramalist.com/'+(i+10)+'-example',year:2025-i,type:i%2?'Movie':'Drama',poster:'https://i.mydramalist.com/example.jpg'}));
items[0].poster=null;
let api:any,artworkRequests=0;const saved=new Map();
const fetcher=async(url:string)=>{if(url.includes('filmography-artwork')){artworkRequests++;return Response.json({items:items.slice(0,5).map(x=>({id:x.id,poster:'https://image.tmdb.org/t/p/w780/example.jpg',posterSource:'TMDB'}))})}if(url.includes('filmography?'))return Response.json({sectionFound:true,items,list:{kind:'filmography',url:'person:'+state.filter,personUrl:person.url,name:'Example Person’s Filmography',description:state.filter==='actor'?TEXT.actorFilmographyDescription.replace('{name}',person.name):TEXT.directorFilmographyDescription.replace('{name}',person.name),mode:state.filter}});if(url.includes('drama-details'))return Response.json({score:8.5,synopsis:'Original synopsis.',popularity:123});return Response.json({person})};
const renderSelection=()=>{},toggleList=(list:any)=>{const i=state.selection.findIndex(x=>x.url===list.url);if(i<0)state.selection.push(list);else state.selection.splice(i,1);api.sync()};
api=new Function('$','document','state','getRequest','setRequest','copy','fetch','localStorage','selectionKey','renderSelection','toggleList','renderSynopsis','renderScore','requestAnimationFrame','alignSelection','matchMedia',`let listRequest=0;return (${installPeopleUI.toString()})();`)(
 (id:string)=>document.getElementById(id),document,state,()=>listRequest,(v:number)=>listRequest=v,TEXT,fetcher,{setItem:(k:string,v:string)=>saved.set(k,v)},'selection',renderSelection,toggleList,(el:any,text:string)=>el.textContent=text||'',()=>{},()=>0,()=>{},()=>({matches:true})
);
const flush=()=>new Promise(r=>setTimeout(r,0));
await api.fromUrl(person.url,'actor');(document.querySelector('.personMatch button')as any).click();await flush();
assert(document.querySelectorAll('.catalogPoster').length===7,'filmography order/count lost');
assert(document.querySelector('.filmographyCount svg')?.getAttribute('data-icon')==='filmstrip','actor icon');
assert(document.querySelector('.catalogShelfHead p')?.textContent?.includes('Explore dramas and films featuring Example Person.'),'actor copy');
(document.querySelector('.catalogAdd')as any).click();assert(state.selection.length===1&&document.querySelector('.catalogAdd')?.getAttribute('aria-pressed')==='true','selection add');
state.selection=[];api.sync();assert(document.querySelector('.catalogAdd')?.getAttribute('aria-pressed')==='false','sidebar/clear sync');
await flush();assert(artworkRequests===1&&document.querySelector('.catalogPoster img')?.getAttribute('src')?.includes('image.tmdb.org'),'TMDB artwork not applied');
state.filter='director';await api.fromUrl(person.url,'director');(document.querySelector('.personMatch button')as any).click();await flush();
assert(document.querySelector('.filmographyCount svg')?.getAttribute('data-icon')==='movie-camera','director icon');
assert(document.querySelector('.catalogShelfHead p')?.textContent?.includes('Explore films directed by Example Person.'),'director copy');
api.cleanup();assert(!document.querySelector('.catalogDialog'),'modal not cleaned up');
const item={name:'Example',details:'Drama - 2024'},r={name:'Example',first_air_date:'2024-01-01',poster_path:'/example.jpg',origin_country:['JP']};
assert(matchArtwork(item,[r],'tv')?.includes('w780'),'cross-country acting credit rejected');assert(!matchArtwork(item,[r,r],'tv'),'ambiguous match accepted');assert(!matchArtwork(item,[{...r,origin_country:['US']}],'tv'),'unrelated TV origin accepted');
for(const [html,mode]of [[actorHtml,'actor'],[directorHtml,'director']]as const){const p=extractPerson(html,'https://mydramalist.com/people/'+(mode==='actor'?'293-son-ye-jin':'15987-park-chan-wook'));const data=makeFilmography(p,mode);assert(data.list.description===(mode==='actor'?TEXT.actorFilmographyDescription:TEXT.directorFilmographyDescription).replace('{name}',p.name),'catalog copy differs from shelf');}
console.log('PASS filmography shelves, role icons, exact copy, full-list selection, TMDB batches, cross-country matching and cleanup');

for(const query of ['mode=invalid&url=https://mydramalist.com/people/1-example','mode=actor&url=https://evil.test/people/1-example','mode=actor&url=https://mydramalist.com/people/1-example&offset=-1','mode=actor&url=https://mydramalist.com/people/1-example&offset=1000'])assert((await handlePeople(new Request('https://test/api/mdl/filmography-artwork?'+query))).status===400,'unsafe artwork request accepted');
console.log('PASS artwork endpoint validates role, person URL and bounded offset before network access');
