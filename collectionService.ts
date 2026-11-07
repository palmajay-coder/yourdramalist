import {blob} from "https://esm.town/v/std/blob/main.ts";
import {COLLECTION_COUNTRIES,weekWindow,weeklyCatalog,posterUrl,matchArtwork,normalizeTitle} from "./collections.ts";
import {createExploreService} from "./exploreApi.ts";

type Storage={load:()=>Promise<any>;save:(value:any)=>Promise<any>};
export function createCollectionService(storage:Storage|undefined,keyFor:()=>string|undefined,fetcher:typeof fetch=fetch,now=Date.now){
 const cache=new Map<string,any>(),pending=new Map<string,Promise<any>>();
 let ready:Promise<void>|undefined,saving=Promise.resolve(),active=0,requests=0,start=now(),cooldown=0;
 const queue:Array<()=>void>=[];
 async function bounded<T>(p:Promise<T>){let timer;try{return await Promise.race([p,new Promise<undefined>(r=>timer=setTimeout(r,1000))])}finally{clearTimeout(timer)}}
 async function init(){ready??=(async()=>{try{const data=storage?await bounded(storage.load()):null;if(Array.isArray(data))for(const [k,v]of data.slice(-250))cache.set(k,v)}catch{}})();await ready;}
 async function save(){let rows=[...cache];while(rows.length>250||JSON.stringify(rows).length>2000000){cache.delete(rows[0][0]);rows.shift()}if(storage){saving=saving.catch(()=>{}).then(()=>storage.save(rows));await bounded(saving).catch(()=>{})}}
 async function memo(key:string,ttl:number,work:()=>Promise<any>){
  await init();const old=cache.get(key);if(old?.expires>now()){if(old.error)throw Error(old.error);return old.data}if(pending.has(key))return pending.get(key);
  const task=(async()=>{try{const data=await work();cache.delete(key);cache.set(key,{data,at:now(),expires:now()+ttl});await save();return data}catch{cache.set(key,{...old,error:"Catalog data is temporarily unavailable.",expires:now()+30000});throw Error("Catalog data is temporarily unavailable.")}})().finally(()=>pending.delete(key));pending.set(key,task);return task;
 }
 async function request(path:string,params:Record<string,string>={}){
  if(cooldown>now())throw Error("Please try again shortly.");
  if(now()-start>=60000){requests=0;start=now()}if(requests>=120||queue.length>=24)throw Error("Please try again shortly.");requests++;
  if(active>=3)await new Promise<void>(resolve=>queue.push(resolve));else active++;
  try{
   const key=keyFor();if(!key)throw Error("TMDB is not configured");
   const url=new URL("https://api.themoviedb.org/3/"+path);for(const [k,v]of Object.entries(params))url.searchParams.set(k,v);url.searchParams.set("api_key",key);
   const r=await fetcher(url,{redirect:"error",signal:AbortSignal.timeout(8000),headers:{Accept:"application/json"}});
   if(!r.ok){if(r.status===429)cooldown=now()+Math.min(300,Math.max(5,Number(r.headers.get("retry-after"))||30))*1000;await r.body?.cancel();throw Error("Provider unavailable")}
   if(!r.headers.get("content-type")?.includes("application/json")){await r.body?.cancel();throw Error("Unexpected response")}
   const reader=r.body!.getReader(),decoder=new TextDecoder();let text="",size=0;
   try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1000000)throw Error("Response too large");text+=decoder.decode(value,{stream:true})}text+=decoder.decode()}finally{await reader.cancel().catch(()=>{})}
   return JSON.parse(text);
  }finally{const next=queue.shift();if(next)next();else active--;}
 }
 async function keyword(name:string){return memo("keyword:"+name,90*86400000,async()=>{const d=await request("search/keyword",{query:name});return d.results?.find((x:any)=>normalizeTitle(x.name)===normalizeTitle(name))?.id||null})}
 async function weekly(country:string){
  weeklyCatalog(country,0);await init();const window=weekWindow(now()),key="weekly:"+country+":"+window.week;
  const previous=[...cache].filter(([k,v])=>k.startsWith("weekly:"+country+":")&&k!==key&&v.data?.collections).sort((a,b)=>b[0].localeCompare(a[0]));
  const recent=new Set(previous.slice(0,2).flatMap(([,v])=>v.data.collections.flatMap((c:any)=>c.items.map((x:any)=>x.kind+":"+x.id))));
  try{return await memo(key,Date.parse(window.nextRefresh)-now(),async()=>{
   const used=new Set<string>(),collections=[];
   for(const [slot,theme]of window.themes.entries()){
    const keywords="keywords"in theme?(await Promise.all(theme.keywords!.map(keyword))).filter(Boolean).join("|"):"";
    if("keywords"in theme&&!keywords)throw Error("Theme metadata unavailable");
    const groups=await Promise.all(["tv","movie"].map(async kind=>{
     const params:Record<string,string>={with_origin_country:COLLECTION_COUNTRIES[country],include_adult:"false",language:"en-US",sort_by:"vote_average.desc","vote_count.gte":"20","vote_average.gte":"6",without_genres:"16,99",[kind==="tv"?"first_air_date.lte":"primary_release_date.lte"]:new Date(now()).toISOString().slice(0,10)};
     if(keywords)params.with_keywords=keywords;if("genre"in theme)params.with_genres=theme.genre!;
     const data=await request("discover/"+kind,params);
     return (data.results||[]).filter((r:any)=>!r.adult&&Number(r.vote_count)>=20&&Number(r.vote_average)>=6&&!(r.genre_ids||[]).some((g:number)=>[16,99,10763,10764,10767].includes(g))&&posterUrl(r.poster_path)&&(kind!=="tv"||r.origin_country?.includes(COLLECTION_COUNTRIES[country]))).map((r:any)=>({id:r.id,kind,name:r.name||r.title,poster:posterUrl(r.poster_path),overview:r.overview||"",date:r.first_air_date||r.release_date,score:r.vote_average})).filter((r:any)=>r.name&&/^\d{4}-\d{2}-\d{2}$/.test(r.date||"")&&r.date<=new Date(now()).toISOString().slice(0,10));
    }));
    const pool=groups.flat().filter(r=>!used.has(r.kind+":"+r.id));
    // New-to-recent-collections first; ratings determine order within each group.
    pool.sort((a,b)=>Number(recent.has(a.kind+":"+a.id))-Number(recent.has(b.kind+":"+b.id))||b.score-a.score||a.id-b.id);
    const items=pool.slice(0,20);items.forEach(r=>used.add(r.kind+":"+r.id));
    const catalog={...weeklyCatalog(country,slot),name:theme.name+" ("+({"3":"South Korea","2":"China","1":"Japan","5":"Taiwan","6":"Thailand"}[country])+")",description:theme.description};
    collections.push({catalog,items});
   }
   return {...window,themes:undefined,collections,status:"live"};
  })}catch{const old=cache.get(key)?.data||previous[0]?.[1].data;if(old&&now()-Date.parse(old.week)<21*86400000)return{...old,status:"stale",warning:"Showing saved collections. Live refresh is temporarily unavailable."};throw Error("Weekly collections are temporarily unavailable.")}
 }
 async function artwork(item:any,country:string){
  if(!keyFor())return item;
  const kind=/movie/i.test(item.details||"")?"movie":"tv";
  const poster=await memo("art:"+item.url,7*86400000,async()=>{const data=await request("search/"+kind,{query:item.name,include_adult:"false",language:"en-US"});return matchArtwork(item,data.results||[],kind,country)}).catch(()=>null);
  return poster?{...item,poster,posterSource:"TMDB"}:item;
 }
 async function metas(items:any[],base:string,ratings:boolean){
  const result:any[]=Array(items.length);let cursor=0;
  async function worker(){while(cursor<items.length){const i=cursor++,item=items[i];try{const ids=await memo("imdb:"+item.kind+":"+item.id,30*86400000,()=>request(item.kind+"/"+item.id+"/external_ids"));if(!/^tt\d+$/.test(ids.imdb_id||""))continue;result[i]={id:ids.imdb_id,type:item.kind==="tv"?"series":"movie",name:item.name,poster:ratings?base+"/poster/"+ids.imdb_id+".jpg":item.poster,posterShape:"poster",releaseInfo:item.date.slice(0,4),description:item.overview};}catch{}}}
  await Promise.all([worker(),worker(),worker()]);return result.filter(Boolean).filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i);
 }
 return{weekly,artwork,metas};
}
export const collections=createCollectionService({load:()=>blob.getJSON("catalog-collections:v1"),save:v=>blob.setJSON("catalog-collections:v1",v)},()=>Deno.env.get("TMDB_API_KEY"));
const explore=createExploreService({load:()=>blob.getJSON("explore:v1"),save:v=>blob.setJSON("explore:v1",v)});
export async function handleCollections(req:Request){
 if(req.method!=="GET")return new Response("Method not allowed",{status:405,headers:{Allow:"GET"}});
 const u=new URL(req.url),country=u.searchParams.get("country")||"3";
 if(!COLLECTION_COUNTRIES[country])return Response.json({error:"Choose a country."},{status:400});
 try{
  if(u.pathname==="/api/catalogs/weekly")return Response.json(await collections.weekly(country),{headers:{"cache-control":"no-store"}});
  const category=u.searchParams.get("category")||"";
  // Validate before upstream work. No user-supplied URL or title reaches TMDB.
  const {exploreCatalog}=await import("./explore.ts");try{exploreCatalog(category,country)}catch{return Response.json({error:"Choose a catalog."},{status:400})}
  const data=await explore(category,country,1),items=await Promise.all(data.items.slice(0,5).map(row=>collections.artwork(row,country)));
  return Response.json({...data,items},{headers:{"cache-control":"no-store"}});
 }catch{return Response.json({error:"Catalogs are temporarily unavailable. Please try again shortly."},{status:502,headers:{"cache-control":"no-store"}})}
}
