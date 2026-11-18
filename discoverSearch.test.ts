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
await test("title Add buttons follow saved collections and only turn green after a save",async()=>{
 const pageHtml=await(await handler(new Request("https://test/setup/lists"))).text(),{document,window}=parseHTML(pageHtml);
 const script=[...pageHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join("\n");
 const url="https://mydramalist.com/18452-goblin";
 let failWrites=false;
 const saved=new Map<string,string>([["ydl.userCollections.v1",JSON.stringify([{id:"c1",name:"Favorites",titles:[]}])]]);
 const storage={getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>{if(failWrites&&k==="ydl.userCollections.v1")throw Error("full");saved.set(k,v)},removeItem:(k:string)=>saved.delete(k)};
 const location={href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists",search:"",hostname:"test"};
 const proto=(window as any).HTMLDialogElement?.prototype??Object.getPrototypeOf(document.createElement("dialog"));
 if(!proto.showModal){proto.showModal=function(){this.open=true};proto.close=function(){this.open=false;this.dispatchEvent(new window.Event("close"))};}
 new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(window,document,storage,location,{state:null,pushState(s:any){this.state=s},replaceState(s:any){this.state=s},back(){}},async()=>Response.json({query:"Goblin",page:1,titles:[{name:"Guardian: The Lonely and Great God",year:2016,url}],people:[],hasNextPage:false}),()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}});
 (document.getElementById("discoverInput") as HTMLInputElement).value="Goblin";
 (document.getElementById("discoverForm") as HTMLFormElement).dispatchEvent(new window.Event("submit",{cancelable:true}));
 await new Promise(r=>setTimeout(r,20));
 const pill=()=>document.querySelector("#listItems .discoverTitleAdd") as HTMLButtonElement;
 const added=()=>pill().classList.contains("is-added");
 const box=()=>document.querySelector(".collectionPickerRow input") as HTMLInputElement;
 const choose=(on:boolean)=>{pill().click();box().checked=on;box().dispatchEvent(new window.Event("change"));};
 const submit=()=>(document.querySelector(".collectionPickerForm") as HTMLFormElement).dispatchEvent(new window.Event("submit",{cancelable:true}));
 assert(!added()&&pill().textContent==="+Add","starts as a blue Add: "+pill().textContent);
 choose(true);[...document.querySelectorAll(".collectionPicker button")].find(b=>b.textContent==="Cancel")!.dispatchEvent(new window.Event("click"));
 assert(!added(),"canceling must not turn the button green");
 failWrites=true;choose(true);submit();
 assert(!added(),"a failed save must not turn the button green");
 (document.querySelector(".collectionPicker") as any).close();failWrites=false;
 choose(true);submit();
 assert(added()&&pill().textContent==="✓Added","a successful save shows a green Added: "+pill().textContent);
 assert(!pill().disabled,"the button is enabled again after saving");
 pill().click();assert(box().checked,"Added opens the picker with the saved membership checked");
 box().checked=false;box().dispatchEvent(new window.Event("change"));submit();
 assert(!added(),"removing the title from its last collection turns the button blue again");
});
await test("Weekly Picks keeps Add and Added and still selects the whole shelf",async()=>{
 const pageHtml=await(await handler(new Request("https://test/setup/lists"))).text(),{document,window}=parseHTML(pageHtml);
 const script=[...pageHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join("\n");
 const saved=new Map<string,string>(),storage={getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v),removeItem:(k:string)=>saved.delete(k)};
 const location={href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists",search:"",hostname:"test"};
 const catalog={id:"weekly-kr-1",name:"This Week: Romance",url:"https://yourdramalist/weekly/kr/1",type:"series"};
 const fetcher=async(url:string)=>String(url).startsWith("/api/catalogs/weekly")
  ?Response.json({collections:[{catalog,items:[{title:"Love A",url:"https://mydramalist.com/1-love-a",poster:"https://image.tmdb.org/a.jpg"}]}],nextRefresh:new Date(Date.now()+864e5).toISOString()})
  :Response.json({collections:[],items:[]});
 // The weekly countdown clock uses setInterval; collect its timers so the test can stop them.
 const realInterval=globalThis.setInterval,timers:number[]=[];
 (globalThis as any).setInterval=(fn:any,ms:number)=>{const id=realInterval(fn,ms);timers.push(id);return id};
 new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(window,document,storage,location,{state:null,pushState(s:any){this.state=s},replaceState(s:any){this.state=s},back(){}},fetcher,()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}});
 let add:any;
 try{
 for(let i=0;i<50&&!add;i++){await new Promise(r=>setTimeout(r,10));add=[...document.querySelectorAll(".catalogAdd.discoverAddPill")].find((b:any)=>b.getAttribute("aria-label")?.endsWith(catalog.name));}
 assert(add,"Weekly Picks shelf button is missing");
 assert(add.textContent==="+"+TEXT.compactCatalogAdd&&add.getAttribute("aria-pressed")==="false","Weekly Picks starts as Add: "+add.textContent);
 add.click();
 const selection=JSON.parse(saved.get("ydl-v3-selection")||"[]");
 assert(selection.length===1&&selection[0].url===catalog.url,"Add selects the whole shelf: "+JSON.stringify(selection));
 assert(add.textContent==="✓Added"&&add.classList.contains("is-added")&&add.getAttribute("aria-pressed")==="true","Weekly Picks shows Added: "+add.textContent);
 add.click();
 assert(JSON.parse(saved.get("ydl-v3-selection")||"[]").length===0&&add.textContent==="+"+TEXT.compactCatalogAdd,"Added removes the whole shelf again");
 }finally{globalThis.setInterval=realInterval;for(const id of timers)clearInterval(id);}
});
console.log(JSON.stringify({passed}));
