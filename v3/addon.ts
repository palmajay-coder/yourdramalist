import {normalizePreferences,preferenceIssue} from './preferences.ts';
import {exploreCatalog} from './explore.ts';
import {personUrl} from './people.ts';
import {handlePeople} from './peopleApi.ts';
import {Ee,X,K,Je,Te} from './addonCore.ts';
import {APP_VERSION} from './text.ts';
import {ADDON_ICON_URL} from './addonIcon.ts';
type Entry={id:string;name:string;type:'series'|'movie';person?:string;mode?:'actor'|'director'};
export function normalizeAddon(body:any){
 if(!body||!Array.isArray(body.catalogs)||!body.catalogs.length||body.catalogs.length>40)throw Error('catalogs');
 const preferences=normalizePreferences(body.preferences),user=/^[a-zA-Z0-9_-]{1,60}$/.test(body.user||'')?body.user:'';
 const keys={tmdb:String(body.keys?.tmdb||'').trim(),mdblist:String(body.keys?.mdblist||'').trim()};
 if(preferenceIssue(preferences,keys))throw Error('preferences');
 const entries:Entry[]=body.catalogs.map((item:any)=>{
  const name=String(item.name||'').trim().slice(0,180);if(!name)throw Error('catalogs');
  if(item.kind==='explore'){const catalog=exploreCatalog(item.category,item.country||'');return{id:catalog.url,name,type:catalog.types[0]};}
  if(item.kind==='filmography'){const person=personUrl(item.personUrl);if(!person||!['actor','director'].includes(item.mode))throw Error('catalogs');return{id:'person:'+item.mode+':'+person.split('/').pop(),person,mode:item.mode,name,type:'series'};}
  const source=String(item.url||'');let id='';
  if(/^d\.[1-5]\.[a-zA-Z0-9_-]{1,60}$/.test(source))id=source;
  else{let u:URL;try{u=new URL(source)}catch{throw Error('catalogs')};if(!['mydramalist.com','www.mydramalist.com'].includes(u.hostname)||!['https:','http:'].includes(u.protocol))throw Error('catalogs');const match=u.pathname.match(/^\/list\/([a-zA-Z0-9]{4,20})\/?$/);if(match)id=match[1];else throw Error('catalogs');}
  return{id,name,type:'series'};
 });
 if(new Set(entries.map(x=>x.id)).size!==entries.length)throw Error('catalogs');
 return{entries,user,preferences,keys:preferences.posters?keys:{tmdb:'',mdblist:''}};
}
export type AddonConfig=ReturnType<typeof normalizeAddon>;
const encode=(value:Uint8Array)=>btoa(String.fromCharCode(...value)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=(value:string)=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export function createTokenCodec(secret:string){
 if(!/^[a-f0-9]{64}$/i.test(secret))throw Error('Manifest encryption is not configured');
 const key=crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g)!,x=>parseInt(x,16)),'AES-GCM',false,['encrypt','decrypt']);
 return{async seal(value:AddonConfig){const iv=crypto.getRandomValues(new Uint8Array(12));const data=new TextEncoder().encode(JSON.stringify(value));const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key,data));return encode(iv)+'.'+encode(encrypted);},async open(token:string):Promise<AddonConfig>{if(token.length>24000||!/^[-\w]+\.[-\w]+$/.test(token))throw Error('token');const[iv,data]=token.split('.');const value=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv)},await key,decode(data))));if(!value.entries?.length||value.entries.length>40)throw Error('token');return value;}};
}
let codec:ReturnType<typeof createTokenCodec>;
function tokens(){return codec??=createTokenCodec(Deno.env.get('YDL_MANIFEST_SECRET')||'');}
export function makeManifest(config:AddonConfig){return{id:'community.yourdramalist.v3',version:APP_VERSION,name:'YourDramaList',description:'Your MyDramaList catalogs, ratings and reviews for Nuvio.',logo:ADDON_ICON_URL,types:['series','movie'],resources:['catalog',...(config.preferences.reviews?[{name:'stream',types:['series','movie'],idPrefixes:['tt']}]:[])],catalogs:config.entries.map((e,i)=>({id:'ydl_'+i,type:e.type,name:e.name,extra:[{name:'skip',isRequired:false}]})),behaviorHints:{configurable:false}};}
const runtimeConfig=(config:AddonConfig)=>({user:config.user,flags:(config.preferences.reviews?'r':'')+(config.preferences.hideUnreleased?'u':'')+(config.preferences.hideCompleted&&config.user?'h':''),erdb:config.preferences.posters?{tmdbKey:config.keys.tmdb,mdblistKey:config.keys.mdblist,ratings:config.preferences.ratings.join(',')}:null});
export async function loadCatalog(config:AddonConfig,index:number,skip:number,base:string,deps={source:X,people:handlePeople,map:Ee,hidden:Te}){
 const entry=config.entries[index];if(!entry)return{metas:[]};const runtime=runtimeConfig(config);
 let pool:any[];
 if(entry.person){const response=await deps.people(new Request('https://internal/api/mdl/filmography?mode='+entry.mode+'&url='+encodeURIComponent(entry.person)));if(!response.ok)throw Error('upstream');const result=await response.json();pool=result.items.map((x:any)=>({slug:x.url.split('/').pop(),title:x.name,type:x.type,year:x.year,image:x.poster,link:x.url}));}
 else pool=(await deps.source(entry.id)).items;
 const hidden=await deps.hidden(runtime),year=new Date().getFullYear();
 pool=pool.filter(x=>!hidden.has(x.slug)&&(!config.preferences.hideUnreleased||!x.year||Number(x.year)<=year));
 const selected=pool.slice(skip,skip+30),metas:any[]=Array(selected.length);
 await Promise.all(['series','movie'].map(async type=>{const group=selected.map((item,i)=>({item,i})).filter(x=>K(x.item.type)===type);if(!group.length)return;const mapped=await deps.map(group.map(x=>x.item),type,runtime.erdb,!!entry.person);mapped.forEach((meta:any,i:number)=>{if(runtime.erdb&&meta?.poster&&/^tt\d+$/.test(meta.id))meta.poster=base+'/poster/'+meta.id+'.jpg';metas[group[i].i]=meta;});}));
 return{metas:metas.filter((x,i,a)=>x&&/^tt\d+$/.test(x.id)&&x.poster&&a.findIndex(y=>y?.id===x.id)===i)};
}
let active=0,created:number[]=[];
async function readLimited(body:ReadableStream<Uint8Array>|null,limit:number){if(!body)throw Error('body');const reader=body.getReader(),parts:Uint8Array[]=[];let size=0;try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>limit)throw Error('size');parts.push(r.value);}}finally{await reader.cancel().catch(()=>{});}const out=new Uint8Array(size);let at=0;for(const part of parts){out.set(part,at);at+=part.length;}return out;}
export async function handleAddon(req:Request){
 const u=new URL(req.url),headers={'cache-control':'no-store','referrer-policy':'no-referrer'},fail=(error:string,status=400)=>Response.json({error},{status,headers});
 if(u.pathname==='/api/addon/configure'){
  if(req.method!=='POST')return fail('method',405);
  if(req.headers.get('origin')!==u.origin)return fail('origin',403);
  if(!req.headers.get('content-type')?.startsWith('application/json'))return fail('format',415);
  created=created.filter(t=>t>Date.now()-60000);if(created.length>=30)return fail('limit',429);
  if(Number(req.headers.get('content-length'))>32000)return fail('size',413);
  try{const text=new TextDecoder().decode(await readLimited(req.body,32000));const config=normalizeAddon(JSON.parse(text));created.push(Date.now());const token=await tokens().seal(config);return Response.json({url:u.origin+'/addon/'+token+'/manifest.json'},{headers});}catch{return fail('configuration');}
 }
 if(req.method==='OPTIONS')return new Response(null,{status:204});
 if(req.method!=='GET'&&req.method!=='HEAD')return fail('method',405);
 const parts=u.pathname.split('/').filter(Boolean);if(parts[0]!=='addon'||parts.length<3)return fail('path',404);
 let config:AddonConfig;try{config=await tokens().open(parts[1]);}catch{return fail('configuration',404);}
 if(parts[2]==='manifest.json'&&parts.length===3)return Response.json(makeManifest(config),{headers});
 if(active>=4)return fail('busy',429);active++;
 try{
  if(parts[2]==='catalog'&&parts.length>=5){const id=parts[4].replace(/\.json$/,''),match=id.match(/^ydl_(\d+)$/);if(!match)return fail('catalog',404);const i=Number(match[1]);if(config.entries[i]?.type!==parts[3])return fail('catalog',404);const extra=new URLSearchParams(decodeURIComponent((parts[5]||'').replace(/\.json$/,'')));const raw=extra.get('skip')||u.searchParams.get('skip')||'0';if(!/^\d{1,5}$/.test(raw))return fail('skip');return Response.json(await loadCatalog(config,i,Number(raw),u.origin+'/addon/'+parts[1]),{headers});}
  if(parts[2]==='stream'&&parts.length===5&&config.preferences.reviews&&['series','movie'].includes(parts[3]))return Response.json(await Je(parts[3],parts[4].replace(/\.json$/,'')),{headers});
  if(parts[2]==='poster'&&parts.length===4&&config.preferences.posters&&/^tt\d+\.jpg$/.test(parts[3])){const query=new URLSearchParams({ratings:config.preferences.ratings.join(','),posterRatingsLayout:'bottom',posterStreamBadges:'off',lang:'en',tmdbKey:config.keys.tmdb,mdblistKey:config.keys.mdblist});const image=await fetch('https://dmaxg-dynrat.hf.space/poster/'+parts[3]+'?'+query,{signal:AbortSignal.timeout(12000),redirect:'error'});if(!image.ok){await image.body?.cancel();throw Error('upstream');}if(!/^image\/(jpeg|png|webp)/.test(image.headers.get('content-type')||'')){await image.body?.cancel();throw Error('upstream');}return new Response(await readLimited(image.body,3000000),{headers:{...headers,'content-type':image.headers.get('content-type')!,'x-content-type-options':'nosniff'}});}
  return fail('path',404);
 }catch{return fail('MyDramaList or a rating provider is temporarily unavailable. Please try again.',502);}finally{active--;}
}
