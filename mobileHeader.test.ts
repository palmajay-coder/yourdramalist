import {parseHTML} from "npm:linkedom@0.18.12";
import handler from "./app.ts";

const html = await (await handler(new Request("https://test/setup/lists"))).text();
const script = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).join("\n");
const assert = (value: unknown, message: string) => { if (!value) throw Error(message); };

Deno.test("Connect keeps its landing title while other tabs share the mobile header", async () => {
  const {document,window} = parseHTML(html);
  const saved = new Map<string,string>();
  const location = {href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists",search:"",hostname:"test"};
  const header = document.querySelector("body > header")!;
  const originalBrand = header.querySelector(".brand")!.outerHTML;
  const fetches: string[] = [];
  for (const dialog of document.querySelectorAll("dialog")) {
    dialog.showModal = () => { dialog.open = true; };
    dialog.close = () => { dialog.open = false; };
  }
  new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(
    window, document,
    {getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>saved.set(key,value),removeItem:(key:string)=>saved.delete(key)},
    location, {state:null,pushState(value:unknown){this.state=value;},replaceState(value:unknown){this.state=value;},back(){}},
    async (url:string) => {
      fetches.push(String(url));
      if (String(url).includes("/api/mdl/profile")) return Response.json({lists:[
        {name:"Sample’s Plan to Watch",url:"https://mydramalist.com/dramalist/Sample/plan_to_watch",kind:"watchlist",count:1,posters:[]},
      ]});
      return Response.json({collections:[],items:[],titles:[],people:[],hasNextPage:false});
    },
    ()=>0, ()=>({matches:false,addEventListener(){}}), class{observe(){}},
  );
  const click = (destination:string) => document.querySelector<HTMLButtonElement>('[data-destination="'+destination+'"]')!.click();
  const heading = () => header.querySelector("h1") as HTMLElement;
  const toolbar = document.querySelector(".androidDiscoverToolbar") as HTMLElement;
  const connectHeading = document.querySelector("#connect > h1") as HTMLElement;
  const nav = document.querySelector(".androidBottomNav")!;
  const navLabels = () => [...nav.querySelectorAll("button")].map(button=>button.getAttribute("aria-label")).join("|");
  const iconMarkup = [...header.querySelectorAll(".androidHeaderActions button")].map(node=>node.innerHTML).join("|");
  assert(navLabels()==="Connect|Community|Discover|My Collections","Navigation order changed");

  click("connect");
  assert(!header.classList.contains("mobilePageHeader") && !header.querySelector("h1"),"Connect has a navigation heading");
  assert(!connectHeading.hidden && connectHeading.textContent==="YourDramaList","Connect branding is missing");
  for (const [destination,title] of [["community","Community"],["discover","Discover"],["collections","My Collections"]]) {
    click(destination);
    assert(header.classList.contains("mobilePageHeader"),title+" has no mobile header");
    assert(heading()?.textContent===title,title+" heading is wrong");
    assert(toolbar.hidden,"Duplicate content heading remains");
    assert(document.querySelectorAll("header.mobilePageHeader > h1").length===1,"Header heading duplicated");
  }
  assert(header.querySelector(".brand")!.outerHTML===originalBrand,"Brand structure changed on desktop");
  assert([...header.querySelectorAll(".androidHeaderActions button")].map(node=>node.innerHTML).join("|")===iconMarkup,
    "Right-side icons changed");
  click("discover");
  (document.querySelector(".androidSelectionButton") as HTMLButtonElement).click();
  assert((document.getElementById("selectionDialog") as HTMLDialogElement).open,"Your Selection stopped opening");
  (document.getElementById("selectionDialog") as HTMLDialogElement).close();
  document.body.classList.add("wideWeb");
  window.syncMobileHeaderLayout();
  assert(!header.classList.contains("mobilePageHeader") && !header.querySelector("h1"),"Desktop header structure changed");
  assert(!toolbar.hidden && toolbar.querySelector("h1")?.textContent==="Discover","Desktop content title missing");
  assert(!connectHeading.hidden,"Desktop Connect hero removed");
  document.body.classList.remove("wideWeb");
  window.syncMobileHeaderLayout();
  assert(heading()?.textContent==="Discover" && toolbar.hidden,"Portrait heading did not return");
  click("connect");
  const source = document.getElementById("source") as HTMLInputElement;
  source.value = "Sample";
  (document.getElementById("connectForm") as HTMLFormElement).onsubmit!({preventDefault(){}} as SubmitEvent);
  await new Promise(resolve=>setTimeout(resolve,20));
  assert(heading()?.textContent==="Community" && fetches.some(url=>url.includes("username=Sample")),"Connect flow changed");
  click("connect");
  (document.getElementById("skip") as HTMLButtonElement).click();
  assert(heading()?.textContent==="Discover","Skip account flow changed");
  assert(navLabels()==="Connect|Community|Discover|My Collections","Bottom navigation changed during resize");
});
