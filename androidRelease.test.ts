// Android app updates: the version endpoint and the notice inside the app.
import {parseHTML} from "npm:linkedom@0.18.12";
import {createAndroidRelease,ANDROID_DOWNLOAD_URL} from "./androidRelease.ts";
import handler from "./app.ts";
import {TEXT} from "./text.ts";
let passed=0;const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};async function test(name:string,fn:()=>unknown){await fn();passed++;console.log("PASS "+name)}

await test("the version endpoint reads the release's version file and caches it",async()=>{
 let calls=0,time=0;
 const handle=createAndroidRelease((async()=>{calls++;return Response.json({versionCode:107,versionName:"1.1.25"})}) as any,()=>time);
 const first=await(await handle(new Request("https://test/api/app/android"))).json();
 await handle(new Request("https://test/api/app/android"));
 assert(first.versionCode===107&&first.versionName==="1.1.25"&&first.url===ANDROID_DOWNLOAD_URL&&calls===1,"version or cache: "+JSON.stringify(first)+" calls "+calls);
 time+=61*60*1000;await handle(new Request("https://test/api/app/android"));
 assert(calls===2,"the cache should expire after an hour");
});
await test("a missing or malformed version file means no update is offered",async()=>{
 for(const reply of [new Response("nope",{status:404}),Response.json({versionCode:"x",versionName:"1.1.25"}),Response.json({versionCode:5,versionName:"<b>"})]){
  const handle=createAndroidRelease((async()=>reply) as any);
  const data=await(await handle(new Request("https://test/api/app/android"))).json();
  assert(data.versionCode===0,"bad version file accepted: "+JSON.stringify(data));
 }
});

const html=await(await handler(new Request("https://test/setup/lists"))).text();
const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join("\n");
async function page(userAgent:string,latest:any){
 const {document,window}=parseHTML(html);
 const realNavigator=Object.getOwnPropertyDescriptor(globalThis,"navigator");
 Object.defineProperty(globalThis,"navigator",{value:{userAgent},configurable:true});
 try{
  new Function("window","document","localStorage","location","history","fetch","requestAnimationFrame","matchMedia","ResizeObserver",script)(
   window,document,{getItem:()=>null,setItem(){},removeItem(){}},
   {href:"https://test/setup/lists",origin:"https://test",pathname:"/setup/lists",search:"",hostname:"test"},{state:null,pushState(s:any){this.state=s},replaceState(s:any){this.state=s},back(){}},
   async(url:string)=>String(url)==="/api/app/android"?Response.json(latest):Response.json({}),()=>0,()=>({matches:false,addEventListener(){}}),class{observe(){}});
  await new Promise(r=>setTimeout(r,20));
  return document.querySelector(".appUpdateNotice") as any;
 }finally{if(realNavigator)Object.defineProperty(globalThis,"navigator",realNavigator)}
}
const latest={versionCode:107,versionName:"1.1.25",url:ANDROID_DOWNLOAD_URL};
const wv="Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36";
await test("an older app sees the update notice with a download link",async()=>{
 const notice=await page(wv+" YourDramaListApp/105",latest);
 assert(notice&&notice.textContent.includes(TEXT.appUpdateTitle.replace("{version}","1.1.25"))&&notice.textContent.includes(TEXT.appUpdateBody)&&notice.querySelector("a").getAttribute("href")===ANDROID_DOWNLOAD_URL,"notice missing or wrong");
});
await test("the current app, phone browsers and computers see no notice",async()=>{
 assert(!await page(wv+" YourDramaListApp/107",latest),"current app should not see the notice");
 assert(!await page("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130.0 Mobile Safari/537.36",latest),"a phone browser should not see the notice");
 assert(!await page("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0",latest),"a computer should not see the notice");
});
await test("an app from before version reporting is asked to reinstall once",async()=>{
 const notice=await page(wv,latest);
 assert(notice&&notice.textContent.includes(TEXT.appUpdateReinstall),"old apps should be told to reinstall");
});
console.log(JSON.stringify({passed}));
