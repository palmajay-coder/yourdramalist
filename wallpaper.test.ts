// The admin page: owner-only access to the Connect background tint, usage analytics, weekly picks and errors.
import {OWNER_ID,canEdit,DEFAULT_TINT,validateTint} from "./wallpaper.ts";
import {createWallpaperHandler} from "./wallpaperApi.ts";
let passed=0;const ok=(v:any)=>{if(!v)throw Error("Assertion failed")};async function test(name:string,f:()=>any){await f();passed++;console.log("PASS "+name)}
const owner={user:{id:OWNER_ID}};
await test("only the owner account is authorized",()=>{ok(canEdit(owner));ok(!canEdit(null));ok(!canEdit({user:{username:"Niwa710",id:"different"}}))});
await test("admin page asks for sign-in and rejects other accounts",async()=>{const h=createWallpaperHandler(async()=>null);const r=await h(new Request("https://test/admin"));const html=await r.text();ok(r.status===200&&html.includes("Sign in with the site owner")&&!html.includes('id="analytics"'));const denied=createWallpaperHandler(async()=>({user:{id:"different"}}));ok((await denied(new Request("https://test/admin"))).status===403)});
const memory=(initial:any=null)=>{let value=initial;return {load:async()=>value,save:async(v:any)=>{value=v},get value(){return value}}};
const post=(body:any,init:any={})=>new Request("https://test/api/admin/appearance",{method:"POST",headers:{origin:"https://test","content-type":"application/json",...init.headers},body:typeof body==="string"?body:JSON.stringify(body)});
await test("owner sees the tint controls, analytics, weekly picks and errors",async()=>{const h=createWallpaperHandler(async()=>owner,memory());const html=await(await h(new Request("https://test/admin"))).text();for(const id of ['id="tintSettings"','id="tintColor"','id="tintStrength"','id="tintSave"','id="tintReset"','src="/setup?tint-preview=1"','id="analytics"','id="weekly"'])ok(html.includes(id))});
await test("signed out sees no tint controls",async()=>{const h=createWallpaperHandler(async()=>null,memory());const html=await(await h(new Request("https://test/admin"))).text();ok(!html.includes('id="tintSettings"'))});
await test("tint settings are validated and old wallpaper settings still read",()=>{
 ok(validateTint({tint:"#AABBCC",opacity:0.5}).tint==="#aabbcc");
 ok(JSON.stringify(validateTint({mode:"posters",image:"",tint:"#000000",opacity:0.45,bannerImage:"",bannerOverlay:0.38}))==='{"tint":"#000000","opacity":0.45}');
 for(const bad of [null,{},{tint:"red",opacity:.5},{tint:"#000000",opacity:1.2},{tint:"#000000",opacity:-0.1},{tint:"#000000",opacity:"0.5"},{tint:"#000000"}]){let threw=false;try{validateTint(bad)}catch{threw=true}ok(threw)}
});
await test("the Connect tint is public, defaults to the original look and returns what the owner saves",async()=>{
 const store=memory();const h=createWallpaperHandler(async()=>owner,store);
 ok(JSON.stringify(await(await h(new Request("https://test/api/appearance"))).json())===JSON.stringify(DEFAULT_TINT));
 const r=await h(post({tint:"#123456",opacity:0.6}));ok(r.status===200&&(await r.json()).saved);
 const v=await(await h(new Request("https://test/api/appearance"))).json();ok(v.tint==="#123456"&&v.opacity===0.6);
 const old=memory({mode:"posters",image:"",tint:"#000000",opacity:0.45,bannerImage:"x",bannerOverlay:0.38});const h2=createWallpaperHandler(async()=>owner,old);
 ok((await(await h2(new Request("https://test/api/appearance"))).json()).opacity===0.45);
 await h2(post({tint:"#222222",opacity:0.8}));ok(old.value.bannerImage==="x"&&old.value.tint==="#222222","other stored fields are kept");
 const broken=createWallpaperHandler(async()=>null,{load:async()=>{throw Error("down")},save:async()=>{}});ok((await(await broken(new Request("https://test/api/appearance"))).json()).opacity===DEFAULT_TINT.opacity);
});
await test("only the owner can save the tint, from the admin page",async()=>{
 const store=memory();
 ok((await createWallpaperHandler(async()=>null,store)(post({tint:"#123456",opacity:.5}))).status===401);
 ok((await createWallpaperHandler(async()=>({user:{id:"different"}}),store)(post({tint:"#123456",opacity:.5}))).status===403);
 const h=createWallpaperHandler(async()=>owner,store);
 ok((await h(post({tint:"#123456",opacity:.5},{headers:{origin:"https://evil.example"}}))).status===403);
 ok((await h(post({tint:"#123456",opacity:.5},{headers:{"content-type":"text/plain"}}))).status===415);
 ok((await h(post({tint:"nope",opacity:.5}))).status===400);
 ok((await h(post("x".repeat(3000)))).status===413);
 ok(store.value===null,"nothing was saved by rejected requests");
 const failing=createWallpaperHandler(async()=>owner,{load:async()=>null,save:async()=>{throw Error("down")}});ok((await failing(post({tint:"#123456",opacity:.5}))).status===503);
});
console.log(JSON.stringify({passed}));
