import {parseHTML} from "npm:linkedom@0.18.12";
import handler from "./app.ts";

const html=await(await handler(new Request("https://test/setup/lists"))).text();
const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
const assert=(value:unknown,message:string)=>{if(!value)throw Error(message)};
const saved=new Map([["ydl-v3-user","sample_user"],["ydl-v3-preferences",'{"reviews":true}'],["ydl-v3-theme","light"]]);
const initial=new Map(saved);
function mount(){
 const {document,window}=parseHTML(html);
 const location={href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists"};
 const storage={getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>saved.set(key,value),removeItem:(key:string)=>saved.delete(key)};
 new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(
  window,document,storage,location,{pushState:(_state:unknown,_title:string,path:string)=>{location.pathname=path;}},
  async()=>Response.json({}),()=>0,()=>({matches:false}),class{observe(){}}
 );
 return document;
}
let document=mount();
assert(document.getElementById("clearSelection")!.classList.contains("hidden"),"Clear should be hidden for an empty selection");
document.querySelector<HTMLButtonElement>('[data-filter="catalogs"]')!.click();
const cards=document.querySelectorAll<HTMLInputElement>('#listItems input[type="checkbox"]');
for(const card of [cards[0],cards[1]]){card.checked=true;card.dispatchEvent(new document.defaultView!.Event("change"));}
assert(document.getElementById("count")!.textContent==="(2)","Two catalogs should be selected");
assert(!document.getElementById("clearSelection")!.classList.contains("hidden"),"Clear should appear for a nonempty selection");
assert(cards[0].checked&&cards[1].checked,"Selected cards should be checked");
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
assert([...document.querySelectorAll<HTMLInputElement>('#listItems input[type="checkbox"]')].every(c=>!c.checked),"All displayed cards should be unchecked");
assert(saved.get("ydl-v3-selection")==="[]","Cleared selection should be saved");
for(const [key,value]of initial)assert(saved.get(key)===value,"Unrelated saved setting changed: "+key);
console.log("PASS clear removes all catalogs and preserves username, preferences and theme");

document=mount();
assert(document.getElementById("count")!.textContent==="(0)","Cleared selection should stay empty after refresh");
assert(!/basket/i.test(html),"Selection terminology regression");
console.log("PASS cleared selection survives refresh and uses selection terminology");
