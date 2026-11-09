import {parseHTML} from "npm:linkedom@0.18.12";
import {ERROR_CATEGORIES,POSTER_VERIFY_CATEGORIES,adminErrors,recordErrorLog} from "./analyticsApi.ts";
import {SETUP_ERRORS,POSTER_ERRORS,POSTER_PROVIDERS} from "./errorGuide.ts";
import {createPreviewHandler} from "./preferencesPreview.ts";
import {adminPage} from "./wallpaperAdmin.ts";
import {OWNER_ID} from "./wallpaper.ts";
let passed=0;const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};async function test(name:string,fn:()=>unknown){await fn();passed++;console.log("PASS "+name)}

await test("every recorded error type has a plain-language guide entry",()=>{
 const setup=[...ERROR_CATEGORIES],poster=new Set([...POSTER_VERIFY_CATEGORIES].map(c=>c.split(":")[1])),providers=new Set([...POSTER_VERIFY_CATEGORIES].map(c=>c.split(":")[0]));
 for(const c of setup)assert(SETUP_ERRORS[c],"setup guide missing: "+c);
 for(const c of poster)assert(POSTER_ERRORS[c],"poster guide missing: "+c);
 for(const p of providers)assert(POSTER_PROVIDERS[p],"provider name missing: "+p);
 for(const g of [...Object.values(SETUP_ERRORS),...Object.values(POSTER_ERRORS)])assert(g.title&&g.meaning&&g.fix&&["user","you","outside"].includes(g.owner),"incomplete guide entry: "+g.title);
 assert(SETUP_ERRORS["manifest-generation"].owner==="you","server failures should need the owner's attention");
});

await test("error records accept only real codes and known error types",async()=>{
 // Invalid input returns quietly without touching storage or throwing.
 await recordErrorLog({code:"not-a-code",kind:"setup",category:"catalog-count"});
 await recordErrorLog({code:"YDL-1A2B3C4D",kind:"setup",category:"made-up"});
 await recordErrorLog({code:"YDL-1A2B3C4D",kind:"poster",category:"credentials-rejected",provider:"evil"});
});

await test("poster check errors pass their code, provider and type to the error log",async()=>{
 const logged:any[]=[];
 const handler=createPreviewHandler((async()=>new Response("",{status:403})) as typeof fetch,Date.now,async()=>{},async(entry:any)=>{logged.push(entry)});
 const r=await handler(new Request("https://test/api/preferences/poster-preview",{method:"POST",headers:{origin:"https://test","content-type":"application/json"},body:JSON.stringify({provider:"rpdb",apiKey:"abcdefgh12"})}));
 const body=await r.json();
 assert(logged.length===1&&logged[0].code===body.diagnosticCode&&logged[0].kind==="poster"&&logged[0].provider==="rpdb"&&logged[0].category==="credentials-rejected","poster error not logged: "+JSON.stringify(logged));
 assert(!JSON.stringify(logged).includes("abcdefgh12"),"API key reached the error log");
});

await test("only the site owner can read error records",async()=>{
 const get=(session:any,q="")=>adminErrors(new Request("https://test/api/admin/errors"+q),session);
 assert((await get(null)).status===401,"signed-out access allowed");
 assert((await get({user:{id:"someone-else"}})).status===403,"non-owner access allowed");
 const owner={user:{id:OWNER_ID}};
 assert((await get(owner,"?code=bad")).status===400,"malformed code accepted");
 const ok=await get(owner);const data=await ok.json();
 assert(ok.status===200&&Array.isArray(data.rows)&&data.guide.setup["catalog-count"]&&data.timezone==="America/Los_Angeles","owner listing failed");
 assert((await adminErrors(new Request("https://test/api/admin/errors",{method:"POST"}),owner)).status===405,"writes allowed");
});

await test("admin Errors section shows the summary, alert, guide, recent list and code lookup",async()=>{
 const html=adminPage(true);const {document,window}=parseHTML(html);
 const now=Date.now(),guide={setup:SETUP_ERRORS,poster:POSTER_ERRORS,providers:POSTER_PROVIDERS};
 const rows=[{code:"YDL-AAAA0001",at:now-60000,kind:"setup",category:"manifest-generation",provider:null},{code:"YDL-AAAA0002",at:now-120000,kind:"poster",category:"credentials-rejected",provider:"rpdb"},{code:"YDL-AAAA0003",at:now-180000,kind:"setup",category:"catalog-count",provider:null}];
 const summary=[{kind:"setup",category:"catalog-count",count:5,week:3,today:1,last:now-180000},{kind:"setup",category:"manifest-generation",count:1,week:1,today:1,last:now-60000},{kind:"poster",category:"credentials-rejected",count:2,week:2,today:1,last:now-120000}];
 const fetcher=async(url:string)=>{
  if(url.startsWith("/api/admin/errors?code=YDL-AAAA0002"))return Response.json({match:rows[1],guide});
  if(url.startsWith("/api/admin/errors?code="))return Response.json({match:null,guide});
  if(url.startsWith("/api/admin/errors"))return Response.json({days:30,now,rows,summary,guide});
  if(url.startsWith("/api/admin/analytics"))return Response.json({rows:[]});
  return Response.json({mode:"posters",image:"",tint:"#000000",opacity:0.45});
 };
 const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
 new Function("window","document","fetch","navigator","location","ResizeObserver","requestAnimationFrame",script)(window,document,fetcher,{clipboard:{writeText:async()=>{}}},{origin:"https://test"},class{observe(){}disconnect(){}},()=>0);
 await new Promise(r=>setTimeout(r,20));
 const $=(id:string)=>document.getElementById(id)!;
 assert($("errorsToday").textContent==="3"&&$("errorsWeek").textContent==="6","summary counts wrong");
 assert($("errorsTop").textContent==="Too many catalogs","most common error wrong");
 assert(!$("errorAttention").hasAttribute("hidden")&&/Install link failed to build/.test($("errorAttention").textContent),"needs-attention alert missing");
 assert($("attentionFilter").textContent==="Needs your attention (1)","attention count wrong");
 const guideRows=document.querySelectorAll("#errorGuideRows tr.guideRow");
 assert(guideRows.length===Object.keys(SETUP_ERRORS).length+Object.keys(POSTER_ERRORS).length,"guide table should list every error type");
 assert(guideRows[0].textContent!.includes("Too many catalogs"),"guide table should sort by count");
 assert(document.querySelectorAll("#recentErrorRows tr").length===3,"recent list wrong");
 assert(document.querySelector("#recentErrorRows tr")!.textContent!.includes("YDL-AAAA0001"),"newest error should be first");
 (document.querySelector('#errorFilters [data-filter="you"]') as any).click();
 assert(document.querySelectorAll("#recentErrorRows tr").length===1,"needs-attention filter wrong");
 (document.querySelector('#errorFilters [data-filter="poster"]') as any).click();
 assert(document.querySelector("#recentErrorRows tr")!.textContent!.includes("Poster key rejected · RPDB"),"poster filter or provider label wrong");
 ($("codeInput") as any).value="ydl-aaaa0002";$("codeLookup").dispatchEvent(new window.Event("submit"));
 await new Promise(r=>setTimeout(r,20));
 assert(/YDL-AAAA0002/.test($("codeResult").textContent!)&&/Tell the user: Check the key/.test($("codeResult").textContent!),"code lookup result wrong");
 ($("codeInput") as any).value="YDL-FFFF0000";$("codeLookup").dispatchEvent(new window.Event("submit"));
 await new Promise(r=>setTimeout(r,20));
 assert(/No record of YDL-FFFF0000/.test($("codeResult").textContent!),"missing code message wrong");
 assert(!html.includes('id="errorRanks"')&&!html.includes('id="posterVerifyRanks"')&&!html.includes('id="todayPosterErrors"'),"old split error boxes still present");
});
console.log(JSON.stringify({passed}));
