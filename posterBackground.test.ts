import {POSTER_SEEDS,chooseBackgroundPoster,createPosterService,createBackdropService,rankBackdropShows,chooseBackdrop} from "./posterBackground.ts";
let passed=0;const ok=(v:any)=>{if(!v)throw Error("Assertion failed")};async function test(name:string,f:()=>any){await f();passed++;console.log("PASS "+name)}
function record(seed=POSTER_SEEDS[0]){return {id:seed.id,name:seed.name,title:seed.name,origin_country:[seed.kind==="tv"?"KR":"JP"],genres:[{id:18}],type:"Scripted",poster_path:"/Approved.jpg",images:{posters:[{file_path:"/Approved.jpg",width:1400,height:2100,aspect_ratio:2/3,vote_average:5,vote_count:10}]}}}
const response=(data:any)=>new Response(JSON.stringify(data),{headers:{"content-type":"application/json"}});
await test("native resolution validated and fixed 780px artwork selected",()=>{const v=chooseBackgroundPoster(record(),"tv");ok(v.sourceWidth===1400&&v.poster==="https://image.tmdb.org/t/p/w780/Approved.jpg")});
await test("undersized, landscape and unsafe artwork rejected",()=>{for(const image of [{width:500},{height:700},{aspect_ratio:1.78},{file_path:"https://evil.test/p.jpg"}]){const r=record();Object.assign(r.images.posters[0],image);ok(chooseBackgroundPoster(r,"tv")===null)}});
await test("non-Korean TV, animation, adult and reality excluded",()=>{for(const patch of [{origin_country:["US"]},{genres:[{id:16}]},{adult:true},{type:"Reality"},{genres:[{id:35}]}])ok(chooseBackgroundPoster({...record(),...patch},"tv")===null)});
await test("only allowlisted Asian movie origins accepted",()=>{ok(chooseBackgroundPoster({...record(),origin_country:["JP"]},"movie"));ok(!chooseBackgroundPoster({...record(),origin_country:["US"]},"movie"))});
await test("cache and concurrent requests share refresh, never expose key",async()=>{let calls=0,active=0,max=0,saved:any;const s=createPosterService({load:async()=>saved,save:async v=>{saved=v}},()=>"private-test-key",async url=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,2));active--;const u=new URL(url);if(u.pathname.endsWith("configuration"))return response({images:{poster_sizes:["w780"]}});const id=Number(u.pathname.split("/").pop());return response(record(POSTER_SEEDS.find(x=>x.id===id)!))});const [a,b]=await Promise.all([s(),s()]);ok(a.posters.length===12&&calls===13&&max<=3);ok(!JSON.stringify(a).includes("private-test-key")&&!JSON.stringify(saved).includes("private-test-key"));ok((await s()).status==="cached"&&calls===13)});
await test("stored cache reload avoids upstream API",async()=>{const saved={posters:[chooseBackgroundPoster(record(),"tv")],at:Date.now(),expires:Date.now()+86400000};const s=createPosterService({load:async()=>saved,save:async()=>{}},()=>"key",async()=>{throw Error("must not fetch")});ok((await s()).status==="cached")});
await test("failed refresh retains last good artwork and cooldown",async()=>{let clock=1000000000,calls=0;const saved={posters:[chooseBackgroundPoster(record(),"tv")],at:clock-2*86400000,expires:clock-1};const s=createPosterService({load:async()=>saved,save:async()=>{}},()=>"key",async()=>{calls++;return new Response("",{status:429})},()=>clock);ok((await s()).status==="stale");await s();ok(calls===1);clock+=31*86400000;ok((await s()).status==="fallback")});
await test("missing key and invalid-key errors use approved fallback without leakage",async()=>{for(const key of [undefined,"invalid-secret"]){let calls=0;const s=createPosterService({load:async()=>null,save:async()=>{}},()=>key,async()=>{calls++;return new Response("",{status:401})});const v=await s();ok(v.status==="fallback"&&v.posters.length===12&&!JSON.stringify(v).includes("invalid-secret"));await s();ok(calls===(key?1:0))}});

const NOW=Date.parse("2026-11-19T00:00:00Z"),daysAgo=(d:number)=>new Date(NOW-d*86400000).toISOString().slice(0,10);
const show=(id:number,age:number,popularity:number,patch:any={})=>({id,name:"Show "+id,origin_country:["KR"],genre_ids:[18],first_air_date:daysAgo(age),popularity,backdrop_path:"/b"+id+".jpg",...patch});
await test("backdrops: Korean dramas only, newest and popular first, old shows dropped",()=>{
 const ranked=rankBackdropShows([show(1,300,900),show(2,20,500),show(3,10,50),show(4,40,800),show(5,900,999),show(6,5,700,{origin_country:["US"]}),show(7,5,700,{genre_ids:[10764]}),show(8,5,700,{backdrop_path:null}),show(2,20,500),show(9,-5,999)],NOW);
 ok(ranked.map(x=>x.id).join()==="4,2,3,1")});
await test("backdrops: English title art first, then the default, then a clean still",()=>{
 const art=(file:string,lang:string|null,patch:any={})=>({file_path:file,iso_639_1:lang,width:1920,height:1080,aspect_ratio:1.778,vote_average:5,...patch});
 ok(chooseBackdrop({backdrops:[art("/clean.jpg",null),art("/small.jpg","en",{width:800}),art("/titled.jpg","en")]},"/default.jpg")==="/titled.jpg");
 ok(chooseBackdrop({backdrops:[art("/clean.jpg",null)]},"/default.jpg")==="/default.jpg");
 ok(chooseBackdrop({backdrops:[art("/clean.jpg",null)]},null)==="/clean.jpg");
 ok(chooseBackdrop({backdrops:[art("https://evil.test/x.jpg","en")]},null)===null)});
await test("backdrops: refresh queries trending and new Korean dramas, caches a day, hides the key",async()=>{
 const urls:URL[]=[];let saved:any;
 const s=createBackdropService({load:async()=>saved,save:async v=>{saved=v}},()=>"private-test-key",async url=>{const u=new URL(url);urls.push(u);
  if(u.pathname.endsWith("/images"))return response({backdrops:[{file_path:"/t"+u.pathname.split("/")[4]+".jpg",iso_639_1:"en",width:1920,height:1080,aspect_ratio:1.778}]});
  const base=u.pathname.includes("trending")?100:200;return response({results:Array.from({length:8},(_,i)=>show(base+Number(u.searchParams.get("page"))*10+i,10+i*20,100-i))})},()=>NOW);
 const v=await s();ok(v.status==="live"&&v.backdrops.length>=10&&v.backdrops[0].image.startsWith("https://image.tmdb.org/t/p/w780/t"));
 const d=urls.find(u=>u.pathname.endsWith("discover/tv"))!;
 ok(d.searchParams.get("with_origin_country")==="KR"&&d.searchParams.get("with_genres")==="18"&&d.searchParams.get("without_genres")==="16,10763,10764,10767"&&d.searchParams.get("first_air_date.lte")==="2026-11-19");
 ok(urls.some(u=>u.pathname.endsWith("trending/tv/week")));
 ok(!JSON.stringify(v).includes("private-test-key")&&!JSON.stringify(saved).includes("private-test-key"));
 const calls=urls.length;ok((await s()).status==="cached"&&urls.length===calls)});
await test("backdrops: missing key or TMDB failure falls back without leaking",async()=>{for(const key of [undefined,"invalid-secret"]){const s=createBackdropService({load:async()=>null,save:async()=>{}},()=>key,async()=>new Response("",{status:401}),()=>NOW);const v=await s();ok(v.status==="fallback"&&!JSON.stringify(v).includes("invalid-secret"))}});
console.log(JSON.stringify({passed}));
