import {blob} from "https://esm.town/v/std/blob/main.ts";
import {getOAuthUserData} from "https://esm.town/v/std/oauth/middleware.ts";
import {DEFAULT_WALLPAPER,canEdit,checkWrite,readSettingsBody,validateWallpaper} from "./wallpaper.ts";
import {adminPage} from "./wallpaperAdmin.ts";
import {adminAnalytics,adminErrors,adminWeekly} from "./analyticsApi.ts";
const key="appearance:v1";
export function createWallpaperHandler(storage:{load:()=>Promise<any>;save:(value:any)=>Promise<any>},sessionFor:(req:Request)=>Promise<any>){
async function settings(){return validateWallpaper(await storage.load()??DEFAULT_WALLPAPER)}
return async function(req:Request){
 const u=new URL(req.url),json=(value:any,status=200)=>Response.json(value,{status,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
 if(u.pathname==="/api/appearance"&&req.method==="GET"){try{return json(await settings())}catch{return json({...DEFAULT_WALLPAPER,warning:"Wallpaper settings are temporarily unavailable."})}}
 const session=await sessionFor(req);
 if(u.pathname==="/api/admin/analytics")return await adminAnalytics(req,session);
 if(u.pathname==="/api/admin/errors")return await adminErrors(req,session);
 if(u.pathname==="/api/admin/weekly")return await adminWeekly(req,session);
 if(u.pathname==="/admin"&&req.method==="GET"){
  if(!session?.user)return new Response(adminPage(false),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
  if(!canEdit(session))return new Response("This admin page is only available to the site owner.",{status:403});
  return new Response(adminPage(true),{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
 }
 if(!canEdit(session))return json({error:session?.user?"Only the site owner can change the wallpaper.":"Sign in to save wallpaper settings."},session?.user?403:401);
 if(u.pathname==="/api/admin/appearance"&&req.method==="POST"){
  try{checkWrite(req)}catch(e){return json({error:e.message},403)}
  let value;try{value=await readSettingsBody(req)}catch(e){return json({error:e.message},400)}
  try{await storage.save(value);return json({saved:true,...value})}catch{return json({error:"The wallpaper could not be saved. Your existing wallpaper has been kept."},503)}
 }
 return json({error:"Method not allowed"},405);
};
}
export const handleWallpaper=createWallpaperHandler({load:()=>blob.getJSON(key),save:v=>blob.setJSON(key,v)},getOAuthUserData);
