import {createDramaSearchHandler} from "./dramaSearchApi.ts";
import {parseHTML} from "npm:linkedom@0.18.12";
import {installFloatingNotice} from "./notifications.ts";
import {TEXT} from "./text.ts";
import handler from "./app.ts";
let passed=0;
const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};
async function test(name:string,fn:()=>unknown){await fn();passed++;console.log("PASS "+name);}
const html='<html><head><title>Search results - MyDramaList</title></head><body><div class="box" id="mdl-123"><div class="film-cover"><img src="https://i.mydramalist.com/test.jpg"></div><div class="content"><div class="title"><a href="/123-sample-drama">Sample Drama</a></div><span class="score">8.2</span><p class="text-muted">Japanese Drama - 1996</p></div></div><div class="pagination"><a href="/search?q=sample&amp;page=2">Next</a></div></body></html>';
// Search now reads Kuryana (MyDramaList's data as JSON). html above shows the old MyDramaList page shape.
const page=()=>Response.json({success:true,data:{dramas:[{id:123,link:"https://mydramalist.com/123-sample-drama",title:"Sample Drama",image:"https://i.mydramalist.com/test.jpg",rating:8.2,type:"Korean Drama",year:2020}],pagination:{page:1,total_pages:2}}});
const req=(q="sample",p="1")=>new Request("https://test/api/mdl/drama-search?q="+encodeURIComponent(q)+"&page="+p);
await test("invalid input is rejected without upstream requests",async()=>{
 let calls=0;const get=createDramaSearchHandler((async()=>{calls++;return page()}) as typeof fetch);
 for(const r of [req("a"),req("x".repeat(101)),req("sample","0"),new Request(req().url,{method:"POST"})])assert((await get(r)).status>=400,"invalid input accepted");
 assert(calls===0,"validation triggered upstream");
});
await test("search output and pagination retain their existing shape",async()=>{
 const get=createDramaSearchHandler((async()=>page()) as typeof fetch),data=await(await get(req())).json();
 assert(data.query==="sample"&&data.page===1&&data.hasNextPage,"search metadata");
 assert(data.dramas[0].name==="Sample Drama"&&data.dramas[0].score==="8.2"&&data.dramas[0].poster.startsWith("https://i.mydramalist.com/"),"card parsing changed");
});
await test("repeated searches use five-minute cache and preserve submitted query",async()=>{
 let calls=0,time=0;const get=createDramaSearchHandler((async()=>{calls++;return page()}) as typeof fetch,()=>time);
 await get(req("Sample"));const hit=await(await get(req(" sample "))).json();assert(calls===1&&hit.query==="sample","cache key or displayed query");
 time=300001;await get(req("sample"));assert(calls===2,"expired cache never refreshed");
});
await test("identical in-flight lookups share one upstream request",async()=>{
 let release!:()=>void,calls=0;const gate=new Promise<void>(r=>release=r);
 const get=createDramaSearchHandler((async()=>{calls++;await gate;return page()}) as typeof fetch);
 const a=get(req()),b=get(req("SAMPLE"));assert(calls===1,"duplicate upstream lookup");release();
 assert((await a).status===200&&(await b).status===200,"shared request failed");
});
await test("three concurrent lookups are allowed and capacity recovers",async()=>{
 let release!:()=>void,calls=0;const gate=new Promise<void>(r=>release=r);
 const get=createDramaSearchHandler((async()=>{calls++;await gate;return page()}) as typeof fetch);
 const work=["one","two","three"].map(q=>get(req(q)));const busy=await get(req("four"));
 assert(busy.status===429&&busy.headers.get("retry-after")==="2"&&calls===3,"concurrency limit");
 release();await Promise.all(work);assert((await get(req("four"))).status===200,"capacity not released");
});
await test("minute limit counts uncached requests and resets automatically",async()=>{
 let calls=0,time=0;const get=createDramaSearchHandler((async()=>{calls++;return page()}) as typeof fetch,()=>time);
 for(let i=0;i<30;i++)assert((await get(req("title"+i))).status===200,"allowed search rejected");
 assert((await get(req("extra"))).status===429&&calls===30,"minute quota exceeded");
 assert((await get(req("title0"))).status===200&&calls===30,"cache used quota");
 time=60000;assert((await get(req("extra"))).status===200&&calls===31,"quota did not reset");
});
await test("Kuryana throttling adds a shared cooldown while cached results remain available",async()=>{
 let calls=0,time=0;const get=createDramaSearchHandler((async()=>{calls++;return calls===1?page():new Response("",{status:429,headers:{"retry-after":"10"}})}) as typeof fetch,()=>time);
 await get(req("cached"));const slow=await get(req("blocked"));
 /* Kuryana gives no retry time, so throttling pauses searches for 30 seconds. */assert(slow.status===429&&slow.headers.get("retry-after")==="30","throttle pause missing");
 assert((await get(req("another"))).status===429&&calls===2,"cooldown triggered extra request");
 assert((await get(req("cached"))).status===200,"cached results unavailable during cooldown");
 time=30001;await get(req("another"));assert(calls===3,"cooldown never released");
});
await test("oversized and challenge pages fail cleanly without being cached",async()=>{
 const huge=new Uint8Array(3000001);
 for(const response of [new Response(huge,{headers:{"content-type":"text/html"}}),new Response("<title>Just a moment</title>",{headers:{"content-type":"text/html"}}),new Response("<title>Wrong page</title>",{headers:{"content-type":"text/html"}})]){
  const get=createDramaSearchHandler((async()=>response) as typeof fetch);assert((await get(req())).status===502,"unsafe upstream response accepted");
 }
});
await test("a failed lookup does not occupy all subsequent search capacity",async()=>{
 let fail=true;const get=createDramaSearchHandler((async()=>{if(fail)throw new DOMException("timeout","TimeoutError");return page()}) as typeof fetch);
 assert((await get(req())).status===504,"timeout mapping");fail=false;
 assert((await get(req())).status===200,"failed lookup stayed pending");
});
await test("floating notice is dismissible, replaces itself and treats text safely",()=>{
 const {document}=parseHTML("<html><body></body></html>");Object.assign(globalThis,{document});
 const notice=installFloatingNotice(TEXT);notice.show("<img src=x onerror=alert(1)>");
 assert(document.querySelector(".noticeToastMessage")!.textContent?.startsWith("<img"),"message was not text");
 assert(!document.querySelector(".noticeToast img"),"message became HTML");
 notice.show(TEXT.searchRetry);assert(document.querySelectorAll(".noticeToast").length===1,"notifications stacked");
 (document.querySelector(".noticeToastClose") as HTMLButtonElement).click();
 assert((document.getElementById("floatingNotice") as HTMLElement).hidden,"dismiss did not hide notice");
});
// The Dramas tab was removed, so the Discover search box searches actors and directors only.
await test("Discover search looks up people, not dramas",async()=>{
 const pageHtml=await(await handler(new Request("https://test/setup/lists"))).text(),{document,window}=parseHTML(pageHtml);
 const script=[...pageHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join("\n");
 const saved=new Map<string,string>(),storage={getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v),removeItem:(k:string)=>saved.delete(k)};
 const location={href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists",search:"",hostname:"test"};
 const asked:string[]=[];
 new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(window,document,storage,location,{state:null,pushState(s:any){this.state=s},replaceState(s:any){this.state=s},back(){}},async(url:string)=>{asked.push(String(url));return Response.json({people:[],hasNextPage:false})},()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}});
 (document.getElementById("discoverInput") as HTMLInputElement).value="Goblin";
 (document.getElementById("discoverForm") as HTMLFormElement).dispatchEvent(new window.Event("submit",{cancelable:true}));
 await new Promise(r=>setTimeout(r,20));
 assert(asked.some(u=>u.startsWith("/api/mdl/people-search")&&u.includes("Goblin")),"people search was not requested: "+asked.join(", "));
 assert(!asked.some(u=>u.startsWith("/api/mdl/drama-search")),"drama search should not run from the page");
});
console.log(JSON.stringify({passed}));
