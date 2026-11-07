import {collections} from './collectionService.ts';
import {blob} from 'https://esm.town/v/std/blob/main.ts';
import {personUrl,extractPerson,personSummary,extractPeopleSearch,makeFilmography,type Mode} from './people.ts';
type Entry={data:any;at:number;expires:number;error?:string};
type Storage={load:()=>Promise<any>;save:(snapshot:any)=>Promise<unknown>};
async function bounded<T>(promise:Promise<T>):Promise<T|undefined>{let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([promise,new Promise<undefined>(resolve=>{timer=setTimeout(()=>resolve(undefined),1000)})])}finally{clearTimeout(timer)}}
export function createPeopleService(storage?:Storage,fetcher:typeof fetch=fetch,now=Date.now){
 let cache=new Map<string,Entry>(),ready:Promise<void>|undefined,saving=Promise.resolve();const pending=new Map<string,Promise<any>>();let active=0,windowAt=now(),requests=0;
 async function page(key:string,url:string,parse:(html:string)=>any,ttl:number){
  ready??=(async()=>{try{const saved=storage?await bounded(storage.load()):null;if(Array.isArray(saved))cache=new Map(saved.slice(-100))}catch{}})();await ready;
  const old=cache.get(key);const usable=old?.data&&now()-old.at<7*86400000;
  if(old&&old.expires>now()){if(!old.data)throw Error(old.error||'MyDramaList is temporarily unavailable.');return {data:old.data,status:old.error?'stale':'cached',warning:old.error};}
  if(pending.has(key))return pending.get(key);
  if(active>=3)throw Error('People lookup is busy. Please try again shortly.');
  if(now()-windowAt>=60000){windowAt=now();requests=0}if(requests>=60)throw Error('People request limit reached. Please try again shortly.');
  const p=(async()=>{active++;requests++;let entry:Entry;
   try{const r=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{Accept:'text/html'}});
    if(!r.ok){await r.body?.cancel();throw Error(r.status===404?'Person not found. Check the link.':'MyDramaList could not be retrieved (HTTP '+r.status+').');}
    if(!r.headers.get('content-type')?.toLowerCase().includes('text/html')){await r.body?.cancel();throw Error('MyDramaList returned an unexpected response.');}
    const reader=r.body!.getReader(),decoder=new TextDecoder();let html='',size=0;
    try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>4000000)throw Error('This MyDramaList page is too large to load.');html+=decoder.decode(value,{stream:true})}html+=decoder.decode()}finally{await reader.cancel().catch(()=>{})}
    if(r.headers.get('cf-mitigated')==='challenge'||/<title[^>]*>\s*(?:Just a moment|Attention Required)|cf-chl-|\/cdn-cgi\/challenge-platform/i.test(html))throw Error('MyDramaList restricted access. Please try again later.');
    entry={data:parse(html),at:now(),expires:now()+ttl};
   }catch(e){const error=e instanceof Error&&e.name!=='TimeoutError'&&e.name!=='AbortError'?e.message:'MyDramaList took too long. Please try again.';entry={data:usable?old!.data:null,at:usable?old!.at:now(),expires:now()+30000,error};}finally{active--}
   cache.delete(key);cache.set(key,entry);while(cache.size>100)cache.delete(cache.keys().next().value!);
   if(storage){const snapshot=[...cache];saving=saving.catch(()=>{}).then(async()=>{await storage.save(snapshot)});await bounded(saving).catch(()=>{})}
   if(!entry.data)throw Error(entry.error);return {data:entry.data,status:entry.error?'stale':'live',warning:entry.error};
  })().finally(()=>pending.delete(key));pending.set(key,p);return p;
 }
 return {
  async person(raw:string){const url=personUrl(raw);if(!url)throw Error('Enter a valid HTTPS MyDramaList person link.');const id=url.match(/\/people\/(\d+)-/)![1];return page('person:'+id,url,html=>extractPerson(html,url),6*3600000)},
  async search(query:string,pageNumber:number){const target=new URL('https://mydramalist.com/search');target.searchParams.set('adv','people');target.searchParams.set('q',query);target.searchParams.set('page',String(pageNumber));return page('search:'+query.toLowerCase()+':'+pageNumber,target.href,html=>extractPeopleSearch(html,target),300000)}
 };
}
const service=createPeopleService({load:()=>blob.getJSON('people:v1'),save:snapshot=>blob.setJSON('people:v1',snapshot)});
export async function handlePeople(req:Request){
 if(req.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
 const u=new URL(req.url);const mode=u.searchParams.get('mode')||'actor';
 const fail=(error:string,status=400)=>Response.json({error},{status,headers:{'cache-control':'no-store'}});
 if(!['actor','director'].includes(mode))return fail('Choose Actors / Actresses or Directors.');
 const search=u.pathname==='/api/mdl/people-search';
 const raw=u.searchParams.get('url')||'';const query=(u.searchParams.get('q')||'').trim();const page=u.searchParams.get('page')||'1';
 if(search&&(query.length<2||query.length>100||!/^([1-9]|[1-9]\d)$/.test(page)))return fail('Enter a name between 2 and 100 characters and a valid search page.');
 if(!search&&!personUrl(raw))return fail('Enter a valid HTTPS MyDramaList person link.');
 try{
  if(search){const result=await service.search(query,Number(page));return Response.json({...result.data,query,page:Number(page),mode,status:result.status,warning:result.warning},{headers:{'cache-control':'no-store'}})}
  const offset=u.searchParams.get('offset')||'0';
  if(u.pathname==='/api/mdl/filmography-artwork'&&!/^(?:0|[1-9]\d{0,2})$/.test(offset))return fail('Choose a valid filmography offset.');
  const result=await service.person(raw);
  if(u.pathname==='/api/mdl/filmography-artwork'){
   const data=makeFilmography(result.data,mode as Mode);
   const items=await Promise.all(data.items.slice(Number(offset),Number(offset)+5).map(item=>collections.artwork({...item,details:item.type+' - '+(item.year||'')})));
   return Response.json({items:items.map(({id,poster,posterSource})=>({id,poster,posterSource:posterSource||'MyDramaList'}))},{headers:{'cache-control':'no-store'}});
  }
  if(u.pathname==='/api/mdl/filmography')return Response.json({...makeFilmography(result.data,mode as Mode),person:personSummary(result.data),status:result.status,warning:result.warning},{headers:{'cache-control':'no-store'}});
  return Response.json({person:personSummary(result.data),status:result.status,warning:result.warning},{headers:{'cache-control':'no-store'}});
 }catch(e){return fail(e instanceof Error?e.message:'Unable to load MyDramaList.',502)}
}
