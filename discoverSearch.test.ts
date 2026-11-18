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
await test("the green + opens a full-screen search that shows results on the same screen and keeps recent searches",async()=>{
 const pageHtml=await(await handler(new Request("https://test/setup/lists"))).text(),{document,window}=parseHTML(pageHtml);
 const script=[...pageHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join("\n");
 const saved=new Map<string,string>();let blocked=false;
 const storage={getItem:(k:string)=>{if(blocked)throw Error("blocked");return saved.get(k)??null},setItem:(k:string,v:string)=>{if(blocked)throw Error("blocked");saved.set(k,v)},removeItem:(k:string)=>saved.delete(k)};
 const location={href:"https://test/setup",origin:"https://test",pathname:"/setup",search:"",hostname:"test"};
 const proto=Object.getPrototypeOf(document.createElement("dialog"));
 if(!proto.showModal){proto.showModal=function(){this.open=true};proto.close=function(){if(!this.open)return;this.open=false;this.dispatchEvent(new window.Event("close"))};}
 let focused:any=null;
 for(const tag of ["input","button"]){const p1=Object.getPrototypeOf(document.createElement(tag));for(const p of [p1,Object.getPrototypeOf(p1)])Object.defineProperty(p,"focus",{configurable:true,value(){focused=this}});}
 const asked:string[]=[];
 const hist={state:null as any,pushState(s:any){this.state=s},replaceState(s:any){this.state=s},back(){this.state=null;window.dispatchEvent(new window.Event("popstate"))}};
 new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(window,document,storage,location,hist,async(url:string)=>{asked.push(String(url));return Response.json({query:"x",page:1,titles:[{name:"Bullet Ballet",year:1998,url:"https://mydramalist.com/1-bullet-ballet"}],people:[{id:"9",name:"Shinya Tsukamoto"}],hasNextPage:false,collections:[],items:[]})},()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}});
 const nav=[...document.querySelectorAll(".androidBottomNav button")] as any[];
 assert(nav.map(b=>b.getAttribute("aria-label")).join("|")==="Connect|Community|Search titles to add|Discover|My Collections","the + belongs in the middle");
 const plus=nav[2],sheet=()=>document.querySelector(".quickSearch") as any,box=()=>document.getElementById("quickSearchInput") as HTMLInputElement;
 const tick=(ms=30)=>new Promise(r=>setTimeout(r,ms));
 const searches=()=>asked.filter(u=>u.startsWith("/api/mdl/people-search")).length;
 const enter=async(text:string)=>{box().value=text;(sheet().querySelector("form") as any).dispatchEvent(new window.Event("submit",{cancelable:true}));await tick();};
 const items=()=>[...sheet().querySelectorAll(".quickSearchItem")].map((b:any)=>b.textContent);
 plus.click();
 assert(sheet().open&&focused===box(),"the + opens the search with the box focused");
 assert(sheet().textContent.includes("Build your own catalog")&&sheet().textContent.includes("Search a title and tap Add."),"an empty history explains what to do");
 assert(sheet().querySelector("form").classList.contains("withIntro"),"the heading sits above the search box while there are no recent searches");
 (sheet().querySelector(".quickSearchBack") as any).click();
 assert(!sheet().open&&focused===plus,"the back arrow closes the search and returns to the +");
 plus.click();
 box().value="bullet balle";box().dispatchEvent(new window.Event("input"));
 await tick(100);assert(searches()===0,"typing waits for a short pause");
 await tick(500);
 assert(searches()===1&&asked[asked.length-1].includes("bullet%20balle"),"pausing searches once: "+asked.join(", "));
 const results=sheet().querySelector(".quickSearchResults");
 assert(sheet().open&&results.querySelector(".discoverTitleIdentity")?.textContent.includes("Bullet Ballet"),"results show on the search screen");
 assert(results.querySelector(".discoverTitleAdd")&&results.textContent.includes("Shinya Tsukamoto"),"results use the Discover Add buttons and include people");
 assert(!document.getElementById("listItems")!.textContent.includes("Bullet Ballet"),"Discover's own results are untouched");
 assert(sheet().querySelector(".quickSearchRecentView").hidden&&!sheet().querySelector(".quickSearchClearText").hidden,"recent searches hide and the × shows while results are up");
 assert(!items().length&&!saved.get("ydl.recentSearches.v1"),"typing alone does not save a recent search");
 await enter("bullet balle");
 assert(searches()===1,"pressing Search on the same text does not search again");
 assert(JSON.parse(saved.get("ydl.recentSearches.v1")!).join()==="bullet balle","pressing Search saves it");
 (sheet().querySelector(".quickSearchClearText") as any).click();
 assert(box().value===""&&!results.childElementCount&&!sheet().querySelector(".quickSearchRecentView").hidden&&items().join()==="bullet balle","× clears the box and shows recent searches");
 assert(!sheet().querySelector("form").classList.contains("withIntro"),"recent searches replace the heading");
 (sheet().querySelector(".quickSearchItem") as any).click();await tick();
 assert(searches()===2&&box().value==="bullet balle"&&results.childElementCount,"tapping a recent search searches again on the same screen");
 (sheet().querySelector(".quickSearchBack") as any).click();
 (document.getElementById("discoverInput") as HTMLInputElement).value="Gong Yoo";
 (document.getElementById("discoverForm") as any).dispatchEvent(new window.Event("submit",{cancelable:true}));await tick();
 plus.click();
 assert(items().join("|")==="Gong Yoo|bullet balle","Discover and the + share recent searches: "+items().join("|"));
 for(let i=0;i<10;i++)await enter("Title "+i);
 (sheet().querySelector(".quickSearchClearText") as any).click();
 assert(items().length===8&&items()[0]==="Title 9","recent searches keep the newest 8");
 (sheet().querySelector(".quickSearchRemove") as any).click();
 assert(items()[0]==="Title 8","× on a row removes it");
 (sheet().querySelector(".quickSearchClear") as any).click();
 assert(!items().length,"Clear removes them all");
 blocked=true;const before=searches();await enter("Goblin");
 assert(searches()===before+1,"search still works when storage is blocked");
});
console.log(JSON.stringify({passed}));
