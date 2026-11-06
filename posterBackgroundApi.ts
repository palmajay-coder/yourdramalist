import {blob} from "https://esm.town/v/std/blob/main.ts";
import {createPosterService} from "./posterBackground.ts";
const getPosters=createPosterService({load:()=>blob.getJSON("poster-background:v1"),save:v=>blob.setJSON("poster-background:v1",v)},()=>Deno.env.get("TMDB_API_KEY"));
export async function handlePosterBackground(req:Request){
 if(req.method!=="GET")return new Response("Method not allowed",{status:405,headers:{Allow:"GET"}});
 return Response.json(await getPosters(),{headers:{"cache-control":"public, max-age=3600"}});
}
