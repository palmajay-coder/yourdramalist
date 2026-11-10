import {betterPostersPattern,posterPlusPattern,posterPlusImageUrl,rpdbApiKey,rpdbPosterUrl,normalizePreferences,preferenceIssue,MAX_CATALOGS,MAX_MANIFEST_TOKEN} from './preferences.ts';
import {normalizeTitle,weeklyCatalog} from './collections.ts';
import {collections} from './collectionService.ts';
import {exploreCatalog} from './explore.ts';
import {personUrl} from './people.ts';
import {handlePeople} from './peopleApi.ts';
import {loadWatchlist,loadWatchlistCategory,loadMDLTitlePoster,WATCHLIST_CARDS} from './addonScrape.ts';
import {Ee,X,G,K,Je,Te} from './addonCore.ts';
import {APP_VERSION} from './text.ts';
import {ADDON_ICON_URL} from './addonIcon.ts';
import {localizedCatalogName} from './catalogLabels.ts';
import {recordAnalytics,recordErrorLog} from './analyticsApi.ts';
import {normalizeShelfFilter,shelfFilterLabel,shelfFilterKey,shelfNeedsFacts,applyShelfFilter,type ShelfFilter} from './shelfFilters.ts';
import {getTitleFacts} from './titleFacts.ts';
import {popularity,personPicks,visitorAddress} from './popularity.ts';
import {firstReviewAsk} from './reviewDedupe.ts';
type Entry={id:string;name:string;type:'series'|'movie';filter?:ShelfFilter;filterLabel?:string;watchlist?:string;watchlistStatus?:string;watchlistAll?:boolean;weekly?:{country:string;slot:number};explore?:{category:string;country:string};person?:string;mode?:'actor'|'director'};
type ConfigIssue = 'catalog-count' | 'catalog-entry' | 'duplicate-catalog' | 'preferences';
class InvalidConfig extends Error {
 constructor(readonly issue: ConfigIssue) { super(issue); }
}
/** Adds a validated shelf filter to a watchlist or list entry, with its own catalog id and label. */
function withFilter(entry:Entry,raw:unknown):Entry{
 const filter=entry.watchlistAll?null:normalizeShelfFilter(raw);if(!filter)return entry;
 const label=shelfFilterLabel(filter),suffix=': '+label;
 const name=entry.name.endsWith(suffix)?entry.name.slice(0,-suffix.length).trim()||entry.name:entry.name;
 return{...entry,id:entry.id+':f'+shelfFilterKey(filter),name,filter,filterLabel:label};
}
export function normalizeAddon(body:any){
 if(!body||!Array.isArray(body.catalogs)||!body.catalogs.length||body.catalogs.length>MAX_CATALOGS)throw new InvalidConfig('catalog-count');
 const preferences=normalizePreferences(body.preferences),user=/^[a-zA-Z0-9_-]{1,60}$/.test(body.user||'')?body.user:'';
 const keys={tmdb:String(body.keys?.tmdb||'').trim(),mdblist:String(body.keys?.mdblist||'').trim()};
 const betterPosters=betterPostersPattern(body.betterPosters);
 const posterPlus=posterPlusPattern(body.posterPlus);
 const rpdb = body.rpdb && typeof body.rpdb === 'object' ? rpdbApiKey(body.rpdb.apiKey) : '';
 if((body.betterPosters && (!betterPosters || preferences.posters || posterPlus || rpdb)) || (body.posterPlus && (!posterPlus || preferences.posters || betterPosters || rpdb)) || (body.rpdb && (!rpdb || preferences.posters || betterPosters || posterPlus)) || preferenceIssue(preferences,keys))throw new InvalidConfig('preferences');
 const entries:Entry[]=body.catalogs.map((item:any)=>{
  const name=String(item.name||'').trim().slice(0,180);if(!name)throw new InvalidConfig('catalog-entry');
  if(item.kind==='weekly'){const c=weeklyCatalog(item.country,item.slot);return{id:c.url,name:c.name,type:'series',weekly:{country:item.country,slot:item.slot}};}
  if(item.kind==='explore'){const catalog=exploreCatalog(item.category,item.country||'');return{id:catalog.url,name,type:catalog.types[0],explore:{category:item.category,country:item.country||''}};}
  if(item.kind==='filmography'){const person=personUrl(item.personUrl);if(!person||!['actor','director'].includes(item.mode))throw new InvalidConfig('catalog-entry');return{id:'person:'+item.mode+':'+person.split('/').pop(),person,mode:item.mode,name,type:'series'};}
  const source=String(item.url||'');let id='';
  if(/^d\.[1-5]\.[a-zA-Z0-9_-]{1,60}$/.test(source))id=source;
  else{let u:URL;try{u=new URL(source)}catch{throw new InvalidConfig('catalog-entry')};if(!['mydramalist.com','www.mydramalist.com'].includes(u.hostname)||!['https:','http:'].includes(u.protocol))throw new InvalidConfig('catalog-entry');const watchlist=u.pathname.match(/^\/dramalist\/([a-zA-Z0-9_-]{1,60})(?:\/([a-z_]+))?\/?$/);if(watchlist){const username=watchlist[1].toLowerCase();const status=watchlist[2];if(status&&!WATCHLIST_CARDS.some(([key])=>key===status))throw new InvalidConfig('catalog-entry');return withFilter({id:'watchlist:'+username+(status?':'+status:''),name,type:'series',watchlist:username,...(status?{watchlistStatus:status}:{watchlistAll:true})},item.filter);}const match=u.pathname.match(/^\/list\/([a-zA-Z0-9]{4,20})\/?$/);if(match)id=match[1];else throw new InvalidConfig('catalog-entry');}
  return withFilter({id,name,type:'series'},item.filter);
 });
 if(new Set(entries.map(x=>x.id)).size!==entries.length)throw new InvalidConfig('duplicate-catalog');
 return{entries,user,preferences,...(betterPosters?{betterPosters}:{}),...(posterPlus?{posterPlus}:{}),...(rpdb?{rpdb:{apiKey:rpdb}}:{}),keys:preferences.posters?keys:{tmdb:'',mdblist:''}};
}
export type AddonConfig=ReturnType<typeof normalizeAddon>;
const encode=(value:Uint8Array)=>btoa(String.fromCharCode(...value)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=(value:string)=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export function createTokenCodec(secret:string){
 if(!/^[a-f0-9]{64}$/i.test(secret))throw Error('Manifest encryption is not configured');
 const key=crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g)!,x=>parseInt(x,16)),'AES-GCM',false,['encrypt','decrypt']);
 return{async seal(value:AddonConfig){const iv=crypto.getRandomValues(new Uint8Array(12));const data=new TextEncoder().encode(JSON.stringify(value));const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key,data));return encode(iv)+'.'+encode(encrypted);},async open(token:string):Promise<AddonConfig>{if(token.length>24000||!/^[-\w]+\.[-\w]+$/.test(token))throw Error('token');const[iv,data]=token.split('.');const value=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv)},await key,decode(data))));if(!value.entries?.length||value.entries.length>MAX_CATALOGS)throw Error('token');return value;}};
}
let codec:ReturnType<typeof createTokenCodec>;
function tokens(){return codec??=createTokenCodec(Deno.env.get('YDL_MANIFEST_SECRET')||'');}
export function makeManifest(config:AddonConfig){const language=config.preferences.metadataProvider==='tmdb'?config.preferences.tmdbLanguage:'en-US';return{id:'community.yourdramalist.v3',version:APP_VERSION,name:'YourDramaList',description:'Your MyDramaList catalogs, ratings and reviews for Nuvio.',logo:ADDON_ICON_URL,types:['series','movie'],resources:['catalog',...(config.preferences.reviews?[{name:'stream',types:['series','movie'],idPrefixes:['tt']}]:[])],catalogs:config.entries.map((e,i)=>({id:'ydl_'+i,type:e.type,name:localizedCatalogName(e,language)+(e.filterLabel?': '+e.filterLabel:''),extra:[{name:'skip',isRequired:false}]})),behaviorHints:{configurable:false}};}
const runtimeConfig=(config:AddonConfig)=>({user:config.user,flags:(config.preferences.reviews?'r':'')+(config.preferences.hideUnreleased?'u':'')+(config.preferences.hideCompleted&&config.user?'h':''),erdb:config.preferences.posters?{tmdbKey:config.keys.tmdb,mdblistKey:config.keys.mdblist,ratings:config.preferences.ratings.join(',')}:null});
// Which of the owner's public watchlist sections holds a title, e.g. "Plan to Watch". Uses the same 5-minute cache as the catalogs.
const STATUS_LABELS:Record<string,string>={1:'Currently Watching',2:'Completed',3:'Plan to Watch',4:'On Hold',5:'Dropped',6:'Undecided'};
export function listStatus(user:string,load=loadWatchlist){return async(slug:string)=>{const sections=await load(user.toLowerCase());for(const [id,items] of Object.entries(sections||{}))if(STATUS_LABELS[id]&&(items as any[]).some(x=>x.slug===slug))return STATUS_LABELS[id];return null}}
export async function loadCatalog(config:AddonConfig,index:number,skip:number,base:string,deps={source:X,people:handlePeople,map:Ee,hidden:Te,watchlistSections:loadWatchlist,watchlistCategory:loadWatchlistCategory,standardArtwork:collections.standardArtwork,mdlPoster:loadMDLTitlePoster}){
 const entry=config.entries[index];if(!entry)return{metas:[]};const runtime=runtimeConfig(config);
 const pattern=betterPostersPattern(config.betterPosters),plusPattern=posterPlusPattern(config.posterPlus),rpdbKey=rpdbApiKey((config as any).rpdb?.apiKey);
 // TMDB remains primary, with MDL filling in metadata TMDB does not provide.
 const metadataProvider=String((config.preferences as any).metadataProvider||"mdl");
 const tmdbMetadata=metadataProvider!=="mdl";
 const artworkMetadata={metadata:true,poster:false,descriptionSource:"tmdb",clearMissingMetadata:false,language:config.preferences.tmdbLanguage};
 function applyExternalPoster<T extends {id:string;poster?:string;type?:string}>(meta:T,item?:any):T {
  if(!/^tt\d+$/.test(meta.id))return meta;
  if(pattern){const url=pattern.replace("{imdb_id}",meta.id);return {...meta,poster:item?.slug&&item?.link?base+'/poster/'+meta.id+'.jpg?style=better&mdl='+encodeURIComponent(item.slug):url};}
  if(plusPattern)return {...meta,poster:posterPlusImageUrl(plusPattern,meta)};
  if(rpdbKey)return {...meta,poster:rpdbPosterUrl(rpdbKey,meta.id)};
  return meta;
 }
 if(entry.weekly){
  const data=await (deps as any).weekly?.(entry.weekly.country)??await collections.weekly(entry.weekly.country);
  let items=data.collections[entry.weekly.slot]?.items||[];
  if(config.preferences.hideCompleted&&config.user){
   const watched=await ((deps as any).watchlist||G)(config.user).catch(()=>({}));
   const hidden=[...(watched[2]||[]),...(watched[5]||[])];
   items=items.filter((item:any)=>!hidden.some((x:any)=>x.title&&normalizeTitle(x.title)===normalizeTitle(item.name)&&(!x.year||String(x.year)===item.date.slice(0,4))));
  }
  const metas=await ((deps as any).weeklyMetas||collections.metas)(items,base,config.preferences.posters);const page=metas.slice(skip,skip+30).map(applyExternalPoster);
  return{metas:tmdbMetadata&&deps.standardArtwork?await deps.standardArtwork(page,artworkMetadata):page};
 }
 let pool:any[];
 if(entry.person){const response=await deps.people(new Request('https://internal/api/mdl/filmography?mode='+entry.mode+'&url='+encodeURIComponent(entry.person)));if(!response.ok)throw Error('upstream');const result=await response.json();pool=result.items.map((x:any)=>({slug:x.url.split('/').pop(),title:x.name,type:x.type,year:x.year,image:x.poster,link:x.url}));}
 else if(entry.watchlist&&entry.watchlistStatus)pool=await (deps.watchlistCategory??loadWatchlistCategory)(entry.watchlist,entry.watchlistStatus);
 else if(entry.watchlist){
  const sections=await (deps.watchlistSections??loadWatchlist)(entry.watchlist);
  const seen=new Set<string>();
  if(config.preferences.hideCompleted&&config.user.toLowerCase()===entry.watchlist){
   for(const item of [...(sections[2]||[]),...(sections[5]||[])])seen.add(item.slug);
  }
  pool=Object.values(sections).flat().filter((item:any)=>item.slug&&!seen.has(item.slug)&&seen.add(item.slug));
 }
 else pool=(await deps.source(entry.id)).items;
 if(entry.filter&&!entry.person){
  // Same rules as the setup page preview. Genres come from saved TMDB lookups.
  const facts=shelfNeedsFacts(entry.filter,pool)?await ((deps as any).facts??getTitleFacts)(pool.slice(0,1000).map((x:any)=>({slug:x.slug,title:x.title,year:x.year,type:x.type,country:x.country})),{budgetMs:12000}).catch(()=>({})):{};
  pool=applyShelfFilter(pool,entry.filter,facts);
 }
 const hidden=['completed','dropped'].includes(entry.watchlistStatus||'')?new Set():await deps.hidden(runtime),year=new Date().getFullYear();
 pool=pool.filter(x=>!hidden.has(x.slug)&&(!config.preferences.hideUnreleased||!x.year||Number(x.year)<=year));
 const selected=pool.slice(skip,skip+30),metas:any[]=Array(selected.length);
 await Promise.all(['series','movie'].map(async type=>{const group=selected.map((item,i)=>({item,i})).filter(x=>K(x.item.type)===type);if(!group.length)return;const mapped=await deps.map(group.map(x=>x.item),type,runtime.erdb,!!entry.person);mapped.forEach((meta:any,i:number)=>{if(runtime.erdb&&meta?.poster&&/^tt\d+$/.test(meta.id))meta.poster=base+'/poster/'+meta.id+'.jpg?mdl='+encodeURIComponent(group[i].item.slug||'');metas[group[i].i]=meta;});}));
 const matched=metas.filter((x,i,a)=>x&&/^tt\d+$/.test(x.id)&&a.findIndex(y=>y?.id===x.id)===i);
 const standardPoster=!pattern&&!plusPattern&&!rpdbKey&&!runtime.erdb;
 const artwork=deps.standardArtwork&&(standardPoster||tmdbMetadata)?await deps.standardArtwork(matched,{...artworkMetadata,metadata:tmdbMetadata,poster:standardPoster}):matched;
 const itemById=new Map(metas.map((meta,i)=>[meta?.id,selected[i]]));
 const result=artwork.map(meta=>applyExternalPoster(meta,itemById.get(meta.id)));
 if(standardPoster&&deps.mdlPoster){
  const itemById=new Map(metas.map((meta,i)=>[meta?.id,selected[i]]));
  const missing=result.map(meta=>({meta,item:itemById.get(meta.id)})).filter(x=>!x.meta.poster&&x.item?.link).slice(0,5);
  let cursor=0;
  await Promise.all(Array.from({length:Math.min(2,missing.length)},async()=>{while(cursor<missing.length){const {meta,item}=missing[cursor++];meta.poster=await deps.mdlPoster(item).catch(()=>null);}}));
 }
 return{metas:result.filter(x=>x.poster)};
}
let created:number[]=[];
/** Runs up to `max` catalog loads at once; later requests wait briefly instead of failing with "busy". */
export function createRequestLimiter(max=4,maxWaiting=40,waitMs=15000){
 let active=0;const waiting:Array<()=>void>=[];
 return{
  acquire():Promise<boolean>{
   if(active<max){active++;return Promise.resolve(true);}
   if(waiting.length>=maxWaiting)return Promise.resolve(false);
   return new Promise(resolve=>{const start=()=>{clearTimeout(timer);active++;resolve(true);};const timer=setTimeout(()=>{const i=waiting.indexOf(start);if(i>=0)waiting.splice(i,1);resolve(false);},waitMs);waiting.push(start);});
  },
  release(){active--;waiting.shift()?.();},
  stats(){return{active,waiting:waiting.length};},
 };
}
const catalogLimiter=createRequestLimiter();
async function readLimited(body:ReadableStream<Uint8Array>|null,limit:number){if(!body)throw Error('body');const reader=body.getReader(),parts:Uint8Array[]=[];let size=0;try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>limit)throw RangeError('size');parts.push(r.value);}}finally{await reader.cancel().catch(()=>{});}const out=new Uint8Array(size);let at=0;for(const part of parts){out.set(part,at);at+=part.length;}return out;}
export async function handleAddon(req:Request){
 const u=new URL(req.url),headers={'cache-control':'no-store','referrer-policy':'no-referrer'},fail=(error:string,status=400)=>Response.json({error},{status,headers});
 if(u.pathname==='/api/addon/configure'){
  const diagnose=async(error:string,status:number,category:string=error)=>{
   const diagnosticCode='YDL-'+crypto.randomUUID().slice(0,8).toUpperCase();
   await recordAnalytics('manifest.error',category);
   await recordErrorLog({code:diagnosticCode,kind:'setup',category});
   console.warn(JSON.stringify({diagnosticCode,timestamp:new Date().toISOString(),category}));
   // Size limits are safe to name, so the setup page can tell users what to change.
   const issue=category==='catalog-count'||category==='token-too-large'?{issue:category}:{};
   return Response.json({error,diagnosticCode,...issue},{status,headers});
  };
  if(req.method!=='POST')return diagnose('method',405);
  if(req.headers.get('origin')!==u.origin)return diagnose('origin',403);
  if(!req.headers.get('content-type')?.startsWith('application/json'))return diagnose('format',415);
  created=created.filter(t=>t>Date.now()-60000);if(created.length>=30)return diagnose('limit',429,'rate-limit');
  if(Number(req.headers.get('content-length'))>32000)return diagnose('size',413,'request-too-large');
  let body:unknown;
  try{body=JSON.parse(new TextDecoder().decode(await readLimited(req.body,32000)));}
  catch(error){return error instanceof RangeError?diagnose('size',413,'request-too-large'):diagnose('configuration',400,'invalid-request-body');}
  let config:AddonConfig;
  try{config=normalizeAddon(body);}
  catch(error){return diagnose('configuration',400,error instanceof InvalidConfig?error.issue:'catalog-entry');}
  created.push(Date.now());
  try{
   const token=await tokens().seal(config);
   // Val Town rejects request paths near 14,500 characters, so refuse links Nuvio could not load.
   if(token.length>MAX_MANIFEST_TOKEN)return diagnose('configuration',400,'token-too-large');
   // Each person counts once per category: the catalogs and features in this link, and their device type.
   const scopes:string[]=[];
   for(const entry of config.entries){
    if(entry.weekly)scopes.push(`catalog.selected:weekly:${entry.weekly.slot}`);
    else if(entry.explore)scopes.push(`catalog.selected:explore:${entry.explore.category}:${entry.explore.country||'all'}`);
    else if(entry.person)scopes.push('feature.selected:'+(entry.mode==='director'?'director-filmography':'actor-filmography'));
    else if(entry.watchlist)scopes.push('feature.selected:'+(entry.watchlistAll?'community-combined-watchlist':'community-watchlist'));
    else scopes.push('feature.selected:community-public-list');
    if(entry.filter)scopes.push('feature.selected:filtered-catalog');
   }
   const prefs=config.preferences as any;
   scopes.push('feature.selected:'+(prefs.metadataProvider==='tmdb'?'metadata-tmdb':'metadata-mdl'));
   scopes.push('feature.selected:'+(config.posterPlus?'posters-poster-plus':config.betterPosters?'posters-betterposters':(config as any).rpdb?'posters-rpdb':prefs.posters?'posters-easyposters':'posters-tmdb'));
   for(const [enabled,category] of [[prefs.reviews,'reviews'],[prefs.hideUnreleased,'hide-unreleased'],[prefs.hideCompleted,'hide-completed']] as [boolean,string][]){if(enabled)scopes.push('feature.selected:'+category);}
   await popularity.recordManifest(req,scopes,personPicks(config.entries,(body as any)?.catalogs));
   return Response.json({url:u.origin+'/addon/'+token+'/manifest.json'},{headers});
  }catch{return diagnose('configuration',400,'manifest-generation');}
 }
 if(req.method==='OPTIONS')return new Response(null,{status:204});
 if(req.method!=='GET'&&req.method!=='HEAD')return fail('method',405);
 const parts=u.pathname.split('/').filter(Boolean);if(parts[0]!=='addon'||parts.length<3)return fail('path',404);
 let config:AddonConfig;try{config=await tokens().open(parts[1]);}catch{return fail('configuration',404);}
 if(parts[2]==='manifest.json'&&parts.length===3)return Response.json(makeManifest(config),{headers});
 if(!await catalogLimiter.acquire())return fail('busy',429);
 try{
  if(parts[2]==='catalog'&&parts.length>=5){const id=parts[4].replace(/\.json$/,''),match=id.match(/^ydl_(\d+)$/);if(!match)return fail('catalog',404);const i=Number(match[1]);if(config.entries[i]?.type!==parts[3])return fail('catalog',404);const extra=new URLSearchParams(decodeURIComponent((parts[5]||'').replace(/\.json$/,'')));const raw=extra.get('skip')||u.searchParams.get('skip')||'0';if(!/^\d{1,5}$/.test(raw))return fail('skip');return Response.json(await loadCatalog(config,i,Number(raw),u.origin+'/addon/'+parts[1]),{headers});}
  if(parts[2]==='stream'&&parts.length===5&&config.preferences.reviews&&['series','movie'].includes(parts[3])){const title=parts[4].replace(/\.json$/,'');if(!await firstReviewAsk(visitorAddress(req),title,parts[1]))return Response.json({streams:[]},{headers});return Response.json(await Je(parts[3],parts[4].replace(/\.json$/,''),config.user?listStatus(config.user):undefined),{headers});}
if(parts[2]==='poster'&&parts.length===4&&u.searchParams.get('style')==='better'&&config.betterPosters&&/^tt\d+\.jpg$/.test(parts[3])){const fallback=async()=>{const slug=u.searchParams.get('mdl')||'';if(!/^\d+-[a-z0-9-]+$/i.test(slug))return null;const poster=await loadMDLTitlePoster({slug});if(!poster)return null;const response=await fetch(poster,{signal:AbortSignal.timeout(10000),redirect:'follow'});if(!response.ok||!/^image\/(jpeg|png|webp)/.test(response.headers.get('content-type')||'')){await response.body?.cancel();return null;}return new Response(await readLimited(response.body,3000000),{headers:{...headers,'content-type':response.headers.get('content-type')!,'x-content-type-options':'nosniff'}});};try{const source=config.betterPosters.replace('{imdb_id}',parts[3].replace(/\.jpg$/,''));const image=await fetch(source,{signal:AbortSignal.timeout(12000),redirect:'follow'});if(!image.ok||!/^image\/(jpeg|png|webp)/.test(image.headers.get('content-type')||'')){await image.body?.cancel();throw Error('upstream');}return new Response(await readLimited(image.body,3000000),{headers:{...headers,'content-type':image.headers.get('content-type')!,'x-content-type-options':'nosniff'}});}catch{const image=await fallback();if(image)return image;throw Error('upstream');}}

  if(parts[2]==='poster'&&parts.length===4&&config.preferences.posters&&/^tt\d+\.jpg$/.test(parts[3])){const fallback=async()=>{const slug=u.searchParams.get('mdl')||'';if(!/^\d+-[a-z0-9-]+$/i.test(slug))return null;const poster=await loadMDLTitlePoster({slug});if(!poster)return null;const response=await fetch(poster,{signal:AbortSignal.timeout(10000),redirect:'error'});if(!response.ok||!/^image\/(jpeg|png|webp)/.test(response.headers.get('content-type')||'')){await response.body?.cancel();return null;}return new Response(await readLimited(response.body,3000000),{headers:{...headers,'content-type':response.headers.get('content-type')!,'x-content-type-options':'nosniff'}});};const query=new URLSearchParams({ratings:config.preferences.ratings.join(','),posterRatingsLayout:'bottom',posterStreamBadges:'off',lang:'en',tmdbKey:config.keys.tmdb,mdblistKey:config.keys.mdblist});try{const image=await fetch('https://dmaxg-dynrat.hf.space/poster/'+parts[3]+'?'+query,{signal:AbortSignal.timeout(12000),redirect:'error'});if(!image.ok||!/^image\/(jpeg|png|webp)/.test(image.headers.get('content-type')||'')){await image.body?.cancel();throw Error('upstream');}return new Response(await readLimited(image.body,3000000),{headers:{...headers,'content-type':image.headers.get('content-type')!,'x-content-type-options':'nosniff'}});}catch{const image=await fallback();if(image)return image;throw Error('upstream');}}
  return fail('path',404);
 }catch(error){if((error as {code?:string})?.code==='PRIVATE')return fail('This MyDramaList list is private or unavailable.',404);return fail('MyDramaList or a rating provider is temporarily unavailable. Please try again.',502);}finally{catalogLimiter.release();}
}
