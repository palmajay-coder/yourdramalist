// The admin page: owner-only access to usage analytics, weekly picks and errors.
// The Wallpaper section and /api/appearance were removed with the landing page.
import {OWNER_ID,canEdit} from "./wallpaper.ts";
import {createWallpaperHandler} from "./wallpaperApi.ts";
let passed=0;const ok=(v:any)=>{if(!v)throw Error("Assertion failed")};async function test(name:string,f:()=>any){await f();passed++;console.log("PASS "+name)}
const owner={user:{id:OWNER_ID}};
await test("only the owner account is authorized",()=>{ok(canEdit(owner));ok(!canEdit(null));ok(!canEdit({user:{username:"Niwa710",id:"different"}}))});
await test("admin page asks for sign-in and rejects other accounts",async()=>{const h=createWallpaperHandler(async()=>null);const r=await h(new Request("https://test/admin"));const html=await r.text();ok(r.status===200&&html.includes("Sign in with the site owner")&&!html.includes('id="analytics"'));const denied=createWallpaperHandler(async()=>({user:{id:"different"}}));ok((await denied(new Request("https://test/admin"))).status===403)});
await test("owner sees analytics, weekly picks and errors, and no wallpaper settings",async()=>{const h=createWallpaperHandler(async()=>owner);const html=await(await h(new Request("https://test/admin"))).text();ok(html.includes('id="analytics"')&&html.includes('id="weekly"')&&html.includes("Errors"));ok(!/Wallpaper|wallpaper-preview|\/api\/appearance|backgroundMode|bannerImage/.test(html))});
await test("wallpaper routes are gone",async()=>{const h=createWallpaperHandler(async()=>owner);for(const r of [new Request("https://test/api/appearance"),new Request("https://test/api/admin/appearance",{method:"POST",headers:{origin:"https://test","content-type":"application/json"},body:"{}"})])ok((await h(r)).status===405)});
console.log(JSON.stringify({passed}));
