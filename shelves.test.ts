import {parseHTML} from "npm:linkedom@0.18.12";
import handler from "./app.ts";
import {applyShelfFilter,normalizeShelfFilter,shelfFilterLabel,shelfFilterKey,shelfCountry,shelfNeedsFacts} from "./shelfFilters.ts";
import {factsGenresFor,pickTmdbResult,getTitleFacts,expectedCountry} from "./titleFacts.ts";
import {shelfSource,createShelfHandler} from "./shelfApi.ts";
import {normalizeAddon,makeManifest,loadCatalog} from "./addon.ts";
let passed=0;const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};async function test(name:string,fn:()=>unknown){await fn();passed++;console.log("PASS "+name)}

// Synthetic titles shaped like MyDramaList watchlist rows (numeric country) and list rows (type with nationality).
const items=[
 {slug:"1-love-a",title:"Love A",type:"Drama",year:2021,country:"3",image:"https://i.mydramalist.com/a_4c.jpg"},
 {slug:"2-city-b",title:"City B",type:"Movie",year:2018,country:"2"},
 {slug:"3-ghost-c",title:"Ghost C",type:"Japanese Drama",year:2015},
 {slug:"4-old-d",title:"Old D",type:"Korean Movie",year:2001},
 {slug:"5-thai-e",title:"Thai E",type:"Drama",year:2023,country:""},
];
const facts={"1-love-a":{genres:["Drama","Romance"]},"2-city-b":{genres:["Crime","Thriller"],poster:"https://image.tmdb.org/t/p/w342/cityb.jpg"},"3-ghost-c":{genres:["Horror"]},"4-old-d":{genres:["Romance"]},"5-thai-e":{genres:["Comedy"],country:"TH"}};

await test("filters apply type, country, release years, genres and sort",()=>{
 const slugs=(f:any)=>applyShelfFilter(items,normalizeShelfFilter(f),facts).map(x=>x.slug).join(",");
 assert(slugs({type:"movie"})==="2-city-b,4-old-d","type filter");
 assert(slugs({type:"drama"})==="1-love-a,3-ghost-c,5-thai-e","dramas include every non-movie type");
 assert(slugs({countries:["KR"]})==="1-love-a,4-old-d","country from watchlist code and list type");
 assert(slugs({countries:["TH"]})==="5-thai-e","country falls back to TMDB facts");
 assert(slugs({from:2015,to:2021})==="1-love-a,2-city-b,3-ghost-c","year range");
 assert(slugs({genres:["Romance"]})==="1-love-a,4-old-d","genre filter");
 assert(slugs({sort:"newest"})==="5-thai-e,1-love-a,2-city-b,3-ghost-c,4-old-d","newest first");
 const added=[{slug:"1-a",added:10},{slug:"2-b",added:30},{slug:"3-c",added:20}];
 assert(applyShelfFilter(added,normalizeShelfFilter({sort:"added"}),{}).map(x=>x.slug).join(",")==="2-b,3-c,1-a","date added puts the latest addition first");
 assert(applyShelfFilter(items,normalizeShelfFilter({sort:"added"}),{}).map(x=>x.slug).join(",")==="1-love-a,2-city-b,3-ghost-c,4-old-d,5-thai-e","lists without add order keep their own order");
 assert(slugs({sort:"az"})==="2-city-b,3-ghost-c,1-love-a,4-old-d,5-thai-e","A to Z");
 assert(applyShelfFilter(items,null,facts)===items,"no filter keeps MyDramaList order");
});
await test("filter values are cleaned and labelled consistently",()=>{
 assert(normalizeShelfFilter({type:"tv",countries:["XX"],genres:["Fake"],sort:"random"})===null,"unknown values should drop");
 const f=normalizeShelfFilter({type:"drama",countries:["KR"],genres:["Romance"],from:"2024",to:"2018",sort:"newest"})!;
 assert(f.from===2018&&f.to===2024,"years should swap into order");
 assert(shelfFilterLabel(f)==="Korean Romance Dramas","year and sort stay out of the name: "+shelfFilterLabel(f));
 assert(shelfFilterKey(f)===shelfFilterKey(normalizeShelfFilter({sort:"newest",to:2024,from:2018,genres:["Romance"],countries:["KR"],type:"drama"})),"key should not depend on order");
 assert(shelfFilterKey(f)!==shelfFilterKey(normalizeShelfFilter({type:"movie"})),"different filters need different keys");
 assert(shelfFilterLabel(normalizeShelfFilter({countries:["KR","JP"],genres:["Comedy","Romance"],type:"drama"}))==="Japanese & Korean Comedy & Romance Dramas","several countries and genres read as one phrase");
 assert(shelfFilterLabel(normalizeShelfFilter({sort:"az"}))===""&&shelfFilterLabel(normalizeShelfFilter({sort:"added"}))===""&&shelfFilterLabel(normalizeShelfFilter({from:2018}))==="","sort or year alone leaves the name unchanged");
 assert(shelfCountry({type:"Hong Kong Movie"})==="HK"&&shelfCountry({country:"1"})==="JP","country mapping");
 assert(shelfNeedsFacts({genres:["Romance"]},items)&&!shelfNeedsFacts({type:"movie"},items),"facts only when needed");
});
await test("TMDB genres fill in Romance, Thriller, Horror and Historical for dramas from keywords",()=>{
 assert(factsGenresFor("tv",[18,10765],["romantic comedy","joseon dynasty"]).join(",")==="Drama,Fantasy,Historical,Romance,Sci-Fi","tv genres + keywords");
 assert(factsGenresFor("movie",[10749,53]).join(",")==="Romance,Thriller","movie genres");
 const pick=pickTmdbResult([{id:1,name:"Pulse",first_air_date:"2024-01-01"},{id:2,name:"Pulse",first_air_date:"2001-02-03"}],"Pulse",2001);
 assert(pick?.id===2,"year should pick the right TMDB entry");
});
await test("title facts are looked up once per title with genres and country",async()=>{
 let calls=0;
 const fetcher=(async(input:URL)=>{calls++;const u=new URL(String(input));
  if(u.pathname==="/3/search/tv")return Response.json({results:[{id:77,name:"Love A",first_air_date:"2021-03-01",genre_ids:[18],origin_country:["KR"],poster_path:"/loveA.jpg"}]});
  if(u.pathname==="/3/tv/77/keywords")return Response.json({results:[{name:"love triangle"}]});
  if(u.pathname==="/3/search/movie")return Response.json({results:[{id:88,title:"City B",release_date:"2018-05-01",genre_ids:[80],original_language:"zh"}]});
  return new Response("",{status:404});}) as typeof fetch;
 const out=await getTitleFacts([{slug:"1-love-a",title:"Love A",year:2021,type:"Drama"},{slug:"2-city-b",title:"City B",year:2018,type:"Movie"},{slug:"bad slug",title:"x"}],{key:"test",fetcher});
 assert(out["1-love-a"].genres.join(",")==="Drama,Romance"&&out["1-love-a"].country==="KR"&&out["1-love-a"].poster==="https://image.tmdb.org/t/p/w342/loveA.jpg","drama facts: "+JSON.stringify(out["1-love-a"]));
 assert(!out["2-city-b"].poster,"no poster when TMDB has none");
 assert(out["2-city-b"].genres.join(",")==="Crime"&&out["2-city-b"].country==="CN","movie facts");
 assert(!out["bad slug"]&&calls===3,"invalid slugs skipped; one search per title plus drama keywords");
 let searches:string[]=[];
 const crowded=(async(input:URL)=>{const u=new URL(String(input));searches.push(u.searchParams.get("primary_release_year")||"any");
  if(u.searchParams.get("primary_release_year")==="2021")return Response.json({results:[{id:5,title:"Midnight",release_date:"2021-06-30",genre_ids:[53],original_language:"ko",poster_path:"/midnight.jpg"}]});
  return Response.json({results:Array.from({length:10},(_,i)=>({id:100+i,title:"Midnight",release_date:(1990+i)+"-01-01",genre_ids:[18]}))});}) as typeof fetch;
 const mid=await getTitleFacts([{slug:"40349-midnight",title:"Midnight",year:2021,type:"Korean Movie"}],{key:"test",fetcher:crowded});
 assert(mid["40349-midnight"].poster==="https://image.tmdb.org/t/p/w342/midnight.jpg"&&searches.join()==="2021","common titles are found by searching within the release year: "+searches.join());
 searches=[];
 const old=await getTitleFacts([{slug:"1498-time",title:"Time",year:2018,type:"Korean Drama"}],{key:"test",fetcher:(async()=>{searches.push("x");return Response.json({results:[]})}) as typeof fetch});
 assert(!old["1498-time"].poster&&searches.length===2,"a miss tries the year search, then a plain search");
 const lost=pickTmdbResult([{id:1,name:"Lost and Found",first_air_date:"2008-03-01",origin_country:["US"],original_language:"en"},{id:2,name:"Lost and Found",first_air_date:"2008-05-01",origin_country:["TW"],original_language:"zh"}],"Lost and Found",2008,expectedCountry({type:"Taiwanese Drama"}));
 assert(lost?.id===2,"a same-name show from another country is turned down");
 assert(!pickTmdbResult([{id:1,name:"Lost and Found",first_air_date:"2008-03-01",origin_country:["US"]}],"Lost and Found",2008,"TW"),"no match beats the wrong match");
 assert(expectedCountry({country:"3"})==="KR"&&pickTmdbResult([{id:9,title:"Midnight",release_date:"2021-06-30",original_language:"ko"}],"Midnight",2021,"KR")?.id===9,"Korean film matches by language");
});
await test("shelf endpoint accepts only MyDramaList lists and watchlists",async()=>{
 assert(shelfSource("https://mydramalist.com/list/AbCd1234")?.kind==="list","list");
 assert((shelfSource("https://mydramalist.com/dramalist/Sample/completed") as any)?.status==="completed","watchlist status");
 assert(!shelfSource("https://evil.test/list/AbCd1234")&&!shelfSource("https://mydramalist.com/dramalist/sample/unknown"),"unsafe sources rejected");
 const h=createShelfHandler({load:async()=>items,facts:async()=>({})});
 const r=await h(new Request("https://test/api/mdl/shelf?url="+encodeURIComponent("https://mydramalist.com/dramalist/sample/completed")));
 const data=await r.json();
 assert(r.status===200&&data.items.length===5&&data.items[0].poster==="https://i.mydramalist.com/a_4c.jpg"&&data.items[0].url==="https://mydramalist.com/1-love-a","shelf items");
 assert((await h(new Request("https://test/api/mdl/title-facts",{method:"POST",headers:{origin:"https://evil.test"},body:"{}"}))).status===403,"cross-site facts requests rejected");
});
await test("filtered catalogs get their own id and a server-built name in Nuvio",async()=>{
 const url="https://mydramalist.com/dramalist/Sample/completed";
 const c=normalizeAddon({catalogs:[
  {name:"Sample’s Completed",url},
  {name:"Sample’s Completed: Korean Dramas",url:url+"?ydlf=x",filter:{type:"drama",countries:["KR"]}},
  {name:"Sample’s Dramas and Films",url:"https://mydramalist.com/dramalist/Sample",filter:{type:"movie"}},
  {name:"Fake name",url:"https://mydramalist.com/list/AbCd1234",filter:{genres:["Romance"],sort:"newest"}},
 ],preferences:{}});
 assert(c.entries.length===4&&new Set(c.entries.map(e=>e.id)).size===4,"filtered and unfiltered versions coexist");
 assert(!c.entries[2].filter&&c.entries[2].id==="watchlist:sample","the full watchlist ignores filters");
 assert(c.entries[1].name==="Sample’s Completed"&&c.entries[1].filterLabel==="Korean Dramas","label is rebuilt by the server");
 const names=makeManifest(c).catalogs.map((x:any)=>x.name);
 assert(names[1]==="Sample’s Completed: Korean Dramas"&&names[3]==="Fake name: Romance","manifest names: "+names.join(" | "));
 const pool=[{slug:"1-love-a",title:"Love A",type:"Drama",year:2021,country:"3"},{slug:"2-city-b",title:"City B",type:"Movie",year:2018,country:"2"}];
 const result=await loadCatalog(c,1,0,"https://test/addon/token",{hidden:async()=>new Set(),watchlistCategory:async()=>pool,map:async(list:any[],type:string)=>list.map(x=>({id:"tt"+x.slug.split("-")[0],name:x.title,type,poster:"https://image.test/p.jpg"}))} as any);
 assert(result.metas.map((m:any)=>m.name).join(",")==="Love A","Nuvio catalog applies the same filter");
});

// Setup page, app layout (the only layout visitors see): Community shows one card per list, and the
// header Filter button opens a filter sheet that applies to every list before adding it.
const html=await(await handler(new Request("https://test/setup/lists"))).text();
const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
function mountApp(fetcher:(input:string,init?:any)=>Promise<Response>,saved=new Map<string,string>()){
 const {document,window}=parseHTML(html);
 // linkedom has no modal dialogs; open and close them the way a browser would.
 const proto=Object.getPrototypeOf(document.createElement("dialog"));
 proto.showModal=function(){this.open=true};proto.show=proto.showModal;
 proto.close=function(){if(!this.open)return;this.open=false;this.dispatchEvent(new window.Event("close"))};
 new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(
  window,document,{getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v),removeItem:(k:string)=>saved.delete(k)},
  {href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists",search:"",hostname:"test"},{state:null,pushState(s:any){this.state=s},replaceState(s:any){this.state=s},back(){}},fetcher,()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}}
 );
 return document;
}
const settle=()=>new Promise(r=>setTimeout(r,10));
const waitFor=async(check:()=>unknown,message:string,tries=200)=>{for(let i=0;i<tries;i++){if(check())return;await settle()}throw Error(message)};
const profileFetcher=async(input:string)=>{
 const url=String(input);
 if(url.startsWith("/api/mdl/profile"))return Response.json({profileName:"Sample",lists:[{name:"Sample’s Completed",url:"https://mydramalist.com/dramalist/sample/completed",kind:"watchlist"},{name:"Sample’s Dramas and Films",url:"https://mydramalist.com/dramalist/sample",kind:"watchlist",combined:true},{name:"Thai Romance",url:"https://mydramalist.com/list/AbCd1234",kind:"list",profile:"Sample"}]});
 if(url.startsWith("/api/mdl/shelf"))return Response.json({items:items.map(x=>({...x,url:"https://mydramalist.com/"+x.slug,poster:x.image||null})),total:5});
 if(url.startsWith("/api/mdl/title-facts"))return Response.json({facts});
 return Response.json({});
};
await test("Community cards list every profile list and the filter sheet adds a filtered catalog",async()=>{
 const saved=new Map<string,string>();const document=mountApp(profileFetcher,saved);
 (document.getElementById("profileInput") as any).value="Sample";
 await (document.getElementById("profileForm") as any).onsubmit({preventDefault(){}});
 const cards=()=>[...document.querySelectorAll("#listItems article")] as any[];
 await waitFor(()=>cards().length===3,"one card per list should appear");
 assert(cards().map(c=>c.querySelector("strong,h3")?.textContent).join(" | ")==="Sample’s All Dramas & Films | Sample’s Completed | Thai Romance","the combined watchlist comes first, then sections, then custom lists");
 (document.querySelector(".androidFilterButton") as any).click();
 const sheet=document.querySelector(".androidFiltersDialog") as any;
 assert(sheet&&sheet.open,"Filter should open the Community filter sheet");
 const chip=(text:string)=>[...sheet.querySelectorAll(".shelfChip")].find((b:any)=>b.textContent===text) as any;
 chip("Shows").click();chip("Romance").click();
 ([...sheet.querySelectorAll("button")].find((b:any)=>b.textContent==="Show Results") as any).click();
 assert(!sheet.open,"Show Results should close the sheet");
 const completed=cards()[1];
 await waitFor(()=>completed.querySelector(".catalogAdd"),"the card keeps its Add button");
 await waitFor(()=>/Love A/.test(completed.textContent)&&!/City B|Ghost C|Old D|Thai E/.test(completed.textContent),"the card previews only Romance dramas");
 (completed.querySelector(".catalogAdd") as any).click();
 const selection=JSON.parse(saved.get("ydl-v3-selection")!);
 assert(selection.length===1&&selection[0].name==="Sample’s Completed: Romance Dramas"&&selection[0].filter.type==="drama"&&selection[0].filter.genres.join()==="Romance"&&/\?ydlf=/.test(selection[0].url),"filtered catalog should be selected with its label: "+JSON.stringify(selection[0]));
 assert(completed.querySelector(".catalogAdd").getAttribute("aria-pressed")==="true","Add should show Added for this filter");
 (document.querySelector(".androidFilterButton") as any).click();
 ([...sheet.querySelectorAll("button")].find((b:any)=>b.textContent==="Clear") as any).click();
 ([...sheet.querySelectorAll("button")].find((b:any)=>b.textContent==="Show Results") as any).click();
 await waitFor(()=>completed.querySelector(".catalogAdd").getAttribute("aria-pressed")==="false","clearing the filter shows the unfiltered list, which is not added yet");
});
console.log(JSON.stringify({passed}));
