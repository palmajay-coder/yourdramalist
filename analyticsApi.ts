import {sqlite} from "https://esm.town/v/std/sqlite/main.ts";
import {pacificDate,pacificMidnight} from "./pacificTime.ts";
import {canEdit} from "./wallpaper.ts";
import {CATEGORIES,COUNTRIES} from "./explore.ts";
import {THEMES,themesForWeek,weekWindow} from "./collections.ts";
import {SETUP_ERRORS,POSTER_ERRORS,POSTER_PROVIDERS,type ErrorKind} from "./errorGuide.ts";

export type AnalyticsMetric = "manifest.generated" | "manifest.error" | "feature.selected" | "catalog.selected" | "catalog.added" | "poster.verify.error" | "people.generated" | "popular.catalog" | "popular.person";

export const ERROR_CATEGORIES = new Set([
  "method", "origin", "format", "rate-limit", "request-too-large", "invalid-request-body",
  "catalog-count", "preferences", "catalog-entry", "duplicate-catalog", "manifest-generation", "token-too-large",
]);
const FEATURE_CATEGORIES = new Set([
  "community-public-list", "community-watchlist", "community-combined-watchlist",
  "actor-filmography", "director-filmography", "reviews", "hide-unreleased", "hide-completed",
  "metadata-mdl", "metadata-tmdb", "posters-tmdb", "posters-easyposters", "posters-betterposters",
  "posters-poster-plus", "posters-rpdb", "filtered-catalog",
]);
const CATALOG_CATEGORIES = new Set([
  "weekly:0", "weekly:1",
  "explore:top-shows:all", "explore:popular-shows:all", "explore:newest-shows:all", "explore:upcoming-shows:all", "explore:airing-shows:all", "explore:variety-shows:all", "explore:top-movies:all", "explore:popular-movies:all", "explore:newest-movies:all", "explore:upcoming-movies:all",
  ...["1", "2", "3", "5", "6"].flatMap(country => ["top-shows", "popular-shows", "newest-shows", "upcoming-shows", "airing-shows", "variety-shows", "top-movies", "popular-movies", "newest-movies", "upcoming-movies"].map(category => `explore:${category}:${country}`)),
]);
const ADD_SOURCES = new Set(["popular-this-month","discover-drama-related","discover-actor-filmography","discover-director-filmography","discover-catalog","community-watchlist","community-public-list","community-direct-list","featured-list","weekly-picks"]);
export const POSTER_VERIFY_CATEGORIES = new Set([
  "unknown:invalid-input", "unknown:invalid-configuration", "unknown:request-limit", "unknown:request-size", "unknown:request-origin", "unknown:request-format", "unknown:request-method",
  ...["ratings", "better", "posterplus", "rpdb"].flatMap(provider => [
    `${provider}:invalid-credentials`, `${provider}:invalid-settings`, `${provider}:credentials-rejected`, `${provider}:provider-unavailable`,
    `${provider}:provider-response`, `${provider}:provider-rate-limit`, `${provider}:sample-poster-missing`,
    `${provider}:not-an-image`, `${provider}:request-limit`, `${provider}:client-network`,
  ]),
]);
// people.generated counts each person once a day; popular.* count each person once a day per catalog or per actor/director.
export const POPULAR_PERSON = /^[1-9]\d{0,11}-[a-z0-9-]{1,200}:(actor|director)$/i;
const valid = (metric:AnalyticsMetric, category:string) => metric === "manifest.generated" || metric === "people.generated" ? category === "all"
  : metric === "popular.catalog" ? CATALOG_CATEGORIES.has(category) && category.startsWith("explore:")
  : metric === "popular.person" ? POPULAR_PERSON.test(category)
  : metric === "manifest.error" ? ERROR_CATEGORIES.has(category)
  : metric === "feature.selected" ? FEATURE_CATEGORIES.has(category)
  : metric === "poster.verify.error" ? POSTER_VERIFY_CATEGORIES.has(category)
  : metric === "catalog.selected" ? CATALOG_CATEGORIES.has(category)
  : metric === "catalog.added" && ADD_SOURCES.has(category);

let schema:Promise<void>|undefined;
async function ready(){
  schema ??= sqlite.execute(`CREATE TABLE IF NOT EXISTS ydl_daily_analytics (
    day TEXT NOT NULL, metric TEXT NOT NULL, category TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(day, metric, category)
  )`).then(()=>{});
  try{await schema}catch(error){schema=undefined;throw error;}
  await sqlite.execute({sql:"DELETE FROM ydl_daily_analytics WHERE day < ?",args:[shiftDay(dayKey(),-180)]});
}
export function dayKey(now=Date.now()){
  return pacificDate(now).date.toISOString().slice(0,10);
}
export function shiftDay(day:string,delta:number){
  const [year,month,date]=day.split("-").map(Number);
  return new Date(Date.UTC(year,month-1,date+delta)).toISOString().slice(0,10);
}
export async function recordAnalytics(metric:AnalyticsMetric,category:string,count=1){
  await recordAnalyticsBatch([[metric,category,count]]);
}
export async function recordAnalyticsBatch(items:Array<[AnalyticsMetric,string,number]>){
  const counts=new Map<string,{metric:AnalyticsMetric;category:string;count:number}>();
  for(const [metric,category,count] of items){
    if(!valid(metric,category)||!Number.isSafeInteger(count)||count<1||count>40)continue;
    const key=metric+"\u0000"+category,prior=counts.get(key);
    counts.set(key,{metric,category,count:count+(prior?.count||0)});
  }
  if(!counts.size)return;
  try{
    await ready();
    const day=dayKey();
    await sqlite.batch([...counts.values()].map(({metric,category,count})=>({sql:`INSERT INTO ydl_daily_analytics(day,metric,category,count) VALUES(?,?,?,?)
      ON CONFLICT(day,metric,category) DO UPDATE SET count=count+excluded.count`,args:[day,metric,category,count]})));
  }catch{/* Analytics storage must never prevent a manifest or UI request from succeeding. */}
}

export async function adminAnalytics(req:Request,session:any){
  if(!canEdit(session))return Response.json({error:session?.user?"Only the site owner can view analytics.":"Sign in to view analytics."},{status:session?.user?403:401,headers:{"cache-control":"no-store"}});
  if(req.method!=="GET")return Response.json({error:"Method not allowed"},{status:405,headers:{"cache-control":"no-store"}});
  try{
    await ready();
    const start=shiftDay(dayKey(),-29);
    const result=await sqlite.execute({sql:"SELECT day, metric, category, count FROM ydl_daily_analytics WHERE day >= ? ORDER BY day ASC",args:[start]});
    const rows=(result.rows||[]).map((row:any)=>({...row,label:analyticsCategoryLabel(String(row.category))}));
    return Response.json({days:30,timezone:"America/Los_Angeles",rows},{headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});
  }catch{return Response.json({error:"Analytics are temporarily unavailable."},{status:503,headers:{"cache-control":"no-store"}});}
}

/** Weekly picks rotation for the admin page: recent and upcoming weeks, and every theme with when it ran and how many
 * times people added it. Adds count generated manifests that include each weekly row during that week. */
export async function adminWeekly(req:Request,session:any,now=Date.now()){
  const headers={"cache-control":"no-store","x-content-type-options":"nosniff"};
  if(!canEdit(session))return Response.json({error:session?.user?"Only the site owner can view the rotation.":"Sign in to view the rotation."},{status:session?.user?403:401,headers});
  if(req.method!=="GET")return Response.json({error:"Method not allowed"},{status:405,headers});
  const current=weekWindow(now).index,startOf=(index:number)=>new Date(Date.UTC(2026,10,2)+index*604800000).toISOString().slice(0,10);
  let rows:any[]=[];
  try{await ready();rows=(await sqlite.execute({sql:"SELECT day, category, count FROM ydl_daily_analytics WHERE metric = 'catalog.selected' AND category IN ('weekly:0','weekly:1') AND day >= ?",args:[startOf(0)]})).rows||[];}catch{/* Show the schedule without adds. */}
  const addsFor=(index:number,slot:number)=>{const from=startOf(index),to=startOf(index+1);return rows.filter((r:any)=>r.category==="weekly:"+slot&&r.day>=from&&r.day<to).reduce((n:number,r:any)=>n+Number(r.count||0),0)};
  const weeks=[];
  for(let index=Math.max(0,current-4);index<=current+8;index++)weeks.push({week:startOf(index),current:index===current,past:index<current,themes:themesForWeek(index).map((t,slot)=>({name:t.name,adds:index<=current?addsFor(index,slot):null}))});
  const themes=THEMES.map(t=>{
    const ran:number[]=[];for(let index=0;index<=current;index++)if(themesForWeek(index).some(x=>x.name===t.name))ran.push(index);
    let next=null;for(let index=current+1;index<=current+60;index++)if(themesForWeek(index).some(x=>x.name===t.name)){next=startOf(index);break}
    const adds=ran.reduce((n,index)=>n+addsFor(index,themesForWeek(index).findIndex(x=>x.name===t.name)),0);
    return{name:t.name,description:t.description,runs:ran.length,lastRun:ran.length?startOf(ran[ran.length-1]):null,nextRun:next,adds,live:ran.includes(current)};
  });
  return Response.json({current:startOf(current),weeks,themes},{headers});
}

const ERROR_LOG_MS=30*24*60*60*1000,ERROR_LOG_MAX=5000;
let errorSchema:Promise<void>|undefined;
async function errorLogReady(){
  errorSchema ??= sqlite.execute(`CREATE TABLE IF NOT EXISTS ydl_error_log (
    code TEXT PRIMARY KEY, at INTEGER NOT NULL, kind TEXT NOT NULL, category TEXT NOT NULL, provider TEXT
  )`).then(()=>{});
  try{await errorSchema}catch(error){errorSchema=undefined;throw error;}
}
/** Keeps one row per diagnostic code for 30 days: the code, time, error type and poster provider. Nothing that identifies a visitor. */
export async function recordErrorLog(entry:{code:string;kind:ErrorKind;category:string;provider?:string},now=Date.now()){
  if(!/^YDL-[0-9A-F]{8}$/.test(entry.code))return;
  const provider=entry.kind==="poster"?entry.provider||"unknown":null;
  if(entry.kind==="setup"?!ERROR_CATEGORIES.has(entry.category):!POSTER_VERIFY_CATEGORIES.has(`${provider}:${entry.category}`))return;
  try{
    await errorLogReady();
    await sqlite.batch([
      {sql:"INSERT OR IGNORE INTO ydl_error_log(code,at,kind,category,provider) VALUES(?,?,?,?,?)",args:[entry.code,now,entry.kind,entry.category,provider]},
      {sql:"DELETE FROM ydl_error_log WHERE at < ?",args:[now-ERROR_LOG_MS]},
      {sql:"DELETE FROM ydl_error_log WHERE code IN (SELECT code FROM ydl_error_log ORDER BY at DESC LIMIT -1 OFFSET ?)",args:[ERROR_LOG_MAX]},
    ]);
  }catch{/* Error records must never block the response that carries the code. */}
}
export async function adminErrors(req:Request,session:any,now=Date.now()){
  const headers={"cache-control":"no-store","x-content-type-options":"nosniff"};
  if(!canEdit(session))return Response.json({error:session?.user?"Only the site owner can view errors.":"Sign in to view errors."},{status:session?.user?403:401,headers});
  if(req.method!=="GET")return Response.json({error:"Method not allowed"},{status:405,headers});
  const guide={setup:SETUP_ERRORS,poster:POSTER_ERRORS,providers:POSTER_PROVIDERS};
  const code=new URL(req.url).searchParams.get("code");
  if(code!==null&&!/^YDL-[0-9A-F]{8}$/.test(code.trim().toUpperCase()))return Response.json({error:"Enter a code like YDL-1A2B3C4D."},{status:400,headers});
  try{
    await errorLogReady();
    const since=now-ERROR_LOG_MS;
    if(code!==null){
      const result=await sqlite.execute({sql:"SELECT code, at, kind, category, provider FROM ydl_error_log WHERE code = ? AND at >= ?",args:[code.trim().toUpperCase(),since]});
      return Response.json({match:result.rows?.[0]??null,guide},{headers});
    }
    const today=pacificMidnight(pacificDate(now).date),week=now-7*24*60*60*1000;
    const [recent,summary]=await Promise.all([
      sqlite.execute({sql:"SELECT code, at, kind, category, provider FROM ydl_error_log WHERE at >= ? ORDER BY at DESC LIMIT 500",args:[since]}),
      sqlite.execute({sql:"SELECT kind, category, COUNT(*) AS count, SUM(CASE WHEN at >= ? THEN 1 ELSE 0 END) AS week, SUM(CASE WHEN at >= ? THEN 1 ELSE 0 END) AS today, MAX(at) AS last FROM ydl_error_log WHERE at >= ? GROUP BY kind, category",args:[week,today,since]}),
    ]);
    return Response.json({days:30,timezone:"America/Los_Angeles",now,rows:recent.rows||[],summary:summary.rows||[],guide},{headers});
  }catch{return Response.json({error:"Errors are temporarily unavailable."},{status:503,headers});}
}

const additionRequests:number[]=[];
export async function recordCatalogAddition(req:Request){
  const url=new URL(req.url);
  if(req.method!=="POST")return Response.json({error:"Method not allowed"},{status:405});
  if(req.headers.get("origin")!==url.origin)return Response.json({error:"Origin check failed"},{status:403});
  if(!req.headers.get("content-type")?.startsWith("application/json"))return Response.json({error:"Request format is invalid"},{status:415});
  if(Number(req.headers.get("content-length")||0)>256)return Response.json({error:"Request is too large"},{status:413});
  const now=Date.now();while(additionRequests.length&&additionRequests[0]<now-60000)additionRequests.shift();
  if(additionRequests.length>=120)return Response.json({error:"Request limit reached"},{status:429});
  let body:any;try{const text=await req.text();if(text.length>256)return Response.json({error:"Request is too large"},{status:413});body=JSON.parse(text)}catch{return Response.json({error:"Invalid request"},{status:400});}
  if(!body||typeof body.source!=="string"||!ADD_SOURCES.has(body.source))return Response.json({error:"Invalid source"},{status:400});
  additionRequests.push(now);
  await recordAnalytics("catalog.added",body.source);
  return Response.json({ok:true},{headers:{"cache-control":"no-store"}});
}

export const analyticsLabels:Record<string,string>={
  "popular-this-month":"Popular this month card", "discover-drama-related":"Discover · Drama related lists", "discover-actor-filmography":"Discover · Actor filmographies", "discover-director-filmography":"Discover · Director filmographies", "discover-catalog":"Discover · Catalogs", "community-watchlist":"Community · Watchlists", "community-public-list":"Community · Public lists", "community-direct-list":"Community · Direct list URLs", "featured-list":"Featured banner lists", "weekly-picks":"Weekly picks",
  "community-public-list":"Public lists", "community-watchlist":"Individual watchlists", "community-combined-watchlist":"All watchlists",
  "actor-filmography":"Actor filmographies", "director-filmography":"Director filmographies", reviews:"MyDramaList reviews",
  "hide-unreleased":"Hide unreleased titles", "hide-completed":"Hide completed and dropped titles",
  "metadata-mdl":"MyDramaList metadata", "metadata-tmdb":"TMDB metadata",
  "posters-tmdb":"TMDB posters", "posters-easyposters":"EasyPosters", "posters-betterposters":"BetterPosters", "posters-poster-plus":"Poster+", "posters-rpdb":"RPDB", "filtered-catalog":"Filtered catalogs",
  "weekly:0":"This week’s picks · 1", "weekly:1":"This week’s picks · 2",
  "method":"Invalid request method", "origin":"Origin validation", "format":"Request format", "rate-limit":"Request limit", "request-too-large":"Request too large", "invalid-request-body":"Invalid request body", "catalog-count":"Catalog count", "preferences":"Invalid preferences", "catalog-entry":"Invalid catalog entry", "duplicate-catalog":"Duplicate catalog", "manifest-generation":"Manifest generation", "token-too-large":"Install link too long",
};
export function analyticsCategoryLabel(category:string){
  if(analyticsLabels[category])return analyticsLabels[category];
  if(category.includes(":")){
    const [provider,issue]=category.split(":");
    const providerName:Record<string,string>={ratings:"EasyPosters",better:"BetterPosters",posterplus:"Poster+",rpdb:"RPDB",unknown:"Other"};
    const issueName:Record<string,string>={"invalid-credentials":"Invalid or missing credentials","invalid-settings":"Invalid URL or settings","credentials-rejected":"Provider rejected credentials","provider-unavailable":"Provider unavailable","provider-response":"Provider error","provider-rate-limit":"Provider rate limit","sample-poster-missing":"Sample poster unavailable","not-an-image":"Provider did not return an image","request-limit":"Verification request limit","request-size":"Request too large","request-origin":"Request origin check","request-format":"Request format","request-method":"Request method","invalid-input":"Invalid request","invalid-configuration":"Invalid settings","client-network":"Browser connection error"};
    if(providerName[provider]&&issueName[issue])return `${providerName[provider]} · ${issueName[issue]}`;
  }
  if(category.startsWith("explore:")){
    const [,id,countryId]=category.split(":");
    const title=CATEGORIES.find(item=>item[0]===id)?.[1];
    const country=countryId==="all"?"":COUNTRIES.find(item=>item[0]===countryId)?.[1]||"";
    if(title)return `MyDramaList’s ${title}${country?` (${country})`:""}`;
  }
  return "Other";
}
