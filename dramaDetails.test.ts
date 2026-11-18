import { extractDramaDetails, synopsisPreview, dramaUrl, createDetailsService, type Entry } from './dramaDetails.ts';
import { goblinHtml } from './goblinFixture.ts';
import { tmdbOnlyPreview } from './dramaDetailsApi.ts';
import { matchCatalogTitle } from './catalogMdlMatch.ts';
const url='https://mydramalist.com/18452-goblin';
let passed=0;
function assert(ok: unknown, message: string) { if(!ok) throw Error(message); }
async function test(name: string, fn:()=>unknown) { await fn();passed++;console.log('PASS '+name); }
const html=(body:string)=>'<link rel="canonical" href="'+url+'">'+body;
function memory(){const map=new Map<string,Entry>();return {map,async get(k:string){return map.get(k)},async set(k:string,v:Entry){map.set(k,v)}}}
// Details now come from Kuryana (MyDramaList's data as JSON), not the MyDramaList page itself.
const kuryanaJson=(u:string)=>new Response(JSON.stringify({success:true,data:{id:Number(u.match(/(\d+)-/)![1]),rating:8.8,ranked:178,popularity:1,synopsis:'A goblin seeks his bride.'}}),{headers:{'content-type':'application/json'}});
const response=()=>kuryanaJson(url);
await test('synthetic fixture complete synopsis and statistics parsing',()=>{
 const d=extractDramaDetails(goblinHtml,url);
 assert(d.score===8.8&&d.rank===178&&d.popularity===1,'fixture statistics');
 assert(d.synopsis?.startsWith("Kim Sin was once an unbeatable general"),'synopsis beginning');
 assert(d.synopsis?.endsWith('(Source: Synthetic fixture)'),'complete hidden ending');
 assert(d.synopsis?.includes('only gets complicated as the two fall in love.'),'hidden synopsis included');
 assert(!d.synopsis?.includes('Edit Translation')&&!d.synopsis?.includes('English'),'UI controls excluded');
});
await test('missing fields stay null; no metadata synopsis substitution',()=>{
 const d=extractDramaDetails(html('<meta name="description" content="truncated">'),url);
 assert(Object.values(d).filter(x=>x===null).length===4,'missing fields');
});
await test('preserve text entities, paragraph breaks and source links',()=>{
 const d=extractDramaDetails(html('<div class="show-synopsis"><p>A &amp; B<br>C <span class="read-more-hidden">D <a href="/profile/source">credit</a></span></p></div>'),url);
 assert(d.synopsis==='A & B\nC D credit','text preservation');
});
await test('three original sentences; shorter descriptions remain complete',()=>{
 for(const s of ['', 'One sentence.', 'One. Two.', 'One. Two. Three.', 'A long single sentence '+Array(90).fill('word').join(' ')])assert(synopsisPreview(s)===s,'short descriptions preserved');
 const s='First sentence. Second sentence! Third sentence? Fourth sentence.';
 assert(synopsisPreview(s)==='First sentence. Second sentence! Third sentence?','three sentences');
 const d=extractDramaDetails(goblinHtml,url);
 assert(synopsisPreview(d.synopsis!).endsWith('end his life.'),'Goblin first three sentences');
 assert(d.synopsis!.endsWith('(Source: Synthetic fixture)'),'full original retained');
});
await test('URL restrictions and canonical identity',()=>{
 for(const s of ['http://mydramalist.com/18452-goblin','https://evil.com/18452-goblin','https://mydramalist.com@evil.com/18452-goblin','https://mydramalist.com/list/abc','https://mydramalist.com:444/18452-goblin'])assert(dramaUrl(s)===null,'URL rejected');
 assert(dramaUrl(url+'?x=1#hi')===url,'normalized');let threw=false;try{extractDramaDetails(goblinHtml,'https://mydramalist.com/123-other')}catch{threw=true}assert(threw,'identity rejected');
});
await test('deduplicate simultaneous requests and reuse cache',async()=>{
 const c=memory();let calls=0;const get=createDetailsService(c,async()=>{calls++;await new Promise(r=>setTimeout(r,5));return response()});
 const values=await Promise.all([get(url),get(url),get(url)]);assert(calls===1&&values.every(x=>x.status==='live'),'dedup');assert((await get(url)).status==='cached'&&calls===1,'cache');
});
await test('HTTP block negative cache preserves basic search independence',async()=>{
 const c=memory();let calls=0;const get=createDetailsService(c,async()=>{calls++;return new Response('',{status:403})});
 assert((await get(url)).status==='unavailable','blocked');await get(url);assert(calls===1,'failure cooldown');
});
await test('challenge HTML and wrong content rejected',async()=>{
 for(const r of [new Response('<title>Just a moment</title>',{headers:{'content-type':'text/html'}}),new Response('{}',{headers:{'content-type':'application/json'}})]){
 const get=createDetailsService(memory(),async()=>r);assert((await get(url)).status==='unavailable','restricted');}
});
await test('stale data during refresh failure; expires after seven days',async()=>{
 const c=memory();let clock=1000000000;const d=extractDramaDetails(goblinHtml,url);
 c.map.set(url,{data:d,fetchedAt:clock-7*3600000,retryAt:0});const get=createDetailsService(c,async()=>{throw Error('network')},()=>clock);
 const r=await get(url);assert(r.status==='stale'&&r.synopsis===d.synopsis,'stale retained');clock+=8*86400000;assert((await get(url)).status==='unavailable','expired hidden');
});
await test('fetch concurrency bounded to three and excessive queue rejected',async()=>{
 let active=0,max=0;const get=createDetailsService(memory(),async(u)=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));active--;return kuryanaJson(String(u))});
 const results=await Promise.all(Array.from({length:35},(_,i)=>get('https://mydramalist.com/'+(i+1)+'-test')));assert(max===3,'max concurrency');assert(results.some(x=>x.status==='unavailable'),'bounded queue');
});
await test('60 upstream requests per minute; cache hits allowed',async()=>{
 let calls=0;const get=createDetailsService(memory(),async(u)=>{calls++;return kuryanaJson(String(u))},()=>1000);
 for(let i=1;i<=61;i++)await get('https://mydramalist.com/'+i+'-test');assert(calls===60,'rate limit');assert((await get('https://mydramalist.com/1-test')).status==='cached','cached allowed');
});
await test('oversized response refused',async()=>{
 const get=createDetailsService(memory(),async()=>new Response('a'.repeat(3000001),{headers:{'content-type':'text/html'}}));assert((await get(url)).status==='unavailable','size limited');
});
await test('a TMDB title with no MyDramaList match still gets the full preview from TMDB',()=>{
 const preview=tmdbOnlyPreview({kind:'tv',year:2025,synopsis:'A new show.',preview:{backdrop:'https://image.tmdb.org/b.jpg',poster:'',genres:[],cast:[{name:'A'}],tagline:null}});
 assert(preview.synopsis==='A new show.'&&preview.backdrop&&preview.cast.length===1&&preview.type==='Drama'&&preview.year===2025,'TMDB story, art and cast');
 assert(!('poster' in preview)&&!('genres' in preview)&&!('tagline' in preview),'empty TMDB fields are dropped');
 assert(!('mdlUrl' in preview)&&preview.status==='unavailable'&&preview.reviews.length===0,'no MyDramaList link or reviews, so no Add button');
 assert(tmdbOnlyPreview({kind:'movie',synopsis:null}).type==='Movie','movies are labelled Movie');
});
await test('TMDB titles match MyDramaList even with one-letter names or subtitles',async()=>{
 const results=[
  {title:'W',slug:'16589-w',link:'https://mydramalist.com/16589-w',year:2016,type:'Korean Drama',rating:8.3},
  {title:'W: The Unfinished Story',slug:'21631-w-the-unfinished-story',link:'https://mydramalist.com/21631-w-the-unfinished-story',year:2016,type:'Korean TV Show'},
  {title:'W Special',slug:'19970-w-special',link:'https://mydramalist.com/19970-w-special',year:2016,type:'Korean Special'},
  {title:'The Next Stop W',slug:'721665-w-two-worlds',link:'https://mydramalist.com/721665-w-two-worlds',year:2023,type:'Chinese Drama'},
 ];
 const asked:string[]=[];const search=async(q:string)=>{asked.push(q);return {dramas:results}};
 const w=await matchCatalogTitle({kind:'tv',year:2016,names:['W','W - Two Worlds Apart'],countries:['KR']},search);
 assert(w?.url==='https://mydramalist.com/16589-w'&&w.score===8.3,'"W" matches MyDramaList\'s W: '+JSON.stringify(w));
 assert(asked.includes('W'),'the one-letter name is searched: '+asked.join(', '));
 const subtitle=await matchCatalogTitle({kind:'tv',year:2016,names:['W: Two Worlds'],countries:['KR']},search);
 assert(subtitle?.url==='https://mydramalist.com/16589-w','the short title before a subtitle matches');
 assert(await matchCatalogTitle({kind:'tv',year:2017,names:['W'],countries:['KR']},search)===null,'the wrong year does not match');
 assert(await matchCatalogTitle({kind:'movie',year:2016,names:['W'],countries:['KR']},search)===null,'a movie does not match a drama');
 const twice=async()=>({dramas:[results[0],{...results[0],slug:'99-w',link:'https://mydramalist.com/99-w'}]});
 assert(await matchCatalogTitle({kind:'tv',year:2016,names:['W'],countries:['KR']},twice)===null,'two equal matches stay unmatched');
});
console.log(JSON.stringify({passed}));
