import { kuryana, KuryanaError, detailsLine, mdlLink, mdlImage } from "./kuryana.ts";
import { TEXT } from "./text.ts";

type SearchResult={query:string;page:number;dramas:{id:string;name:string;url:string;poster:string|null;details:string;score:string}[];hasNextPage:boolean};
class SearchFailure extends Error {
 constructor(public status:number,message:string,public retryAfter?:number){super(message);}
}
export function createDramaSearchHandler(fetcher:typeof fetch=fetch,now=Date.now){
 const cache=new Map<string,{data:SearchResult;expires:number}>(),pending=new Map<string,Promise<SearchResult>>();
 let active=0,windowAt=now(),count=0,cooldownUntil=0;
 const ttl=300000,maxEntries=100,maxConcurrent=3,maxPerMinute=30;
 const response=(data:SearchResult,query:string)=>Response.json({...data,query},{headers:{"cache-control":"public, max-age=300"}});
 // Reads search results from Kuryana (MyDramaList refuses requests from cloud hosts).
 async function lookup(query:string,page:string):Promise<SearchResult>{
  let data:any;
  try{data=await kuryana(`/v2/search?q=${encodeURIComponent(query)}&page=${page}`,{fetcher});}
  catch(error){
   if(error instanceof KuryanaError&&error.status===429){cooldownUntil=Math.max(cooldownUntil,now()+30000);throw new SearchFailure(429,TEXT.searchRetry,30);}
   if(error instanceof KuryanaError&&error.status===404)return {query,page:Number(page),dramas:[],hasNextPage:false};
   if(error instanceof KuryanaError)throw new SearchFailure(502,"MyDramaList search is unavailable. Please try again.");
   throw error;
  }
  const seen=new Set<string>();
  const dramas:SearchResult["dramas"]=[];
  for(const item of (Array.isArray(data?.dramas)?data.dramas:[])){
   const id=String(item?.id??"");
   const url=mdlLink(item?.link);
   const name=String(item?.title||"").replace(/\s+/g," ").trim();
   if(!/^\d+$/.test(id)||seen.has(id)||!url||!name||!new RegExp("^https://mydramalist\\.com/"+id+"-[A-Za-z0-9-]+/?$").test(url))continue;
   seen.add(id);
   dramas.push({id,name,url,poster:mdlImage(item?.image),details:detailsLine(item),score:item?.rating==null?"":Number(item.rating).toFixed(1)});
  }
  const pageNumber=Number(data?.pagination?.page)||Number(page),total=Number(data?.pagination?.total_pages)||pageNumber;
  return {query,page:Number(page),dramas,hasNextPage:pageNumber<total};
 }
 return async function(req:Request):Promise<Response>{
  const fail=(status:number,error:string,retryAfter?:number)=>Response.json({error},{status,headers:{"cache-control":"no-store",...(retryAfter?{"retry-after":String(retryAfter)}:{})}});
  if(req.method!=="GET")return new Response("Method not allowed",{status:405,headers:{Allow:"GET"}});
  const input=new URL(req.url),query=(input.searchParams.get("q")||"").trim(),page=input.searchParams.get("page")||"1";
  if(query.length<2||query.length>100)return fail(400,"Enter a drama name between 2 and 100 characters.");
  if(!/^[1-9]\d{0,2}$/.test(page))return fail(400,"Invalid search page.");
  const key=query.toLowerCase()+":"+page,time=now(),hit=cache.get(key);
  if(hit&&hit.expires>time){cache.delete(key);cache.set(key,hit);return response(hit.data,query);}
  if(hit)cache.delete(key);
  let work=pending.get(key);
  if(!work){
   if(time<cooldownUntil)return fail(429,TEXT.searchRetry,Math.max(1,Math.ceil((cooldownUntil-time)/1000)));
   if(time-windowAt>=60000){windowAt=time;count=0;}
   if(count>=maxPerMinute)return fail(429,TEXT.searchRetry,Math.max(1,Math.ceil((windowAt+60000-time)/1000)));
   if(active>=maxConcurrent)return fail(429,TEXT.searchRetry,2);
   active++;count++;
   work=lookup(query,page).then(data=>{
    cache.delete(key);cache.set(key,{data,expires:now()+ttl});
    while(cache.size>maxEntries)cache.delete(cache.keys().next().value!);
    return data;
   }).finally(()=>{active--;pending.delete(key);});
   pending.set(key,work);
  }
  try{return response(await work,query);}
  catch(error){
   if(error instanceof SearchFailure)return fail(error.status,error.message,error.retryAfter);
   const timeout=error instanceof Error&&["TimeoutError","AbortError"].includes(error.name);
   return fail(timeout?504:502,timeout?"MyDramaList search took too long. Please try again.":"Unable to search MyDramaList. Please try again.");
  }
 };
}
export const handleDramaSearch=createDramaSearchHandler();
