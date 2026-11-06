import { load } from "npm:cheerio@1.0.0";
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
 async function lookup(query:string,page:string):Promise<SearchResult>{
  const target=new URL("https://mydramalist.com/search");target.searchParams.set("q",query);target.searchParams.set("page",page);
  const upstream=await fetcher(target,{redirect:"error",signal:AbortSignal.timeout(15000),headers:{Accept:"text/html"}});
  if(upstream.status===429){
   await upstream.body?.cancel();const raw=upstream.headers.get("retry-after")||"";
   const seconds=/^\d+$/.test(raw)?Number(raw):Math.ceil((Date.parse(raw)-now())/1000);
   const retry=Number.isFinite(seconds)?Math.max(5,Math.min(300,seconds)):30;
   cooldownUntil=Math.max(cooldownUntil,now()+retry*1000);
   throw new SearchFailure(429,TEXT.searchRetry,retry);
  }
  if(!upstream.ok){await upstream.body?.cancel();throw new SearchFailure(502,"MyDramaList search is unavailable. Please try again.");}
  if(!upstream.headers.get("content-type")?.toLowerCase().includes("text/html")){await upstream.body?.cancel();throw new SearchFailure(502,"MyDramaList returned an unexpected search response.");}
  const reader=upstream.body?.getReader();if(!reader)throw new SearchFailure(502,"MyDramaList returned an empty search response.");
  const decoder=new TextDecoder();let html="",size=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>3000000)throw new SearchFailure(502,"MyDramaList returned an oversized search response.");html+=decoder.decode(value,{stream:true});}html+=decoder.decode();}
  finally{await reader.cancel().catch(()=>{});}
  if(upstream.headers.get("cf-mitigated")==="challenge"||/<title[^>]*>\s*(?:Just a moment|Attention Required)|cf-chl-|\/cdn-cgi\/challenge-platform/i.test(html))throw new SearchFailure(502,"MyDramaList returned an access challenge. Please try again later.");
    const $ = load(html);
    const clean = (s: string) => s.replace(/\s+/g, " ").trim();
    if (!/Search results/i.test($("title").text())) throw new SearchFailure(502, "MyDramaList did not return a search results page.");
    const seen = new Set<string>();
    const dramas: { id: string; name: string; url: string; poster: string | null; details: string; score: string }[] = [];
    $(".box[id]").each((_, el) => {
      const card = $(el);
      const id = card.attr("id")?.match(/^mdl-(\d+)$/)?.[1];
      if (!id || seen.has(id)) return;
      const title = card.find(".content .title > a[href]").first();
      const name = clean(title.text());
      let url: URL;
      try { url = new URL(title.attr("href") || "", "https://mydramalist.com"); } catch { return; }
      if (!name || url.origin !== "https://mydramalist.com" || !new RegExp("^/" + id + "-[A-Za-z0-9-]+/?$").test(url.pathname)) return;
      let poster: string | null = null;
      const image = card.find(".film-cover img").first();
      try {
        const imageUrl = new URL(image.attr("data-src") || image.attr("src") || "");
        if (imageUrl.protocol === "https:" && imageUrl.hostname === "i.mydramalist.com" && !imageUrl.username && !imageUrl.password && !imageUrl.port) poster = imageUrl.href;
      } catch { /* Missing poster is allowed. */ }
      seen.add(id);
      dramas.push({ id, name, url: url.origin + url.pathname, poster, details: clean(card.find(".content > .text-muted").first().text()), score: clean(card.find(".score").first().text()) });
    });
    const nextPage = $(".pagination a[href]").toArray().some(el => {
      try {
        const next = new URL($(el).attr("href")!, target);
        return next.origin === target.origin && next.pathname === "/search" && Number(next.searchParams.get("page")) === Number(page) + 1;
      } catch { return false; }
    });
  return {query,page:Number(page),dramas,hasNextPage:nextPage};
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
