import {blob} from "https://esm.town/v/std/blob/main.ts";
import {createFeaturedService} from "./featured.ts";
const service=createFeaturedService({load:()=>blob.getJSON("featured:v1"),save:v=>blob.setJSON("featured:v1",v)});
export async function handleFeatured(req:Request){
 if(req.method!=="GET")return new Response("Method not allowed",{status:405,headers:{Allow:"GET"}});
 return Response.json(await service(),{headers:{"cache-control":"public, max-age=60"}});
}
