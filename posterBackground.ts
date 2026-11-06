export const POSTER_SEEDS=[{"name":"Crash Landing on You","poster":"https://image.tmdb.org/t/p/w780/fgBNLPr6mC8pxuR79ENAJY4nBmj.jpg","source":"https://www.themoviedb.org/tv/94796","kind":"tv","id":94796},{"name":"Squid Game","poster":"https://image.tmdb.org/t/p/w780/1QdXdRYfktUSONkl1oD5gc6Be0s.jpg","source":"https://www.themoviedb.org/tv/93405","kind":"tv","id":93405},{"name":"Guardian: The Lonely and Great God","poster":"https://image.tmdb.org/t/p/w780/sPkxHNw5BFvuCFGWw825TS7n6X3.jpg","source":"https://www.themoviedb.org/tv/67915","kind":"tv","id":67915},{"name":"Hotel Del Luna","poster":"https://image.tmdb.org/t/p/w780/8bizZsXoAsOTbhyFKfBogC8mgG2.jpg","source":"https://www.themoviedb.org/tv/90447","kind":"tv","id":90447},{"name":"Parasite","poster":"https://image.tmdb.org/t/p/w780/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg","source":"https://www.themoviedb.org/movie/496243","kind":"movie","id":496243},{"name":"Train to Busan","poster":"https://image.tmdb.org/t/p/w780/vNVFt6dtcqnI7hqa6LFBUibuFiw.jpg","source":"https://www.themoviedb.org/movie/396535","kind":"movie","id":396535},{"name":"The Handmaiden","poster":"https://image.tmdb.org/t/p/w780/dLlH4aNHdnmf62umnInL8xPlPzw.jpg","source":"https://www.themoviedb.org/movie/290098","kind":"movie","id":290098},{"name":"Oldboy","poster":"https://image.tmdb.org/t/p/w780/pWDtjs568ZfOTMbURQBYuT4Qxka.jpg","source":"https://www.themoviedb.org/movie/670","kind":"movie","id":670},{"name":"Shoplifters","poster":"https://image.tmdb.org/t/p/w780/4nfRUOv3LX5zLn98WS1WqVBk9E9.jpg","source":"https://www.themoviedb.org/movie/505192","kind":"movie","id":505192},{"name":"In the Mood for Love","poster":"https://image.tmdb.org/t/p/w780/8BgGbbWiLNhPtkMkN0gGTnbtvBv.jpg","source":"https://www.themoviedb.org/movie/843","kind":"movie","id":843},{"name":"Infernal Affairs","poster":"https://image.tmdb.org/t/p/w780/gix9thDBXfjJ8M7rYbihqbQGBcP.jpg","source":"https://www.themoviedb.org/movie/10775","kind":"movie","id":10775},{"name":"Bad Genius","poster":"https://image.tmdb.org/t/p/w780/g1gW6DQ7QFocDn24QBOZqoYpd3O.jpg","source":"https://www.themoviedb.org/movie/455714","kind":"movie","id":455714}];
const ASIA=new Set(["KR","JP","CN","TW","HK","TH"]);
export function chooseBackgroundPoster(record:any,kind:string){
 const countries=kind==="tv"?record.origin_country:(record.origin_country||record.production_countries?.map((x:any)=>x.iso_3166_1)||[]);
 const genres=(record.genres||[]).map((x:any)=>x.id);
 if(record.adult||genres.includes(16))return null;
 if(kind==="tv"&&(!countries.includes("KR")||!genres.includes(18)||["Reality","Talk Show","News"].includes(record.type)))return null;
 if(kind==="movie"&&!countries.some((x:string)=>ASIA.has(x)))return null;
 const images=(record.images?.posters||[]).filter((x:any)=>x.width>=780&&x.height>=1100&&x.aspect_ratio>=0.6&&x.aspect_ratio<=0.75&&/^\/[A-Za-z0-9]+\.(jpg|png|webp)$/.test(x.file_path));
 images.sort((a:any,b:any)=>Number(b.file_path===record.poster_path)-Number(a.file_path===record.poster_path)||(b.vote_average||0)-(a.vote_average||0)||(b.vote_count||0)-(a.vote_count||0)||b.width*b.height-a.width*a.height);
 const image=images[0];if(!image)return null;
 return {id:record.id,kind,name:record.name||record.title,poster:"https://image.tmdb.org/t/p/w780"+image.file_path,sourceWidth:image.width,sourceHeight:image.height,countries};
}
export function createPosterService(storage:{load:()=>Promise<any>;save:(v:any)=>Promise<any>},keyFor:()=>string|undefined,fetcher:typeof fetch=fetch,now=Date.now){
 let entry:any,ready:Promise<void>|undefined,pending:Promise<any>|undefined;
 const fallback=()=>({posters:POSTER_SEEDS.map(({name,poster,id,kind})=>({name,poster,id,kind})),status:"fallback"});
 async function bounded<T>(p:Promise<T>){let t;try{return await Promise.race([p,new Promise<undefined>(r=>{t=setTimeout(()=>r(undefined),1000)})])}finally{clearTimeout(t)}}
 return async()=>{
 ready??=(async()=>{try{entry=await bounded(storage.load())}catch{}})();await ready;
 const usable=entry?.posters?.length&&now()-entry.at<30*86400000;
 if(entry&&entry.expires>now())return usable?{posters:entry.posters,status:entry.error?"stale":"cached"}:fallback();
 if(pending)return pending;
 pending=(async()=>{
 const key=keyFor();if(!key){entry={posters:usable?entry.posters:[],at:usable?entry.at:now(),expires:now()+300000,error:true};return usable?{posters:entry.posters,status:"stale"}:fallback()}
 const deadline=now()+25000;
 async function request(path:string){
 if(now()>deadline)throw Error("Refresh timeout");
 const url=new URL("https://api.themoviedb.org/3/"+path);url.searchParams.set("api_key",key);
 const r=await fetcher(url,{signal:AbortSignal.timeout(8000),redirect:"error",headers:{Accept:"application/json"}});
 if(!r.ok){await r.body?.cancel();throw Error("TMDB HTTP "+r.status)}
 const text=await r.text();if(text.length>3000000)throw Error("TMDB response too large");return JSON.parse(text);
 }
 try{
 const config=await request("configuration");if(!config.images?.poster_sizes?.includes("w780"))throw Error("TMDB image size unavailable");
 const result:any[]=Array(POSTER_SEEDS.length);let index=0;
 async function worker(){while(index<POSTER_SEEDS.length){const i=index++,seed=POSTER_SEEDS[i];try{const record=await request(seed.kind+"/"+seed.id+"?append_to_response=images&include_image_language=en,ko,ja,zh,th,null");result[i]=chooseBackgroundPoster(record,seed.kind)}catch{result[i]=null}}}
 await Promise.all([worker(),worker(),worker()]);const posters=result.filter(Boolean);if(posters.length<8)throw Error("Not enough qualifying artwork");
 entry={posters,at:now(),expires:now()+86400000};await bounded(storage.save(entry)).catch(()=>{});
 return {posters,status:"live"};
 }catch{entry={posters:usable?entry.posters:[],at:usable?entry.at:now(),expires:now()+300000,error:true};await bounded(storage.save(entry)).catch(()=>{});return usable?{posters:entry.posters,status:"stale"}:fallback()}
 })().finally(()=>pending=undefined);return pending;
 };
}
