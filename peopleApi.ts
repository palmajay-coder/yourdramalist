import {collections} from './collectionService.ts';
import {blob} from 'https://esm.town/v/std/blob/main.ts';
import {personUrl,personFromKuryana,personSummary,peopleSearchFromKuryana,makeFilmography,remoteImage,type Mode} from './people.ts';
import {kuryana,KuryanaError} from './kuryana.ts';
import {tmdbPersonCredits} from './tmdbPeople.ts';
type Entry={data:any;at:number;expires:number;error?:string};
type Storage={load:()=>Promise<any>;save:(snapshot:any)=>Promise<unknown>};
async function bounded<T>(promise:Promise<T>):Promise<T|undefined>{let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([promise,new Promise<undefined>(resolve=>{timer=setTimeout(()=>resolve(undefined),1000)})])}finally{clearTimeout(timer)}}
// Acting and directing credits come from TMDB (Kuryana leaves many out). If TMDB is not
// configured or has no matching person, keep Kuryana's credits rather than showing nothing.
async function withTmdbCredits(person:ReturnType<typeof personFromKuryana>,fetcher:typeof fetch){
 const credits=await tmdbPersonCredits(person,{fetcher});
 if(!credits)return person;
 const filmographies={actor:credits.actor.length?credits.actor:person.filmographies.actor,director:credits.director.length?credits.director:person.filmographies.director};
 const sections={actor:Math.max(credits.actor.length?1:0,person.sections.actor),director:Math.max(credits.director.length?1:0,person.sections.director)};
 return {...person,filmographies,sections};
}
// Poster from the title's MyDramaList page via Kuryana, remembered for a day.
const posterMemo=new Map<string,{poster:string|null;expires:number}>();
async function mdlPoster(url:string):Promise<string|null>{
 const hit=posterMemo.get(url);if(hit&&hit.expires>Date.now())return hit.poster;
 let poster:string|null=null;
 try{const data=await kuryana('/v2/dramas/'+new URL(url).pathname.slice(1),{timeoutMs:6000});poster=remoteImage(data?.poster)}catch{}
 posterMemo.set(url,{poster,expires:Date.now()+(poster?86400000:600000)});while(posterMemo.size>500)posterMemo.delete(posterMemo.keys().next().value!);
 return poster;
}
export function createPeopleService(storage?:Storage,fetcher:typeof fetch=fetch,now=Date.now){
 let cache=new Map<string,Entry>(),ready:Promise<void>|undefined,saving=Promise.resolve();const pending=new Map<string,Promise<any>>();let active=0,windowAt=now(),requests=0;
 // `url` is a Kuryana v2 path; `parse` maps Kuryana's data to the old parser's shape.
 async function page(key:string,url:string,parse:(data:any)=>any|Promise<any>,ttl:number){
  ready??=(async()=>{try{const saved=storage?await bounded(storage.load()):null;if(Array.isArray(saved))cache=new Map(saved.slice(-100))}catch{}})();await ready;
  const old=cache.get(key);const usable=old?.data&&now()-old.at<7*86400000;
  if(old&&old.expires>now()){if(!old.data)throw Error(old.error||'MyDramaList is temporarily unavailable.');return {data:old.data,status:old.error?'stale':'cached',warning:old.error};}
  if(pending.has(key))return pending.get(key);
  if(active>=3)throw Error('People lookup is busy. Please try again shortly.');
  if(now()-windowAt>=60000){windowAt=now();requests=0}if(requests>=60)throw Error('People request limit reached. Please try again shortly.');
  const p=(async()=>{active++;requests++;let entry:Entry;
   try{let data:any;
    try{data=await kuryana(url,{fetcher,timeoutMs:8000,maxBytes:4000000});}
    catch(e){if(e instanceof KuryanaError)throw Error(e.status===404?'Person not found. Check the link.':'MyDramaList could not be retrieved (HTTP '+e.status+').');throw e;}
    entry={data:await parse(data),at:now(),expires:now()+ttl};
   }catch(e){const error=e instanceof Error&&e.name!=='TimeoutError'&&e.name!=='AbortError'?e.message:'MyDramaList took too long. Please try again.';entry={data:usable?old!.data:null,at:usable?old!.at:now(),expires:now()+30000,error};}finally{active--}
   cache.delete(key);cache.set(key,entry);while(cache.size>100)cache.delete(cache.keys().next().value!);
   if(storage){const snapshot=[...cache];saving=saving.catch(()=>{}).then(async()=>{await storage.save(snapshot)});await bounded(saving).catch(()=>{})}
   if(!entry.data)throw Error(entry.error);return {data:entry.data,status:entry.error?'stale':'live',warning:entry.error};
  })().finally(()=>pending.delete(key));pending.set(key,p);return p;
 }
 return {
  async person(raw:string){const url=personUrl(raw);if(!url)throw Error('Enter a valid HTTPS MyDramaList person link.');const id=url.match(/\/people\/(\d+)-/)![1];const slug=url.slice(url.indexOf('/people/')+8);return page('person:'+id,'/v2/people/'+encodeURIComponent(slug),data=>withTmdbCredits(personFromKuryana(data,url),fetcher),6*3600000)},
  async search(query:string,pageNumber:number){return page('search:'+query.toLowerCase()+':'+pageNumber,'/v2/search?q='+encodeURIComponent(query)+'&page='+pageNumber,data=>peopleSearchFromKuryana(data,pageNumber),300000)}
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
   const matched=await Promise.all(data.items.slice(Number(offset),Number(offset)+5).map(item=>collections.artwork({...item,details:item.type+' - '+(item.year||'')})));
   // Kuryana's credits carry no pictures, and TMDB cannot match every title (older Japanese
   // specials in particular), so fall back to the title's own MyDramaList poster.
   const items=await Promise.all(matched.map(async(item:any)=>{if(item.poster||!/^\d+$/.test(String(item.id)))return item;const poster=await mdlPoster(item.url);return poster?{...item,poster,posterSource:'MyDramaList'}:item}));
   return Response.json({items:items.map(({id,poster,posterSource})=>({id,poster,posterSource:posterSource||'MyDramaList'}))},{headers:{'cache-control':'no-store'}});
  }
  if(u.pathname==='/api/mdl/filmography')return Response.json({...makeFilmography(result.data,mode as Mode),person:personSummary(result.data),status:result.status,warning:result.warning},{headers:{'cache-control':'no-store'}});
  return Response.json({person:personSummary(result.data),status:result.status,warning:result.warning},{headers:{'cache-control':'no-store'}});
 }catch(e){return fail(e instanceof Error?e.message:'Unable to load MyDramaList.',502)}
}
