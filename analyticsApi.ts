import {sqlite} from "https://esm.town/v/std/sqlite/main.ts";
import {pacificDate} from "./pacificTime.ts";
import {canEdit} from "./wallpaper.ts";
import {CATEGORIES,COUNTRIES} from "./explore.ts";

export type AnalyticsMetric = "manifest.generated" | "manifest.error" | "feature.selected" | "catalog.selected";

const ERROR_CATEGORIES = new Set([
  "method", "origin", "format", "rate-limit", "request-too-large", "invalid-request-body",
  "catalog-count", "preferences", "catalog-entry", "duplicate-catalog", "manifest-generation",
]);
const FEATURE_CATEGORIES = new Set([
  "community-public-list", "community-watchlist", "community-combined-watchlist",
  "actor-filmography", "director-filmography", "reviews", "hide-unreleased", "hide-completed",
  "metadata-mdl", "metadata-tmdb", "posters-tmdb", "posters-easyposters", "posters-betterposters",
  "posters-poster-plus", "posters-rpdb",
]);
const CATALOG_CATEGORIES = new Set([
  "weekly:0", "weekly:1",
  "explore:top-shows:all", "explore:popular-shows:all", "explore:newest-shows:all", "explore:upcoming-shows:all", "explore:airing-shows:all", "explore:variety-shows:all", "explore:top-movies:all", "explore:popular-movies:all", "explore:newest-movies:all", "explore:upcoming-movies:all",
  ...["1", "2", "3", "5", "6"].flatMap(country => ["top-shows", "popular-shows", "newest-shows", "upcoming-shows", "airing-shows", "variety-shows", "top-movies", "popular-movies", "newest-movies", "upcoming-movies"].map(category => `explore:${category}:${country}`)),
]);
const valid = (metric:AnalyticsMetric, category:string) => metric === "manifest.generated" ? category === "all"
  : metric === "manifest.error" ? ERROR_CATEGORIES.has(category)
  : metric === "feature.selected" ? FEATURE_CATEGORIES.has(category)
  : metric === "catalog.selected" && CATALOG_CATEGORIES.has(category);

let schema:Promise<void>|undefined;
async function ready(){
  schema ??= sqlite.execute(`CREATE TABLE IF NOT EXISTS ydl_daily_analytics (
    day TEXT NOT NULL, metric TEXT NOT NULL, category TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(day, metric, category)
  )`).then(()=>{});
  try{await schema}catch(error){schema=undefined;throw error;}
  await sqlite.execute({sql:"DELETE FROM ydl_daily_analytics WHERE day < ?",args:[shiftDay(dayKey(),-180)]});
}
function dayKey(now=Date.now()){
  return pacificDate(now).date.toISOString().slice(0,10);
}
function shiftDay(day:string,delta:number){
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

export const analyticsLabels:Record<string,string>={
  "community-public-list":"Public lists", "community-watchlist":"Individual watchlists", "community-combined-watchlist":"All watchlists",
  "actor-filmography":"Actor filmographies", "director-filmography":"Director filmographies", reviews:"MyDramaList reviews",
  "hide-unreleased":"Hide unreleased titles", "hide-completed":"Hide completed and dropped titles",
  "metadata-mdl":"MyDramaList metadata", "metadata-tmdb":"TMDB metadata",
  "posters-tmdb":"TMDB posters", "posters-easyposters":"EasyPosters", "posters-betterposters":"BetterPosters", "posters-poster-plus":"Poster+", "posters-rpdb":"RPDB",
  "weekly:0":"This week’s picks · 1", "weekly:1":"This week’s picks · 2",
  "method":"Invalid request method", "origin":"Origin validation", "format":"Request format", "rate-limit":"Request limit", "request-too-large":"Request too large", "invalid-request-body":"Invalid request body", "catalog-count":"Catalog count", "preferences":"Invalid preferences", "catalog-entry":"Invalid catalog entry", "duplicate-catalog":"Duplicate catalog", "manifest-generation":"Manifest generation",
};
export function analyticsCategoryLabel(category:string){
  if(analyticsLabels[category])return analyticsLabels[category];
  if(category.startsWith("explore:")){
    const [,id,countryId]=category.split(":");
    const title=CATEGORIES.find(item=>item[0]===id)?.[1];
    const country=countryId==="all"?"":COUNTRIES.find(item=>item[0]===countryId)?.[1]||"";
    if(title)return `MyDramaList’s ${title}${country?` (${country})`:""}`;
  }
  return "Other";
}
