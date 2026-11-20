import {mdlTitleMeta,normalizeAddon,createTokenCodec,makeManifest,loadCatalog,handleAddon,createRequestLimiter,listStatus,analyticsScopes,selectionFromConfig,configurePage} from './addon.ts';
import {parseModernWatchlist,profileWatchlistCards,extractMDLTitlePoster} from './addonScrape.ts';
import {Ge,Sz,Go,Xe,hiddenTitleKey} from './addonCore.ts';
import {exploreCatalog} from './explore.ts';
let passed=0;const assert=(v:any,m:string)=>{if(!v)throw Error(m)};async function test(name:string,fn:()=>any){await fn();passed++;console.log('PASS '+name)};
await test('watchlist parser reads single-quoted lazy artwork regardless of wrapper class',()=>{const html="<tr id=\"ml123\"><td><div class=\"cover\"><img data-src='https://i.mydramalist.com/example_4t.jpg'></div><a class=\"title\" href=\"/123-title\">Sample Title</a></td><td class=\"msv2-i-status\">Completed</td><td class=\"msv2-i-type\">Movie</td><td class=\"msv2-i-year\">2024</td></tr>";const item=parseModernWatchlist(html)[2][0];assert(item?.image==="https://i.mydramalist.com/example_4c.jpg","single-quoted artwork was not parsed")});
await test('watchlist rows carry the number MDL gives each added show',()=>{const row=(id:number,slug:string)=>"<tr id=\"ml"+id+"\"><td><a class=\"title\" href=\"/"+slug+"\">T</a></td><td class=\"msv2-i-status\">Plan to Watch</td></tr>";const items=parseModernWatchlist(row(900,"1-a")+row(950,"2-b"),3)[3];assert(items[0].added===900&&items[1].added===950,"add order was not read")});
await test('classic MDL watchlist row keeps type/year/country for TMDB artwork matching',()=>{const html="<tr id=\"ml1320\"><td class=\"mdl-style-col-title\"><a class=\"title\" href=\"https://mydramalist.com/1320-2ldk\"><span>2ldk</span></a></td><td class=\"mdl-style-col-country\" abbr=\"1\">Japan</td><td class=\"mdl-style-col-year\">2003</td><td class=\"mdl-style-col-type\">Movie</td></tr>";const item=parseModernWatchlist(html,2)[2][0];assert(item?.type==="Movie"&&item?.year===2003&&item?.country==="1","classic MDL type/year/country not parsed")});
await test('MDL title poster parser rejects off-site image hosts',()=>{assert(extractMDLTitlePoster('<meta property="og:image" content="https://i.mydramalist.com/pulse.jpg">')==='https://i.mydramalist.com/pulse.jpg','MDL poster missing');assert(extractMDLTitlePoster('<meta property="og:image" content="https://evil.example/poster.jpg">')===null,'off-site poster accepted')});
await test('watchlist preview fills five slots by checking later titles when artwork is missing',async()=>{const items=Array.from({length:8},(_,index)=>({slug:(index+1)+'-title',title:'Title '+(index+1),link:'https://mydramalist.com/'+(index+1)+'-title',type:'Movie',year:2020,country:'3',image:''}));const cards=await profileWatchlistCards('Example','Example',async(_username,status)=>status==='on_hold'?items:[],async(item)=>item.slug==='5-title'?null:'https://image.tmdb.org/t/p/w780/'+item.slug+'.jpg');const onHold=cards.find(card=>card.url.endsWith('/on_hold'));assert(onHold?.posters.length===5&&onHold.posters.includes('https://image.tmdb.org/t/p/w780/6-title.jpg'),'preview did not backfill fifth poster')});
const body={catalogs:[{name:'My community list',url:'https://mydramalist.com/list/q1XvK6w3'}],preferences:{reviews:true},user:'TestUser'};
await test('edited setups get distinct manifest identities while existing catalog links still work', async () => {
 const codec = createTokenCodec('b'.repeat(64));
 const original = normalizeAddon(body);
 const replacement = normalizeAddon({...body,catalogs:[{name:'Replacement list',url:'https://mydramalist.com/list/q1XvK6w4'}]});
 const settingsEdit = normalizeAddon({...body,preferences:{tmdbLanguage:'ko-KR',metadataProvider:'tmdb'}});
 const legacy = makeManifest(original);
 const first = makeManifest(await codec.open(await codec.seal(original)));
 const same = makeManifest(await codec.open(await codec.seal(original)));
 const changed = makeManifest(await codec.open(await codec.seal(replacement)));
 const localized = makeManifest(await codec.open(await codec.seal(settingsEdit)));
 assert(legacy.id==='community.yourdramalist.v3' && legacy.catalogs[0].id==='ydl_0','legacy manifest identity changed');
 assert(first.id===same.id && first.id!==changed.id && first.id!==localized.id && legacy.id!==first.id,'setup manifest identity collided');
 assert(first.catalogs[0].id===changed.catalogs[0].id && changed.catalogs[0].name==='Replacement list','catalog routing changed');
});
await test('manifest keeps names and order without upstream requests',()=>{const c=normalizeAddon({...body,catalogs:[...body.catalogs,exploreCatalog('top-movies','1')]});const m=makeManifest(c);assert(m.catalogs[0].name==='My community list'&&m.catalogs[1].type==='movie','catalog order/type');assert(m.resources.some((x:any)=>x.name==='stream'),'reviews resource missing')});
await test('TMDB language localizes generated catalog names while preserving custom list titles',()=>{const catalogs=[{kind:'explore',category:'popular-shows',country:'3',name:'MyDramaList’s Most Popular Shows (South Korea)'},{name:'Seoby’s Currently Watching',url:'https://mydramalist.com/dramalist/Seoby/watching'},{name:'Chae Soo Bin’s Filmography',kind:'filmography',mode:'actor',personUrl:'https://mydramalist.com/people/123-chae-soo-bin'},{name:'Seoby’s Favorites list',url:'https://mydramalist.com/list/q1XvK6w4'}];const c=normalizeAddon({...body,catalogs,preferences:{metadataProvider:'tmdb',tmdbLanguage:'pt-BR'}});const names=makeManifest(c).catalogs.map((x:any)=>x.name);assert(names[0].includes('Séries mais populares'),'Explore name did not localize');/* Names follow each language's own word order, set in catalogLabels.ts OWNER_PATTERN. */assert(names[1]==='Assistindo de Seoby','watchlist category did not localize');assert(names[2]==='Filmografia de Chae Soo Bin','filmography name did not localize');assert(names[3]==='Seoby’s Favorites list','user-created title was modified')});
await test('no review resource when disabled',()=>{assert(!makeManifest(normalizeAddon({...body,preferences:{}})).resources.some((x:any)=>x.name==='stream'),'review resource retained')});
await test('unsupported sources are rejected',()=>{for(const url of ['https://evil.test/list/q1XvK6w3','https://mydramalist.com/people/123-x','r.TestUser']){let failed=false;try{normalizeAddon({...body,catalogs:[{url,name:'test'}]})}catch{failed=true}assert(failed,'unsafe/unapproved source accepted')}});
await test('filmography configuration preserves exact person identity and role',()=>{const c=normalizeAddon({...body,catalogs:[{name:'Park Chan Wook’s Filmography',kind:'filmography',mode:'director',personUrl:'https://mydramalist.com/people/15987-park-chan-wook'}]});assert(c.entries[0].mode==='director'&&c.entries[0].person?.includes('15987'),'wrong person or role')});
await test('unused keys are removed from configuration',()=>{const c=normalizeAddon({...body,keys:{tmdb:'private-key',mdblist:'another-key'}});assert(!JSON.stringify(c).includes('private-key'),'unused keys retained')});
await test('encrypted configuration round trips without revealing API keys',async()=>{const keys={tmdb:'a'.repeat(32),mdblist:'fake-key-for-unit-test'};const c=normalizeAddon({...body,preferences:{posters:true},keys});const codec=createTokenCodec('b'.repeat(64)),token=await codec.seal(c);assert(!token.includes(keys.tmdb)&&!token.includes(keys.mdblist),'plaintext key exposed');assert((await codec.open(token)).keys.tmdb===keys.tmdb,'roundtrip failed');let rejected=false;try{await codec.open(token.slice(0,-8)+'AAAAAAAA')}catch{rejected=true}assert(rejected,'tampered token accepted')});
await test('mixed catalogs preserve source order and filter future/hidden titles',async()=>{const c=normalizeAddon({...body,preferences:{hideUnreleased:true,hideCompleted:true}});const items=[{slug:'1-first',title:'first',type:'Movie',year:2020},{slug:'2-hidden',title:'hidden',type:'Drama',year:2020},{slug:'3-future',title:'future',type:'Drama',year:2999},{slug:'4-last',title:'last',type:'Drama',year:2021}];const result=await loadCatalog(c,0,0,'https://test/addon/token',{source:async()=>({items}),hidden:async()=>new Set(['2-hidden']),people:()=>{throw Error('unexpected')},map:async(items:any[],type:string)=>items.map(x=>({id:'tt'+x.slug.split('-')[0],name:x.title,type,poster:'https://image.test/poster.jpg'}))} as any);assert(result.metas.map(x=>x.name).join(',')==='first,last','order/filter mismatch')});
await test('a title with no IMDb id stays in the catalog under a MyDramaList id when a poster is found',async()=>{
 const c=normalizeAddon({...body,catalogs:[{name:'Watchlist',url:'https://mydramalist.com/dramalist/Example/plan_to_watch'}]});
 const items=[{slug:'1-known-show',title:'Known Show',link:'https://mydramalist.com/1-known-show',type:'Drama',year:2026,image:''},{slug:'2-upcoming-show',title:'Upcoming Show',link:'https://mydramalist.com/2-upcoming-show',type:'Drama',year:2027,image:''},{slug:'3-no-artwork',title:'No Artwork',link:'https://mydramalist.com/3-no-artwork',type:'Drama',year:2027,image:''}];
 const deps:any={hidden:async()=>new Set(),watchlistCategory:async()=>items,
  map:async(list:any[],type:string)=>list.map(x=>x.slug==='1-known-show'?{id:'tt7000001',name:x.title,type,releaseInfo:'2026',poster:'https://image.tmdb.org/t/p/w780/known.jpg'}:{id:'mdl:'+x.slug,name:x.title,type,releaseInfo:String(x.year)}),
  standardArtwork:async(m:any[])=>m,titleArtwork:async(item:any)=>item.name==='Upcoming Show'?{...item,poster:'https://image.tmdb.org/t/p/w780/upcoming.jpg'}:item};
 const result=await loadCatalog(c,0,0,'https://test/addon/token',deps);
 const ids=result.metas.map((m:any)=>m.id);
 assert(ids.join()==='tt7000001,mdl:2-upcoming-show','an IMDb title and an unreleased title with a poster should both appear, and a title with no poster should not: '+ids.join());
});
await test('the manifest offers details for MyDramaList ids, and the meta route answers for them',async()=>{
 const c=normalizeAddon(body);
 assert(makeManifest(c).resources.some((r:any)=>r?.name==='meta'&&r.idPrefixes?.includes('mdl:')),'meta resource missing from the manifest');
 const meta=await mdlTitleMeta('series','2-upcoming-show',{kuryana:(async()=>({title:'Upcoming Show',year:2027,poster:'https://i.mydramalist.com/up.jpg',synopsis:'A new drama.'})) as any,artwork:async(item:any)=>({...item,poster:'https://image.tmdb.org/t/p/w780/upcoming.jpg'})});
 assert(meta?.id==='mdl:2-upcoming-show'&&meta.name==='Upcoming Show'&&meta.releaseInfo==='2027'&&meta.poster==='https://image.tmdb.org/t/p/w780/upcoming.jpg'&&meta.description==='A new drama.'&&meta.website==='https://mydramalist.com/2-upcoming-show','meta details: '+JSON.stringify(meta));
 assert(await mdlTitleMeta('series','../evil')===null&&await mdlTitleMeta('tv','2-upcoming-show')===null,'bad ids and types are refused');
 const noData=await mdlTitleMeta('series','9-gone',{kuryana:(async()=>{throw Error('down')}) as any});
 assert(noData===null,'a missing title gives no meta');
});
await test('the meta route answers for a MyDramaList id through a real install link',async()=>{
 Deno.env.set('YDL_MANIFEST_SECRET','c'.repeat(64));
 const realFetch=globalThis.fetch;
 globalThis.fetch=(async(input:any)=>{const u=String(input);return u.includes('/v2/dramas/2-upcoming-show')?Response.json({success:true,data:{title:'Upcoming Show',year:2027,poster:'https://i.mydramalist.com/up.jpg',synopsis:'A new drama.'}}):new Response('no',{status:404})}) as any;
 try{
  const made=await handleAddon(new Request('https://test/api/addon/configure',{method:'POST',headers:{origin:'https://test','content-type':'application/json'},body:JSON.stringify(body)}));
  const link=new URL((await made.json()).url);
  const reply=await handleAddon(new Request('https://test'+link.pathname.replace('manifest.json','')+'meta/series/'+encodeURIComponent('mdl:2-upcoming-show')+'.json'));
  const meta=(await reply.json()).meta;
  assert(reply.status===200&&meta?.id==='mdl:2-upcoming-show'&&meta.name==='Upcoming Show'&&meta.poster==='https://i.mydramalist.com/up.jpg','route reply: '+JSON.stringify(meta));
  const other=await handleAddon(new Request('https://test'+link.pathname.replace('manifest.json','')+'meta/series/tt1234567.json'));
  assert((await other.json()).meta===null,'IMDb ids are not answered by this add-on');
 }finally{globalThis.fetch=realFetch}
});
await test('catalog uses an MDL poster when TMDB artwork is unavailable',async()=>{const c=normalizeAddon({...body,catalogs:[{name:'Watchlist',url:'https://mydramalist.com/dramalist/Example/on_hold'}]});const item={slug:'123-pulse',title:'Pulse',link:'https://mydramalist.com/123-pulse',type:'Movie',year:2001,image:''};const result=await loadCatalog(c,0,0,'https://test/addon/token',{hidden:async()=>new Set(),watchlistCategory:async()=>[item],map:async(items,type)=>items.map(()=>({id:'tt1234567',name:'Pulse',type,releaseInfo:'2001'})),standardArtwork:async(items)=>items,mdlPoster:async()=> 'https://i.mydramalist.com/pulse.jpg'} as any);assert(result.metas.length===1&&result.metas[0].poster==='https://i.mydramalist.com/pulse.jpg','MDL poster fallback missing')});
await test('a title whose only poster is a dead Cinemeta link gets a TMDB poster found by name and year',async()=>{
 const c=normalizeAddon({...body,catalogs:[{name:'Watchlist',url:'https://mydramalist.com/dramalist/Example/plan_to_watch'}]});
 const items=[{slug:'1-new-show',title:'New Show',link:'https://mydramalist.com/1-new-show',type:'Drama',year:2026,image:''},{slug:'2-quiet-show',title:'Quiet Show',link:'https://mydramalist.com/2-quiet-show',type:'Drama',year:2026,image:''}];
 const asked:any[]=[];
 const deps:any={hidden:async()=>new Set(),watchlistCategory:async()=>items,map:async(list:any[],type:string)=>list.map((x,i)=>({id:'tt700000'+i,name:x.title,type,releaseInfo:'2026',poster:'https://images.metahub.space/poster/small/tt700000'+i+'/img'})),standardArtwork:async(m:any[])=>m,
  titleArtwork:async(item:any)=>{asked.push(item);return item.name==='New Show'?{...item,poster:'https://image.tmdb.org/t/p/w780/new.jpg'}:item}};
 const result=await loadCatalog(c,0,0,'https://test/addon/token',deps);
 const byName=Object.fromEntries(result.metas.map((m:any)=>[m.name,m.poster]));
 assert(byName['New Show']==='https://image.tmdb.org/t/p/w780/new.jpg','the TMDB poster was not used: '+JSON.stringify(byName));
 assert(byName['Quiet Show'].startsWith('https://images.metahub.space/'),'a title TMDB cannot find keeps the poster it had');
 assert(asked[0].details==='Drama - 2026'&&/^https:\/\/mydramalist\.com\//.test(asked[0].url),'the lookup should carry the title, type, year and link');
});
await test('EasyPosters request carries a safe MDL fallback slug',async()=>{const c=normalizeAddon({...body,catalogs:[{name:'Watchlist',url:'https://mydramalist.com/dramalist/Example/on_hold'}],preferences:{posters:true},keys:{tmdb:'a'.repeat(32),mdblist:'abcdefgh'}});const item={slug:'123-pulse',title:'Pulse',link:'https://mydramalist.com/123-pulse',type:'Movie',year:2001,image:''};const result=await loadCatalog(c,0,0,'https://test/addon/token',{hidden:async()=>new Set(),watchlistCategory:async()=>[item],map:async(items,type)=>items.map(()=>({id:'tt1234567',name:'Pulse',type,poster:'https://image.test/poster.jpg'}))} as any);assert(new URL(result.metas[0].poster).searchParams.get('mdl')==='123-pulse','EasyPosters fallback slug missing')});
await test('BetterPosters request carries a safe MDL fallback slug',async()=>{const c=normalizeAddon({...body,catalogs:[{name:'Watchlist',url:'https://mydramalist.com/dramalist/Example/on_hold'}],betterPosters:'https://btttr.cc/poster/imdb/poster-default/{imdb_id}.jpg'});const item={slug:'123-pulse',title:'Pulse',link:'https://mydramalist.com/123-pulse',type:'Movie',year:2001,image:''};const result=await loadCatalog(c,0,0,'https://test/addon/token',{hidden:async()=>new Set(),watchlistCategory:async()=>[item],map:async(items,type)=>items.map(()=>({id:'tt1234567',name:'Pulse',type,poster:'https://image.test/poster.jpg'}))} as any);const poster=new URL(result.metas[0].poster);assert(poster.pathname==='/addon/token/poster/tt1234567.jpg'&&poster.searchParams.get('style')==='better'&&poster.searchParams.get('mdl')==='123-pulse','BetterPosters fallback slug missing')});
await test('actor/director catalog uses V3 role-filtered newest-first data',async()=>{let requested='';const c=normalizeAddon({...body,catalogs:[{name:'Director',kind:'filmography',mode:'director',personUrl:'https://mydramalist.com/people/15987-park-chan-wook'}]});const result=await loadCatalog(c,0,0,'https://test/addon/token',{source:()=>{throw Error('legacy person table used')},hidden:async()=>new Set(),people:async(req:Request)=>{requested=req.url;return Response.json({items:[{url:'https://mydramalist.com/2-new',name:'new',type:'Movie',year:2025},{url:'https://mydramalist.com/1-old',name:'old',type:'Drama',year:2020}]})},map:async(items:any[],type:string)=>items.map(x=>({id:'tt'+x.slug.split('-')[0],name:x.title,type,poster:'https://image.test/poster.jpg'}))} as any);assert(new URL(requested).searchParams.get('mode')==='director'&&result.metas[0].name==='new','V3 filmography changed')});
await test('TMDB filmography credits get distinct ids and hide completed dramas',async()=>{const c=normalizeAddon({...body,catalogs:[{name:'Actor',kind:'filmography',mode:'actor',personUrl:'https://mydramalist.com/people/440-gong-yoo'}]});const seen:string[]=[];
 const result=await loadCatalog(c,0,0,'https://test/addon/token',{source:()=>{throw Error('legacy')},hidden:async()=>new Set(['9-done',hiddenTitleKey('Goblin',2016)]),people:async()=>Response.json({items:[{id:'tmdb-tv-67915',url:'https://www.themoviedb.org/tv/67915',name:'Goblin',type:'Drama',year:2016},{id:'tmdb-movie-67915',url:'https://www.themoviedb.org/movie/67915',name:'Same Number',type:'Movie',year:2014},{id:'tmdb-tv-1',url:'https://www.themoviedb.org/tv/1',name:'Coffee Prince',type:'Drama',year:2007}]}),map:async(items:any[],type:string)=>items.map((x,i)=>{seen.push(x.slug);return{id:'tt'+type.length+i,name:x.title,type,poster:'https://image.test/poster.jpg'}})} as any);
 assert(seen.includes('tmdb-movie-67915')&&seen.includes('tmdb-tv-1')&&!seen.includes('67915'),'TMDB credits keep their media type in the id: '+seen.join(','));
 assert(!result.metas.some((m:any)=>m.name==='Goblin')&&result.metas.some((m:any)=>m.name==='Coffee Prince'),'a completed drama is hidden from the filmography')});
await test('"Because you watched" catalogs: need a username, take this week\'s seed names, and list the row\'s titles',async()=>{
 const c=normalizeAddon({...body,catalogs:[{name:'Because you watched The Glory',kind:'recs',slot:0},{name:'Because you watched Move to Heaven',kind:'recs',slot:2}]});
 assert((c.entries as any[]).map(e=>e.id).join(',')==='ydl-recs:0,ydl-recs:2','recs entries keep their slots');
 let refused=false;try{normalizeAddon({...body,user:'',catalogs:[{name:'Because you watched X',kind:'recs',slot:0}]})}catch{refused=true}
 assert(refused,'recommendation rows need a MyDramaList username');
 let badSlot=false;try{normalizeAddon({...body,catalogs:[{name:'X',kind:'recs',slot:7}]})}catch{badSlot=true}
 assert(badSlot,'only three rows exist');
 const named=makeManifest(c as any,{},{0:'The Glory'}).catalogs.map((x:any)=>x.name);
 assert(named[0]==='Because you watched The Glory'&&named[1]==='Because you watched…','the manifest names rows after this week\'s titles: '+named.join(' | '));
 let asked='';
 const result=await loadCatalog(c,0,0,'https://test/addon/token',{source:()=>{throw Error('legacy')},hidden:async()=>new Set(),recs:async(user:string)=>{asked=user;return{rows:[{seed:{title:'The Glory',slug:'1-the-glory'},items:[{kind:'tv',id:1,name:'Mouse',poster:'https://image.tmdb.org/t/p/w780/m.jpg',date:'2021-03-03'}]}]}},weeklyMetas:async(items:any[])=>items.map(x=>({id:'tt'+x.id,type:'series',name:x.name,poster:x.poster}))} as any);
 assert(asked===body.user&&result.metas.length===1&&result.metas[0].id==='tt1'&&result.metas[0].name==='Mouse','the catalog lists the row for the install\'s username');
 const empty=await loadCatalog(c,1,0,'https://test/addon/token',{source:()=>{throw Error('legacy')},hidden:async()=>new Set(),recs:async()=>({rows:[]}),weeklyMetas:async()=>[]} as any);
 assert(Array.isArray(empty.metas)&&!empty.metas.length,'a week with fewer rows gives an empty catalog, not an error');
});
await test('Spotlight installs in Nuvio: GTA 6, and a monthly catalog named after the current month\'s list',async()=>{
 const c=normalizeAddon({...body,catalogs:[{name:'Watch this while they play GTA 6',kind:'special',url:'ydl-special:gta6'},{name:'Thankful for Family',kind:'special',url:'ydl-special:monthly'}]});
 assert((c.entries as any[]).map(e=>e.id).join(',')==='ydl-special:gta6,ydl-special:monthly','both Spotlight catalogs are accepted from their addresses');
 const names=makeManifest(c as any).catalogs.map((x:any)=>x.name);
 const {monthlySpotlight}=await import('./specialCatalog.ts');
 assert(names[0]==='Watch this while they play GTA 6'&&names[1]===monthlySpotlight(Date.now()).name,'the monthly catalog takes this month\'s name: '+names.join(' | '));
 let refused=false;try{normalizeAddon({...body,catalogs:[{name:'Other',kind:'special',id:'other'}]})}catch{refused=true}
 assert(refused,'only Spotlight catalogs are accepted');
 const deps={source:()=>{throw Error('legacy')},hidden:async()=>new Set(),special:async()=>({lists:[{catalog:{id:'gta6'},items:[{kind:'tv',id:5,name:'Business Proposal'}]},{catalog:{id:'monthly'},items:[{kind:'tv',id:6,name:'Reply 1988'}]}]}),weeklyMetas:async(items:any[])=>items.map(x=>({id:'tt'+x.id,type:'series',name:x.name}))} as any;
 const gta=await loadCatalog(c,0,0,'https://test/addon/token',deps),month=await loadCatalog(c,1,0,'https://test/addon/token',deps);
 assert(gta.metas[0].id==='tt5'&&month.metas[0].id==='tt6','each catalog lists its own list');
 const ended=await loadCatalog(c,0,0,'https://test/addon/token',{...deps,special:async()=>({lists:[{catalog:{id:'monthly'},items:[{kind:'tv',id:6,name:'Reply 1988'}]}]})});
 assert(Array.isArray(ended.metas)&&!ended.metas.length,'after GTA 6 ends its catalog is empty');
});
await test('Top 10 K-dramas and K-movies install in Nuvio and list today\'s ranking',async()=>{
 const c=normalizeAddon({...body,catalogs:[{name:'Top 10 K-Dramas Today',kind:'top10',url:'ydl-top10:tv'},{name:'Top 10 K-Movies Today',kind:'top10',url:'ydl-top10:movie'}]});
 const m=makeManifest(c as any).catalogs;
 assert(m[0].name==='Top 10 Dramas Today (South Korea)'&&m[0].type==='series'&&m[1].name==='Top 10 Movies Today (South Korea)'&&m[1].type==='movie','names and types: '+JSON.stringify(m));
 let refused=false;try{normalizeAddon({...body,catalogs:[{name:'X',kind:'top10',url:'ydl-top10:anime'}]})}catch{refused=true}
 {const f=normalizeAddon({...body,catalogs:[{name:'Top 10 J-Dramas Today',kind:'top10',url:'ydl-top10:tv:JP'},{name:'Thankful for Family',kind:'special',url:'ydl-special:monthly:JP'}]});
  const [t,sp]=f.entries as any[];assert(t.id==='ydl-top10:tv:JP'&&t.top10.country==='JP'&&t.name==='Top 10 Dramas Today (Japan)'&&sp.id==='ydl-special:monthly:JP'&&sp.special.country==='JP','a filtered Top 10 and Spotlight keep their country');
  let bad=false;try{normalizeAddon({...body,catalogs:[{name:'X',kind:'top10',url:'ydl-top10:tv:US'}]})}catch{bad=true}assert(bad,'an unknown country is refused');
  let asked:any[]=[];const d={source:()=>{throw Error('legacy')},hidden:async()=>new Set(),top10:async(c:string)=>{asked.push(c);return{rows:[{catalog:{id:'tv'},items:[{kind:'tv',id:1,name:'X'}]}]}},special:async(c:string)=>{asked.push(c);return{lists:[{catalog:{id:'monthly'},items:[{kind:'tv',id:6,name:'Y'}]}]}},weeklyMetas:async(items:any[])=>items.map(x=>({id:'tt'+x.id,type:'series',name:x.name}))} as any;
  await loadCatalog(f,0,0,'https://test/addon/token',d);await loadCatalog(f,1,0,'https://test/addon/token',d);
  assert(asked.join(',')==='JP,JP','Nuvio loads the country\'s list: '+asked.join(','));}
 assert(refused,'only K-dramas and K-movies exist');
 const deps={source:()=>{throw Error('legacy')},hidden:async()=>new Set(),top10:async()=>({rows:[{catalog:{id:'tv'},items:[{kind:'tv',id:1,name:'Pro Bono'}]},{catalog:{id:'movie'},items:[{kind:'movie',id:2,name:'No Other Choice'}]}]}),weeklyMetas:async(items:any[])=>items.map(x=>({id:'tt'+x.id,type:x.kind==='tv'?'series':'movie',name:x.name}))} as any;
 const dramas=await loadCatalog(c,0,0,'https://test/addon/token',deps),movies=await loadCatalog(c,1,0,'https://test/addon/token',deps);
 assert(dramas.metas[0].name==='Pro Bono'&&movies.metas[0].name==='No Other Choice','each catalog lists its own ranking');
});
await test('original review cards retain wording, truncation and spoiler behavior',()=>{const review=Xe([{overall:10,helpful:43,headline:'Artistic brilliance in every frame.',body:'x'.repeat(700),spoiler:false},{overall:8,helpful:1,body:'secret ending',spoiler:true}],'123-test');assert(review[0].name==='“Artistic brilliance in every frame.”'&&review[0].title.startsWith('★ 10.0/10  ·  43 found this helpful'),'review wording changed');assert(!review[1].title.includes('secret ending')&&review[1].title.includes('Contains spoilers.'),'spoiler exposed');assert(Ge({score:8.1,users:6251,rank:2262,pop:1449,watchers:'19,498'},'123-test').name==='MyDramaList','score card');const v=Sz({completed:'36.1',dropped:'0.6'},'123-test','series',false);assert(v.name==='✓ Verdict'&&v.title==='Viewers usually finish this drama  ·  36.1% completed','verdict changed');const card=Ge({score:8.1,users:6251},'123-test','Plan to Watch');assert(card.title==='★★★★☆ 8.1/10 (6.3K ratings)\nIn your watchlist  ·  Plan to Watch','score card format');assert(!Ge({score:8.1,users:6251},'123-test').title.includes('watchlist'),'status without a match');const open=Go('123-test');assert(open.name==='Open on MyDramaList'&&open.externalUrl.endsWith('/123-test'),'open card')});
await test('watchlist status finds the section holding a title',async()=>{const status=listStatus('Someone',async()=>({1:[{slug:'a'}],3:[{slug:'b'}],7:[{slug:'c'}]}) as any);assert(await status('b')==='Plan to Watch'&&await status('a')==='Currently Watching','wrong section');assert(await status('c')===null&&await status('z')===null,'unknown title should have no status')});
await test('setups up to 60 catalogs are accepted and larger setups name the limit', async () => {
  const catalogs = (n: number) => Array.from({length: n}, (_, i) => ({name: 'List ' + i, url: 'https://mydramalist.com/list/Limit' + String(i).padStart(2, '0')}));
  assert(normalizeAddon({...body, catalogs: catalogs(60)}).entries.length === 60, '60 catalogs rejected');
  let issue = '';
  try { normalizeAddon({...body, catalogs: catalogs(61)}); } catch (error) { issue = (error as {issue?: string}).issue || ''; }
  assert(issue === 'catalog-count', '61 catalogs accepted');
  const warn = console.warn;
  console.warn = () => {};
  try {
    const response = await handleAddon(new Request('https://test/api/addon/configure', {method: 'POST', headers: {origin: 'https://test', 'content-type': 'application/json'}, body: JSON.stringify({...body, catalogs: catalogs(61)})}));
    const result = await response.json();
    assert(response.status === 400 && result.issue === 'catalog-count' && /^YDL-[0-9A-F]{8}$/.test(result.diagnosticCode), 'catalog limit not reported');
  } finally {
    console.warn = warn;
  }
});
await test('a 60-catalog setup fits within the install link limit',async()=>{const catalogs=Array.from({length:60},(_,i)=>({name:'MyDramaList’s Most Popular Shows (South Korea) '+i,url:'https://mydramalist.com/list/Limit'+String(i).padStart(2,'0')}));const token=await createTokenCodec('b'.repeat(64)).seal(normalizeAddon({...body,catalogs}));assert(token.length<=14000,'typical 60-catalog token too long: '+token.length)});
await test('catalog requests past the limit wait their turn instead of failing',async()=>{
  const limiter=createRequestLimiter(2,3,200);const order:number[]=[];
  const job=async(n:number,ms:number)=>{if(!await limiter.acquire())return 'busy';try{await new Promise(r=>setTimeout(r,ms));order.push(n);return 'ok';}finally{limiter.release();}};
  const results=await Promise.all([job(1,30),job(2,30),job(3,10),job(4,10),job(5,10)]);
  assert(results.every(r=>r==='ok'),'queued requests failed: '+results.join(','));
  assert(order.slice(0,2).sort().join()==='1,2'&&order.length===5,'queue order changed');
  assert(limiter.stats().active===0&&limiter.stats().waiting===0,'limiter did not release');
  const full=createRequestLimiter(1,1,50);await full.acquire();const queued=full.acquire();
  assert(await full.acquire()===false,'waiting list should be capped');
  assert(await queued===false,'a request should give up after the wait limit');
});
// Request-level check: rejected requests return a diagnostic code that matches a minimal log line.
await test('manifest diagnostics correlate safe logs with rejected requests', async () => {
  const warnings: string[] = [];
  const warn = console.warn;
  console.warn = (message: string) => { warnings.push(message); };
  try {
    const endpoint = 'https://test/api/addon/configure';
    const headers = {origin: 'https://test', 'content-type': 'application/json'};
    const input = {...body, catalogs: [...body.catalogs, ...body.catalogs], keys: {tmdb: 'private-key'}};
    const response = await handleAddon(new Request(endpoint, {method: 'POST', headers, body: JSON.stringify(input)}));
    const result = await response.json();
    const log = JSON.parse(warnings[0]);
    assert(response.status === 400 && result.error === 'configuration', 'validation response changed');
    assert(/^YDL-[0-9A-F]{8}$/.test(result.diagnosticCode), 'diagnostic code missing');
    assert(log.diagnosticCode === result.diagnosticCode && log.category === 'duplicate-catalog', 'log does not match response');
    assert(Number.isFinite(Date.parse(log.timestamp)), 'missing timestamp');
    assert(Object.keys(log).sort().join(',') === 'category,diagnosticCode,timestamp', 'unexpected diagnostic data');
  } finally {
    console.warn = warn;
  }
});
await test('Spotlight, Top 10 and Because you watched count as their own catalogs, not as community lists',async()=>{
 const {validAnalytics,analyticsCategoryLabel}=await import('./analyticsApi.ts');
 const c=normalizeAddon({...body,catalogs:[{name:'Thankful for Family (Japan)',kind:'special',url:'ydl-special:monthly:JP'},{name:'GTA',kind:'special',url:'ydl-special:gta6'},{name:'Top 10 Dramas Today (South Korea)',kind:'top10',url:'ydl-top10:tv'},{name:'Top 10 Movies Today (China)',kind:'top10',url:'ydl-top10:movie:CN'},{name:'Because you watched X',kind:'recs',slot:1}]});
 const scopes=analyticsScopes(c).filter(s=>s.startsWith('catalog.selected:')||s.endsWith('community-public-list'));
 assert(scopes.join(',')==='catalog.selected:spotlight:monthly:JP,catalog.selected:spotlight:gta6:all,catalog.selected:top10:tv:KR,catalog.selected:top10:movie:CN,catalog.selected:recs:1','scopes: '+scopes.join(','));
 assert(scopes.every(s=>validAnalytics(s.split(':')[0] as any,s.slice(s.indexOf(':')+1))),'every scope is an accepted category');
 assert(analyticsCategoryLabel('spotlight:monthly:JP')==='Spotlight of the month (Japan)'&&analyticsCategoryLabel('spotlight:gta6:all')==='Spotlight · GTA 6'&&analyticsCategoryLabel('top10:movie:CN')==='Top 10 Movies Today (China)'&&analyticsCategoryLabel('recs:1')==='Because you watched · Row 2','labels');
 assert(['spotlight','top10','recommended'].every(s=>validAnalytics('catalog.added',s))&&!validAnalytics('catalog.selected','top10:tv:US'),'Discover Add sources are accepted; unknown countries are not');
});
await test('Configure in Nuvio and Stremio reopens the setup with the same catalogs and no keys',async()=>{
 const full={...body,user:'TestUser',preferences:{reviews:true,hideUnreleased:true},catalogs:[
  {name:'My community list',url:'https://mydramalist.com/list/q1XvK6w3',filter:{type:'drama'}},
  {name:'TestUser’s Watchlist',url:'https://mydramalist.com/dramalist/testuser',kind:'watchlist'},
  {name:'Lee Min Ho',kind:'filmography',mode:'actor',personUrl:'https://mydramalist.com/people/123-lee-min-ho'},
  {...exploreCatalog('top-movies','1'),kind:'explore'},
  {name:'w',kind:'weekly',country:'3',slot:1},
  {name:'Top 10 Dramas Today (Japan)',kind:'top10',url:'ydl-top10:tv:JP'},
  {name:'Thankful for Family (China)',kind:'special',url:'ydl-special:monthly:CN'},
  {name:'Because you watched X',kind:'recs',slot:2},
 ]};
 const c=normalizeAddon(full);
 const again=normalizeAddon({user:c.user,preferences:c.preferences,catalogs:selectionFromConfig(c)});
 const show=(x:any)=>x.entries.map((e:any)=>e.id+'|'+e.name+'|'+e.type).join(' / ');
 assert(show(again)===show(c),'the same catalogs come back:\n'+show(c)+'\n'+show(again));
 assert(makeManifest(c).behaviorHints.configurable===true,'the manifest offers Configure');
 const keyed=normalizeAddon({...body,preferences:{posters:false},rpdb:{apiKey:'t0-SECRETKEY123456'}});
 const page=configurePage(keyed);
 assert(page.includes('ydl-v3-selection')&&page.includes("location.replace('/setup/lists')")&&!page.includes('SECRETKEY')&&!/<\/script>[\s\S]*<\/script>[\s\S]*<\/script>/.test(page),'the page restores the setup without keys');
 Deno.env.set('YDL_MANIFEST_SECRET','c'.repeat(64));
 const made=await handleAddon(new Request('https://test/api/addon/configure',{method:'POST',headers:{origin:'https://test','content-type':'application/json'},body:JSON.stringify(full)}));
 const link=new URL((await made.json()).url);
 const opened=await handleAddon(new Request('https://test'+link.pathname.replace('manifest.json','configure')));
 const html=await opened.text();
 assert(opened.status===200&&opened.headers.get('content-type')?.includes('text/html')&&opened.headers.get('x-robots-tag')==='noindex'&&html.includes('ydl-special:monthly:CN'),'a real install link opens its setup');
 const bad=await handleAddon(new Request('https://test/addon/not-a-token/configure'));
 assert(bad.status===302&&bad.headers.get('location')==='/','a broken link goes to the home page');
});
await test('a sorted or Movies/Shows-filtered Spotlight, Weekly Picks or Because you watched row keeps that in Nuvio',async()=>{
 const items=[{kind:'tv',id:1,name:'Old Show',date:'2015-01-01',score:7},{kind:'movie',id:2,name:'New Film',date:'2025-05-01',score:8},{kind:'tv',id:3,name:'New Show',date:'2024-01-01',score:9}];
 const c=normalizeAddon({...body,user:'TestUser',catalogs:[
  {name:'Thankful for Family (Japan)',kind:'special',url:'ydl-special:monthly:JP?ydlf=x',filter:{sort:'newest'}},
  {name:'w',kind:'weekly',country:'3',slot:0,filter:{type:'drama',sort:'oldest'}},
  {name:'Because you watched X',kind:'recs',slot:1,filter:{sort:'rating'}}]});
 const [sp,wk,rc]=c.entries as any[];
 assert(sp.special.id==='monthly'&&sp.special.country==='JP'&&sp.filter.sort==='newest'&&wk.filter.type==='drama'&&rc.filter.sort==='rating','the filters are kept: '+JSON.stringify(c.entries));
 const deps={source:()=>{throw Error('legacy')},hidden:async()=>new Set(),special:async()=>({lists:[{catalog:{id:'monthly'},items}]}),weekly:async()=>({collections:[{items},{items:[]}]}),recs:async()=>({rows:[{items:[]},{items}]}),weeklyMetas:async(list:any[])=>list.map(x=>({id:'tt'+x.id,type:'series',name:x.name}))} as any;
 const names=async(i:number)=>(await loadCatalog(c,i,0,'https://test/addon/token',deps)).metas.map((m:any)=>m.name).join(',');
 assert(await names(0)==='New Film,New Show,Old Show','Spotlight newest first: '+await names(0));
 assert(await names(1)==='Old Show,New Show','Weekly Picks shows only, oldest first: '+await names(1));
 assert(await names(2)==='New Show,New Film,Old Show','Because you watched by rating: '+await names(2));
 const again=normalizeAddon({user:c.user,preferences:c.preferences,catalogs:selectionFromConfig(c)});
 assert(JSON.stringify(again.entries)===JSON.stringify(c.entries),'Configure keeps the filters');
});
await test('a sorted or Movies-only filmography keeps that in Nuvio and after Configure',async()=>{
 const c=normalizeAddon({...body,catalogs:[{name:'Ann Hui’s Filmography',kind:'filmography',mode:'director',personUrl:'https://mydramalist.com/people/2185-ann-hui',filter:{type:'movie',sort:'oldest'}}]});
 const entry=c.entries[0] as any;
 assert(entry.person==='https://mydramalist.com/people/2185-ann-hui'&&entry.filter.type==='movie'&&entry.filter.sort==='oldest','the filter is kept');
 const named=makeManifest(c).catalogs[0].name;
 assert(entry.name==='Ann Hui’s Classic Movies'&&named==='Ann Hui’s Classic Movies','Netflix-style name with no colon label: '+named);
 const credits=[{id:'1',name:'Elegies',url:'https://mydramalist.com/1-elegies',year:2023,type:'Movie'},{id:'2',name:'A Show',url:'https://mydramalist.com/2-a-show',year:2019,type:'Drama'},{id:'3',name:'A Simple Life',url:'https://mydramalist.com/3-a-simple-life',year:2012,type:'Movie'}];
 const deps={source:()=>{throw Error('legacy')},hidden:async()=>new Set(),people:async()=>Response.json({items:credits}),map:async(items:any[])=>items.map((x:any)=>({id:'tt'+x.slug.split('-')[0],type:'movie',name:x.title,poster:'https://image.tmdb.org/t/p/w500/p.jpg'})),weeklyMetas:async()=>[]} as any;
 const metas=(await loadCatalog(c,0,0,'https://test/addon/token',deps)).metas.map((m:any)=>m.name).join(',');
 assert(metas==='A Simple Life,Elegies','movies only, oldest first: '+metas);
 const back=selectionFromConfig(c)[0] as any;
 assert(back.url.startsWith('ydl-filmography:director:2185?ydlf=')&&back.personId==='2185'&&back.filter.sort==='oldest','Configure gives the page its own address back: '+back.url);
 assert(JSON.stringify(normalizeAddon({...body,catalogs:selectionFromConfig(c)}).entries)===JSON.stringify(c.entries),'Configure round trip');
});
await test('Top Rated filmographies are a Top 10 with Netflix-style names',async()=>{
 const {filmographyName}=await import('./shelfFilters.ts');
 const names=[[{sort:'rating'},'Son Ye Jin’s Top 10 All Time'],[{sort:'rating',type:'movie'},'Son Ye Jin’s Top 10 Movies'],[{sort:'rating',type:'drama'},'Son Ye Jin’s Top 10 Dramas'],[{sort:'newest'},'Son Ye Jin’s Latest'],[{sort:'oldest'},'Son Ye Jin’s Classics'],[{sort:'az'},'Son Ye Jin A to Z'],[{type:'movie'},'Son Ye Jin’s Movies'],[{type:'drama'},'Son Ye Jin’s Dramas'],[null,'Son Ye Jin’s Filmography'],[{sort:'newest',type:'drama'},'Son Ye Jin’s Latest Dramas'],[{sort:'az',type:'movie'},'Son Ye Jin’s Movies A to Z']] as const;
 for(const [filter,name] of names)assert(filmographyName('Son Ye Jin',filter)===name,JSON.stringify(filter)+' → '+filmographyName('Son Ye Jin',filter));
 const c=normalizeAddon({...body,catalogs:[{name:'Son Ye Jin’s Filmography',kind:'filmography',mode:'actor',personUrl:'https://mydramalist.com/people/1-son-ye-jin',personName:'Son Ye Jin',filter:{sort:'rating'}}]});
 assert(makeManifest(c).catalogs[0].name==='Son Ye Jin’s Top 10 All Time','Nuvio name');
 const credits=Array.from({length:14},(_,i)=>({id:String(i+1),name:'T'+(i+1),url:'https://mydramalist.com/'+(i+1)+'-t',year:2000+i,type:'Drama',...(i<12?{score:5+i/4}:{})}));
 const deps={source:()=>{throw Error('legacy')},hidden:async()=>new Set(),people:async()=>Response.json({items:credits}),map:async(items:any[])=>items.map((x:any)=>({id:'tt'+x.slug.split('-')[0],type:'series',name:x.title,poster:'https://image.tmdb.org/t/p/w500/p.jpg'}))} as any;
 const metas=(await loadCatalog(c,0,0,'https://test/addon/token',deps)).metas.map((m:any)=>m.name);
 assert(metas.length===10&&metas[0]==='T12'&&metas[9]==='T3'&&!metas.includes('T13'),'only the ten highest rated, best first: '+metas.join(','));
 const back=selectionFromConfig(c)[0] as any;
 assert(back.name==='Son Ye Jin’s Top 10 All Time'&&back.personName==='Son Ye Jin'&&JSON.stringify(normalizeAddon({...body,catalogs:selectionFromConfig(c)}).entries)===JSON.stringify(c.entries),'Configure keeps the name');
});
await test('one person can have several filmography catalogs, one per sort or Movies/Shows choice',async()=>{
 const base={kind:'filmography',mode:'actor',personUrl:'https://mydramalist.com/people/1-son-ye-jin',personName:'Son Ye Jin',name:'Son Ye Jin’s Filmography'};
 const c=normalizeAddon({...body,catalogs:[base,{...base,filter:{sort:'rating',type:'drama'}},{...base,filter:{sort:'rating',type:'movie'}},{...base,filter:{sort:'newest'}}]});
 assert(new Set(c.entries.map((e:any)=>e.id)).size===4,'four separate catalogs');
 assert(makeManifest(c).catalogs.map((x:any)=>x.name).join(' | ')==='Son Ye Jin’s Filmography | Son Ye Jin’s Top 10 Dramas | Son Ye Jin’s Top 10 Movies | Son Ye Jin’s Latest','each has its own Nuvio name: '+makeManifest(c).catalogs.map((x:any)=>x.name).join(' | '));
});
console.log(JSON.stringify({passed}));
