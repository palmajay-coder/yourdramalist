import {parseHTML} from 'npm:linkedom@0.18.12';
import {installPeopleUI} from './peopleClient.ts';
import {createLoadingBear} from './loadingBear.ts';
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
api=new Function('$','document','state','getRequest','setRequest','copy','fetch','localStorage','selectionKey','renderSelection','toggleList','renderSynopsis','renderScore','requestAnimationFrame','alignSelection','matchMedia','compactAndroid',`let listRequest=0;const createLoadingBear=${createLoadingBear.toString()};return (${installPeopleUI.toString()})();`)(
 (id:string)=>document.getElementById(id),document,state,()=>listRequest,(v:number)=>listRequest=v,TEXT,fetcher,{setItem:(k:string,v:string)=>saved.set(k,v)},'selection',renderSelection,toggleList,(el:any,text:string)=>el.textContent=text||'',()=>{},()=>0,()=>{},()=>({matches:true}),true
);
const flush=()=>new Promise(r=>setTimeout(r,0));
Object.assign(person,{actorCount:7,directorCount:0});
await api.fromUrl(person.url,'actor');
const card=document.querySelector('#listItems .compactCatalogRow') as any;
assert(card&&card.querySelector('h3')?.textContent==='Example Person','person card');
const add=card.querySelector('.catalogAdd') as any;assert(add.textContent==='+Add Filmography'&&add.classList.contains('discoverAddPill')&&add.getAttribute('aria-pressed')==='false','Add Filmography is the blue pill: '+add.textContent);
await add.onclick();
assert(state.selection.length===1&&state.selection[0].mode==='actor'&&state.selection[0].analyticsSource==='discover-actor-filmography','filmography added in one tap: '+JSON.stringify(state.selection));
assert(add.getAttribute('aria-pressed')==='true'&&add.textContent==='✓Added'&&add.classList.contains('is-added'),'button shows the green Added pill: '+add.textContent);
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

// TMDB credits carry a rating for the Rating sort on actor and director pages, when enough people voted.
{
  const {tmdbPersonCredits}=await import('./tmdbPeople.ts');
  const {applyShelfFilter}=await import('./shelfFilters.ts');
  const tmdbFetch=(async(input:any)=>{const u=new URL(String(input));
    if(u.pathname.endsWith('/search/person'))return Response.json({results:[{id:7,name:'Son Ye-jin',original_name:'손예진',popularity:9}]});
    return Response.json({cast:[
      {id:1,media_type:'tv',name:'Crash Landing on You',first_air_date:'2019-12-14',vote_average:8.6,vote_count:900,character:'Yoon Se-ri',genre_ids:[18]},
      {id:2,media_type:'movie',title:'The Classic',release_date:'2003-01-30',vote_average:7.9,vote_count:300,character:'Ji-hye',genre_ids:[18]},
      {id:3,media_type:'movie',title:'Little Known',release_date:'2010-01-01',vote_average:10,vote_count:2,character:'Mi-na',genre_ids:[18]}],crew:[]})}) as typeof fetch;
  const credits=await tmdbPersonCredits({name:'Son Ye-jin',nativeName:'손예진'},{fetcher:tmdbFetch,key:'k'});
  const [cloy,classic,little]=['Crash Landing on You','The Classic','Little Known'].map(n=>credits!.actor.find(c=>c.name===n)!);
  assert(cloy.score===8.6&&classic.score===7.9&&little.score===undefined,'TMDB ratings are kept, but not from two votes: '+JSON.stringify(credits!.actor.map(c=>[c.name,c.score])));
  const byRating=applyShelfFilter(credits!.actor,{sort:'rating'}).map((c:any)=>c.name).join(',');
  assert(byRating==='Crash Landing on You,The Classic,Little Known','Rating sort puts unrated titles last: '+byRating);
  console.log('PASS filmography credits carry TMDB ratings for the Rating sort');
}

// The person page's facts come from the same TMDB request as the credits, and nothing missing is invented.
{
  const {tmdbPersonCredits}=await import('./tmdbPeople.ts');
  const asked:string[]=[];
  const tmdbFetch=(async(input:any)=>{const u=new URL(String(input));asked.push(u.pathname+'?'+u.searchParams.get('append_to_response'));
    if(u.pathname.endsWith('/search/person'))return Response.json({results:[{id:440,name:'Gong Yoo',original_name:'공유',popularity:9}]});
    return Response.json({birthday:'1979-07-10',deathday:null,place_of_birth:'Busan, South Korea',biography:'Gong Yoo is an actor.',gender:2,profile_path:'/gy.jpg',
      combined_credits:{cast:[
        {id:1,media_type:'tv',name:'Goblin',first_air_date:'2016-12-02',vote_count:2000,vote_average:8.5,backdrop_path:'/goblin.jpg',character:'Kim Shin',genre_ids:[18]},
        {id:1,media_type:'tv',name:'Goblin',first_air_date:'2016-12-02',vote_count:2000,vote_average:8.5,backdrop_path:'/goblin.jpg',character:'Narrator',genre_ids:[18]},
        {id:2,media_type:'movie',title:'Train to Busan',release_date:'2016-07-20',vote_count:9000,vote_average:7.8,backdrop_path:'/train.jpg',character:'Seok-woo',genre_ids:[27]},
        {id:3,media_type:'tv',name:'Talk Show',first_air_date:'2020-01-01',vote_count:99999,backdrop_path:'/talk.jpg',character:'Himself',genre_ids:[10767]}],crew:[]}})}) as typeof fetch;
  const credits=await tmdbPersonCredits({name:'Gong Yoo',nativeName:'공유'},{fetcher:tmdbFetch,key:'k'});
  assert(asked.filter(x=>x.startsWith('/3/person/')).length===1&&asked.some(x=>x==='/3/person/440?combined_credits'),'one TMDB request for facts and credits: '+asked.join(' '));
  const p=credits!.profile!;
  assert(p.birthday==='1979-07-10'&&p.deathday===null&&p.birthplace==='Busan, South Korea'&&p.gender==='male'&&p.image==='https://image.tmdb.org/t/p/w342/gy.jpg','facts are kept as TMDB gives them: '+JSON.stringify(p));
  assert(p.backdrops.actor==='https://image.tmdb.org/t/p/w1280/train.jpg'&&p.backdrops.director===null,'the backdrop is the best-known acting title, never a talk show: '+p.backdrops.actor);
  const goblin=credits!.actor.filter(c=>c.name==='Goblin');
  assert(goblin.length===1&&goblin[0].role==='Kim Shin / Narrator'&&goblin[0].backdrop==='https://image.tmdb.org/t/p/w500/goblin.jpg','one card per title keeps both roles: '+JSON.stringify(goblin));
  const bare=await tmdbPersonCredits({name:'Gong Yoo',nativeName:null},{fetcher:(async(input:any)=>String(input).includes('/search/')?Response.json({results:[{id:5,name:'Gong Yoo'}]}):Response.json({combined_credits:{cast:[],crew:[]}})) as typeof fetch,key:'k'});
  assert(bare!.profile!.birthday===null&&bare!.profile!.birthplace===null&&bare!.profile!.biography===null&&bare!.profile!.backdrops.actor===null,'missing facts stay empty');
  console.log('PASS person facts and backdrop come from the credits request, with roles merged');
}
// Preview cast members keep their MyDramaList page so they can open a profile.
{
  const {castUrl}=await import('./dramaDetails.ts');
  const {withCastLinks}=await import('./dramaDetailsApi.ts');
  assert(castUrl('https://mydramalist.com/people/440-gong-yoo')==='https://mydramalist.com/people/440-gong-yoo'&&castUrl('people/440-gong-yoo')==='https://mydramalist.com/people/440-gong-yoo','MyDramaList person links are kept');
  assert(castUrl('https://evil.example/people/440-gong-yoo')===undefined&&castUrl('https://mydramalist.com/18452-goblin')===undefined&&castUrl('')===undefined,'anything else is dropped');
  const linked=withCastLinks([{name:'Takuya Kimura'},{name:'Nobody'}],[{name:'Kimura Takuya',url:'https://mydramalist.com/people/1-kimura-takuya'}]);
  assert(linked[0].url==='https://mydramalist.com/people/1-kimura-takuya'&&!linked[1].url,'TMDB cast gets the MyDramaList link by name, in either name order');
  console.log('PASS preview cast members carry their MyDramaList profile link');
}
