// Synthetic MDL-shaped examples for offline tests. Never used as live data.
const row=(id:number,title:string,year:number,type='Main Role')=>`<tr><td class="year">${year}</td><td class="title"><b><a href="/${id}-fixture-title">${title}</a></b></td><td class="role"><span class="roleid">${type}</span></td></tr>`;
const table=(heading:string,rows:string)=>`<h5 class="header">${heading}</h5><table class="film-list"><tbody>${rows}</tbody></table>`;
export const actorHtml=`<link rel="canonical" href="https://mydramalist.com/people/293-son-ye-jin"><h1 class="film-title">Son Ye Jin</h1><ul><li><b>Native name:</b> 손예진</li><li><b>Nationality:</b> South Korean</li><li><b>Born:</b> January 11, 1982</li></ul><div class="box"><div data-component="person-view"></div><div class="box-body"><div class="col-sm-8">Son Ye Jin is a South Korean actress. This is a synthetic biography used to test complete text extraction.<br>(Source: Synthetic fixture)</div></div></div>`+
 table('Drama',row(990001,'Variety',2027)+Array.from({length:16},(_,i)=>row(991000+i,'Example drama '+i,2020-i)).join(''))+
 table('Movie',row(990002,'No Other Choice',2025)+Array.from({length:17},(_,i)=>row(992000+i,'Example movie '+i,2019-i)).join(''))+
 table('TV Show',row(993000,'Excluded variety appearance',2026));
export const directorHtml=`<link rel="canonical" href="https://mydramalist.com/people/15987-park-chan-wook"><h1 class="film-title">Park Chan Wook</h1><ul><li><b>Native name:</b> 박찬욱</li><li><b>Nationality:</b> South Korean</li></ul>`+
 table('Screenwriter',row(6891,'Excluded screenplay',2024,'Movie'))+
 table('Director',row(753165,'Excluded separate director section',2024,'Drama'))+
 table('Screenwriter &amp; Director',row(994001,'No Other Choice',2025,'Movie')+Array.from({length:6},(_,i)=>row(994100+i,'Example combined credit '+i,2022-i,'Movie')).join(''))+
 table('Screenwriter &amp; Director',row(994002,'Day Trip',2012,'Movie')+Array.from({length:6},(_,i)=>row(994200+i,'Example older combined credit '+i,2011-i,'Drama')).join(''));
