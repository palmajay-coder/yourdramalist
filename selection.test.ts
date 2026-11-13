import {parseHTML} from "npm:linkedom@0.18.12";
import handler from "./app.ts";

const html=await(await handler(new Request("https://test/setup/lists"))).text();
const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
const assert=(value:unknown,message:string)=>{if(!value)throw Error(message)};
const saved=new Map([["ydl-v3-user","sample_user"],["ydl-v3-preferences",'{"reviews":true}'],["ydl-v3-theme","light"]]);
const initial=new Map(saved);
function mount(fetcher: typeof fetch = async()=>Response.json({})){
 const {document,window}=parseHTML(html);
 const location={href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists",search:"",hostname:"test"};
 const storage={getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>saved.set(key,value),removeItem:(key:string)=>saved.delete(key)};
 new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(
  window,document,storage,location,{state:null,pushState(state:unknown,_title:string,path:string){this.state=state;location.pathname=path;},replaceState(state:unknown,_title:string,path:string){this.state=state;location.pathname=path;},back(){}},
  fetcher,()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}}
 );
 return document;
}
let document=mount();
assert(document.getElementById("clearSelection")!.classList.contains("hidden"),"Clear should be hidden for an empty selection");
document.querySelector<HTMLButtonElement>('[data-filter="catalogs"]')!.click();
const cards=document.querySelectorAll<HTMLButtonElement>('.catalogAdd');
for(const card of [cards[0],cards[1]])card.click();
assert(document.getElementById("count")!.textContent==="(2)","Two catalogs should be selected");
assert(!document.getElementById("clearSelection")!.classList.contains("hidden"),"Clear should appear for a nonempty selection");
assert(cards[0].getAttribute("aria-pressed")==="true"&&cards[1].getAttribute("aria-pressed")==="true","Selected cards should be checked");
assert(JSON.parse(saved.get("ydl-v3-selection")!).length===2,"Selection should be saved");
console.log("PASS clear control appears only when selected catalogs exist");

document=mount();
assert(document.getElementById("count")!.textContent==="(2)","Refresh should restore selected catalogs");
document.querySelector<HTMLButtonElement>('[data-filter="catalogs"]')!.click();
const clear=document.getElementById("clearSelection") as HTMLButtonElement;
clear.click();
assert(document.getElementById("count")!.textContent==="(0)","Clear should reset the count");
assert(document.getElementById("continue")!.hasAttribute("disabled"),"Continue should be disabled");
assert(clear.classList.contains("hidden"),"Clear should hide when empty");
assert([...document.querySelectorAll<HTMLButtonElement>('.catalogAdd')].every(c=>c.getAttribute('aria-pressed')==='false'),"All displayed cards should be unchecked");
assert(saved.get("ydl-v3-selection")==="[]","Cleared selection should be saved");
for(const [key,value]of initial)assert(saved.get(key)===value,"Unrelated saved setting changed: "+key);
console.log("PASS clear removes all catalogs and preserves username, preferences and theme");

document=mount();
assert(document.getElementById("count")!.textContent==="(0)","Cleared selection should stay empty after refresh");
assert(!/basket/i.test(html),"Selection terminology regression");
console.log("PASS cleared selection survives refresh and uses selection terminology");

saved.set("ydl-v3-selection",JSON.stringify(Array.from({length:60},(_,i)=>({url:"https://mydramalist.com/list/Limit"+String(i).padStart(2,"0"),name:"Limit "+i}))));
document=mount();
document.querySelector<HTMLButtonElement>('[data-filter="catalogs"]')!.click();
const extra=document.querySelector<HTMLButtonElement>('.catalogAdd')!;
extra.click();
assert(document.getElementById("count")!.textContent==="(60)","Selection should stop at 60 catalogs");
assert(extra.getAttribute("aria-pressed")==="false","Refused catalog should stay unselected");
assert(JSON.parse(saved.get("ydl-v3-selection")!).length===60,"Saved selection should stay at 60 catalogs");
assert(/60-catalog limit/.test(document.getElementById("floatingNotice")!.textContent||""),"Limit notice should explain the cap");
assert(document.querySelector("#floatingNotice strong")!.textContent==="Catalog limit reached","Limit notice should use its own heading");
console.log("PASS selection stops at the 60-catalog limit and explains why");
saved.set("ydl-v3-selection","[]");

document=mount(async()=>Response.json({lists:[
 {name:"Sample’s List",url:"https://mydramalist.com/dramalist/sample",kind:"watchlist",combined:true},
 {name:"Sample’s Plan to Watch",url:"https://mydramalist.com/dramalist/sample/plan_to_watch",kind:"watchlist"},
 {name:"Favorites",url:"https://mydramalist.com/list/abcd"}
]}));
const profileInput=document.getElementById("profileInput") as HTMLInputElement;
profileInput.value="Sample";
await (document.getElementById("profileForm") as HTMLFormElement).onsubmit!({preventDefault(){}} as SubmitEvent);
await new Promise(resolve=>setTimeout(resolve,0));
// The app layout shows every list from a profile in one grid: the combined watchlist first,
// then watchlist sections, then custom lists. There are no separate Watchlists and Custom tabs.
const names=()=>[...document.querySelectorAll("#listItems article")].map(node=>node.querySelector("strong,h3")?.textContent);
assert(names().join("|")==="Sample’s All Dramas & Films|Sample’s Plan to Watch|Favorites","Profile lists should open with the combined card first");
(document.querySelector("#listItems .catalogAdd") as HTMLButtonElement).click();
assert(document.getElementById("count")!.textContent==="(1)","Adding a profile list should count it");
assert(document.querySelector("#listItems .catalogAdd")!.getAttribute("aria-pressed")==="true","Added list should show as added");
console.log("PASS Community shows all profile lists in one grid and adds them");

(document.getElementById("communitySelectAll") as HTMLButtonElement).click();
assert(document.getElementById("count")!.textContent==="(3)","Select all should add the remaining lists without duplicates");
assert(JSON.parse(saved.get("ydl-v3-selection")!).length===3,"Select all should be saved");
console.log("PASS Community Select all adds every list once");
