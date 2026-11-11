import {load} from "npm:cheerio@1.0.0";
export const COUNTRIES=[["","All countries"],["3","South Korea"],["2","China"],["1","Japan"],["5","Taiwan"],["6","Thailand"]];
export const CATEGORIES=[
 ["top-shows","Top Rated Shows","ty=68&so=top","series"],
 ["popular-shows","Popular Shows","ty=68&so=popular","series"],
 ["newest-shows","Newest Shows","ty=68&so=newest&or=desc","series"],
 ["upcoming-shows","Upcoming Shows","ty=68&st=2&so=date","series"],
 ["airing-shows","Top Airing Shows","ty=68&st=1&so=top","series"],
 ["variety-shows","Variety Shows","ty=86&fm=6&so=popular","series"],
 ["top-movies","Top Rated Movies","ty=77&so=top","movie"],
 ["popular-movies","Popular Movies","ty=77&so=popular","movie"],
 ["newest-movies","Newest Movies","ty=77&so=newest&or=desc","movie"],
 ["upcoming-movies","Upcoming Movies","ty=77&st=2&so=date","movie"]
];
export function exploreCatalog(category:string,country=""){
 const k=CATEGORIES.find(x=>x[0]===category),c=COUNTRIES.find(x=>x[0]===country);
 if(!k||!c)throw Error("Choose a valid category and country.");
 const path="search?adv=titles&"+k[2]+(country?"&co="+country:"");
 // Same encoded source identity as the original MDL-lists Explore catalogs.
 const id="p."+btoa(path).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
 return {kind:"explore",url:id,catalogId:id,category,country,profile:"TMDB",name:k[1]+(country?" ("+c[1]+")":""),sourceUrl:"https://mydramalist.com/"+path,types:[k[3]],catalogEndpoint:"/api/mdl/explore?category="+category+"&country="+country,description:"",posters:[] as string[]};
}
export function userListName(list:any){
 // Filtered catalogs keep their base name in originalName and add ": filter" once; custom lists then drop the word "list".
 const label=list.filterLabel?": "+String(list.filterLabel):"";
 if(list.kind==="watchlist"||list.kind==="filmography"||list.kind==="explore"||list.kind==="weekly"){
  if(!label)return list.name;
  const base=String(list.originalName||list.name);
  return base.endsWith(label)?base:base+label;
 }
 const author=list.profileName||list.profile;
 const raw=String(list.originalName||list.name||"Untitled");
 const named=author&&author!=="MyDramaList"&&!raw.toLowerCase().startsWith(String(author).toLowerCase()+"’s ")&&!raw.toLowerCase().startsWith(String(author).toLowerCase()+"'s ")?author+"’s "+raw:raw;
 return label?named+label:/\blist$/i.test(named.trim())?named:named+" list";
}
export function extractExplore(html:string,target:URL){
 const $=load(html),items:any[]=[],seen=new Set();
 if(!/Search Results/i.test($("title").text()))throw Error("MyDramaList returned an unexpected catalog page.");
 $(".box[id]").each((_,el)=>{
  const card=$(el),id=card.attr("id")?.match(/^mdl-(\d+)$/)?.[1],a=card.find(".content .title > a[href]").first();
  if(!id||seen.has(id))return;
  let u;try{u=new URL(a.attr("href")||"",target)}catch{return}
  const name=a.text().replace(/\s+/g," ").trim();if(!name||u.origin!==target.origin||!new RegExp("^/"+id+"-[A-Za-z0-9-]+/?$").test(u.pathname))return;
  let poster=null;const img=card.find(".film-cover img").first();
  try{const p=new URL(img.attr("data-src")||img.attr("data-cfsrc")||img.attr("src")||"");if(p.protocol==="https:"&&p.hostname==="i.mydramalist.com"&&!p.username&&!p.password&&!p.port)poster=p.href}catch{}
  seen.add(id);const details=card.find(".content > .text-muted").first().text().replace(/\s+/g," ").trim();
  const raw=card.find(".score").first().text().trim(),score=Number(raw);
  items.push({id,mdlId:id,name,url:u.origin+u.pathname,poster,details,...(raw&&score>0&&score<=10?{score}: {})});
 });
 const current=Number(target.searchParams.get("page")||1);
 const hasNextPage=$(".pagination a[href]").toArray().some(e=>{try{const u=new URL($(e).attr("href")!,target);return u.origin===target.origin&&u.pathname===target.pathname&&Number(u.searchParams.get("page"))===current+1}catch{return false}});
 return {items,hasNextPage};
}
