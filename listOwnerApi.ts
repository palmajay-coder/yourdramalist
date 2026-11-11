import { load } from "npm:cheerio@1.0.0";
import { kuryana } from "./kuryana.ts";
export function listUrl(raw: string): string | null {
 try {const u=new URL(raw);return u.protocol==='https:'&&['mydramalist.com','www.mydramalist.com'].includes(u.hostname)&&!u.port&&!u.username&&!u.password&&/^\/list\/[A-Za-z0-9_-]{1,80}\/?$/.test(u.pathname)&&!/^\/list\/create\/?$/i.test(u.pathname)?'https://mydramalist.com'+u.pathname.replace(/\/$/,''):null;}catch{return null}
}
export function extractListOwner(html: string, expected: string) {
 const $=load(html);
 if(listUrl($('link[rel="canonical"]').attr('href')||'')!==expected)throw Error('Unexpected list page');
 const owners=$('.last-updated a[href]').toArray().map(el=>{
 try{const u=new URL($(el).attr('href')!,'https://mydramalist.com');const m=u.pathname.match(/^\/profile\/([A-Za-z0-9_-]{1,60})\/?$/);
 if(u.origin!=='https://mydramalist.com'||u.username||u.password||!m)return null;
 return {profile:m[1],profileName:$(el).text().replace(/\s+/g,' ').trim()||m[1]};}catch{return null}
 }).filter(Boolean);
 const unique=new Map(owners.map(o=>[o!.profile,o!]));
 if(unique.size!==1)throw Error('List creator unavailable');
 return [...unique.values()][0];
}
type Owner=ReturnType<typeof extractListOwner>;
const cache=new Map<string,{owner:Owner|null,expires:number}>();
const pending=new Map<string,Promise<Owner|null>>();
let active=0,windowAt=Date.now(),count=0;
async function resolve(url:string):Promise<Owner|null>{
 const hit=cache.get(url);if(hit&&hit.expires>Date.now())return hit.owner;
 if(pending.has(url))return pending.get(url)!;
 if(active>=3)return null;
 if(Date.now()-windowAt>=60000){windowAt=Date.now();count=0}if(count>=60)return null;
 const p=(async()=>{active++;count++;let owner:Owner|null=null;
 try{
 const listId=new URL(url).pathname.split('/')[2];
 const data=await kuryana(`/v2/lists/${encodeURIComponent(listId)}?page=1`,{timeoutMs:8000});
 const who=data?.author&&typeof data.author==='object'?data.author:null;const slug=String(who?.slug||who?.id||'');
 if(/^[A-Za-z0-9_-]{1,60}$/.test(slug))owner={profile:slug,profileName:String(who?.name||slug).replace(/\s+/g,' ').trim()||slug};
 }catch{}finally{active--}
 cache.delete(url);cache.set(url,{owner,expires:Date.now()+(owner?21600000:300000)});while(cache.size>200)cache.delete(cache.keys().next().value!);
 return owner;
 })().finally(()=>pending.delete(url));pending.set(url,p);return p;
}
export async function handleListOwner(req:Request){
 if(req.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
 const url=listUrl(new URL(req.url).searchParams.get('url')||'');if(!url)return Response.json({error:'Provide a MyDramaList list URL.'},{status:400});
 const owner=await resolve(url);return Response.json(owner??{error:'List creator is temporarily unavailable.'},{status:owner?200:503,headers:{'cache-control':'no-store'}});
}
