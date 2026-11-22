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
  assert(navLabels()==="Connect|Lists|Search titles to add|Discover|Stats","Navigation order changed");

  click("connect");
  assert(!header.classList.contains("mobilePageHeader") && !header.querySelector("h1"),"Connect has a navigation heading");
  assert(!connectHeading.hidden && connectHeading.textContent==="YourDramaList","Connect branding is missing");
  for (const [destination,title] of [["community","Lists"],["discover","Discover"],["stats","Stats"]]) {
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
  assert(heading()?.textContent==="Lists" && fetches.some(url=>url.includes("username=Sample")),"Connect flow changed");
  click("connect");
  (document.getElementById("skip") as HTMLButtonElement).click();
  assert(heading()?.textContent==="Discover","Skip account flow changed");
  assert(navLabels()==="Connect|Lists|Search titles to add|Discover|Stats","Bottom navigation changed during resize");
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
  assert(rows.length===6 && rows.every(row => row.querySelectorAll(".motionTile").length===8), "Rows are missing or not doubled for a seamless loop");
  const images = [...document.querySelectorAll(".motionTile img")].map(img => img.getAttribute("src"));
  assert(!images.some(src => src?.includes("evil.test")), "A non-TMDB image got through");
  const middle = new Set([...rows[2].querySelectorAll("img"),...rows[3].querySelectorAll("img")].map(img => img.getAttribute("src")));
  const newest = backdrops.slice(0,8).map(item => item.image);
  assert(newest.every(src => middle.has(src)), "The newest shows are not in the middle rows");
  assert(!/rotate\(-12deg\)/.test(html) && /backdropGlide\{from\{transform:translateX\(-50%\)\}to\{transform:translateX\(0\)\}\}/.test(html),
    "Rows are tilted or not gliding left to right");
});

Deno.test("The YDL opening plays once per fresh app open, only in the Android app", () => {
  const headScript = html.match(/<head>[\s\S]*?<script>([\s\S]*?)<\/script>/)![1];
  assert(headScript.includes("ydl-intro-played") && html.indexOf(headScript) < html.indexOf("<body>"), "The intro switch must run in <head>");
  assert(/<body><div id="ydlIntro" aria-hidden="true"><div class="ydlIntroWord"><b>Y<\/b><i><span>our<\/span><\/i><b>D<\/b><i><span>rama<\/span><\/i><b>L<\/b><i><span>ist<\/span><\/i><\/div><\/div>/.test(html),
    "The YDL to YourDramaList markup is missing");
  assert(html.includes("#ydlIntro{display:none}") && /prefers-reduced-motion:reduce\)\{\.ydlIntroWord\{animation:none/.test(html),
    "The intro must be hidden by default and calm with reduced motion");
  assert(html.includes("html.ydlIntro #connect>h1{opacity:0}") && !/[^.]#connect>h1\{opacity:0\}/.test(html.replace("html.ydlIntro #connect>h1{opacity:0}","")),
    "The Connect title must hide only while the intro plays");
  assert(html.includes("document.querySelector('#connect > h1')") && html.includes("selectNodeContents(h)") && html.includes("setTimeout(done,4100)"),
    "The intro must land on the Connect title and always clean itself up");
  const run = (userAgent: string, session: Map<string,string>, search = "") => {
    const classes = new Set<string>();
    new Function("navigator","sessionStorage","location","document", headScript)(
      {userAgent}, {getItem:(k:string)=>session.get(k)??null,setItem:(k:string,v:string)=>session.set(k,v)}, {search},
      {documentElement:{classList:{add:(c:string)=>classes.add(c)}}});
    return classes.has("ydlIntro");
  };
  const app = "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 YourDramaListApp/104";
  const session = new Map<string,string>();
  assert(run(app, session), "A fresh app open did not play the intro");
  assert(!run(app, session), "The intro replayed in the same app session");
  assert(!run("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120 Mobile Safari/537.36", new Map()), "A phone browser played the intro");
  assert(!run("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/605.1.15", new Map()), "A computer played the intro");
  assert(run("Mozilla/5.0 (Macintosh) Safari/605.1.15", new Map([["ydl-intro-played","1"]]), "?intro=1"), "?intro=1 did not preview it");
});

Deno.test("The logo font is served and used for the Connect title and the opening", async () => {
  const response = await handler(new Request("https://test/assets/milky-nice-v2.woff2"));
  const bytes = new Uint8Array(await response.arrayBuffer());
  const original = await Deno.readFile(new URL("./logoFont.ts", import.meta.url)).then(b => new TextDecoder().decode(b).match(/encoded="([^"]+)"/)![1]);
  assert(response.headers.get("content-type")==="font/woff2" && /immutable/.test(response.headers.get("cache-control")||""), "The font is not served as cached WOFF2");
  assert(bytes.length===atob(original).length && String.fromCharCode(...bytes.slice(0,4))==="wOF2", "The served font is not the Milky Nice file");
  assert(html.includes('<link rel="preload" as="font" type="font/woff2" href="/assets/milky-nice-v2.woff2" crossorigin>') &&
    html.includes('@font-face{font-family:"Milky Nice";src:url(/assets/milky-nice-v2.woff2)'), "The font is not preloaded or declared");
  assert(/#connect > h1 \{font-family:"Milky Nice"/.test(html) && /\.ydlIntroWord\{font:400 [^;]*"Milky Nice"/.test(html), "The Connect title or the opening does not use the logo font");
  assert(html.includes("document.fonts.load('1em \"Milky Nice\"')"), "The opening does not wait for the logo font");
});

Deno.test("Page titles use the Milky Nice heading font", () => {
  assert(/header\.mobilePageHeader > h1 \{[^}]*font-family:"Milky Nice"/.test(html), "Phone page titles do not use the heading font");
  assert(/\.androidDiscoverToolbar h1\{[^}]*font-family:"Milky Nice"/.test(html), "Computer page titles do not use the heading font");
});

Deno.test("The admin tint controls all of the Connect darkening", async () => {
  const {installPosterWall} = await import("./posterWallClient.ts");
  const shadeFor = (color: string, opacity: number) => {
    const {document, window} = parseHTML("<body></body>");
    const wall = new Function("document","window","fetch","AbortSignal",`return (${installPosterWall.toString()})([],['connect']);`)(
      document, window, async () => Response.json({}), {timeout: () => undefined});
    wall.setTint(color, opacity);
    return (document.querySelector(".motionShade") as HTMLElement).style.getPropertyValue("--poster-shade");
  };
  const alphas = (value: string) => [...value.matchAll(/rgba\([^)]*,([\d.]+)\)/g)].map(m => Number(m[1]));
  const off = shadeFor("#000000", 0);
  assert(alphas(off).length===5 && alphas(off).every(a => a===0), "0% still darkens Connect: "+off);
  const standard = shadeFor("#0a0c10", 0.74);
  assert(alphas(standard).join()==="0,0.55,0.74,0.81,0.93", "The default look changed: "+standard);
  assert(/linear-gradient\(180deg,rgba\(255,0,0,0\.00\) 45%,rgba\(255,0,0,0\.15\) 100%\)/.test(shadeFor("#ff0000", 0.2)), "The bottom fade ignores the tint color");
  assert(!/rgba\(5,6,8,\.55\)/.test(html), "A fixed shade that ignores the slider is still in the page");
});

Deno.test("The Android app uses the same landscape layout as a phone browser", () => {
  const start = html.indexOf("// Share the same controls and state when the browser or the Android app rotates or resizes.");
  assert(start > 0 && html.slice(start, start + 200).includes("\n{\n"), "The wide landscape layout is still skipped in the app");
  assert(!/if\(!androidApp\)\{\s*const mobileDevice/.test(html), "The wide landscape layout is still skipped in the app");
});
