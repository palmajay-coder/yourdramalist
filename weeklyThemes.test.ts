import {parseHTML} from "npm:linkedom@0.18.12";
import {THEMES,themesForWeek,weekWindow,weeklyCatalog} from "./collections.ts";
import {createCollectionService} from "./collectionService.ts";
import {adminWeekly} from "./analyticsApi.ts";
import {adminPage} from "./wallpaperAdmin.ts";
import {OWNER_ID} from "./wallpaper.ts";
let passed=0;const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};async function test(name:string,fn:()=>unknown){await fn();passed++;console.log("PASS "+name)}

await test("25 themes, the original rotation this week, the new pool from Nov 16",()=>{
 assert(THEMES.length===25&&new Set(THEMES.map(t=>t.name)).size===25,"25 unique themes");
 const now=weekWindow(Date.UTC(2026,10,10,12));
 assert(now.week==="2026-11-09"&&now.themes.map(t=>t.name).join("|")==="A Little Comfort|One More Episode","this week is unchanged");
 const next=weekWindow(Date.UTC(2026,10,17,12));
 assert(next.week==="2026-11-16"&&next.themes.map(t=>t.name).join("|")==="Sweet Revenge|First Love","new themes start next Monday");
 for(let index=2;index<200;index++){
  const seen=new Set<string>();for(let w=index;w<index+12;w++)for(const t of themesForWeek(w))seen.add(t.name);
  assert(seen.size===24,"no theme repeats within 12 weeks (week "+index+")");
 }
});

await test("every theme has a name in each supported language",()=>{
 for(const language of ["es-ES","fr-FR","de-DE","it-IT","pt-BR","nl-NL","pl-PL","tr-TR","ru-RU","uk-UA","ar-SA","he-IL","hi-IN","ja-JP","ko-KR","zh-CN"]){
  for(let index=0;index<THEMES.length;index++){
   const original=Date.now;(Date as any).now=()=>Date.UTC(2026,10,17,12)+Math.floor(index/2)*604800000;
   try{const name=weeklyCatalog("3",index%2,language).name;assert(!name.startsWith(themesForWeek(2+Math.floor(index/2))[index%2].name+" ("),"untranslated "+language+" theme "+index)}finally{(Date as any).now=original}
  }
 }
});

await test("a thin theme relaxes its filters, then tops up with the country's best dramas",async()=>{
 const calls:string[]=[];
 const fetcher=(async(input:URL)=>{const u=new URL(String(input));calls.push(u.pathname+"?"+u.searchParams.toString());
  if(u.pathname.includes("search/keyword"))return Response.json({results:[{id:7,name:u.searchParams.get("query")}]});
  const kind=u.pathname.endsWith("/tv")?"tv":"movie",votes=u.searchParams.get("vote_count.gte"),drama=u.searchParams.get("with_genres")==="18";
  const count=drama?20:2,offset=(drama?500:votes==="5"?300:100)+(kind==="tv"?0:50);
  return Response.json({results:Array.from({length:count},(_,i)=>({id:offset+i,name:"T"+(offset+i),title:"T"+(offset+i),poster_path:"/p.jpg",first_air_date:"2020-01-01",release_date:"2020-01-01",vote_average:7,vote_count:30,genre_ids:[18],origin_country:["TW"]}))},{headers:{"content-type":"application/json"}});
 }) as typeof fetch;
 const service=createCollectionService(undefined,()=>"key",fetcher,()=>Date.UTC(2026,10,17,12));
 const data=await service.weekly("5");
 const items=data.collections[0].items;
 assert(items.length===20,"row is filled: "+items.length);
 assert(items.slice(0,4).every((x:any)=>x.id<300)&&items.slice(4,8).every((x:any)=>x.id>=300&&x.id<500),"theme titles first, relaxed matches next: "+items.map((x:any)=>x.id).join(","));
 assert(items.slice(8).every((x:any)=>x.id>=500),"then the country's best-rated dramas");
 assert(calls.some(c=>c.includes("vote_count.gte=5")&&c.includes("with_keywords"))&&calls.some(c=>c.includes("with_genres=18")&&!c.includes("with_keywords")),"relaxed and top-up searches ran");
});

await test("admin rotation lists this week, upcoming weeks and every theme",async()=>{
 const owner={user:{id:OWNER_ID}};
 assert((await adminWeekly(new Request("https://test/api/admin/weekly"),{})).status===401,"signed-out visitors are refused");
 const data=await (await adminWeekly(new Request("https://test/api/admin/weekly"),owner,Date.UTC(2026,10,10,12))).json();
 assert(data.current==="2026-11-09"&&data.weeks.find((w:any)=>w.current).themes.map((t:any)=>t.name).join("|")==="A Little Comfort|One More Episode","this week");
 assert(data.weeks.find((w:any)=>w.week==="2026-11-16").themes[0].name==="Sweet Revenge","next week");
 const revenge=data.themes.find((t:any)=>t.name==="Sweet Revenge");
 assert(data.themes.length===25&&revenge.runs===0&&revenge.nextRun==="2026-11-16","theme table");
 const comfort=data.themes.find((t:any)=>t.name==="A Little Comfort");
 assert(comfort.live&&comfort.runs===1&&comfort.lastRun==="2026-11-09","current theme marked live");

 const html=adminPage(true);const {document,window}=parseHTML(html);
 const fetcher=async(url:string)=>url.startsWith("/api/admin/weekly")?Response.json(data):url.startsWith("/api/admin/analytics")?Response.json({rows:[]}):url.startsWith("/api/admin/errors")?Response.json({rows:[],summary:[],guide:{setup:{},poster:{},providers:{}}}):Response.json({mode:"posters",image:"",tint:"#000000",opacity:0.45});
 const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
 new Function("window","document","fetch","navigator","location","ResizeObserver","requestAnimationFrame",script)(window,document,fetcher,{clipboard:{writeText:async()=>{}}},{origin:"https://test"},class{observe(){}disconnect(){}},()=>0);
 await new Promise(r=>setTimeout(r,20));
 assert(/A Little Comfort · One More Episode/.test(document.getElementById("weeklyNow")!.textContent!),"this week shown");
 assert(document.querySelectorAll("#weeklyNext li").length===8&&/Sweet Revenge · First Love/.test(document.getElementById("weeklyNext")!.textContent!),"coming up shown");
 assert(document.querySelectorAll("#weeklyThemes tr").length===25&&document.getElementById("weeklyAllTitle")!.textContent==="All themes (25)","all themes table");
});
console.log(JSON.stringify({passed}));
