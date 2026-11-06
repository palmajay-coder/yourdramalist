import {load} from "npm:cheerio@1.0.0";
export function extractFeatured(html:string){
 const $=load(html),box=$(".featured-list").first();if(!box.length)throw Error("Featured list is unavailable.");
 let id="";for(const a of box.find("a[href]").toArray()){try{const u=new URL($(a).attr("href")!,"https://mydramalist.com");if(u.origin==="https://mydramalist.com"&&!u.username&&!u.password&&!u.port){const m=u.pathname.match(/^\/list\/([A-Za-z0-9_-]+)\/?$/);if(m&&m[1]!=="create"){id=m[1];break}}}catch{}}
 const clean=(s:string)=>s.replace(/\s+/g," ").trim(),title=clean(box.find(".list-title").first().text());
 if(!id||!title)throw Error("Featured list is unavailable.");
 const images:string[]=[];for(const el of box.find("img").toArray()){try{const img=$(el);const u=new URL(img.attr("data-src")||img.attr("src")||"","https://mydramalist.com");if(u.protocol==="https:"&&u.hostname==="i.mydramalist.com"&&!u.username&&!u.password&&!u.port&&!images.includes(u.href))images.push(u.href)}catch{}if(images.length===3)break}
 return {id,url:"https://mydramalist.com/list/"+id,title,label:clean(box.find(".list-type").first().text()),description:clean(box.find(".list-desc").first().text()),images};
}
export function createFeaturedService(storage?:{load:()=>Promise<any>;save:(v:any)=>Promise<any>},fetcher:typeof fetch=fetch,now=Date.now){
 let entry:any=null,ready:Promise<void>|undefined,pending:Promise<any>|undefined;
 async function bounded<T>(p:Promise<T>){let t;try{return await Promise.race([p,new Promise<undefined>(r=>{t=setTimeout(()=>r(undefined),1000)})])}finally{clearTimeout(t)}}
 return async()=>{
 ready??=(async()=>{try{entry=storage?await bounded(storage.load()):null}catch{}})();await ready;
 if(entry&&entry.expires>now())return {featured:entry.data,status:entry.error?(entry.data?"stale":"unavailable"):"cached"};
 if(pending)return pending;
 pending=(async()=>{const old=entry;try{
 const r=await fetcher("https://mydramalist.com/list",{redirect:"error",signal:AbortSignal.timeout(8000),headers:{Accept:"text/html"}});
 if(!r.ok){await r.body?.cancel();throw Error("MyDramaList unavailable.")}
 if(!r.headers.get("content-type")?.includes("text/html")){await r.body?.cancel();throw Error("Unexpected content.")}
 const reader=r.body!.getReader(),decoder=new TextDecoder();let html="",size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>3000000)throw Error("Page too large.");html+=decoder.decode(value,{stream:true})}html+=decoder.decode()}finally{await reader.cancel().catch(()=>{})}
 if(r.headers.get("cf-mitigated")==="challenge"||/cf-chl-|Just a moment|\/cdn-cgi\/challenge-platform/i.test(html))throw Error("MDL access restricted.");
 entry={data:extractFeatured(html),at:now(),expires:now()+1800000};
 }catch{entry={data:old?.data&&now()-old.at<7*86400000?old.data:null,at:old?.at||now(),expires:now()+60000,error:true}}
 if(storage)await bounded(storage.save(entry)).catch(()=>{});
 return {featured:entry.data,status:entry.error?(entry.data?"stale":"unavailable"):"live"};
 })().finally(()=>pending=undefined);return pending;
 };
}
