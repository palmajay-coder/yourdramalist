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
console.log(JSON.stringify({passed}));
