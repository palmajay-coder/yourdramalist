import {extractFeatured,createFeaturedService} from "./featured.ts";
import {handleFeatured} from "./featuredApi.ts";
let passed=0;const ok=(v:any)=>{if(!v)throw Error("Assertion failed")};async function test(name:string,f:()=>any){await f();passed++;console.log("PASS "+name)}
const html='<div class="featured-list"><a href="/list/aB12"><img src="https://i.mydramalist.com/a.jpg"><img src="//i.mydramalist.com/b.jpg"><img src="https://i.mydramalist.com/c.jpg"></a><span class="list-type">Featured Voting List</span><h2 class="list-title">A &amp; B</h2><p class="list-desc">Original description.</p></div>';
const response=()=>new Response(html,{headers:{"content-type":"text/html"}});
await test("extract actual featured title, original description and three images",()=>{const v=extractFeatured(html);ok(v.id==="aB12"&&v.title==="A & B"&&v.images.length===3&&v.description==="Original description.")});
await test("unsafe links, images and missing sections rejected",()=>{for(const source of ["<title>Lists</title>",html.replace("/list/aB12","https://evil.test/list/aB12")]){let failed=false;try{extractFeatured(source)}catch{failed=true}ok(failed)}const v=extractFeatured(html.replace("https://i.mydramalist.com/a.jpg","javascript:alert(1)"));ok(v.images.length===2)});
await test("concurrent requests and daily cache share one upstream call",async()=>{let calls=0;const s=createFeaturedService(undefined,async()=>{calls++;return response()});await Promise.all([s(),s(),s()]);ok((await s()).status==="cached"&&calls===1)});
await test("persistent cache reload avoids upstream",async()=>{let saved:any;const storage={load:async()=>saved,save:async v=>{saved=v}};await createFeaturedService(storage,async()=>response())();const s=createFeaturedService(storage,async()=>{throw Error("must not fetch")});ok((await s()).featured.id==="aB12")});
await test("stale success survives access restrictions across daily checks",async()=>{let clock=1000000000,calls=0;const s=createFeaturedService(undefined,async()=>{calls++;return calls===1?response():new Response("Just a moment",{headers:{"content-type":"text/html"}})},()=>clock);await s();clock+=86400000;ok((await s()).status==="stale");clock+=8*86400000;ok((await s()).featured.id==="aB12")});
await test("failure cooldown prevents repeated MDL requests",async()=>{let calls=0;const s=createFeaturedService(undefined,async()=>{calls++;return new Response("",{status:403})});ok((await s()).featured===null);await s();ok(calls===1)});
await test("oversized and non-HTML content are unavailable without invented data",async()=>{for(const r of [new Response("a".repeat(3000001),{headers:{"content-type":"text/html"}}),new Response("{}",{headers:{"content-type":"application/json"}})]){const s=createFeaturedService(undefined,async()=>r);ok((await s()).featured===null)}});
await test("writes rejected",async()=>{ok((await handleFeatured(new Request("https://test/api/mdl/featured",{method:"POST"}))).status===405)});
console.log(JSON.stringify({passed}));
await test("daily refresh deduplicates banners, keeps picks on reordered lineups and redraws on change",async()=>{
 const card=(id:string)=>`<div class="custom-list-preview"><div class="content titles"><img src="https://i.mydramalist.com/${id}.jpg"></div><a class="title-primary" href="/list/${id}">${id}</a></div>`;
 const section=(label:string,ids:string[])=>`<div class="box-header"><h2>${label}</h2></div><div class="box-body">${ids.map(card).join("")}</div>`;
 let clock=Date.UTC(2026,6,1,6,59),calls=0,recent=["cccc","dddd"];
 const service=createFeaturedService(undefined,async()=>{
  calls++;
  return new Response(html+section("Recently Activity Lists",recent)+section("Trending Lists",["cccc","eeee"]),{headers:{"content-type":"text/html"}});
 },()=>clock,()=>0);
 const first=await service();ok(first.slides.map((x:any)=>x.id).join(",")==="aB12,cccc,eeee");
 ok(first.nextRefresh==="2026-07-01T07:00:00.000Z");
 await service();ok(calls===1);
 clock+=60000;recent.reverse();ok((await service()).slides[1].id==="cccc");
 clock+=86400000;recent.push("ffff");ok((await service()).slides[1].id==="dddd");
});
