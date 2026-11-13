import {parseHTML} from "npm:linkedom@0.18.12";
import handler from "./app.ts";
import {createPopularity, personPicks, visitorAddress, deviceType} from "./popularity.ts";
import {adminPage} from "./wallpaperAdmin.ts";
import {dayKey} from "./analyticsApi.ts";
let passed=0;const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};async function test(name:string,fn:()=>unknown){await fn();passed++;console.log("PASS "+name)}

// In-memory stand-in for the few statements popularity.ts runs.
function fakeDb(){
 const salts=new Map<string,string>(),visits=new Set<string>(),meta=new Map<string,any>(),analytics:any[]=[],dropped:string[]=[];
 const run=(q:any)=>{
  const sql=String(q.sql).trim(),a=q.args||[];
  if(sql.startsWith("CREATE"))return{rows:[],rowsAffected:0};
  if(sql.startsWith("DROP TABLE IF EXISTS")){dropped.push(sql.split(" ").pop()!);return{rows:[],rowsAffected:0}}
  if(sql.startsWith("INSERT OR IGNORE INTO ydl_month_salt")){if(salts.has(a[0]))return{rows:[],rowsAffected:0};salts.set(a[0],a[1]);return{rows:[],rowsAffected:1}}
  if(sql.startsWith("DELETE FROM ydl_month_salt")){for(const k of [...salts.keys()])if(k<a[0])salts.delete(k);return{rows:[],rowsAffected:0}}
  if(sql.startsWith("SELECT salt"))return{rows:salts.has(a[0])?[{salt:salts.get(a[0])}]:[]};
  if(sql.startsWith("SELECT DISTINCT scope FROM ydl_visits")){const [visitor,from,...scopes]=a;return{rows:[...new Set([...visits].map(k=>k.split("|")).filter(([d,s,v])=>v===visitor&&d>=from&&scopes.includes(s)).map(([,s])=>s))].map(scope=>({scope}))}}
  if(sql.startsWith("INSERT OR IGNORE INTO ydl_visits")){const k=a.join("|");if(visits.has(k))return{rows:[],rowsAffected:0};visits.add(k);return{rows:[],rowsAffected:1}}
  if(sql.startsWith("DELETE FROM ydl_visits")){for(const k of [...visits])if(k.split("|")[0]<a[0])visits.delete(k);return{rows:[],rowsAffected:0}}
  if(sql.startsWith("SELECT day, scope, visitor FROM ydl_visits"))return{rows:[...visits].map(k=>k.split("|")).filter(([d])=>d>=a[0]).map(([day,scope,visitor])=>({day,scope,visitor}))};
  if(sql.startsWith("INSERT INTO ydl_people_meta")){const prev=meta.get(a[0]);meta.set(a[0],{slug:a[0],name:a[1],photo:a[2]??prev?.photo??null,at:a[3]});return{rows:[],rowsAffected:1}}
  if(sql.startsWith("DELETE FROM ydl_people_meta"))return{rows:[],rowsAffected:0};
  if(sql.startsWith("SELECT metric, category, SUM(count)")){const sums=new Map<string,any>();for(const r of analytics)if(r.day>=a[0]&&String(r.metric).startsWith("popular.")){const k=r.metric+"|"+r.category,prev=sums.get(k);sums.set(k,{metric:r.metric,category:r.category,total:(prev?.total||0)+r.count})}return{rows:[...sums.values()]}}
  if(sql.startsWith("SELECT slug, name, photo FROM ydl_people_meta"))return{rows:a.map((s:string)=>meta.get(s)).filter(Boolean)};
  throw Error("unexpected SQL: "+sql);
 };
 return{db:{execute:async(q:any)=>run(q),batch:async(qs:any[])=>qs.map(run)},salts,visits,meta,analytics,dropped};
}
const noon=Date.UTC(2026,10,9,20),day=24*60*60*1000;
const phone="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148",computer="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0";
const request=(ip:string,agent=computer)=>new Request("https://test/api/addon/configure",{method:"POST",headers:{"x-forwarded-for":ip+", 10.0.0.1","user-agent":agent}});

await test("people are counted once per category and range, with device type and returns, without keeping their address",async()=>{
 const f=fakeDb();let now=noon;
 const p=createPopularity({db:f.db,now:()=>now,record:async(items)=>{for(const [metric,category,count] of items)f.analytics.push({day:dayKey(now),metric,category,count})}});
 const scopes=["catalog.selected:explore:newest-shows:3","catalog.selected:explore:newest-shows:1","catalog.selected:explore:airing-shows:3","catalog.selected:weekly:0","feature.selected:reviews","feature.selected:not-a-feature","made-up:scope"];
 const people=[{slug:"123-song-kang",mode:"actor" as const,name:"Song Kang",photo:"https://i.mydramalist.com/song.jpg"}];
 await p.recordManifest(request("203.0.113.5",phone),scopes,people);
 await p.recordManifest(request("203.0.113.5",phone),scopes,people);
 const count=(metric:string,category:string)=>f.analytics.filter(r=>r.metric===metric&&r.category===category).reduce((n,r)=>n+r.count,0);
 assert(count("popular.catalog","explore:newest-shows:3")===1&&count("popular.person","123-song-kang:actor")===1,"Popular this month counts once per person per day");
 assert(count("weekly.people","weekly:0")===1,"weekly picks count each person once a week");
 assert(!f.analytics.some(r=>r.metric==="people.generated"||r.metric==="catalog.selected"||r.metric==="feature.selected"||r.metric==="manifest.generated"),"no click totals are written");
 assert(![...f.visits].some(k=>k.includes("not-a-feature")||k.includes("made-up")),"unknown categories are dropped");
 await p.recordManifest(request("198.51.100.7"),["catalog.selected:explore:newest-shows:3","feature.selected:reviews"],[]);
 await p.recordVisit(request("198.51.100.7"),["catalog.added:discover-drama-related"]);
 await p.recordVisit(request("198.51.100.8"),["catalog.added:discover-drama-related"]);
 assert(![...f.visits].some(k=>k.includes("203.0.113.5")||k.includes("198.51.100.7")),"addresses are never stored");
 assert(f.meta.get("123-song-kang")?.name==="Song Kang","actor name and photo are kept for the card");
 let s=await p.summary();
 assert(s.today.people===2&&s.today.mobile===1&&s.today.computer===1,"today: two people, one on a phone: "+JSON.stringify(s.today));
 assert(s.ranges[7].scopes["feature.selected:reviews"]===2&&s.ranges[7].scopes["catalog.selected:explore:newest-shows:3"]===2,"categories count people, not links");
 assert(s.ranges[7].groups["newest-shows"]===2&&s.ranges[7].scopes["catalog.selected:explore:newest-shows:1"]===1,"two countries of one catalog still count a person once");
 assert(s.ranges[7].scopes["catalog.added:discover-drama-related"]===2&&s.ranges[7].people===2,"search adds count people without counting them as link makers");
 now=noon+day;
 await p.recordManifest(request("203.0.113.5",phone),scopes,people);
 s=await p.summary();
 assert(s.today.people===1&&s.ranges[7].people===2&&s.ranges[7].returning===1,"the same person the next day counts once in the week and as returning: "+JSON.stringify(s.ranges[7]));
 assert(count("popular.catalog","explore:newest-shows:3")===3&&count("weekly.people","weekly:0")===1,"daily popularity counts again, the weekly row does not");
 assert(s.daily.length===30&&s.daily.at(-1)!.people===1&&s.daily.at(-2)!.people===2,"people per day");
 const firstSalt=f.salts.get(dayKey(noon).slice(0,7));
 now=Date.UTC(2026,11,1,20);
 await p.recordManifest(request("203.0.113.5",phone),scopes,people);
 assert(f.salts.size===1&&f.salts.get("2026-12")!==firstSalt,"the secret is replaced each month and the old one deleted");
 assert((await p.summary()).ranges[30].people===3,"a new month gives the same person a new code");
 now=Date.UTC(2027,0,20,20);
 await p.recordManifest(request("203.0.113.9"),[],[]);
 assert(![...f.visits].some(k=>k<"2026-12-16"),"codes older than 35 days are deleted");
 assert(f.dropped.includes("ydl_daily_seen")&&f.dropped.includes("ydl_daily_salt"),"the old daily tables are removed");
 const before=f.visits.size;await p.recordManifest(new Request("https://test/x",{method:"POST"}),scopes,people);
 assert(f.visits.size===before,"requests without an address are not counted");
 assert(visitorAddress(request("203.0.113.5"))==="203.0.113.5","first forwarded address is used");
 assert(deviceType(request("1.1.1.1","Mozilla/5.0 (iPad; CPU OS 17_0)"))==="mobile"&&deviceType(request("1.1.1.1","Mozilla/5.0 (Linux; Android 14; Pixel 8)"))==="mobile"&&deviceType(request("1.1.1.1"))==="computer","tablets count as mobile");
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
 assert(r.catalogs.map((c:any)=>c.label).join("|")==="Newest Shows · South Korea|Top Airing Shows · South Korea|Top Rated Movies · Japan"/* Labels use the catalog names from explore.ts. */,"catalog ranking: "+r.catalogs.map((c:any)=>c.label).join("|"));
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

await test("admin analytics: people counts, device split, returns, combined Discover catalogs, features and search",async()=>{
 const html=adminPage(true);const {document,window}=parseHTML(html);
 const range=(people:number,extra:any={})=>({people,mobile:Math.round(people*0.75),computer:people-Math.round(people*0.75),returning:3,groups:{weekly:30,"newest-shows":22,"airing-shows":9},scopes:{"catalog.selected:explore:newest-shows:3":20,"catalog.selected:explore:newest-shows:1":5,"catalog.selected:explore:airing-shows:3":9,"catalog.selected:weekly:0":30,"feature.selected:community-watchlist":7,"feature.selected:posters-tmdb":9,"catalog.added:discover-actor-filmography":4,"catalog.added:discover-drama-related":6},...extra});
 const data={today:{people:12},ranges:{7:range(40),30:range(80)},daily:Array.from({length:30},(_,i)=>({day:"2026-11-"+String(i+1).padStart(2,"0"),people:i})),labels:{"catalog.selected:explore:newest-shows:3":"MyDramaList’s Newest Shows (South Korea)","catalog.selected:explore:newest-shows:1":"MyDramaList’s Newest Shows (Japan)","catalog.selected:explore:airing-shows:3":"MyDramaList’s Airing Shows (South Korea)","catalog.selected:weekly:0":"This week’s picks · 1"}};
 const fetcher=async(url:string)=>url.startsWith("/api/admin/analytics")?Response.json(data):url.startsWith("/api/admin/errors")?Response.json({rows:[],summary:[],guide:{setup:{},poster:{},providers:{}}}):Response.json({mode:"posters",image:"",tint:"#000000",opacity:0.45});
 const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
 new Function("window","document","fetch","navigator","location","ResizeObserver","requestAnimationFrame",script)(window,document,fetcher,{clipboard:{writeText:async()=>{}}},{origin:"https://test"},class{observe(){}disconnect(){}},()=>0);
 await new Promise(r=>setTimeout(r,20));
 const $=(id:string)=>document.getElementById(id)!;
 assert($("peopleToday").textContent==="12"&&$("peopleRange").textContent==="40","headline people");
 assert($("deviceSplit").textContent==="75% · 25%"&&$("returning").textContent==="3 (8%)","device split and returns: "+$("deviceSplit").textContent+" "+$("returning").textContent);
 const catalogNames=[...document.querySelectorAll("#catalogRanks > li")].map(li=>li.querySelector("span")!.textContent+"="+li.querySelector("strong")!.textContent);
 assert(catalogNames.join("|")==="This week’s picks=30|Newest Shows=22|Airing Shows=9","each catalog shows its people, countries combined once: "+catalogNames.join("|"));
 (document.querySelectorAll("#catalogRanks .rankToggle")[1] as any).click();
 assert([...document.querySelectorAll("#catalogRanks .rankSub li")].map(li=>li.textContent).join("|")==="South Korea20|Japan5","a row expands to show countries");
 assert(/Individual watchlists/.test($("featureRanks").textContent!)&&/Not used: .*Director filmographies/.test($("featureUnused").textContent!),"catalog types tab lists used and unused features");
 (document.querySelector('#featureTabs [data-group="posters"]') as any).click();
 assert(/TMDB posters/.test($("featureRanks").textContent!)&&/RPDB/.test($("featureUnused").textContent!),"poster styles tab");
 assert([...document.querySelectorAll("#searchRanks li")].map(li=>li.textContent).join("|")==="Drama search6|Actor search4|Director search0","search breakdown shows every search, even unused ones");
 assert(document.querySelectorAll("#dailyRows .sparkBar").length===7,"seven days of bars");
 (document.querySelector('#analyticsRange [data-range="30"]') as any).click();
 assert(document.querySelectorAll("#dailyRows .sparkBar").length===30&&$("peopleRangeLabel").textContent==="People · 30 days"&&$("peopleRange").textContent==="80","range switch");
 assert(!/Manifests today/.test(html),"click totals are gone");
});

await test("Popular this month is not shown in the app layout",async()=>{
 const html=await(await handler(new Request("https://test/setup/lists"))).text();
 const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
 const {document,window}=parseHTML(html);let asked=false;
 new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(
  window,document,{getItem:()=>null,setItem(){},removeItem(){}},
  {href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists",search:"",hostname:"test"},{state:null,pushState(s){this.state=s},replaceState(s){this.state=s},back(){}},async(u:string)=>{if(String(u).startsWith("/api/popular"))asked=true;return Response.json({})},()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}}
 );
 (document.querySelector('[data-tab="discover"]') as any).click();await new Promise(r=>setTimeout(r,30));
 assert((document.getElementById("popularCard") as any).hidden&&!asked,"the app layout hides the card and does not load rankings");
});

// The card's own behavior, checked in the older web layout (still used by the admin wallpaper preview).
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
  {href:"https://test/setup/lists?wallpaper-preview=1",origin:"https://test",pathname:"/setup/lists",search:"?wallpaper-preview=1",hostname:"test"},{state:null,pushState(s){this.state=s},replaceState(s){this.state=s},back(){}},fetcher,()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}}
 );
 const settle=()=>new Promise(r=>setTimeout(r,10));
 const waitFor=async(check:()=>unknown,message:string)=>{for(let i=0;i<200;i++){if(check())return;await settle()}throw Error(message)};
 const card=document.getElementById("popularCard") as any;
 assert(card.closest("aside.sidebar"),"the card lives in the right column under Your Selection");
 (document.querySelector('[data-tab="discover"]') as any).click();
 await waitFor(()=>!card.hidden&&card.querySelector(".popularRow"),"card appears on the Discover tab");
 assert(card.querySelector("h3").textContent==="Popular this month","title");
 const rows=()=>[...card.querySelectorAll(".popularRow")] as any[];
 assert(rows().length===3&&/Newest Shows · South Korea78 people/.test(rows()[0].textContent)&&!/adds/.test(rows()[1].textContent),"catalog rows with counts only when shown");
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
