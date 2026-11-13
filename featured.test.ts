import {seasonForPacificDate,createFeaturedService} from "./featured.ts";
import {TEXT} from "./text.ts";
let passed=0;const ok=(v:any,m="Assertion failed")=>{if(!v)throw Error(m)};async function test(name:string,f:()=>any){await f();passed++;console.log("PASS "+name)}
// Synthetic public list page in the shape MyDramaList serves; no captured user data.
const page=(id:string)=>`<html><head><link rel="canonical" href="https://mydramalist.com/list/${id}"></head><body><div class="box"><div class="box-header"><h1>Seasonal ${id}</h1><div class="description">Curated picks.</div></div><div class="box-body"><div class="list-bars"></div><div class="collection-list"><div class="film-cover"><img data-src="https://i.mydramalist.com/${id}.jpg"></div></div></div></div></body></html>`;
// The curated lists now come from Kuryana (MyDramaList's data as JSON). page() above shows the old MyDramaList shape.
const listFetcher=(counter:{calls:number})=>(async(url:string|URL)=>{counter.calls++;const id=new URL(String(url)).pathname.split("/").pop()!;return new Response(JSON.stringify({success:true,data:{title:"Seasonal "+id,description:"Curated picks.",items:[{title:"Title",image:`https://i.mydramalist.com/${id}.jpg`}],pagination:{total_pages:1}}}),{headers:{"content-type":"application/json"}})}) as typeof fetch;
const at=(iso:string)=>Date.parse(iso);
await test("banner season follows the Pacific calendar",()=>{
 ok(seasonForPacificDate(at("2026-11-09T20:00:00Z"))==="fall","November should be fall");
 ok(seasonForPacificDate(at("2026-12-01T20:00:00Z"))==="winter","December should be winter");
 ok(seasonForPacificDate(at("2027-02-28T20:00:00Z"))==="winter","February should be winter");
 ok(seasonForPacificDate(at("2027-03-01T20:00:00Z"))==="spring","March should be spring");
 ok(seasonForPacificDate(at("2027-06-15T20:00:00Z"))==="summer","June should be summer");
 ok(seasonForPacificDate(at("2026-09-01T06:30:00Z"))==="summer","late August in Pacific time should still be summer");
});
await test("seasonal lists load three slides with the matching seasonal copy",async()=>{
 const counter={calls:0},s=createFeaturedService(undefined,listFetcher(counter),()=>at("2026-11-09T20:00:00Z"));
 const v=await s();
 ok(v.season==="fall"&&v.status==="live","live fall banner");
 ok(v.slides.length===3&&v.featured?.id===v.slides[0].id,"three slides");
 ok(v.heading===TEXT.seasonalBannerCopy.fall.title&&v.subtitle===TEXT.seasonalBannerCopy.fall.description,"seasonal copy");
 ok(v.slides.every((x:any)=>x.label===TEXT.featuredListLabel&&x.images.length===1),"slide details");
});
await test("concurrent requests share one load and later requests use the daily cache",async()=>{
 const counter={calls:0},s=createFeaturedService(undefined,listFetcher(counter),()=>at("2026-11-09T20:00:00Z"));
 await Promise.all([s(),s(),s()]);
 ok(counter.calls===3,"one upstream call per seasonal list");
 ok((await s()).status==="cached"&&counter.calls===3,"daily cache reused");
});
await test("unavailable lists return an empty banner without throwing",async()=>{
 const s=createFeaturedService(undefined,(async()=>{throw Error("offline")}) as typeof fetch,()=>at("2026-11-09T20:00:00Z"));
 const v=await s();
 ok(v.status==="unavailable"&&!v.featured&&v.slides.length===0,"empty fallback");
});
console.log(JSON.stringify({passed}));
