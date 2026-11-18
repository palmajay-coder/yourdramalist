// The unified Discover search box and the floating notice it uses.
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
await test("Discover search renders titles and people from one query",async()=>{
 const pageHtml=await(await handler(new Request("https://test/setup/lists"))).text(),{document,window}=parseHTML(pageHtml);
 const script=[...pageHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join("\n");
 const saved=new Map<string,string>(),storage={getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v),removeItem:(k:string)=>saved.delete(k)};
 const location={href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists",search:"",hostname:"test"};
 const asked:string[]=[];
 new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(window,document,storage,location,{state:null,pushState(s:any){this.state=s},replaceState(s:any){this.state=s},back(){}},async(url:string)=>{asked.push(String(url));return Response.json({query:"Goblin",page:1,titles:[{name:"Guardian: The Lonely and Great God",year:2016,url:"https://mydramalist.com/18452-goblin"}],people:[{id:"440",name:"Gong Yoo"}],hasNextPage:true})},()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}});
 (document.getElementById("discoverInput") as HTMLInputElement).value="Goblin";
 (document.getElementById("discoverForm") as HTMLFormElement).dispatchEvent(new window.Event("submit",{cancelable:true}));
 await new Promise(r=>setTimeout(r,20));
 assert(asked.some(u=>u.startsWith("/api/mdl/people-search")&&u.includes("Goblin")),"unified search was not requested: "+asked.join(", "));
 assert(asked.filter(u=>u.startsWith("/api/mdl/people-search")).length===1,"expected one search request");
 const results=document.getElementById("listItems")!;
 assert(results.querySelector("button.discoverTitleIdentity")?.textContent?.includes("Guardian"),"title result is missing");
 assert(!results.querySelector(".discoverTitleRow")?.textContent?.includes("2016"),"year belongs in the preview");
 assert(results.querySelector(".discoverTitleAdd")?.getAttribute("aria-label")?.startsWith("Add to Collection:"),"collection action is missing");
 assert(results.querySelector(".compactPersonIdentity")?.textContent?.includes("Gong Yoo"),"people result is missing");
 assert(results.querySelector("nav")?.getAttribute("aria-label")==="Discover search result pages","pagination is missing");
});
console.log(JSON.stringify({passed}));
