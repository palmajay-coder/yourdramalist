import {parseHTML} from "npm:linkedom@0.18.12";
import handler from "./app.ts";

const html=await(await handler(new Request("https://test/setup/lists"))).text();
const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
const assert=(value:unknown,message:string)=>{if(!value)throw Error(message)};
const saved=new Map([["ydl-v3-user","sample_user"],["ydl-v3-preferences",'{"reviews":true}'],["ydl-v3-theme","light"]]);
const initial=new Map(saved);
function mount(fetcher: typeof fetch = async()=>Response.json({})){
 const {document,window}=parseHTML(html);
 const location={href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists"};
 const storage={getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>saved.set(key,value),removeItem:(key:string)=>saved.delete(key)};
 new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(
  window,document,storage,location,{pushState:(_state:unknown,_title:string,path:string)=>{location.pathname=path;}},
  fetcher,()=>0,()=>({matches:false}),class{observe(){}}
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

document=mount(async()=>Response.json({lists:[
 {name:"Sample’s List",url:"https://mydramalist.com/dramalist/sample",kind:"watchlist",combined:true},
 {name:"Sample’s Plan to Watch",url:"https://mydramalist.com/dramalist/sample/plan_to_watch",kind:"watchlist"},
 {name:"Favorites",url:"https://mydramalist.com/list/abcd"}
]}));
const profileInput=document.getElementById("profileInput") as HTMLInputElement;
profileInput.value="Sample";
await (document.getElementById("profileForm") as HTMLFormElement).onsubmit!({preventDefault(){}} as SubmitEvent);
await new Promise(resolve=>setTimeout(resolve,0));
const names=()=>[...document.querySelectorAll("#listItems h3")].map(node=>node.textContent);
assert(names().join("|")==="Sample’s All Dramas & Films|Sample’s Plan to Watch","Watchlists should open with the combined card first");
(document.querySelector("#listItems input") as HTMLInputElement).onchange!({} as Event);
(document.querySelector('[data-community-view="custom"]') as HTMLButtonElement).click();
assert(names().join("|")==="Sample’s Favorites list","Custom tab should show only custom lists");
assert(document.getElementById("count")!.textContent==="(1)","Switching tabs lost selection");
(document.querySelector('[data-community-view="watchlists"]') as HTMLButtonElement).click();
assert((document.querySelector("#listItems input") as HTMLInputElement).checked,"Returning to watchlists lost checkbox state");
console.log("PASS Community tabs separate profile results and share selections");

(document.getElementById("communitySelectAll") as HTMLButtonElement).click();
assert(document.getElementById("count")!.textContent==="(2)","Select all should add remaining watchlists without duplicates");
(document.querySelector('[data-community-view="custom"]') as HTMLButtonElement).click();
(document.getElementById("communitySelectAll") as HTMLButtonElement).click();
assert(document.getElementById("count")!.textContent==="(3)","Select all should preserve selections in other tab");
console.log("PASS Community Select all applies to the current tab without duplicates");
