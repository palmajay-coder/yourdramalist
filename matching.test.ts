import {fe,Et} from "./addonScrape.ts";
let passed=0;const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};async function test(name:string,fn:()=>unknown){await fn();passed++;console.log("PASS "+name)}
const nextYear=new Date().getFullYear()+1;
// Synthetic Cinemeta and TMDB answers shaped like the real ones seen for these titles.
const cinemeta:Record<string,any[]>={
 "pulse":[{id:"tt0286751",name:"Pulse",releaseInfo:"2005"},{id:"tt0454919",name:"Pulse",releaseInfo:"2006"},{id:"tt50307492",name:"Pulse"}],
 "city on fire":[{id:"tt0093435",name:"City on Fire",releaseInfo:"2025"},{id:"tt14764514",name:"City on Fire"},{id:"tt0078976",name:"City on Fire",releaseInfo:"1979"}],
 "crash landing on you":[{id:"tt10850932",name:"Crash Landing on You",releaseInfo:"2019"}],
 "brand new show":[{id:"tt99999901",name:"Brand New Show"}],
};
const tmdb:Record<string,any>={
 "pulse":{results:[{id:1001,title:"Pulse",release_date:"2001-02-03"}],ext:{1001:"tt0286751"}},
 "city on fire":{results:[{id:1002,title:"City on Fire",release_date:"1987-02-13"}],ext:{1002:"tt0093435"}},
 "brand new show":{results:[],ext:{}},
};
let tmdbCalls=0;
globalThis.fetch=(async(input:string|URL)=>{
 const u=new URL(String(input));
 if(u.hostname==="v3-cinemeta.strem.io"){const q=decodeURIComponent(u.pathname.split("search=")[1].replace(/\.json$/,""));return Response.json({metas:cinemeta[q]||[]});}
 if(u.hostname==="api.themoviedb.org"){tmdbCalls++;const ext=u.pathname.match(/\/(\d+)\/external_ids/);if(ext){for(const t of Object.values(tmdb))if(t.ext[ext[1]])return Response.json({imdb_id:t.ext[ext[1]]});return Response.json({});}return Response.json({results:(tmdb[(u.searchParams.get("query")||"").toLowerCase()]||{results:[]}).results});}
 return new Response("not found",{status:404});
}) as typeof fetch;

await test("Pulse (2001) matches the 2001 film, not the undated upcoming one",async()=>{
 const m=await fe({slug:"1-pulse",title:"Pulse",year:2001},"movie","test-key");
 assert(m?.id==="tt0286751","picked "+JSON.stringify(m));
});
await test("City on Fire (1987) matches the 1987 film, not the undated upcoming one",async()=>{
 const m=await fe({slug:"2-city-on-fire",title:"City on Fire",year:1987},"movie","test-key");
 assert(m?.id==="tt0093435","picked "+JSON.stringify(m));
});
await test("titles Cinemeta already dates correctly match without asking TMDB",async()=>{
 const before=tmdbCalls;
 const m=await fe({slug:"3-crash-landing-on-you",title:"Crash Landing on You",year:2019},"series","test-key");
 assert(m?.id==="tt10850932"&&tmdbCalls===before,"changed a correct match or called TMDB");
});
await test("new and upcoming titles can still match an undated listing",async()=>{
 const m=await fe({slug:"4-brand-new-show",title:"Brand New Show",year:nextYear},"series","test-key");
 assert(m?.id==="tt99999901","upcoming title lost its match: "+JSON.stringify(m));
});
await test("an undated result no longer outranks an older, dated title",()=>{
 const pick=Et([{id:"tt1",name:"Pulse",year:2005},{id:"tt2",name:"Pulse",year:null}],"Pulse",2001);
 assert(!pick||pick.id!=="tt2","undated title won");
});

// Matches are stored so each title is looked up once; a failed lookup is retried, not remembered as "no match".
let cinemetaDown=false,cinemetaCalls=0;
const baseFetch=globalThis.fetch;
globalThis.fetch=(async(input:string|URL,init?:any)=>{
 const u=new URL(String(input));
 if(u.hostname==="v3-cinemeta.strem.io"){cinemetaCalls++;if(cinemetaDown)return new Response("busy",{status:503});}
 return baseFetch(input,init);
}) as typeof fetch;
await test("a title already matched costs no new requests",async()=>{
 const title={slug:"5-crash-landing-on-you-again",title:"Crash Landing on You",year:2019};
 const first=await fe(title,"series","test-key");
 const before=cinemetaCalls;
 const second=await fe(title,"series","test-key");
 assert(first?.id==="tt10850932"&&second?.id==="tt10850932"&&cinemetaCalls===before,"the stored match was not reused");
});
await test("a failed lookup is not remembered as no match, and is tried again",async()=>{
 const title={slug:"6-flaky-lookup",title:"Crash Landing on You",year:2019};
 cinemetaDown=true;
 const down=await fe(title,"series","test-key");
 cinemetaDown=false;
 // Memory pauses a failed title for a minute; clear that pause to stand in for the next load.
 const {O}=await import("./addonScrape.ts");O.delete("nm2:series:6-flaky-lookup");O.delete("match3:series:6-flaky-lookup");
 const up=await fe(title,"series","test-key");
 assert(down===null&&up?.id==="tt10850932","a title that failed to look up should match on the next try");
});
await test("a title with no match anywhere is remembered as a miss, not looked up again",async()=>{
 const title={slug:"7-no-such-title",title:"Nothing Here At All",year:2020};
 const none=await fe(title,"series","test-key");
 const before=cinemetaCalls;
 const again=await fe(title,"series","test-key");
 assert(none===null&&again===null&&cinemetaCalls===before,"a real miss should not be looked up again");
});
console.log(JSON.stringify({passed}));
