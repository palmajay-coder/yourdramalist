import {getOAuthUserData} from "https://esm.town/v/std/oauth/middleware.ts";
import {blob} from "https://esm.town/v/std/blob/main.ts";
import {DEFAULT_TINT,canEdit,validateTint} from "./wallpaper.ts";
import {adminPage} from "./wallpaperAdmin.ts";
import {adminAnalytics,adminErrors,adminWeekly} from "./analyticsApi.ts";
import {popularity} from "./popularity.ts";
// The admin page and its data: the Connect background tint, usage analytics, weekly picks and errors.
// The tint uses the same storage key as the old Wallpaper section, so a tint saved there is kept.
const TINT_KEY="appearance:v1";
type TintStorage={load:()=>Promise<any>;save:(value:any)=>Promise<any>};
const blobStorage:TintStorage={load:()=>blob.getJSON(TINT_KEY),save:value=>blob.setJSON(TINT_KEY,value)};
export function createWallpaperHandler(sessionFor:(req:Request)=>Promise<any>,storage:TintStorage=blobStorage){
const json=(value:any,status=200)=>Response.json(value,{status,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
async function currentTint(){
 const saved=await storage.load();
 if(!saved)return DEFAULT_TINT;
 try{return validateTint(saved)}catch{return DEFAULT_TINT}
}
return async function(req:Request){
 const u=new URL(req.url);
 if(u.pathname==="/api/appearance"&&req.method==="GET"){
  try{return json(await currentTint())}catch{return json(DEFAULT_TINT)}
 }
 const session=await sessionFor(req);
 if(u.pathname==="/api/admin/appearance"&&req.method==="POST"){
  if(!canEdit(session))return json({error:session?.user?"Only the site owner can change the tint.":"Sign in to change the tint."},session?.user?403:401);
  if(req.headers.get("origin")!==u.origin)return json({error:"Please save from the admin page."},403);
  if(!req.headers.get("content-type")?.startsWith("application/json"))return json({error:"Expected JSON settings."},415);
  let value;
  try{
   const body=await req.text();
   if(body.length>2000)return json({error:"Settings are too large."},413);
   value=validateTint(JSON.parse(body));
  }catch(e){return json({error:e instanceof Error?e.message:"Invalid tint settings."},400)}
  try{
   const previous=await storage.load().catch(()=>null);
   // Keep any other fields the old Wallpaper section stored alongside the tint.
   await storage.save({...(previous&&typeof previous==="object"?previous:{}),...value});
   return json({saved:true,...value});
  }catch{return json({error:"The tint could not be saved. The current tint has been kept."},503)}
 }
 if(u.pathname==="/api/admin/analytics")return await adminAnalytics(req,session,popularity.summary);
 if(u.pathname==="/api/admin/errors")return await adminErrors(req,session);
 if(u.pathname==="/api/admin/weekly")return await adminWeekly(req,session);
 if(u.pathname==="/admin"&&req.method==="GET"){
  if(!session?.user)return new Response(adminPage(false),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
  if(!canEdit(session))return new Response("This admin page is only available to the site owner.",{status:403});
  return new Response(adminPage(true),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
 }
 return Response.json({error:"Method not allowed"},{status:405,headers:{"cache-control":"no-store"}});
};
}
export const handleWallpaper=createWallpaperHandler(getOAuthUserData);
