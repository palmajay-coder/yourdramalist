import {normalizeAddon,createTokenCodec,makeManifest,loadCatalog,handleAddon} from './addon.ts';
import {Ge,Sz,Xe} from './addonCore.ts';
import {exploreCatalog} from './explore.ts';
let passed=0;const assert=(v:any,m:string)=>{if(!v)throw Error(m)};async function test(name:string,fn:()=>any){await fn();passed++;console.log('PASS '+name)};
const body={catalogs:[{name:'My community list',url:'https://mydramalist.com/list/q1XvK6w3'}],preferences:{reviews:true},user:'TestUser'};
await test('manifest keeps names and order without upstream requests',()=>{const c=normalizeAddon({...body,catalogs:[...body.catalogs,exploreCatalog('top-movies','1')]});const m=makeManifest(c);assert(m.catalogs[0].name==='My community list'&&m.catalogs[1].type==='movie','catalog order/type');assert(m.resources.some((x:any)=>x.name==='stream'),'reviews resource missing')});
await test('no review resource when disabled',()=>{assert(!makeManifest(normalizeAddon({...body,preferences:{}})).resources.some((x:any)=>x.name==='stream'),'review resource retained')});
await test('unsupported sources are rejected',()=>{for(const url of ['https://evil.test/list/q1XvK6w3','https://mydramalist.com/people/123-x','r.TestUser']){let failed=false;try{normalizeAddon({...body,catalogs:[{url,name:'test'}]})}catch{failed=true}assert(failed,'unsafe/unapproved source accepted')}});
await test('filmography configuration preserves exact person identity and role',()=>{const c=normalizeAddon({...body,catalogs:[{name:'Park Chan Wook’s Filmography',kind:'filmography',mode:'director',personUrl:'https://mydramalist.com/people/15987-park-chan-wook'}]});assert(c.entries[0].mode==='director'&&c.entries[0].person?.includes('15987'),'wrong person or role')});
await test('unused keys are removed from configuration',()=>{const c=normalizeAddon({...body,keys:{tmdb:'private-key',mdblist:'another-key'}});assert(!JSON.stringify(c).includes('private-key'),'unused keys retained')});
await test('encrypted configuration round trips without revealing API keys',async()=>{const keys={tmdb:'a'.repeat(32),mdblist:'fake-key-for-unit-test'};const c=normalizeAddon({...body,preferences:{posters:true},keys});const codec=createTokenCodec('b'.repeat(64)),token=await codec.seal(c);assert(!token.includes(keys.tmdb)&&!token.includes(keys.mdblist),'plaintext key exposed');assert((await codec.open(token)).keys.tmdb===keys.tmdb,'roundtrip failed');let rejected=false;try{await codec.open(token.slice(0,-8)+'AAAAAAAA')}catch{rejected=true}assert(rejected,'tampered token accepted')});
await test('mixed catalogs preserve source order and filter future/hidden titles',async()=>{const c=normalizeAddon({...body,preferences:{hideUnreleased:true,hideCompleted:true}});const items=[{slug:'1-first',title:'first',type:'Movie',year:2020},{slug:'2-hidden',title:'hidden',type:'Drama',year:2020},{slug:'3-future',title:'future',type:'Drama',year:2999},{slug:'4-last',title:'last',type:'Drama',year:2021}];const result=await loadCatalog(c,0,0,'https://test/addon/token',{source:async()=>({items}),hidden:async()=>new Set(['2-hidden']),people:()=>{throw Error('unexpected')},map:async(items:any[],type:string)=>items.map(x=>({id:'tt'+x.slug.split('-')[0],name:x.title,type,poster:'https://image.test/poster.jpg'}))} as any);assert(result.metas.map(x=>x.name).join(',')==='first,last','order/filter mismatch')});
await test('actor/director catalog uses V3 role-filtered newest-first data',async()=>{let requested='';const c=normalizeAddon({...body,catalogs:[{name:'Director',kind:'filmography',mode:'director',personUrl:'https://mydramalist.com/people/15987-park-chan-wook'}]});const result=await loadCatalog(c,0,0,'https://test/addon/token',{source:()=>{throw Error('legacy person table used')},hidden:async()=>new Set(),people:async(req:Request)=>{requested=req.url;return Response.json({items:[{url:'https://mydramalist.com/2-new',name:'new',type:'Movie',year:2025},{url:'https://mydramalist.com/1-old',name:'old',type:'Drama',year:2020}]})},map:async(items:any[],type:string)=>items.map(x=>({id:'tt'+x.slug.split('-')[0],name:x.title,type,poster:'https://image.test/poster.jpg'}))} as any);assert(new URL(requested).searchParams.get('mode')==='director'&&result.metas[0].name==='new','V3 filmography changed')});
await test('original review cards retain wording, truncation and spoiler behavior',()=>{const review=Xe([{overall:10,helpful:43,headline:'Artistic brilliance in every frame.',body:'x'.repeat(700),spoiler:false},{overall:8,helpful:1,body:'secret ending',spoiler:true}],'123-test');assert(review[0].name==='“Artistic brilliance in every frame.”'&&review[0].title.startsWith('★ 10.0/10  ·  43 found this helpful'),'review wording changed');assert(!review[1].title.includes('secret ending')&&review[1].title.includes('Contains spoilers.'),'spoiler exposed');assert(Ge({score:8.1,users:6251,rank:2262,pop:1449,watchers:'19,498'},'123-test').name==='MyDramaList','score card');assert(Sz({completed:'36.1',dropped:'0.6'},'123-test','series',false).title.includes('Viewers usually finish this drama.'),'verdict changed')});

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

console.log(JSON.stringify({passed}));
