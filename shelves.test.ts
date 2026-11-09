import {parseHTML} from "npm:linkedom@0.18.12";
import handler from "./app.ts";
import {applyShelfFilter,normalizeShelfFilter,shelfFilterLabel,shelfFilterKey,shelfCountry,shelfNeedsFacts} from "./shelfFilters.ts";
import {factsGenresFor,pickTmdbResult,getTitleFacts} from "./titleFacts.ts";
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
const facts={"1-love-a":{genres:["Drama","Romance"]},"2-city-b":{genres:["Crime","Thriller"]},"3-ghost-c":{genres:["Horror"]},"4-old-d":{genres:["Romance"]},"5-thai-e":{genres:["Comedy"],country:"TH"}};

await test("filters apply type, country, release years, genres and sort",()=>{
 const slugs=(f:any)=>applyShelfFilter(items,normalizeShelfFilter(f),facts).map(x=>x.slug).join(",");
 assert(slugs({type:"movie"})==="2-city-b,4-old-d","type filter");
 assert(slugs({type:"drama"})==="1-love-a,3-ghost-c,5-thai-e","dramas include every non-movie type");
 assert(slugs({countries:["KR"]})==="1-love-a,4-old-d","country from watchlist code and list type");
 assert(slugs({countries:["TH"]})==="5-thai-e","country falls back to TMDB facts");
 assert(slugs({from:2015,to:2021})==="1-love-a,2-city-b,3-ghost-c","year range");
 assert(slugs({genres:["Romance"]})==="1-love-a,4-old-d","genre filter");
 assert(slugs({sort:"newest"})==="5-thai-e,1-love-a,2-city-b,3-ghost-c,4-old-d","newest first");
 assert(slugs({sort:"az"})==="2-city-b,3-ghost-c,1-love-a,4-old-d,5-thai-e","A to Z");
 assert(applyShelfFilter(items,null,facts)===items,"no filter keeps MyDramaList order");
});
await test("filter values are cleaned and labelled consistently",()=>{
 assert(normalizeShelfFilter({type:"tv",countries:["XX"],genres:["Fake"],sort:"random"})===null,"unknown values should drop");
 const f=normalizeShelfFilter({type:"drama",countries:["KR"],genres:["Romance"],from:"2024",to:"2018",sort:"newest"})!;
 assert(f.from===2018&&f.to===2024,"years should swap into order");
 assert(shelfFilterLabel(f)==="Korean Romance Dramas, 2018–2024, Newest first","label: "+shelfFilterLabel(f));
 assert(shelfFilterKey(f)===shelfFilterKey(normalizeShelfFilter({sort:"newest",to:2024,from:2018,genres:["Romance"],countries:["KR"],type:"drama"})),"key should not depend on order");
 assert(shelfFilterKey(f)!==shelfFilterKey(normalizeShelfFilter({type:"movie"})),"different filters need different keys");
 assert(shelfFilterLabel(normalizeShelfFilter({countries:["KR","JP"],genres:["Comedy","Romance"],type:"drama"}))==="Japanese & Korean Comedy & Romance Dramas","several countries and genres read as one phrase");
 assert(shelfFilterLabel(normalizeShelfFilter({sort:"az"}))==="A–Z"&&shelfFilterLabel(normalizeShelfFilter({from:2018}))==="2018 and later","sort or year alone");
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
  if(u.pathname==="/3/search/tv")return Response.json({results:[{id:77,name:"Love A",first_air_date:"2021-03-01",genre_ids:[18],origin_country:["KR"]}]});
  if(u.pathname==="/3/tv/77/keywords")return Response.json({results:[{name:"love triangle"}]});
  if(u.pathname==="/3/search/movie")return Response.json({results:[{id:88,title:"City B",release_date:"2018-05-01",genre_ids:[80],original_language:"zh"}]});
  return new Response("",{status:404});}) as typeof fetch;
 const out=await getTitleFacts([{slug:"1-love-a",title:"Love A",year:2021,type:"Drama"},{slug:"2-city-b",title:"City B",year:2018,type:"Movie"},{slug:"bad slug",title:"x"}],{key:"test",fetcher});
 assert(out["1-love-a"].genres.join(",")==="Drama,Romance"&&out["1-love-a"].country==="KR","drama facts: "+JSON.stringify(out["1-love-a"]));
 assert(out["2-city-b"].genres.join(",")==="Crime"&&out["2-city-b"].country==="CN","movie facts");
 assert(!out["bad slug"]&&calls===3,"invalid slugs skipped; one search per title plus drama keywords");
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
 assert(names[1]==="Sample’s Completed: Korean Dramas"&&names[3]==="Fake name: Romance, Newest first","manifest names: "+names.join(" | "));
 const pool=[{slug:"1-love-a",title:"Love A",type:"Drama",year:2021,country:"3"},{slug:"2-city-b",title:"City B",type:"Movie",year:2018,country:"2"}];
 const result=await loadCatalog(c,1,0,"https://test/addon/token",{hidden:async()=>new Set(),watchlistCategory:async()=>pool,map:async(list:any[],type:string)=>list.map(x=>({id:"tt"+x.slug.split("-")[0],name:x.title,type,poster:"https://image.test/p.jpg"}))} as any);
 assert(result.metas.map((m:any)=>m.name).join(",")==="Love A","Nuvio catalog applies the same filter");
});

// Setup page: Community lists render as shelves with a working filter bar and live preview.
const html=await(await handler(new Request("https://test/setup/lists"))).text();
const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
await test("Community lists show as shelves with a live-preview filter that adds a filtered catalog",async()=>{
 const saved=new Map<string,string>();
 const {document,window}=parseHTML(html);
 const fetcher=async(input:string)=>{
  const url=String(input);
  if(url.startsWith("/api/mdl/profile"))return Response.json({profileName:"Sample",lists:[{name:"Sample’s Completed",url:"https://mydramalist.com/dramalist/sample/completed",kind:"watchlist"},{name:"Sample’s Dramas and Films",url:"https://mydramalist.com/dramalist/sample",kind:"watchlist",combined:true},{name:"Thai Romance",url:"https://mydramalist.com/list/AbCd1234",kind:"list",profile:"Sample"}]});
  if(url.startsWith("/api/mdl/shelf"))return Response.json({items:items.map(x=>({...x,url:"https://mydramalist.com/"+x.slug,poster:x.image||null})),total:5});
  if(url.startsWith("/api/mdl/title-facts"))return Response.json({facts});
  return Response.json({});
 };
 new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(
  window,document,{getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v),removeItem:(k:string)=>saved.delete(k)},
  {href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists"},{pushState(){}},fetcher,()=>0,()=>({matches:false}),class{observe(){}}
 );
 const settle=()=>new Promise(r=>setTimeout(r,10));
 const waitFor=async(check:()=>unknown,message:string)=>{for(let i=0;i<200;i++){if(check())return;await settle()}throw Error(message)};
 (document.getElementById("profileInput") as any).value="Sample";
 await (document.getElementById("profileForm") as any).onsubmit({preventDefault(){}});
 await waitFor(()=>document.querySelectorAll("#listItems .catalogShelf .catalogPoster").length===10,"watchlist shelves should load");
 const [full,shelf]=[...document.querySelectorAll("#listItems .catalogShelf")] as any[];
 assert((full.querySelector(".shelfFilterToggle") as any).hidden,"the full watchlist has no Filter button");
 assert(shelf&&!document.querySelector("#listItems .listcard"),"Community should use shelves, not list cards");
 assert(shelf.querySelectorAll(".catalogPoster").length===5,"shelf should show the watchlist titles");
 const toggle=shelf.querySelector(".shelfFilterToggle") as any;assert(!toggle.hidden,"Filter button should appear once titles load");
 toggle.click();await waitFor(()=>shelf.querySelector(".shelfFilters .shelfChip"),"filter bar should open");
 const chip=(text:string)=>[...shelf.querySelectorAll(".shelfChip")].find((b:any)=>b.textContent===text) as any;
 assert(![...shelf.querySelectorAll(".shelfFilters option")].some((o:any)=>/Dramas and movies/.test(o.textContent)),"no combined Dramas and movies choice");
 chip("Movies").click();await waitFor(()=>shelf.querySelectorAll(".catalogPoster").length===2,"Movies should preview 2 titles");
 chip("Dramas").click();
 assert(chip("Dramas").getAttribute("aria-pressed")==="true"&&chip("Movies").getAttribute("aria-pressed")==="false","only one type at a time");
 await waitFor(()=>shelf.querySelectorAll(".catalogPoster").length===3,"Dramas filter should preview 3 titles");
 await waitFor(()=>[...shelf.querySelectorAll(".shelfChip")].some((b:any)=>b.textContent==="Romance"),"genre chips should appear once TMDB genres load");
 const romance=[...shelf.querySelectorAll(".shelfChip")].find((b:any)=>b.textContent==="Romance") as any;romance.click();
 await waitFor(()=>shelf.querySelectorAll(".catalogPoster").length===1,"Romance should narrow the preview");
 assert([...shelf.querySelectorAll(".catalogPoster strong")].map((x:any)=>x.textContent).join(",")==="Love A","Dramas + Romance should preview only Love A");
 assert(/Showing 1 of 5/.test(shelf.querySelector(".shelfStatus")!.textContent!)&&/Sample’s Completed: Romance Dramas/.test(shelf.querySelector(".shelfStatus")!.textContent!),"status should show the count and the Nuvio name");
 (shelf.querySelector(".catalogAdd") as any).click();
 const selection=JSON.parse(saved.get("ydl-v3-selection")!);
 assert(selection.length===1&&selection[0].filter.type==="drama"&&selection[0].filter.genres[0]==="Romance"&&selection[0].name==="Sample’s Completed: Romance Dramas","filtered catalog should be selected with its label: "+JSON.stringify(selection[0]));
 assert(shelf.querySelector(".catalogAdd")!.getAttribute("aria-pressed")==="true","Add button should show Added for this filter");
 (document.querySelector('[data-community-view="custom"]') as any).click();
 await waitFor(()=>document.querySelectorAll("#listItems .catalogShelf .catalogPoster").length===5,"custom list shelf should load");
 const custom=document.querySelector("#listItems .catalogShelf") as any;
 assert(!(custom.querySelector(".shelfFilterToggle") as any).hidden,"custom lists have a Filter button");
 assert(custom.querySelector("h3").textContent==="Sample’s Thai Romance list","unfiltered custom lists keep the word list: "+custom.querySelector("h3").textContent);
 custom.querySelector(".shelfFilterToggle").click();await waitFor(()=>custom.querySelector(".shelfChip"),"custom filter bar should open");
 ([...custom.querySelectorAll(".shelfChip")].find((b:any)=>b.textContent==="Dramas") as any).click();
 await waitFor(()=>/Adds to Nuvio as “Sample’s Thai Romance: Dramas”/.test(custom.querySelector(".shelfStatus").textContent),"filtered custom lists drop the word list: "+custom.querySelector(".shelfStatus").textContent);
});
console.log(JSON.stringify({passed}));
