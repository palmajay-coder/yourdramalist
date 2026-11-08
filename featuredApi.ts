import {blob} from "https://esm.town/v/std/blob/main.ts";
import {createFeaturedService} from "./featured.ts";
import {enrichFeaturedArtwork} from "./featuredArtwork.ts";
export const refreshFeatured=createFeaturedService({load:()=>blob.getJSON("seasonal-featured:v1"),save:v=>blob.setJSON("seasonal-featured:v1",v)},fetch,Date.now,enrichFeaturedArtwork);
export async function handleFeatured(req:Request){
 if(req.method!=="GET")return new Response("Method not allowed",{status:405,headers:{Allow:"GET"}});
 return Response.json(await refreshFeatured(),{headers:{"cache-control":"public, max-age=60"}});
}
