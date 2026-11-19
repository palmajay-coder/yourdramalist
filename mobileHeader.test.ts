import {parseHTML} from "npm:linkedom@0.18.12";
import handler from "./app.ts";

const html = await (await handler(new Request("https://test/setup/lists"))).text();
const script = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).join("\n");
const assert = (value: unknown, message: string) => { if (!value) throw Error(message); };

Deno.test("Connect keeps its landing title while other tabs share the mobile header", async () => {
  const {document,window} = parseHTML(html);
  const saved = new Map<string,string>([["ydl-v3-started","1"]]);
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
  assert(navLabels()==="Connect|Community|Search titles to add|Discover|My Collections","Navigation order changed");

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
  assert(navLabels()==="Connect|Community|Search titles to add|Discover|My Collections","Bottom navigation changed during resize");
});

function boot(saved: Map<string,string>, path = "/setup/lists") {
  const {document,window} = parseHTML(html);
  const location = {href:"https://test"+path,origin:"https://test",pathname:path,search:"",hostname:"test"};
  const history = {state:null as unknown,pushState(value:unknown,_t:string,url:string){this.state=value;location.pathname=url;},
    replaceState(value:unknown,_t:string,url:string){this.state=value;location.pathname=url;},back(){}};
  for (const dialog of document.querySelectorAll("dialog")) {
    dialog.showModal = () => { dialog.open = true; };
    dialog.close = () => { dialog.open = false; };
  }
  new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(
    window, document,
    {getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>saved.set(key,value),removeItem:(key:string)=>saved.delete(key)},
    location, history,
    async () => Response.json({collections:[],items:[],titles:[],people:[],lists:[],hasNextPage:false}),
    ()=>0, ()=>({matches:false,addEventListener(){}}), class{observe(){}},
  );
  return {document, location, page: () => document.body.dataset.page};
}

Deno.test("Connect comes first for new visitors and is skipped for returning ones", () => {
  const css = html.match(/body\.androidSetup\[data-page=connect\] \.androidBottomNav\{display:none!important\}/);
  assert(css, "The bottom navigation is not hidden on Connect");

  // A first visit lands on Connect, even from a deep link, and the other pages stay closed.
  const fresh = new Map<string,string>();
  const first = boot(fresh);
  assert(first.page()==="connect" && first.location.pathname==="/setup", "A first visit did not start on Connect: "+first.page());
  first.document.querySelector<HTMLButtonElement>('[data-destination="discover"]')!.click();
  assert(first.page()==="connect", "A new visitor skipped ahead of Connect");
  first.document.querySelector<HTMLButtonElement>("#skip")!.click();
  assert(first.page()==="selection" && fresh.get("ydl-v3-started")==="1", "Continue without an account did not open Discover");

  // The next visit remembers that choice.
  assert(boot(fresh).page()==="selection", "A returning guest was sent back to Connect");
  // Returning from Connect keeps saved data, and leaving again works.
  const again = boot(fresh);
  again.document.querySelector<HTMLButtonElement>('[data-destination="connect"]')!.click();
  assert(again.page()==="connect", "The Connect tab stopped opening Connect");
  again.document.querySelector<HTMLButtonElement>("#skip")!.click();
  assert(again.page()==="selection", "Could not leave Connect again");

  // A saved username, or guests from before this update with saved collections, go straight in.
  assert(boot(new Map([["ydl-v3-user","Sample"]])).page()==="selection", "A saved username was sent to Connect");
  assert(boot(new Map([["ydl.userCollections.v1",JSON.stringify([{id:"a",name:"Faves",titles:[]}])]])).page()==="selection",
    "An existing guest with collections was sent to Connect");
  assert(boot(new Map([["ydl-v3-selection",JSON.stringify([{kind:"watchlist",url:"https://mydramalist.com/dramalist/x"}])]])).page()==="selection",
    "An existing guest with a selection was sent to Connect");
});

Deno.test("Connect background shows straight rows of new backdrops, newest in the middle", async () => {
  const {installPosterWall} = await import("./posterWallClient.ts");
  const {document, window} = parseHTML("<body></body>");
  const backdrops = Array.from({length:24},(_,i)=>({name:"Show "+i,image:"https://image.tmdb.org/t/p/w780/b"+i+".jpg"}));
  backdrops.push({name:"Bad",image:"https://evil.test/t/p/w780/x.jpg"});
  const fetched: string[] = [];
  let resolve!: () => void; const done = new Promise<void>(r => resolve = r);
  const wall = new Function("document","window","fetch","AbortSignal",`return (${installPosterWall.toString()})([],['connect']);`)(
    document, window,
    async (url: string) => { fetched.push(url); setTimeout(resolve, 0); return Response.json({backdrops, status:"live"}); },
    {timeout: () => undefined},
  );
  wall.update("connect");
  await done; await new Promise(r => setTimeout(r, 5));
  const rows = [...document.querySelectorAll(".motionTilt > .motionRow")];
  assert(fetched[0]==="/api/background/backdrops", "The wall did not ask for backdrops");
  assert(rows.length===10 && rows.every(row => row.querySelectorAll(".motionTile").length===12), "Rows are missing or not doubled for a seamless loop");
  const images = [...document.querySelectorAll(".motionTile img")].map(img => img.getAttribute("src"));
  assert(!images.some(src => src?.includes("evil.test")), "A non-TMDB image got through");
  const middle = new Set([...rows[4].querySelectorAll("img"),...rows[5].querySelectorAll("img")].map(img => img.getAttribute("src")));
  const newest = backdrops.slice(0,8).map(item => item.image);
  assert(newest.every(src => middle.has(src)), "The newest shows are not in the middle rows");
  assert(!/rotate\(-12deg\)/.test(html) && /backdropGlide\{from\{transform:translateX\(-50%\)\}to\{transform:translateX\(0\)\}\}/.test(html),
    "Rows are tilted or not gliding left to right");
});
