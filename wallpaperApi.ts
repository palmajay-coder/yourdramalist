import {getOAuthUserData} from "https://esm.town/v/std/oauth/middleware.ts";
import {canEdit} from "./wallpaper.ts";
import {adminPage} from "./wallpaperAdmin.ts";
import {adminAnalytics,adminErrors,adminWeekly} from "./analyticsApi.ts";
import {popularity} from "./popularity.ts";
// The admin page and its data: usage analytics, weekly picks and errors. Owner only.
export function createWallpaperHandler(sessionFor:(req:Request)=>Promise<any>){
return async function(req:Request){
 const u=new URL(req.url);
 const session=await sessionFor(req);
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
