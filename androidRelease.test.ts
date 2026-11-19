// Android app updates: the version endpoint and the notice inside the app.
import {parseHTML} from "npm:linkedom@0.18.12";
import {createAndroidRelease,androidApkUrl,ANDROID_RELEASES_URL} from "./androidRelease.ts";
import handler from "./app.ts";
import {TEXT} from "./text.ts";
let passed=0;const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};async function test(name:string,fn:()=>unknown){await fn();passed++;console.log("PASS "+name)}

await test("the version endpoint reads the release's version file and caches it",async()=>{
 let calls=0,time=0;
 const handle=createAndroidRelease((async()=>{calls++;return Response.json({versionCode:107,versionName:"1.1.25"})}) as any,()=>time);
 const first=await(await handle(new Request("https://test/api/app/android"))).json();
 await handle(new Request("https://test/api/app/android"));
 assert(first.versionCode===107&&first.versionName==="1.1.25"&&first.url==="https://github.com/palmajay-coder/yourdramalist/releases/latest/download/YourDramaList-1.1.25-android.apk"&&calls===1,"version or cache: "+JSON.stringify(first)+" calls "+calls);
 time+=61*60*1000;await handle(new Request("https://test/api/app/android"));
 assert(calls===2,"the cache should expire after an hour");
});
await test("a missing or malformed version file means no update is offered",async()=>{
 for(const reply of [new Response("nope",{status:404}),Response.json({versionCode:"x",versionName:"1.1.25"}),Response.json({versionCode:5,versionName:"<b>"})]){
  const handle=createAndroidRelease((async()=>reply) as any);
  const data=await(await handle(new Request("https://test/api/app/android"))).json();
  assert(data.versionCode===0&&data.url===ANDROID_RELEASES_URL,"bad version file accepted: "+JSON.stringify(data));
 }
});
await test("the permanent download link redirects to the newest versioned APK",async()=>{
 const handle=createAndroidRelease((async()=>Response.json({versionCode:103,versionName:"1.1.27"})) as any);
 const r=await handle(new Request("https://test/download/android"));
 assert(r.status===302&&r.headers.get("location")===androidApkUrl("1.1.27"),"redirect: "+r.status+" "+r.headers.get("location"));
 const down=createAndroidRelease((async()=>new Response("",{status:404})) as any);
 assert((await down(new Request("https://test/download/android"))).headers.get("location")===ANDROID_RELEASES_URL,"falls back to the releases page");
 const viaApp=await handler(new Request("https://test/download/android"));
 assert(viaApp.status===302,"the site serves /download/android");
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
const latest={versionCode:107,versionName:"1.1.25",url:androidApkUrl("1.1.25")};
const wv="Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36";
await test("an older app sees the update notice with a download link",async()=>{
 const notice=await page(wv+" YourDramaListApp/105",latest);
 assert(notice&&notice.textContent.includes(TEXT.appUpdateTitle.replace("{version}","1.1.25"))&&notice.textContent.includes(TEXT.appUpdateBody)&&notice.querySelector("a").getAttribute("href")===androidApkUrl("1.1.25"),"notice missing or wrong");
});
await test("the current app, phone browsers and computers see no notice",async()=>{
 assert(!await page(wv+" YourDramaListApp/107",latest),"current app should not see the notice");
 assert(!await page("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130.0 Mobile Safari/537.36",latest),"a phone browser should not see the notice");
 assert(!await page("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0",latest),"a computer should not see the notice");
});
await test("in-app browsers like Reddit see no notice",async()=>{
 assert(!await page(wv,latest),"a plain in-app web view should not see the notice");
 assert(!await page(wv+" Reddit/Version 2025.40.0/Build 2540000/Android 14",latest),"Reddit's in-app browser should not see the notice");
});
await test("a quiet release does not remind the previous version, but still reminds older ones",async()=>{
 const quiet={versionCode:110,versionName:"1.1.30",url:androidApkUrl("1.1.30"),remindBelow:105};
 assert(!await page(wv+" YourDramaListApp/105",quiet),"1.1.29 should not be asked to update for a quiet release");
 const older=await page(wv+" YourDramaListApp/104",quiet);
 assert(older&&older.textContent.includes(TEXT.appUpdateTitle.replace("{version}","1.1.30")),"older apps should still be offered the newest version");
 const handle=createAndroidRelease((async()=>Response.json({versionCode:110,versionName:"1.1.30"})) as any,Date.now,105);
 assert((await(await handle(new Request("https://test/api/app/android"))).json()).remindBelow===105,"the endpoint reports remindBelow");
 const loud=createAndroidRelease((async()=>Response.json({versionCode:110,versionName:"1.1.30"})) as any,Date.now,110);
 assert((await(await loud(new Request("https://test/api/app/android"))).json()).remindBelow===110,"raising it reminds everyone below the new version");
});
console.log(JSON.stringify({passed}));
