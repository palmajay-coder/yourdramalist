import {blob} from "https://esm.town/v/std/blob/main.ts";
import {exploreCatalog} from "./explore.ts";
import {tmdbExplorePage} from "./tmdbExplore.ts";
export function createExploreService(storage?:{load:()=>Promise<any>;save:(v:any)=>Promise<any>},fetcher:typeof fetch=fetch,now=Date.now){
 const cache=new Map<string,any>(),pending=new Map<string,Promise<any>>();let ready:Promise<void>|undefined,active=0,count=0,start=now(),saving=Promise.resolve();
 async function bounded<T>(p:Promise<T>){let t;try{return await Promise.race([p,new Promise<undefined>(r=>{t=setTimeout(()=>r(undefined),1000)})])}finally{clearTimeout(t)}}
 return async(category:string,country:string,page:number)=>{
 const catalog=exploreCatalog(category,country),key=catalog.url+":"+page;
 ready??=(async()=>{try{const rows=storage?await bounded(storage.load()):null;if(Array.isArray(rows))for(const [k,v] of rows.slice(-100))cache.set(k,v)}catch{}})();await ready;
 const old=cache.get(key);if(old&&old.expires>now()){if(!old.data)throw Error(old.error);return {...old.data,status:old.error?"stale":"cached",warning:old.error,catalog}}
 if(pending.has(key))return pending.get(key);
 if(active>=3)throw Error("Explore is busy. Please try again shortly.");
 if(now()-start>=60000){count=0;start=now()}if(count>=30)throw Error("Explore request limit reached. Please try again shortly.");
 const task=(async()=>{active++;count++;let entry;
 try{const result=await tmdbExplorePage(category,country,page,{fetcher});
 entry={data:{...result,page},at:now(),expires:now()+3600000};
 }catch(e){const stale=old?.data&&now()-old.at<7*86400000?old.data:null;entry={data:stale,at:old?.at||now(),expires:now()+(stale?30000:1000),error:e instanceof Error&&e.name!=="TimeoutError"?e.message:"TMDB took too long. Please try again."}}finally{active--}
 cache.delete(key);cache.set(key,entry);while(cache.size>100)cache.delete(cache.keys().next().value!);
 if(storage){const snapshot=[...cache];saving=saving.catch(()=>{}).then(()=>storage.save(snapshot));await bounded(saving).catch(()=>{})}
 if(!entry.data)throw Error(entry.error);
 return {...entry.data,catalog,status:entry.error?"stale":"live",warning:entry.error};
 })().finally(()=>pending.delete(key));pending.set(key,task);return task;
 };
}
const service=createExploreService({load:()=>blob.getJSON("explore:v1"),save:v=>blob.setJSON("explore:v1",v)});
export async function handleExplore(req:Request){
 if(req.method!=="GET")return new Response("Method not allowed",{status:405,headers:{Allow:"GET"}});
 const u=new URL(req.url),category=u.searchParams.get("category")||"",country=u.searchParams.get("country")||"",page=u.searchParams.get("page")||"1";
 try{exploreCatalog(category,country);if(!/^[1-9]\d?$/.test(page))throw Error("Choose a page between 1 and 99.")}catch(e){return Response.json({error:e.message},{status:400})}
 try{return Response.json(await service(category,country,Number(page)),{headers:{"cache-control":"no-store"}})}catch(e){return Response.json({error:e.message},{status:502,headers:{"cache-control":"no-store"}})}
}
