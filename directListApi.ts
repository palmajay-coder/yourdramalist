import {load} from "npm:cheerio@1.0.0";
import {blob} from "https://esm.town/v/std/blob/main.ts";
import {listUrl,extractListOwner} from './listOwnerApi.ts';
import {kuryana,KuryanaError} from './kuryana.ts';
function imageUrl(raw:string|undefined):string|null{try{const u=new URL(raw||'');return u.protocol==='https:'&&u.hostname==='i.mydramalist.com'&&!u.username&&!u.password&&!u.port?u.href:null}catch{return null}}
export function extractDirectList(html:string,url:string){
 const $=load(html);if(listUrl($('link[rel=canonical]').attr('href')||'')!==url)throw Error('MyDramaList returned an unexpected list page.');
 const heading=$('h1').first();const box=heading.closest('.box');const name=heading.text().replace(/\s+/g,' ').trim();
 if(!name||!box.find('.collection-list').length)throw Error('This public list could not be read. It may be private or unavailable.');
 let owner:{profile:string;profileName:string}|null=null;try{owner=extractListOwner(html,url)}catch{}
 const number=(raw:string)=>/^\d[\d,]*$/.test(raw.trim())?Number(raw.replace(/,/g,'')):null;
 const bars=box.find('> .box-body > .list-bars').first();
 const countText=bars.find('span').filter((_,e)=>$(e).find('i.fa-tv').length>0).first().text().trim().match(/^([\d,]+)\s+Titles?$/i)?.[1];
 const description=box.find('> .box-header .description').first().text().trim();
 const posters:string[]=[];box.find('.collection-list .film-cover img').each((_,e)=>{const image=$(e);const src=imageUrl(image.attr('data-src'))||imageUrl(image.attr('src'));if(src&&posters.length<5)posters.push(src)});
 return {url,listId:new URL(url).pathname.split('/')[2],name,description,posters,count:countText?number(countText):null,loves:number(bars.find('.like-cntb-nohl').first().text()),comments:null,...(owner||{}),profileAvatar:imageUrl(box.find('.list-author img').first().attr('src'))};
}
type List=ReturnType<typeof extractDirectList>;
// Kuryana version of extractDirectList (MyDramaList refuses cloud hosts). It returns the same
// fields; owner, loves and avatar are not available from Kuryana, and the UI already allows that.
export async function listFromKuryana(url:string,fetcher:typeof fetch):Promise<List>{
 const listId=new URL(url).pathname.split('/')[2];
 let first:any;
 try{first=await kuryana(`/v2/lists/${encodeURIComponent(listId)}?page=1`,{fetcher,timeoutMs:8000});}
 catch(e){if(e instanceof Error&&(e.name==='TimeoutError'||e.name==='AbortError'))throw e;if(e instanceof KuryanaError&&(e.status===404||e.status===400))throw Error('List not found, or it is private. Check the link.');throw Error('MyDramaList could not load this list. It may be private or temporarily unavailable.');}
 const name=String(first?.title||'').replace(/\s+/g,' ').trim();
 const items=(Array.isArray(first?.items)?first.items:[]).filter((x:any)=>x?.kind!=='person');
 if(!name)throw Error('This public list could not be read. It may be private or unavailable.');
 const posters:string[]=[];for(const item of items){const src=imageUrl(item?.image);if(src&&!posters.includes(src)&&posters.length<5)posters.push(src)}
 // Exact title count: all pages but the last are full, so count the last page too.
 const pages=Number(first?.pagination?.total_pages)||1;let count:number|null=pages<=1?items.length:null;
 if(pages>1){try{const last=await kuryana(`/v2/lists/${encodeURIComponent(listId)}?page=${pages}`,{fetcher,timeoutMs:8000});const lastItems=(Array.isArray(last?.items)?last.items:[]).filter((x:any)=>x?.kind!=='person');count=(pages-1)*items.length+lastItems.length}catch{count=null}}
 return {url,listId,name,description:String(first?.description||'').trim(),posters,count,loves:null,comments:null,profileAvatar:null} as any;
}
async function storageDeadline<T>(promise:Promise<T>):Promise<T|undefined>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([promise,new Promise<undefined>(resolve=>{timer=setTimeout(()=>resolve(undefined),1000)})])}finally{clearTimeout(timer)}
}
export function createDirectListService(fetcher:typeof fetch=fetch,now=Date.now,storage?:{load:()=>Promise<any>;save:(value:any)=>Promise<unknown>}){
 let cache=new Map<string,{data:List|null;expires:number;error?:string}>();
 let ready:Promise<void>|undefined;let saving=Promise.resolve();let active=0,windowAt=now(),count=0;const pending=new Map<string,Promise<any>>();
 async function get(url:string):Promise<any>{
 ready??=(async()=>{try{const values=storage?await storageDeadline(storage.load()):undefined;if(Array.isArray(values))cache=new Map(values.slice(-100))}catch{}})();await ready;
 const hit=cache.get(url);if(hit&&hit.expires>now())return hit.data?{list:hit.data,status:'cached'}:{error:hit.error,code:502};
 if(pending.has(url))return pending.get(url);
 if(active>=3)return {error:'List loading is busy. Please try again shortly.',code:429};
 if(now()-windowAt>=60000){windowAt=now();count=0}if(count>=30)return {error:'List request limit reached. Please try again shortly.',code:429};
 const p=(async()=>{active++;count++;let entry;
 try{
 entry={data:await listFromKuryana(url,fetcher),expires:now()+600000};
 }catch(e){entry={data:null,expires:now()+30000,error:e instanceof Error&&e.name!=='TimeoutError'&&e.name!=='AbortError'?e.message:'MyDramaList took too long. Please try again.'}}finally{active--}
 cache.delete(url);cache.set(url,entry);while(cache.size>100)cache.delete(cache.keys().next().value!);
 if(storage){const snapshot=[...cache];saving=saving.catch(()=>{}).then(async()=>{await storage.save(snapshot)});await storageDeadline(saving).catch(()=>{})}
 return entry.data?{list:entry.data,status:'live'}:{error:entry.error,code:502};
 })().finally(()=>pending.delete(url));pending.set(url,p);return p;
 }
 return get;
}
const get=createDirectListService(fetch,Date.now,{load:()=>blob.getJSON('direct-lists:v1'),save:value=>blob.setJSON('direct-lists:v1',value)});
export async function handleDirectList(req:Request){
 if(req.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
 const url=listUrl(new URL(req.url).searchParams.get('url')||'');if(!url)return Response.json({error:'Enter a valid HTTPS MyDramaList list link.'},{status:400});
 const result=await get(url);return Response.json(result,{status:result.code||200,headers:{'cache-control':'no-store'}});
}
