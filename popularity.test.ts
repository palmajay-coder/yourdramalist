import {parseHTML} from "npm:linkedom@0.18.12";
import handler from "./app.ts";
import {createPopularity, personPicks, visitorAddress} from "./popularity.ts";
import {adminPage} from "./wallpaperAdmin.ts";
import {dayKey} from "./analyticsApi.ts";
let passed=0;const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};async function test(name:string,fn:()=>unknown){await fn();passed++;console.log("PASS "+name)}

// In-memory stand-in for the few statements popularity.ts runs.
function fakeDb(){
 const salts=new Map<string,string>(),seen=new Set<string>(),meta=new Map<string,any>(),analytics:any[]=[];
 const run=(q:any)=>{
  const sql=String(q.sql).trim(),a=q.args||[];
  if(sql.startsWith("CREATE"))return{rows:[],rowsAffected:0};
  if(sql.startsWith("INSERT OR IGNORE INTO ydl_daily_salt")){if(salts.has(a[0]))return{rows:[],rowsAffected:0};salts.set(a[0],a[1]);return{rows:[],rowsAffected:1}}
  if(sql.startsWith("DELETE FROM ydl_daily_salt")){for(const k of [...salts.keys()])if(k<a[0])salts.delete(k);return{rows:[],rowsAffected:0}}
  if(sql.startsWith("SELECT salt"))return{rows:salts.has(a[0])?[{salt:salts.get(a[0])}]:[]};
  if(sql.startsWith("INSERT OR IGNORE INTO ydl_daily_seen")){const k=a.join("|");if(seen.has(k))return{rows:[],rowsAffected:0};seen.add(k);return{rows:[],rowsAffected:1}}
  if(sql.startsWith("DELETE FROM ydl_daily_seen")){for(const k of [...seen])if(k.split("|")[0]<a[0])seen.delete(k);return{rows:[],rowsAffected:0}}
  if(sql.startsWith("INSERT INTO ydl_people_meta")){const prev=meta.get(a[0]);meta.set(a[0],{slug:a[0],name:a[1],photo:a[2]??prev?.photo??null,at:a[3]});return{rows:[],rowsAffected:1}}
  if(sql.startsWith("DELETE FROM ydl_people_meta"))return{rows:[],rowsAffected:0};
  if(sql.startsWith("SELECT metric, category, SUM(count)")){const sums=new Map<string,any>();for(const r of analytics)if(r.day>=a[0]&&String(r.metric).startsWith("popular.")){const k=r.metric+"|"+r.category,prev=sums.get(k);sums.set(k,{metric:r.metric,category:r.category,total:(prev?.total||0)+r.count})}return{rows:[...sums.values()]}}
  if(sql.startsWith("SELECT slug, name, photo FROM ydl_people_meta"))return{rows:a.map((s:string)=>meta.get(s)).filter(Boolean)};
  throw Error("unexpected SQL: "+sql);
 };
 return{db:{execute:async(q:any)=>run(q),batch:async(qs:any[])=>qs.map(run)},salts,seen,meta,analytics};
}
const noon=Date.UTC(2026,10,9,20),day=24*60*60*1000;
const request=(ip:string,agent="Browser A")=>new Request("https://test/api/addon/configure",{method:"POST",headers:{"x-forwarded-for":ip+", 10.0.0.1","user-agent":agent}});

await test("people are counted once a day without keeping their address",async()=>{
 const f=fakeDb();let now=noon;
 const p=createPopularity({db:f.db,now:()=>now,record:async(items)=>{for(const [metric,category,count] of items)f.analytics.push({day:dayKey(now),metric,category,count})}});
 const catalogs=["explore:newest-shows:3","explore:airing-shows:3","weekly:0"],people=[{slug:"123-song-kang",mode:"actor" as const,name:"Song Kang",photo:"https://i.mydramalist.com/song.jpg"}];
 await p.recordManifest(request("203.0.113.5"),catalogs,people);
 await p.recordManifest(request("203.0.113.5"),catalogs,people);
 const count=(metric:string,category="all")=>f.analytics.filter(r=>r.metric===metric&&r.category===category).reduce((n,r)=>n+r.count,0);
 assert(count("people.generated")===1,"the same person twice in a day counts once");
 assert(count("popular.catalog","explore:newest-shows:3")===1&&count("popular.person","123-song-kang:actor")===1,"each catalog and person counts once per person per day");
 assert(!f.analytics.some(r=>String(r.category).startsWith("weekly")),"weekly picks stay out of the popularity counts");
 await p.recordManifest(request("198.51.100.7"),catalogs,[]);
 assert(count("people.generated")===2&&count("popular.catalog","explore:newest-shows:3")===2,"a second person counts");
 assert(![...f.seen].some(k=>k.includes("203.0.113.5")||k.includes("198.51.100.7")),"addresses are never stored");
 assert(f.meta.get("123-song-kang")?.name==="Song Kang"&&f.meta.get("123-song-kang")?.photo==="https://i.mydramalist.com/song.jpg","actor name and photo are kept for the card");
 const firstSalt=f.salts.get(dayKey(noon));
 now=noon+day;
 await p.recordManifest(request("203.0.113.5"),catalogs,people);
 assert(count("people.generated")===3,"the same person counts again the next day");
 assert(f.salts.size===1&&f.salts.get(dayKey(now))!==firstSalt,"the secret is replaced each day and the old one deleted");
 assert(![...f.seen].some(k=>k.startsWith(dayKey(noon))),"yesterday's codes are deleted");
 await p.recordManifest(new Request("https://test/x",{method:"POST"}),catalogs,people);
 assert(count("people.generated")===3,"requests without an address are not counted");
 assert(visitorAddress(request("203.0.113.5"))==="203.0.113.5","first forwarded address is used");
});

await test("Popular this month ranks catalogs and people with the agreed rules",async()=>{
 const f=fakeDb();let now=noon;const today=dayKey(now);
 const p=createPopularity({db:f.db,now:()=>now,record:async()=>{}});
 const add=(metric:string,category:string,count:number,d=today)=>f.analytics.push({day:d,metric,category,count});
 add("popular.catalog","explore:newest-shows:3",12);add("popular.catalog","explore:airing-shows:3",7);
 assert((await p.rankings()).catalogs.length===0,"fewer than three qualifying catalogs keeps the list hidden");
 now+=61*60*1000;
 add("popular.catalog","explore:top-movies:1",3);add("popular.catalog","explore:popular-shows:all",2);add("popular.catalog","explore:upcoming-shows:2",40,"2026-09-01");
 add("popular.person","123-song-kang:actor",9);add("popular.person","456-park-chan-wook:director",8);add("popular.person","456-park-chan-wook:actor",3);add("popular.person","789-kim-go-eun:actor",4);add("popular.person","999-no-name:actor",20);
 f.meta.set("123-song-kang",{slug:"123-song-kang",name:"Song Kang",photo:"https://i.mydramalist.com/a.jpg"});
 f.meta.set("456-park-chan-wook",{slug:"456-park-chan-wook",name:"Park Chan-wook",photo:null});
 f.meta.set("789-kim-go-eun",{slug:"789-kim-go-eun",name:"Kim Go-eun",photo:"https://evil.test/x.jpg"});
 const r=await p.rankings();
 assert(r.catalogs.map((c:any)=>c.label).join("|")==="Newest Shows · South Korea|Top Airing · South Korea|Top Movies · Japan","catalog ranking: "+r.catalogs.map((c:any)=>c.label).join("|"));
 assert(r.catalogs[0].count===12&&r.catalogs[1].count===null,"counts show only from 10 adds: "+JSON.stringify(r.catalogs));
 assert(r.catalogs[0].category==="newest-shows"&&r.catalogs[0].country==="3","catalog keys let the card add the right catalog");
 assert(r.people.map((x:any)=>x.name).join("|")==="Park Chan-wook|Song Kang|Kim Go-eun","acting and directing are combined into one row per person: "+JSON.stringify(r.people));
 assert(r.people[0].mode==="director"&&r.people[0].count===11,"Add uses the filmography people chose most");
 assert(r.people[2].photo===null,"photos from other sites are dropped");
 add("popular.catalog","explore:variety-shows:3",50);
 assert((await p.rankings()).catalogs.length===3,"rankings are reused for an hour");
});

await test("filmography names and photos come from the request, not the install link",()=>{
 const picks=personPicks([{person:"https://mydramalist.com/people/123-song-kang",mode:"actor"},{explore:{category:"top-shows",country:"3"}}],[{kind:"filmography",personUrl:"https://mydramalist.com/people/123-song-kang",personName:"Song Kang\u0000",personPhoto:"https://i.mydramalist.com/s.jpg"}]);
 assert(picks.length===1&&picks[0].slug==="123-song-kang"&&picks[0].name==="Song Kang"&&picks[0].photo==="https://i.mydramalist.com/s.jpg","person pick: "+JSON.stringify(picks));
});

await test("admin analytics: four numbers, combined Discover catalogs, feature groups, search and people per day",async()=>{
 const html=adminPage(true);const {document,window}=parseHTML(html);
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Los_Angeles"}).format(new Date());
 const rows=[
  {day:today,metric:"people.generated",category:"all",count:12,label:"Other"},
  {day:today,metric:"manifest.generated",category:"all",count:31,label:"Other"},
  {day:today,metric:"manifest.error",category:"origin",count:2,label:"Origin validation"},
  {day:today,metric:"catalog.selected",category:"explore:newest-shows:3",count:20,label:"MyDramaList’s Newest Shows (South Korea)"},
  {day:today,metric:"catalog.selected",category:"explore:newest-shows:1",count:5,label:"MyDramaList’s Newest Shows (Japan)"},
  {day:today,metric:"catalog.selected",category:"explore:airing-shows:3",count:9,label:"MyDramaList’s Airing Shows (South Korea)"},
  {day:today,metric:"catalog.selected",category:"weekly:0",count:30,label:"This week’s picks · 1"},
  {day:today,metric:"feature.selected",category:"community-watchlist",count:7,label:"Individual watchlists"},
  {day:today,metric:"feature.selected",category:"posters-tmdb",count:9,label:"TMDB posters"},
  {day:today,metric:"catalog.added",category:"discover-actor-filmography",count:4,label:"x"},
  {day:today,metric:"catalog.added",category:"discover-drama-related",count:6,label:"x"},
 ];
 const fetcher=async(url:string)=>url.startsWith("/api/admin/analytics")?Response.json({rows}):url.startsWith("/api/admin/errors")?Response.json({rows:[],summary:[],guide:{setup:{},poster:{},providers:{}}}):Response.json({mode:"posters",image:"",tint:"#000000",opacity:0.45});
 const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
 new Function("window","document","fetch","navigator","location","ResizeObserver","requestAnimationFrame",script)(window,document,fetcher,{clipboard:{writeText:async()=>{}}},{origin:"https://test"},class{observe(){}disconnect(){}},()=>0);
 await new Promise(r=>setTimeout(r,20));
 const $=(id:string)=>document.getElementById(id)!;
 assert($("peopleToday").textContent==="12"&&$("todaySuccess").textContent==="31"&&$("todayErrors").textContent==="2"&&$("peopleRange").textContent==="12","headline numbers");
 const catalogNames=[...document.querySelectorAll("#catalogRanks > li")].map(li=>li.querySelector("span")!.textContent+"="+li.querySelector("strong")!.textContent);
 assert(catalogNames.join("|")==="This week’s picks=30|Newest Shows=25|Airing Shows=9","countries are combined: "+catalogNames.join("|"));
 (document.querySelectorAll("#catalogRanks .rankToggle")[1] as any).click();
 assert([...document.querySelectorAll("#catalogRanks .rankSub li")].map(li=>li.textContent).join("|")==="South Korea20|Japan5","a row expands to show countries");
 assert(/Individual watchlists/.test($("featureRanks").textContent!)&&/Not used: .*Director filmographies/.test($("featureUnused").textContent!),"catalog types tab lists used and unused features");
 (document.querySelector('#featureTabs [data-group="posters"]') as any).click();
 assert(/TMDB posters/.test($("featureRanks").textContent!)&&/RPDB/.test($("featureUnused").textContent!),"poster styles tab");
 assert([...document.querySelectorAll("#searchRanks li")].map(li=>li.textContent).join("|")==="Drama search6|Actor search4|Director search0","search breakdown shows every search, even unused ones");
 assert(document.querySelectorAll("#dailyRows .sparkBar").length===7,"seven days of bars");
 (document.querySelector('#analyticsRange [data-range="30"]') as any).click();
 assert(document.querySelectorAll("#dailyRows .sparkBar").length===30&&$("peopleRangeLabel").textContent==="People · 30 days","range switch");
});

await test("Popular this month card sits under Your Selection on Discover and adds in one tap",async()=>{
 const html=await(await handler(new Request("https://test/setup/lists"))).text();
 const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
 const saved=new Map<string,string>();const {document,window}=parseHTML(html);
 const popular={catalogs:[{category:"newest-shows",country:"3",label:"Newest Shows · South Korea",count:78},{category:"airing-shows",country:"3",label:"Airing Shows · South Korea",count:null},{category:"top-movies",country:"1",label:"Top Movies · Japan",count:null}],people:[{slug:"123-song-kang",mode:"actor",name:"Song Kang",photo:"https://i.mydramalist.com/s.jpg",count:12},{slug:"456-park-chan-wook",mode:"director",name:"Park Chan-wook",photo:null,count:null},{slug:"789-kim-go-eun",mode:"actor",name:"Kim Go-eun",photo:null,count:null}]};
 const fetcher=async(input:string)=>{const url=String(input);
  if(url.startsWith("/api/popular"))return Response.json(popular);
  if(url.startsWith("/api/mdl/filmography?mode=actor"))return Response.json({list:{kind:"filmography",url:"person:actor:123-song-kang",catalogId:"person:actor:123-song-kang",name:"Song Kang’s Filmography",personUrl:"https://mydramalist.com/people/123-song-kang",mode:"actor",personDisplayName:"Song Kang",profileAvatar:"https://i.mydramalist.com/s.jpg",posters:[]},items:[]});
  return Response.json({});
 };
 new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(
  window,document,{getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v),removeItem:(k:string)=>saved.delete(k)},
  {href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists"},{pushState(){}},fetcher,()=>0,()=>({matches:false}),class{observe(){}}
 );
 const settle=()=>new Promise(r=>setTimeout(r,10));
 const waitFor=async(check:()=>unknown,message:string)=>{for(let i=0;i<200;i++){if(check())return;await settle()}throw Error(message)};
 const card=document.getElementById("popularCard") as any;
 assert(card.closest("aside.sidebar"),"the card lives in the right column under Your Selection");
 (document.querySelector('[data-tab="discover"]') as any).click();
 await waitFor(()=>!card.hidden&&card.querySelector(".popularRow"),"card appears on the Discover tab");
 assert(card.querySelector("h3").textContent==="Popular this month","title");
 const rows=()=>[...card.querySelectorAll(".popularRow")] as any[];
 assert(rows().length===3&&/Newest Shows · South Korea78 adds/.test(rows()[0].textContent)&&!/adds/.test(rows()[1].textContent),"catalog rows with counts only when shown");
 assert(!/weekly|week’s picks/i.test(card.textContent),"this week's picks are not in the ranking");
 rows()[0].querySelector(".popularAdd").click();
 let selection=JSON.parse(saved.get("ydl-v3-selection")!);
 assert(selection.length===1&&selection[0].kind==="explore"&&selection[0].category==="newest-shows"&&selection[0].country==="3","catalog added: "+JSON.stringify(selection));
 assert(rows()[0].querySelector(".popularAdd").textContent==="✓ Added","row shows Added: "+rows()[0].querySelector(".popularAdd").textContent);
 const tab=[...card.querySelectorAll(".popularTab")].find((b:any)=>b.textContent==="Actors & directors") as any;
 assert(tab,"the people tab appears when both lists have entries");tab.click();
 assert(rows().map((r:any)=>r.querySelector(".popularName").firstChild.textContent).join("|")==="Song Kang|Park Chan-wook|Kim Go-eun","names only, no Actor or Director labels");
 assert(rows()[0].querySelector(".popularFace img")?.getAttribute("src")==="https://i.mydramalist.com/s.jpg"&&rows()[1].querySelector(".popularFace").textContent==="P","round photo, or the first initial");
 rows()[0].querySelector(".popularAdd").click();
 await waitFor(()=>JSON.parse(saved.get("ydl-v3-selection")!).length===2,"filmography is added in one tap");
 selection=JSON.parse(saved.get("ydl-v3-selection")!);
 assert(selection[1].kind==="filmography"&&selection[1].mode==="actor"&&selection[1].analyticsSource==="popular-this-month","filmography added from the card");
 (document.querySelector('[data-tab="profiles"]') as any).click();
 assert(card.hidden,"the card only shows on the Discover tab");
});
console.log(JSON.stringify({passed}));
