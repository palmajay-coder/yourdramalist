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
let api:any;const asked:string[]=[];
// In the app layout each person is a card with one Add button: it adds the role with more credits.
const fetcher=async(url:string)=>{asked.push(url);const mode=url.includes('mode=director')?'director':'actor';
 if(url.includes('filmography?'))return Response.json({sectionFound:true,items,list:{kind:'filmography',url:'ydl-filmography:'+mode+':'+person.id,personUrl:person.url,name:'Example Person’s Filmography',mode}});
 return Response.json({person})};
const renderSelection=()=>{},toggleList=(list:any)=>{const i=state.selection.findIndex(x=>x.url===list.url);if(i<0)state.selection.push(list);else state.selection.splice(i,1);api.sync()};
api=new Function('$','document','state','getRequest','setRequest','copy','fetch','localStorage','selectionKey','renderSelection','toggleList','renderSynopsis','renderScore','requestAnimationFrame','alignSelection','matchMedia','compactAndroid',`let listRequest=0;return (${installPeopleUI.toString()})();`)(
 (id:string)=>document.getElementById(id),document,state,()=>listRequest,(v:number)=>listRequest=v,TEXT,fetcher,{setItem:(k:string,v:string)=>saved.set(k,v)},'selection',renderSelection,toggleList,(el:any,text:string)=>el.textContent=text||'',()=>{},()=>0,()=>{},()=>({matches:true}),true
);
const flush=()=>new Promise(r=>setTimeout(r,0));
Object.assign(person,{actorCount:7,directorCount:0});
await api.fromUrl(person.url,'actor');
const card=document.querySelector('#listItems .compactCatalogRow') as any;
assert(card&&card.querySelector('h3')?.textContent==='Example Person','person card');
const add=card.querySelector('.catalogAdd') as any;assert(add.textContent==='Add Filmography'&&add.getAttribute('aria-pressed')==='false','Add Filmography button');
await add.onclick();
assert(state.selection.length===1&&state.selection[0].mode==='actor'&&state.selection[0].analyticsSource==='discover-actor-filmography','filmography added in one tap: '+JSON.stringify(state.selection));
assert(add.getAttribute('aria-pressed')==='true'&&add.textContent===TEXT.catalogAdded,'button shows Added');
await add.onclick();assert(state.selection.length===0&&add.getAttribute('aria-pressed')==='false','second tap removes it');
Object.assign(person,{actorCount:2,directorCount:9});await api.fromUrl(person.url,'director');
await (document.querySelector('#listItems .compactCatalogRow .catalogAdd') as any).onclick();
assert(state.selection[0]?.mode==='director'&&asked.some(u=>u.includes('filmography?mode=director')),'a mostly-directing person adds the director filmography');
state.selection=[];api.sync();
Object.assign(person,{actorCount:0,directorCount:0});await api.fromUrl(person.url,'actor');
const empty=document.querySelector('#listItems .compactCatalogRow') as any;await empty.querySelector('.catalogAdd').onclick();
assert(state.selection.length===0&&/No filmography credits found/.test(empty.querySelector('.catalogShelfStatus').textContent),'no credits shows a message instead of adding');
api.cleanup();
const item={name:'Example',details:'Drama - 2024'},r={name:'Example',first_air_date:'2024-01-01',poster_path:'/example.jpg',origin_country:['JP']};
assert(matchArtwork(item,[r],'tv')?.includes('w780'),'cross-country acting credit rejected');assert(!matchArtwork(item,[r,r],'tv'),'ambiguous match accepted');assert(!matchArtwork(item,[{...r,origin_country:['US']}],'tv'),'unrelated TV origin accepted');
for(const [html,mode]of [[actorHtml,'actor'],[directorHtml,'director']]as const){const p=extractPerson(html,'https://mydramalist.com/people/'+(mode==='actor'?'293-son-ye-jin':'15987-park-chan-wook'));const data=makeFilmography(p,mode);assert(data.list.description===(mode==='actor'?TEXT.actorFilmographyDescription:TEXT.directorFilmographyDescription).replace('{name}',p.name),'catalog copy differs from shelf');}
console.log('PASS person cards add the right filmography in one tap, cross-country matching and filmography copy');

for(const query of ['mode=invalid&url=https://mydramalist.com/people/1-example','mode=actor&url=https://evil.test/people/1-example'])assert((await handlePeople(new Request('https://test/api/mdl/filmography?'+query))).status===400,'invalid filmography request accepted: '+query);
assert((await handlePeople(new Request('https://test/api/mdl/filmography?mode=actor&url=https://mydramalist.com/people/1-example',{method:'POST'}))).status===405,'write method accepted');
console.log('PASS filmography endpoint validates role and person URL before network access');
