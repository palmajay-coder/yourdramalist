import {parseHTML} from "npm:linkedom@0.18.12";
import {createPopularity, visitorAddress, deviceType} from "./popularity.ts";
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
 await p.recordManifest(request("203.0.113.5",phone),scopes);
 await p.recordManifest(request("203.0.113.5",phone),scopes);
 const count=(metric:string,category:string)=>f.analytics.filter(r=>r.metric===metric&&r.category===category).reduce((n,r)=>n+r.count,0);
 assert(count("weekly.people","weekly:0")===1,"weekly picks count each person once a week");
 assert(!f.analytics.some(r=>r.metric==="people.generated"||r.metric==="catalog.selected"||r.metric==="feature.selected"||r.metric==="manifest.generated"),"no click totals are written");
 assert(![...f.visits].some(k=>k.includes("not-a-feature")||k.includes("made-up")),"unknown categories are dropped");
 await p.recordManifest(request("198.51.100.7"),["catalog.selected:explore:newest-shows:3","feature.selected:reviews"]);
 await p.recordVisit(request("198.51.100.7"),["catalog.added:discover-drama-related"]);
 await p.recordVisit(request("198.51.100.8"),["catalog.added:discover-drama-related"]);
 assert(![...f.visits].some(k=>k.includes("203.0.113.5")||k.includes("198.51.100.7")),"addresses are never stored");
 let s=await p.summary();
 assert(s.today.people===2&&s.today.mobile===1&&s.today.computer===1,"today: two people, one on a phone: "+JSON.stringify(s.today));
 assert(s.ranges[7].scopes["feature.selected:reviews"]===2&&s.ranges[7].scopes["catalog.selected:explore:newest-shows:3"]===2,"categories count people, not links");
 assert(s.ranges[7].groups["newest-shows"]===2&&s.ranges[7].scopes["catalog.selected:explore:newest-shows:1"]===1,"two countries of one catalog still count a person once");
 assert(s.ranges[7].scopes["catalog.added:discover-drama-related"]===2&&s.ranges[7].people===2,"search adds count people without counting them as link makers");
 now=noon+day;
 await p.recordManifest(request("203.0.113.5",phone),scopes);
 s=await p.summary();
 assert(s.today.people===1&&s.ranges[7].people===2&&s.ranges[7].returning===1,"the same person the next day counts once in the week and as returning: "+JSON.stringify(s.ranges[7]));
 assert(count("weekly.people","weekly:0")===1,"the weekly row counts a person once a week");
 assert(!f.analytics.some(r=>r.metric.startsWith("popular.")),"Popular this month totals are no longer written");
 assert(s.daily.length===30&&s.daily.at(-1)!.people===1&&s.daily.at(-2)!.people===2,"people per day");
 const firstSalt=f.salts.get(dayKey(noon).slice(0,7));
 now=Date.UTC(2026,11,1,20);
 await p.recordManifest(request("203.0.113.5",phone),scopes);
 assert(f.salts.size===1&&f.salts.get("2026-12")!==firstSalt,"the secret is replaced each month and the old one deleted");
 assert((await p.summary()).ranges[30].people===3,"a new month gives the same person a new code");
 now=Date.UTC(2027,0,20,20);
 await p.recordManifest(request("203.0.113.9"),[]);
 assert(![...f.visits].some(k=>k<"2026-12-16"),"codes older than 35 days are deleted");
 assert(f.dropped.includes("ydl_daily_seen")&&f.dropped.includes("ydl_daily_salt")&&f.dropped.includes("ydl_people_meta"),"the old daily tables and Popular this month names are removed");
 const before=f.visits.size;await p.recordManifest(new Request("https://test/x",{method:"POST"}),scopes);
 assert(f.visits.size===before,"requests without an address are not counted");
 assert(visitorAddress(request("203.0.113.5"))==="203.0.113.5","first forwarded address is used");
 assert(deviceType(request("1.1.1.1","Mozilla/5.0 (iPad; CPU OS 17_0)"))==="mobile"&&deviceType(request("1.1.1.1","Mozilla/5.0 (Linux; Android 14; Pixel 8)"))==="mobile"&&deviceType(request("1.1.1.1"))==="computer","tablets count as mobile");
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

console.log(JSON.stringify({passed}));
