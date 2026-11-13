// The Discover search box (actors and directors) and the floating notice it uses.
import {parseHTML} from "npm:linkedom@0.18.12";
import {installFloatingNotice} from "./notifications.ts";
import {TEXT} from "./text.ts";
import handler from "./app.ts";
let passed=0;
const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};
async function test(name:string,fn:()=>unknown){await fn();passed++;console.log("PASS "+name);}
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
