// The unified Discover search box and the floating notice it uses.
import {parseHTML} from "npm:linkedom@0.18.12";
import {installFloatingNotice} from "./notifications.ts";
import {TEXT} from "./text.ts";
import handler from "./app.ts";
import {matchScore,rankSearchResults} from "./searchRanking.ts";
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
 pill().click();
 const summary=document.querySelector(".collectionPickerNew summary")!,save=document.querySelector(".collectionPickerSave") as HTMLButtonElement;
 assert(summary.querySelector(".collectionPickerNewIcon")?.getAttribute("aria-hidden")==="true"&&summary.textContent==="+Create New Collection","Create New Collection has a separate + icon");
 assert(save.disabled&&save.textContent==="Save","Save starts disabled with no changes");
 box().checked=true;box().dispatchEvent(new window.Event("change"));
 assert(!save.disabled&&save.textContent==="Save","Save always reads Save, with no checkmark or count: "+save.textContent);
 (document.querySelector(".collectionPicker") as any).close();
 choose(true);[...document.querySelectorAll(".collectionPicker button")].find(b=>b.textContent==="Cancel")!.dispatchEvent(new window.Event("click"));
 assert(!added(),"canceling must not turn the button green");
 failWrites=true;choose(true);submit();
 assert(!added(),"a failed save must not turn the button green");
 (document.querySelector(".collectionPicker") as any).close();failWrites=false;
 choose(true);submit();
 assert(added()&&pill().textContent==="✓Added","a successful save shows a green Added: "+pill().textContent);
 assert(!pill().disabled,"the button is enabled again after saving");
 pill().click();assert(box().checked,"Added opens the picker with the saved membership checked");
 const labels=()=>/Already added|Will add|Will remove/.test(document.querySelector(".collectionPickerList")!.textContent||"");
 assert(!labels(),"rows show no membership labels");
 box().checked=false;box().dispatchEvent(new window.Event("change"));assert(!labels(),"unchecking shows no label");
 box().checked=true;box().dispatchEvent(new window.Event("change"));
 box().checked=false;box().dispatchEvent(new window.Event("change"));submit();
 assert(!added(),"removing the title from its last collection turns the button blue again");
});
await test("a Weekly Picks title keeps the shelf's poster when its preview opens",async()=>{
 const pageHtml=await(await handler(new Request("https://test/setup/lists"))).text(),{document,window}=parseHTML(pageHtml);
 const script=[...pageHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join("\n");
 const proto=Object.getPrototypeOf(document.createElement("dialog"));
 if(!proto.showModal){proto.showModal=function(){this.open=true};proto.close=function(){if(!this.open)return;this.open=false;this.dispatchEvent(new window.Event("close"))};}
 const shelfPoster="https://image.tmdb.org/t/p/w780/rotated.jpg";
 const catalog={id:"weekly-kr-1",name:"This Week: Romance",url:"https://yourdramalist/weekly/kr/1",type:"series"};
 const realInterval=globalThis.setInterval,realImage=(globalThis as any).Image,timers:number[]=[];
 (globalThis as any).setInterval=(fn:any,ms:number)=>{const id=realInterval(fn,ms);timers.push(id);return id};
 // Preview posters load through new Image(); finish them at once.
 (globalThis as any).Image=class{onload:any;set src(_:string){setTimeout(()=>this.onload?.(),0)}};
 const fetcher=async(url:string)=>String(url).startsWith("/api/catalogs/weekly")
  ?Response.json({collections:[{catalog,items:[{kind:"tv",id:7,name:"The Glory",date:"2022-12-30",poster:shelfPoster}]}],nextRefresh:new Date(Date.now()+864e5).toISOString()})
  :String(url).startsWith("/api/mdl/drama-details")?Response.json({poster:"https://image.tmdb.org/t/p/w780/standard.jpg",synopsis:"A story.",reviews:[]})
  :Response.json({collections:[],items:[]});
 try{
  new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver","Image",script)(window,document,{getItem:()=>null,setItem(){},removeItem(){}},{href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists",search:"",hostname:"test"},{state:null,pushState(){},replaceState(){},back(){}},fetcher,()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}},(globalThis as any).Image);
  let tile:any;for(let i=0;i<50&&!tile;i++){await new Promise(r=>setTimeout(r,10));tile=document.querySelector(".catalogPoster");}
  assert(tile?.querySelector("img")?.getAttribute("src")===shelfPoster,"the shelf shows the server's poster for these 12 hours");
  tile.click();await new Promise(r=>setTimeout(r,60));
  const preview=document.querySelector(".catalogTitleDialog") as any;
  assert(preview.open&&preview.textContent.includes("A story."),"the preview opens with its details");
  assert(preview.querySelector(".catalogTitleArtwork").getAttribute("src")===shelfPoster,"the preview keeps the shelf's poster: "+preview.querySelector(".catalogTitleArtwork").getAttribute("src"));
 }finally{globalThis.setInterval=realInterval;(globalThis as any).Image=realImage;for(const id of timers)clearInterval(id);}
});
await test("\"Because you watched\" shelves sit under Weekly Picks for a connected username, and Add selects the row",async()=>{
 const pageHtml=await(await handler(new Request("https://test/setup/lists"))).text();
 const script=[...pageHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join("\n");
 const catalog={id:"weekly-kr-1",name:"This Week: Romance",url:"ydl-weekly:3:0",type:"series",kind:"weekly",country:"3",slot:0};
 const realInterval=globalThis.setInterval,timers:number[]=[];
 (globalThis as any).setInterval=(fn:any,ms:number)=>{const id=realInterval(fn,ms);timers.push(id);return id};
 const mount=async(user:string|null)=>{
  const {document,window}=parseHTML(pageHtml);const saved=new Map<string,string>();if(user)saved.set("ydl-v3-user",user);
  const asked:string[]=[];
  const fetcher=async(url:string)=>{const u=String(url);asked.push(u);
   if(u.startsWith("/api/catalogs/weekly"))return Response.json({collections:[{catalog,items:[{kind:"tv",id:1,name:"Love A",date:"2024-01-01",poster:"https://image.tmdb.org/t/p/w780/a.jpg"}]}],nextRefresh:new Date(Date.now()+864e5).toISOString()});
   if(u.startsWith("/api/recommendations"))return Response.json({week:"2026-11-16",nextRefresh:new Date(Date.now()+864e5).toISOString(),rows:[
    {seed:{title:"The Glory",slug:"1-the-glory"},items:[{kind:"tv",id:7,name:"Mouse",date:"2021-03-03",poster:"https://image.tmdb.org/t/p/w780/m.jpg"}]},
    {seed:{title:"Move to Heaven",slug:"2-move"},items:[{kind:"tv",id:8,name:"Our Blues",date:"2022-04-09",poster:"https://image.tmdb.org/t/p/w780/o.jpg"}]}]});
   return Response.json({collections:[],items:[]});
  };
  new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(window,document,{getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v),removeItem:(k:string)=>saved.delete(k)},{href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists",search:"",hostname:"test"},{state:null,pushState(){},replaceState(){},back(){}},fetcher,()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}});
  for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,10));if(document.querySelector(".recsSection:not([hidden]) .catalogShelf")||(!user&&document.querySelector(".catalogPoster")))break;}
  await new Promise(r=>setTimeout(r,30));
  return {document,saved,asked};
 };
 try{
  const {document,saved,asked}=await mount("Jaesan");
  assert(asked.some(u=>u==="/api/recommendations?username=Jaesan"),"the rows are fetched for the connected username");
  const section=document.querySelector(".recsSection") as any;
  const headings=[...section.querySelectorAll(".catalogShelf h3")].map((h:any)=>h.textContent);
  assert(headings.join(" | ")==="Because you watched The Glory | Because you watched Move to Heaven","each row is named after its title: "+headings.join(" | "));
  assert(section.querySelector("h2.catalogSectionTitle")?.textContent==="Recommended for you","the rows sit under a Recommended for you heading");
  const weekly=[...document.querySelectorAll("#androidCatalogs > section")] as any[];
  assert(weekly.indexOf(section)===weekly.findIndex((s:any)=>s.textContent.includes("This Week: Romance"))+1,"the rows sit directly under Weekly Picks");
  assert(section.textContent.includes("Mouse")&&section.textContent.includes("Our Blues"),"the rows show their titles");
  const add=section.querySelector(".catalogAdd") as any;add.click();
  const selection=JSON.parse(saved.get("ydl-v3-selection")||"[]");
  assert(selection.some((x:any)=>x.kind==="recs"&&x.slot===0&&x.url==="ydl-recs:0"&&x.name==="Because you watched The Glory"),"Add puts the row in Your Selection: "+JSON.stringify(selection));
  assert(add.textContent==="✓Added","the button turns green Added");
  const anonymous=await mount(null);
  assert(!anonymous.asked.some(u=>u.startsWith("/api/recommendations"))&&!anonymous.document.querySelector(".recsSection"),"without a username there are no recommendation rows");
 }finally{globalThis.setInterval=realInterval;for(const id of timers)clearInterval(id);}
});
await test("Spotlight is the first section on Discover: GTA 6 and the month's list under one heading, with one timer",async()=>{
 const pageHtml=await(await handler(new Request("https://test/setup/lists"))).text();
 const script=[...pageHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join("\n");
 const weekly={id:"weekly-kr-1",name:"This Week: Romance",url:"ydl-weekly:3:0",type:"series",kind:"weekly",country:"3",slot:0};
 const realInterval=globalThis.setInterval,timers:number[]=[];
 (globalThis as any).setInterval=(fn:any,ms:number)=>{const id=realInterval(fn,ms);timers.push(id);return id};
 const mount=async(special:any)=>{
  const {document,window}=parseHTML(pageHtml);const saved=new Map<string,string>();
  const fetcher=async(url:string)=>{const u=String(url);
   if(u.startsWith("/api/catalogs/special"))return Response.json(special);
   if(u.startsWith("/api/catalogs/weekly"))return Response.json({collections:[{catalog:weekly,items:[{kind:"tv",id:1,name:"Love A",date:"2024-01-01",poster:"https://image.tmdb.org/t/p/w780/a.jpg"}]}],nextRefresh:new Date(Date.now()+864e5).toISOString()});
   return Response.json({collections:[],items:[]});
  };
  new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(window,document,{getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v),removeItem:(k:string)=>saved.delete(k)},{href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists",search:"",hostname:"test"},{state:null,pushState(){},replaceState(){},back(){}},fetcher,()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}});
  for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,10));if(document.querySelector(".specialSection:not([hidden]) .catalogShelf")&&document.querySelector(".catalogPoster"))break;}
  await new Promise(r=>setTimeout(r,30));
  return {document,saved};
 };
 const until=new Date(Date.now()+(41*24+3)*36e5+60000).toISOString();
 const catalog={kind:"special",id:"gta6",url:"ydl-special:gta6",name:"Watch this while they play GTA 6",type:"series",until};
 try{
  const monthEnd=new Date(Date.now()+(10*24+3)*36e5+60000).toISOString();
  const monthly={kind:"special",id:"monthly",url:"ydl-special:monthly",name:"Thankful for Family",type:"series",until:monthEnd};
  const {document,saved}=await mount({lists:[{catalog,items:[{kind:"tv",id:5,name:"Business Proposal",date:"2022-02-28",poster:"https://image.tmdb.org/t/p/w780/b.jpg"}]},{catalog:monthly,items:[{kind:"tv",id:6,name:"Reply 1988",date:"2015-11-06",poster:"https://image.tmdb.org/t/p/w780/r.jpg"}]}]});
  const sections=[...document.querySelectorAll("#androidCatalogs > section")] as any[];
  assert(sections[0]?.classList.contains("specialSection")&&sections[1]?.textContent.includes("This Week: Romance"),"the GTA 6 shelf comes first, then Weekly Picks: "+sections.map((s:any)=>s.className).join(","));
  assert(sections[0].querySelector("h2").textContent==="Spotlight","the section is headed Spotlight");
  assert(sections[0].querySelectorAll("h2").length===1,"one heading for both lists");
  assert([...sections[0].querySelectorAll(".catalogShelf h3")].map((h:any)=>h.textContent).join(" | ")==="Watch this while they play GTA 6 | Thankful for Family"&&sections[0].textContent.includes("Reply 1988"),"GTA 6 first, the month's list under it");
  assert(sections[0].querySelectorAll(".collectionClock").length===1&&sections[0].querySelector(".collectionClock").textContent==="◷ 10d 3h","one timer, counting to the end of the month: "+sections[0].querySelector(".collectionClock").textContent);
  sections[0].querySelector(".catalogAdd").click();
  const selection=JSON.parse(saved.get("ydl-v3-selection")||"[]");
  assert(selection.some((x:any)=>x.kind==="special"&&x.id==="gta6"&&x.name==="Watch this while they play GTA 6"),"Add puts it in Your Selection: "+JSON.stringify(selection));
  const ended=await mount({lists:[]});
  assert(!ended.document.querySelector(".specialSection"),"after the end date there is no shelf");
 }finally{globalThis.setInterval=realInterval;for(const id of timers)clearInterval(id);}
});
await test("tapping Add to Collection is counted (once per person per day on the server)",async()=>{
 const {recordCatalogAddition}=await import("./analyticsApi.ts");
 const counted:string[]=[];
 const post=(source:string)=>recordCatalogAddition(new Request("https://test/api/analytics/catalog-add",{method:"POST",headers:{origin:"https://test","content-type":"application/json"},body:JSON.stringify({source})}),async(s:string)=>{counted.push(s)});
 assert((await post("add-to-collection")).status===200&&counted.includes("add-to-collection"),"the server accepts the Add to Collection count");
 assert((await post("made-up-source")).status===400,"unknown sources are still refused");
 const pageHtml=await(await handler(new Request("https://test/setup/lists"))).text(),{document,window}=parseHTML(pageHtml);
 const script=[...pageHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join("\n");
 const proto=Object.getPrototypeOf(document.createElement("dialog"));
 if(!proto.showModal){proto.showModal=function(){this.open=true};proto.close=function(){if(!this.open)return;this.open=false;this.dispatchEvent(new window.Event("close"))};}
 const sent:any[]=[];
 const fetcher=async(url:string,options:any={})=>{const u=String(url);
  if(u==="/api/analytics/catalog-add"){sent.push(JSON.parse(options.body));return Response.json({ok:true})}
  if(u.startsWith("/api/mdl/people-search"))return Response.json({query:"Mouse",page:1,titles:[{name:"Mouse",year:2021,url:"https://mydramalist.com/1-mouse"}],people:[],hasNextPage:false});
  return Response.json({collections:[],items:[]});
 };
 new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(window,document,{getItem:()=>null,setItem(){},removeItem(){}},{href:"https://test/setup",origin:"https://test",pathname:"/setup",search:"",hostname:"test"},{state:null,pushState(){},replaceState(){},back(){}},fetcher,()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}});
 (document.querySelector(".androidNavAdd") as any).click();
 (document.getElementById("quickSearchInput") as HTMLInputElement).value="Mouse";
 (document.querySelector(".quickSearch form") as any).dispatchEvent(new window.Event("submit",{cancelable:true}));
 await new Promise(r=>setTimeout(r,40));
 (document.querySelector(".quickSearchResults .discoverTitleAdd") as any).click();await new Promise(r=>setTimeout(r,10));
 assert(sent.some(x=>x.source==="add-to-collection"),"tapping Add sends the count: "+JSON.stringify(sent));
 assert(document.querySelector(".collectionPicker")?.hasAttribute("open")||(document.querySelector(".collectionPicker") as any)?.open,"the collection picker still opens");
});
await test("connecting a username after the app has started shows Recommended for you on Discover, without a restart",async()=>{
 const pageHtml=await(await handler(new Request("https://test/setup/lists"))).text(),{document,window}=parseHTML(pageHtml);
 const script=[...pageHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join("\n");
 const realInterval=globalThis.setInterval,timers:number[]=[];
 (globalThis as any).setInterval=(fn:any,ms:number)=>{const id=realInterval(fn,ms);timers.push(id);return id};
 const saved=new Map<string,string>([["ydl-v3-started","1"]]),asked:string[]=[];
 const fetcher=async(url:string)=>{const u=String(url);asked.push(u);
  if(u.startsWith("/api/mdl/profile"))return Response.json({profileName:"Jaesan",lists:[{name:"Jaesan’s Completed",url:"https://mydramalist.com/dramalist/jaesan/completed",kind:"watchlist"}]});
  if(u.startsWith("/api/recommendations"))return Response.json({rows:[{seed:{title:"The Glory",slug:"1"},items:[{kind:"tv",id:7,name:"Mouse",date:"2021-03-03",poster:"https://image.tmdb.org/t/p/w780/m.jpg"}]}]});
  if(u.startsWith("/api/catalogs/weekly"))return Response.json({collections:[{catalog:{id:"w",name:"This Week: Romance",url:"ydl-weekly:3:0",type:"series",kind:"weekly",country:"3",slot:0},items:[{kind:"tv",id:1,name:"Love A",date:"2024-01-01",poster:"https://image.tmdb.org/t/p/w780/a.jpg"}]}],nextRefresh:new Date(Date.now()+864e5).toISOString()});
  return Response.json({collections:[],items:[]});
 };
 const tick=(ms=30)=>new Promise(r=>setTimeout(r,ms));
 try{
  new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(window,document,{getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v),removeItem:(k:string)=>saved.delete(k)},{href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists",search:"",hostname:"test"},{state:null,pushState(){},replaceState(){},back(){}},fetcher,()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}});
  await tick(80);
  assert(!asked.some(u=>u.startsWith("/api/recommendations"))&&!document.querySelector(".recsSection .catalogShelf"),"no username yet: no rows and no request");
  (document.querySelector('.androidNavItem[data-destination="community"]') as any).click();await tick();
  (document.getElementById("profileInput") as any).value="Jaesan";
  await (document.getElementById("profileForm") as any).onsubmit({preventDefault(){}});await tick(60);
  (document.querySelector('.androidNavItem[data-destination="discover"]') as any).click();await tick(80);
  const section=document.querySelector(".recsSection") as any;
  assert(section&&!section.hidden&&section.querySelector("h2")?.textContent==="Recommended for you"&&section.textContent.includes("Because you watched The Glory"),"the rows appear after looking up a username in Lists");
  assert(asked.filter(u=>u.startsWith("/api/recommendations")).length===1,"the rows are requested once: "+asked.filter(u=>u.startsWith("/api/recommendations")).length);
  const sections=[...document.querySelectorAll("#androidCatalogs > section")] as any[];
  const weekly=sections.findIndex((s:any)=>s.textContent.includes("This Week: Romance"));
  assert(weekly>=0&&sections[weekly+1]===section,"they sit directly under Weekly Picks");
 }finally{globalThis.setInterval=realInterval;for(const id of timers)clearInterval(id);}
});
await test("Top 10 K-Dramas and K-Movies sit right under This Week's Picks, above Recommended for you, with rank numbers 1 to 10",async()=>{
 const pageHtml=await(await handler(new Request("https://test/setup/lists"))).text();
 const script=[...pageHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join("\n");
 assert(pageHtml.includes(".catalogPoster.ranked .rankNumber{"),"the rank number styles are on the page");
 const realInterval=globalThis.setInterval,timers:number[]=[];
 (globalThis as any).setInterval=(fn:any,ms:number)=>{const id=realInterval(fn,ms);timers.push(id);return id};
 const ten=(kind:string)=>Array.from({length:10},(_,i)=>({kind,id:i+1,name:kind+" "+(i+1),date:"2026-10-01",poster:"https://image.tmdb.org/t/p/w780/"+kind+i+".jpg"}));
 const mount=async(top10:any)=>{
  const {document,window}=parseHTML(pageHtml);const saved=new Map<string,string>([["ydl-v3-user","Jaesan"]]),sent:any[]=[];
  const fetcher=async(url:string,options:any={})=>{const u=String(url);
   if(u==="/api/analytics/catalog-add"){sent.push(JSON.parse(options.body));return Response.json({ok:true})}
   if(u.startsWith("/api/catalogs/top10"))return Response.json(top10);
   if(u.startsWith("/api/recommendations"))return Response.json({rows:[{seed:{title:"The Glory",slug:"1"},items:ten("rec")}]});
   if(u.startsWith("/api/catalogs/weekly"))return Response.json({collections:[{catalog:{id:"w",name:"This Week: Romance",url:"ydl-weekly:3:0",type:"series",kind:"weekly",country:"3",slot:0},items:ten("w")}],nextRefresh:new Date(Date.now()+864e5).toISOString()});
   return Response.json({collections:[],items:[]});
  };
  new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(window,document,{getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v),removeItem:(k:string)=>saved.delete(k)},{href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists",search:"",hostname:"test"},{state:null,pushState(){},replaceState(){},back(){}},fetcher,()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}});
  for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,10));if(document.querySelector(".top10Section:not([hidden]) .catalogShelf")&&document.querySelector(".recsSection:not([hidden]) .catalogShelf"))break;}
  await new Promise(r=>setTimeout(r,30));
  return {document,saved,sent};
 };
 try{
  const {document,saved,sent}=await mount({date:"2026-11-20",rows:[{catalog:{kind:"top10",id:"tv",url:"ydl-top10:tv",name:"Top 10 K-Dramas Today",type:"series"},items:ten("tv")},{catalog:{kind:"top10",id:"movie",url:"ydl-top10:movie",name:"Top 10 K-Movies Today",type:"movie"},items:ten("movie")}]});
  const sections=[...document.querySelectorAll("#androidCatalogs > section")] as any[];
  const weekly=sections.findIndex((x:any)=>x.textContent.includes("This Week: Romance"));
  const order=sections.map((x:any)=>x.className||"weekly");
  assert(weekly>=0&&sections[weekly+1]?.classList.contains("top10Section")&&sections[weekly+2]?.classList.contains("recsSection"),"order: This Week's Picks, Top 10, Recommended for you: "+order.join(","));
  const top=sections[weekly+1];
  assert([...top.querySelectorAll(".catalogShelf h3")].map((h:any)=>h.textContent).join(" | ")==="Top 10 K-Dramas Today | Top 10 K-Movies Today","both rows, dramas first");
  const numbers=[...top.querySelectorAll(".catalogShelf")[0].querySelectorAll(".catalogPoster.ranked .rankNumber")].map((n:any)=>n.textContent);
  assert(numbers.join(",")==="1,2,3,4,5,6,7,8,9,10","rank numbers 1 to 10 in order: "+numbers.join(","));
  assert(top.querySelector(".catalogPoster.ranked").getAttribute("aria-label").startsWith("Number 1:"),"screen readers hear the rank");
  top.querySelector(".catalogAdd").click();
  const selection=JSON.parse(saved.get("ydl-v3-selection")||"[]");
  assert(selection.some((x:any)=>x.kind==="top10"&&x.url==="ydl-top10:tv"&&x.name==="Top 10 K-Dramas Today"),"Add puts it in Your Selection");
  assert(sent.some((x:any)=>x.source==="top10")&&!sent.some((x:any)=>x.source==="community-public-list"),"the Add counts as a Top 10 add: "+JSON.stringify(sent));
  const empty=await mount({date:"2026-11-20",rows:[]});
  assert(!empty.document.querySelector(".top10Section"),"no list means no section");
 }finally{globalThis.setInterval=realInterval;for(const id of timers)clearInterval(id);}
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
await test("Weekly Picks titles open the full preview; Add waits for a MyDramaList match",async()=>{
 const pageHtml=await(await handler(new Request("https://test/setup/lists"))).text(),{document,window}=parseHTML(pageHtml);
 const script=[...pageHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join("\n");
 const storage={getItem:()=>null,setItem(){},removeItem(){}};
 const location={href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists",search:"",hostname:"test"};
 const proto=Object.getPrototypeOf(document.createElement("dialog"));
 if(!proto.showModal){proto.showModal=function(){this.open=true};proto.close=function(){if(!this.open)return;this.open=false;this.dispatchEvent(new window.Event("close"))};}
 const catalog={id:"weekly-kr-1",name:"This Week: Romance",url:"https://yourdramalist/weekly/kr/1",type:"series"};
 const asked:string[]=[];
 const fetcher=async(url:string)=>{
  asked.push(String(url));
  if(String(url).startsWith("/api/catalogs/weekly"))return Response.json({collections:[{catalog,items:[{kind:"tv",id:11,name:"Matched Show",date:"2024-01-01",poster:"https://image.tmdb.org/a.jpg"},{kind:"tv",id:22,name:"New Show",date:"2025-01-01",poster:"https://image.tmdb.org/b.jpg"}]}],nextRefresh:new Date(Date.now()+864e5).toISOString()});
  if(String(url).includes("themoviedb.org%2Ftv%2F11"))return Response.json({mdlUrl:"https://mydramalist.com/11-matched-show",synopsis:"Story A",score:8.1,reviews:[],genres:["Romance"]});
  if(String(url).includes("themoviedb.org%2Ftv%2F22"))return Response.json({status:"unavailable",synopsis:"Story B",score:null,reviews:[]});
  return Response.json({collections:[],items:[]});
 };
 const realInterval=globalThis.setInterval,timers:number[]=[];
 (globalThis as any).setInterval=(fn:any,ms:number)=>{const id=realInterval(fn,ms);timers.push(id);return id};
 const tick=(ms=20)=>new Promise(r=>setTimeout(r,ms));
 try{
  new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(window,document,storage,location,{state:null,pushState(){},replaceState(){},back(){}},fetcher,()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}});
  let posters:any[]=[];
  for(let i=0;i<50&&posters.length<2;i++){await tick(10);posters=[...document.querySelectorAll(".catalogShelfTrack .catalogPoster")];}
  assert(posters.length===2,"Weekly Picks posters are missing");
  const preview=()=>document.querySelector(".catalogTitleDialog") as any;
  posters[0].click();
  assert(preview().open&&preview().classList.contains("discoverTitlePreview")&&preview().querySelector(".catalogDialogClose").textContent==="Back","Weekly Picks opens the full preview");
  assert(preview().querySelector(".ydlLoadingSpinner")&&preview().textContent.includes("Loading details..."),"title preview opens immediately with the compact spinner");
  assert(!preview().querySelector(".discoverPreviewActions button"),"Add waits for a MyDramaList match");
  await tick();
  assert(asked.some(u=>u.includes("view=discover")&&u.includes("themoviedb.org%2Ftv%2F11")),"the preview asks for the full view: "+asked.join(", "));
  assert(preview().querySelector(".discoverPreviewActions .discoverCollectionAction")&&preview().querySelector('.discoverPreviewActions a[href="https://mydramalist.com/11-matched-show"]'),"a match shows Add to Collection and Open in MyDramaList");
  assert(preview().textContent.includes("Story A")&&preview().textContent.includes("Story"),"the story shows");
  assert(!preview().querySelector(".ydlLoadingSpinner"),"the spinner disappears when preview details resolve");
  preview().close();
  posters[1].click();await tick();
  assert(preview().open&&!preview().querySelector(".discoverPreviewActions button")&&preview().textContent.includes("Story B"),"no match: TMDB story only, no Add button");
 }finally{globalThis.setInterval=realInterval;for(const id of timers)clearInterval(id);}
});
await test("tapping an actor opens their titles, and a title opens the full preview",async()=>{
 const pageHtml=await(await handler(new Request("https://test/setup/lists"))).text(),{document,window}=parseHTML(pageHtml);
 const script=[...pageHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join("\n");
 const saved=new Map<string,string>(),storage={getItem:(k:string)=>saved.get(k)??null,setItem:(k:string,v:string)=>saved.set(k,v),removeItem:(k:string)=>saved.delete(k)};
 const location={href:"https://test/setup",origin:"https://test",pathname:"/setup",search:"",hostname:"test"};
 const proto=Object.getPrototypeOf(document.createElement("dialog"));
 if(!proto.showModal){proto.showModal=function(){this.open=true};proto.close=function(){if(!this.open)return;this.open=false;this.dispatchEvent(new window.Event("close"))};}
 const person={id:"440",name:"Gong Yoo",url:"https://mydramalist.com/people/440-gong-yoo"};
 const credits=[{id:"tmdb-tv-67915",name:"Goblin",url:"https://www.themoviedb.org/tv/67915",year:2016,type:"Drama",poster:"https://i.mydramalist.com/g.jpg"},{id:"2",name:"Coffee Prince",url:"https://mydramalist.com/2-coffee-prince",year:2007,type:"Drama",poster:null}];
 const asked:string[]=[];
 const fetcher=async(url:string)=>{
  asked.push(String(url));const u=String(url);
  if(u.startsWith("/api/mdl/people-search"))return Response.json({query:"Gong Yoo",page:1,peopleFirst:true,titles:[],people:[person],hasNextPage:false});
  if(u.startsWith("/api/mdl/person"))return Response.json({person:{...person,actorCount:2,directorCount:0}});
  if(u.startsWith("/api/mdl/filmography"))return Response.json({items:credits,list:{kind:"filmography",url:"ydl-filmography:actor:440",catalogId:"ydl-filmography:actor:440",name:"Gong Yoo’s Filmography",personId:"440",personName:"Gong Yoo",personDisplayName:"Gong Yoo",mode:"actor",personUrl:person.url,sort:"release-desc"}});
  if(u.startsWith("/api/mdl/drama-details"))return Response.json({mdlUrl:"https://mydramalist.com/18452-goblin",synopsis:"A goblin story.",reviews:[]});
  return Response.json({collections:[],items:[]});
 };
 new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(window,document,storage,location,{state:null,pushState(){},replaceState(){},back(){}},fetcher,()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}});
 const tick=(ms=30)=>new Promise(r=>setTimeout(r,ms));
 (document.querySelector(".androidNavAdd") as any).click();
 (document.getElementById("quickSearchInput") as HTMLInputElement).value="Gong Yoo";
 (document.querySelector(".quickSearch form") as any).dispatchEvent(new window.Event("submit",{cancelable:true}));await tick();
 const row=document.querySelector(".quickSearchResults .compactCatalogRow")!;
 const rowAdd=row.querySelector(".catalogAdd") as any;
 assert(rowAdd.classList.contains("discoverAddPill")&&rowAdd.textContent==="+Add Filmography","the row uses the blue Add Filmography pill");
 (row.querySelector(".compactPersonIdentity") as any).click();
 assert(document.querySelector(".personTitlesDialog .ydlLoadingSpinner"),"filmography opens with the shared compact spinner");
 await tick();
 assert(!document.querySelector(".personTitlesDialog .ydlLoadingSpinner"),"filmography spinner disappears when titles load");
 const view=document.querySelector(".personTitlesDialog") as any;
 assert(view.open&&view.querySelector("h2").textContent==="Gong Yoo"&&view.textContent.includes("2 titles"),"tapping the actor opens their titles");
 const cards=[...view.querySelectorAll(".androidWatchlistTitle")] as any[];
 assert(cards.length===2&&cards[0].textContent.includes("Goblin")&&cards[0].textContent.includes("2016 · Drama"),"the grid lists their titles with year and type");
 assert(asked.filter(u=>u.startsWith("/api/mdl/filmography")).length===1,"the filmography loads once");
 const headerAdd=view.querySelector(".androidWatchlistHeader .discoverAddPill") as any;
 headerAdd.click();await tick();
 assert(JSON.parse(saved.get("ydl-v3-selection")||"[]").some((x:any)=>x.url==="ydl-filmography:actor:440")&&headerAdd.textContent==="✓Added"&&rowAdd.textContent==="✓Added","Add Filmography in the header adds it, and both buttons turn green: "+headerAdd.textContent+" / "+rowAdd.textContent);
 assert(asked.filter(u=>u.startsWith("/api/mdl/filmography")).length===1,"adding reuses the loaded filmography");
 cards[0].click();await tick();
 const preview=document.querySelector(".catalogTitleDialog") as any;
 assert(asked.some(u=>u.startsWith("/api/mdl/drama-details?url="+encodeURIComponent("https://www.themoviedb.org/tv/67915")+"&view=discover")),"a TMDB credit asks the server for its details");
 assert(preview.open&&preview.classList.contains("discoverTitlePreview")&&preview.textContent.includes("A goblin story.")&&preview.querySelector(".discoverCollectionAction"),"a title opens the full preview with Add to Collection");
 preview.close();
 assert(view.open,"closing the preview returns to the titles");
 (view.querySelector(".androidWatchlistHeader button") as any).click();
 assert(!view.open,"Back closes the titles");
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
 assert(nav.map(b=>b.getAttribute("aria-label")).join("|")==="Connect|Lists|Search titles to add|Discover|My Collections","the + belongs in the middle");
 const plus=nav[2],sheet=()=>document.querySelector(".quickSearch") as any,box=()=>document.getElementById("quickSearchInput") as HTMLInputElement;
 const tick=(ms=30)=>new Promise(r=>setTimeout(r,ms));
 const searches=()=>asked.filter(u=>u.startsWith("/api/mdl/people-search")).length;
 const enter=async(text:string)=>{box().value=text;(sheet().querySelector("form") as any).dispatchEvent(new window.Event("submit",{cancelable:true}));await tick();};
 const items=()=>[...sheet().querySelectorAll(".quickSearchItem")].map((b:any)=>b.textContent);
 plus.click();
 assert(sheet().open&&focused===box(),"the + opens the search with the box focused");
 assert(sheet().querySelector(".quickSearchIntro")!.textContent==="Search","the screen is titled Search");
 const steps=[...sheet().querySelectorAll(".quickSearchSteps li")].map((li:any)=>li.textContent);
 assert(steps.join("|")==="Search a drama or movie|Add titles to your own collection|Create catalogs from your favorite actors or directors|Install them in Nuvio"&&sheet().querySelectorAll(".quickSearchSteps .quickSearchStepIcon svg").length===4&&!/\bOr\b/.test(steps.join(" ")),"the tip explains titles, filmographies and collections: "+steps.join("|"));
 assert((document.getElementById("discoverForm") as any).hidden,"Discover no longer shows its own search bar");
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
 assert(results.querySelector(".discoverTitleAdd")&&results.textContent.includes("Shinya Tsukamoto")&&results.textContent.includes("Actors and directors"),"results include titles with Add buttons and people with filmographies");
 assert(box().placeholder==="Dramas, movies, actors, directors...","the box says what can be searched");
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
await test("search results are ordered by how well they match what was typed",()=>{
 assert(matchScore("gong yoo","Gong Yoo")===100&&matchScore("Yoo Gong","Gong Yoo")===95,"exact and reversed names match best");
 assert(matchScore("lovely run","Lovely Runner")>matchScore("lovely run","Run On"),"word starts beat loose matches");
 assert(matchScore("Moving","Moving")>matchScore("Moving","Moving Pictures")&&matchScore("Moving","Moving Pictures")>matchScore("Moving","Love Is Moving On"),"exact, then starts with, then contains");
 assert(matchScore("Kim Go Eun","Kim Go-eun")===100,"punctuation and case are ignored");
 assert(matchScore("goblin","Stranger")===0,"unrelated names score nothing");
 assert(matchScore("Song Kang","Tie Xue Kang Lian Zhi Xue Zhan Song Shan Jian")===0,"scattered words do not count as a match");
 assert(matchScore("Kim Go Eun","When the Stars Gossip")===0,"partial word hits do not count as a match");
 const actor=rankSearchResults({titles:[{name:"The Gong Show"},{name:"Coffee Prince"}],people:[{name:"Lee Gong"},{name:"Gong Yoo"}]},"Gong Yoo");
 assert(actor.peopleFirst&&actor.people[0].name==="Gong Yoo","an actor's name puts actors first, best match on top: "+JSON.stringify(actor));
 const drama=rankSearchResults({titles:[{name:"Moving On"},{name:"Moving"}],people:[{name:"Moving Kim"}]},"Moving");
 assert(!drama.peopleFirst&&drama.titles[0].name==="Moving","a title wins when it matches better: "+JSON.stringify(drama));
 const tie=rankSearchResults({titles:[{name:"A"},{name:"B"}],people:[]},"zzz");
 assert(tie.titles.map((x:any)=>x.name).join()==="A,B"&&!tie.peopleFirst,"equal scores keep MyDramaList's order");
});
await test("Discover shows actors and directors first when the search is a name",async()=>{
 const pageHtml=await(await handler(new Request("https://test/setup/lists"))).text(),{document,window}=parseHTML(pageHtml);
 const script=[...pageHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join("\n");
 const storage={getItem:()=>null,setItem(){},removeItem(){}};
 const location={href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists",search:"",hostname:"test"};
 let reply:any;
 new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(window,document,storage,location,{state:null,pushState(){},replaceState(){},back(){}},async()=>Response.json(reply),()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}});
 const run=async(q:string)=>{(document.getElementById("discoverInput") as HTMLInputElement).value=q;(document.getElementById("discoverForm") as any).dispatchEvent(new window.Event("submit",{cancelable:true}));await new Promise(r=>setTimeout(r,20));};
 const order=()=>[...document.querySelectorAll("#listItems .catalogSectionTitle")].map(h=>h.textContent).join("|");
 reply={query:"Gong Yoo",page:1,titles:[{name:"The Gong Show",url:"https://mydramalist.com/1-a"}],people:[{id:"440",name:"Gong Yoo"}],peopleFirst:true,hasNextPage:false};
 await run("Gong Yoo");
 assert(order()==="Actors and directors|Dramas and movies","a name lists actors first: "+order());
 reply={...reply,peopleFirst:false};
 await run("Goblin");
 assert(order()==="Dramas and movies|Actors and directors","a title lists dramas first: "+order());
});
await test("the Connect poster wall uses the saved tint, and the admin preview only from the same site",async()=>{
 const pageHtml=await(await handler(new Request("https://test/setup"))).text(),{document,window}=parseHTML(pageHtml);
 const script=[...pageHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join("\n");
 const location={href:"https://test/setup?tint-preview=1",origin:"https://test",pathname:"/setup",search:"?tint-preview=1",hostname:"test"};
 new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(window,document,{getItem:()=>null,setItem(){},removeItem(){}},location,{state:null,pushState(){},replaceState(){},back(){}},async(url:string)=>String(url)==="/api/appearance"?Response.json({tint:"#123456",opacity:0.6}):Response.json({collections:[],items:[],posters:[]}),()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}});
 await new Promise(r=>setTimeout(r,30));
 const shade=()=>(document.querySelector(".motionShade") as any).style.getPropertyValue("--poster-shade");
 assert(shade().includes("rgba(18,52,86,0.60) 0%")&&shade().includes("rgba(18,52,86,0.75) 100%"),"the saved tint is applied: "+shade());
 const message=(origin:string,data:any)=>{const e=new window.Event("message") as any;e.origin=origin;e.source=window.parent;e.data=data;window.dispatchEvent(e)};
 message("https://evil.example",{type:"ydl-tint-preview",tint:"#ff0000",opacity:0.2});
 assert(!shade().includes("255,0,0"),"preview messages from other sites are ignored");
 message("https://test",{type:"ydl-tint-preview",tint:"#ff0000",opacity:0.2});
 assert(shade().includes("rgba(255,0,0,0.20) 0%"),"the admin preview updates the tint live: "+shade());
});
await test("the compact loading indicator shows during search and gives way to results, no matches or an error",async()=>{
 const pageHtml=await(await handler(new Request("https://test/setup/lists"))).text(),{document,window}=parseHTML(pageHtml);
 const script=[...pageHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join("\n");
 assert(pageHtml.includes(".ydlLoadingBear{")&&pageHtml.includes("prefers-reduced-motion:reduce"),"the loader's styles, with reduced motion, are on the page");
 const loaderRule=pageHtml.match(/\.ydlLoadingBear\{[^}]*\}/)?.[0]||"";
 assert(/position:fixed/.test(loaderRule)&&/left:50%/.test(loaderRule)&&/top:50%/.test(loaderRule)&&/translate\(-50%,-50%\)/.test(loaderRule),"the loader sits in the exact center of the screen: "+loaderRule);
 const storage={getItem:()=>null,setItem(){},removeItem(){}};
 const location={href:"https://test/setup",origin:"https://test",pathname:"/setup",search:"",hostname:"test"};
 const proto=Object.getPrototypeOf(document.createElement("dialog"));
 if(!proto.showModal){proto.showModal=function(){this.open=true};proto.close=function(){if(!this.open)return;this.open=false;this.dispatchEvent(new window.Event("close"))};}
 let reply:(r:Response)=>void=()=>{},fail:(e:Error)=>void=()=>{};
 const fetcher=(url:string)=>String(url).startsWith("/api/mdl/people-search")?new Promise<Response>((ok,no)=>{reply=ok;fail=no}):Promise.resolve(Response.json({collections:[],items:[]}));
 new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(window,document,storage,location,{state:null,pushState(){},replaceState(){},back(){}},fetcher,()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}});
 const tick=(ms=20)=>new Promise(r=>setTimeout(r,ms));
 (document.querySelector(".androidNavAdd") as any).click();
 const sheet=document.querySelector(".quickSearch") as any,results=sheet.querySelector(".quickSearchResults"),status=sheet.querySelector(".quickSearchStatus");
 const enter=async(text:string)=>{(document.getElementById("quickSearchInput") as HTMLInputElement).value=text;sheet.querySelector("form").dispatchEvent(new window.Event("submit",{cancelable:true}));await tick();};
 const bear=()=>results.querySelector(".ydlLoadingBear");
 await enter("Wong Kar Wai");
 assert(bear()&&bear().querySelector("p").textContent==="Searching for Wong Kar Wai"&&bear().getAttribute("role")==="status","the bear shows the search right away: "+results.textContent);
 assert(bear().querySelector(".ydlLoadingSpinner")&&status.textContent==="","the compact loader has its spinner, and no duplicate status text");
 reply(Response.json({query:"Wong Kar Wai",page:1,titles:[{name:"In the Mood for Love",year:2000,url:"https://mydramalist.com/1-in-the-mood"}],people:[],hasNextPage:false}));await tick();
 assert(!bear()&&results.textContent.includes("In the Mood for Love"),"results replace the bear");
 await enter("zzzz");
 assert(bear()&&bear().textContent.includes("Searching for zzzz"),"a new search shows the bear again");
 reply(Response.json({query:"zzzz",page:1,titles:[],people:[],hasNextPage:false}));await tick();
 assert(!bear()&&status.textContent.includes("No matches found"),"no matches replaces the bear: "+status.textContent);
 await enter("Broken search");
 fail(Object.assign(Error("MyDramaList lookup failed."),{name:"Error"}));await tick();
 assert(!bear()&&status.textContent.includes("Unable to search")&&!results.childElementCount,"an error replaces the bear: "+status.textContent);
 await enter("Old search");const stale=reply;
 await enter("New search");
 stale(Response.json({query:"Old search",page:1,titles:[{name:"Stale",year:2000,url:"https://mydramalist.com/2-stale"}],people:[],hasNextPage:false}));await tick();
 assert(bear()&&bear().textContent.includes("Searching for New search")&&!results.textContent.includes("Stale"),"a late answer to an older search leaves the newer search's bear");
});
console.log(JSON.stringify({passed}));
