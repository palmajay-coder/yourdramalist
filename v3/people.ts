import { load } from 'npm:cheerio@1.0.0';
const origin='https://mydramalist.com';
const clean=(s:string)=>s.replace(/\s+/g,' ').trim();
export type Mode='actor'|'director';
export function personUrl(raw:string):string|null{
 try{const u=new URL(raw);return u.protocol==='https:'&&['mydramalist.com','www.mydramalist.com'].includes(u.hostname)&&!u.username&&!u.password&&!u.port&&/^\/people\/[1-9]\d{0,11}-[A-Za-z0-9-]{1,200}\/?$/.test(u.pathname)?origin+u.pathname.replace(/\/$/,''):null}catch{return null}
}
export function remoteImage(raw:string|undefined):string|null{try{const u=new URL(raw||'');return u.protocol==='https:'&&u.hostname==='i.mydramalist.com'&&!u.username&&!u.password&&!u.port?u.href:null}catch{return null}}
export interface Credit{id:string;name:string;url:string;year:number|null;type:string;role:string|null;poster:string|null;}
export function extractPerson(html:string,expected:string){
 const $=load(html);const canonical=personUrl($('link[rel=canonical]').attr('href')||'');
 const id=expected.match(/\/people\/(\d+)-/)?.[1];
 if(!id||canonical?.match(/\/people\/(\d+)-/)?.[1]!==id)throw Error('MyDramaList returned an unexpected person page.');
 const name=clean($('h1.film-title').first().text());
 if(!name)throw Error('This person page could not be read.');
 const field=(label:string)=>{const b=$('li > b').filter((_,el)=>clean($(el).text())===label+':').first();return b.length?clean(b.parent().text().slice(b.text().length)):null};
 const nativeName=field('Native name');const nationality=field('Nationality');const born=field('Born');
 const content=$('[data-component="person-view"]').closest('.box').children('.box-body').first().find('.col-sm-8').first().clone();
 content.find('.hidden-md-up,script,style,button,a[href*="/edit/"]').remove();content.find('br').replaceWith('\n');
 const biography=content.text().trim()||null;
 const poster=remoteImage($('meta[property="og:image"]').attr('content'))||remoteImage($('link[rel=image_src]').attr('href'))||remoteImage($('.cover img').first().attr('data-src'))||remoteImage($('.cover img').first().attr('src'));
 const filmographies:{actor:Credit[];director:Credit[]}={actor:[],director:[]};
 const sections:{actor:number;director:number}={actor:0,director:0};
 $('h5.header').each((_,el)=>{
  const heading=clean($(el).text());const mode:Mode|null=heading==='Drama'||heading==='Movie'?'actor':heading==='Screenwriter & Director'?'director':null;
  if(!mode)return;const table=$(el).next('table.film-list');if(!table.length)return;sections[mode]++;
  table.find('tbody > tr').each((_,row)=>{
   const tr=$(row);const a=tr.find('td.title b > a[href]').first();const title=clean(a.text());
   let u:URL;try{u=new URL(a.attr('href')||'',origin)}catch{return}
   const match=u.pathname.match(/^\/([1-9]\d*)-[A-Za-z0-9-]+\/?$/);
   if(u.origin!==origin||u.username||u.password||!match||!title)return;
   const yearText=clean(tr.find('td.year').first().text());const year=/^(?:18|19|20|21)\d{2}$/.test(yearText)?Number(yearText):null;
   const image=tr.find('td.title img').first();
   filmographies[mode].push({id:match[1],name:title,url:origin+u.pathname.replace(/\/$/,''),year,type:mode==='actor'?heading:clean(tr.find('td.role .roleid').first().text())||'Title',role:mode==='actor'?clean(tr.find('td.role .roleid').first().text())||null:'Screenwriter & Director',poster:remoteImage(image.attr('data-src'))||remoteImage(image.attr('src'))});
  });
 });
 for(const mode of ['actor','director'] as const){
  const unique=new Map<string,Credit>();for(const credit of filmographies[mode])if(!unique.has(credit.id))unique.set(credit.id,credit);
  // MDL provides years here, not exact release dates. Preserve MDL order within a year.
  filmographies[mode]=[...unique.values()].sort((a,b)=>(b.year??-1)-(a.year??-1));
 }
 return {id,name,nativeName,displayName:name+(nativeName?' ('+nativeName+')':''),nationality,born,biography,poster,url:canonical!,filmographies,sections};
}
export type Person=ReturnType<typeof extractPerson>;
export function personSummary(person:Person){const {filmographies,sections,...summary}=person;return {...summary,actorCount:filmographies.actor.length,directorCount:filmographies.director.length};}
export function makeFilmography(person:Person,mode:Mode){
 const items=person.filmographies[mode];const id='ydl-filmography:'+mode+':'+person.id;
 const endpoint='/api/mdl/filmography?mode='+mode+'&url='+encodeURIComponent(person.url);
 const catalog={id,name:person.name+'’s Filmography',sourceType:'filmography',personId:person.id,mode,sort:'release-desc',sortPrecision:'year',endpoint};
 return {catalog,items,sectionFound:person.sections[mode]>0,list:{kind:'filmography',url:id,catalogId:id,name:catalog.name,personId:person.id,personName:person.name,personDisplayName:person.displayName,personUrl:person.url,mode,sort:'release-desc',catalogEndpoint:endpoint,profileAvatar:person.poster,posters:items.map(x=>x.poster).filter((x):x is string=>!!x).slice(0,5),count:items.length,description:person.name+'’s screen credits, newest first.'}};
}
export function extractPeopleSearch(html:string,target:URL){
 const $=load(html);if(!/Search results/i.test($('title').text()))throw Error('MyDramaList did not return a people search page.');
 const people:{id:string;name:string;url:string;poster:string|null;nationality:string|null;biography:string|null}[]=[];const seen=new Set<string>();
 $('.box').each((_,el)=>{const card=$(el);const title=card.find('.content .title > a[href]').first();let raw:string;try{raw=new URL(title.attr('href')||'',origin).href}catch{return}
 const url=personUrl(raw);if(!url)return;const id=url.match(/\/people\/(\d+)-/)![1];const name=clean(title.text());if(!name||seen.has(id))return;seen.add(id);
 const image=card.find('.cover img').first();people.push({id,name,url,poster:remoteImage(image.attr('data-src'))||remoteImage(image.attr('src')),nationality:clean(card.find('.content > .text-muted').first().text())||null,biography:card.find('.content > p').first().text().trim()||null});});
 const page=Number(target.searchParams.get('page')||1);
 const hasNextPage=$('.pagination a[href]').toArray().some(el=>{try{const u=new URL($(el).attr('href')!,target);return u.origin===origin&&u.pathname==='/search'&&Number(u.searchParams.get('page'))===page+1}catch{return false}});
 return {people,hasNextPage};
}
