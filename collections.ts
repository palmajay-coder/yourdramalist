import {pacificDate, pacificMidnight} from "./pacificTime.ts";
// Stable weekly slots: installation IDs never include a date or theme name.
export const COLLECTION_COUNTRIES:Record<string,string>={"3":"KR","2":"CN","1":"JP","5":"TW","6":"TH"};
export const THEMES=[
 {name:"Bring the Tissues",description:"Stories worth a few tears.",keywords:["tragedy","heartbreak","terminal illness"]},
 {name:"Love With a Twist",description:"Romance that keeps you guessing.",keywords:["love triangle","enemies to lovers","fake relationship"]},
 {name:"A Little Comfort",description:"Good company for a quiet night.",keywords:["friendship","slice of life"]},
 {name:"One More Episode",description:"Mysteries that keep you watching.",genre:"9648"},
 {name:"Another Time",description:"Step into stories from the past.",keywords:["historical","period drama"]},
 {name:"Under Suspicion",description:"Crime stories with something to hide.",genre:"80"},
];
export function weekWindow(time=Date.now()){
 const {date:d}=pacificDate(time);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));
 const start=d.getTime(),index=Math.floor((start-Date.UTC(2026,10,2))/604800000);
 return{week:d.toISOString().slice(0,10),nextRefresh:new Date(pacificMidnight(new Date(start+604800000))).toISOString(),themes:[0,1].map(i=>THEMES[((index*2+i)%THEMES.length+THEMES.length)%THEMES.length])};
}
export function weeklyCatalog(country:string,slot:number){
 if(!COLLECTION_COUNTRIES[country]||![0,1].includes(slot))throw Error("Invalid collection");
 const names:Record<string,string>={"3":"South Korea","2":"China","1":"Japan","5":"Taiwan","6":"Thailand"};
 const theme=weekWindow().themes[slot];
 return{kind:"weekly",country,slot,url:"weekly:"+country+":"+slot,name:theme.name+" ("+names[country]+")",description:theme.description,profile:"YourDramaList",types:["series"],posters:[]};
}
export function posterUrl(path:unknown){return typeof path==="string"&&/^\/[a-zA-Z0-9]+\.(jpg|png|webp)$/.test(path)?"https://image.tmdb.org/t/p/w780"+path:null;}
export function normalizeTitle(value:string){return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,"");}
export function matchArtwork(item:any,results:any[],kind:string,country=""){
 const year=String(item.details||"").match(/\b(19|20)\d{2}\b/)?.[0];if(!year)return null;
 const matches=results.filter(r=>!r.adult&&posterUrl(r.poster_path)&&String(r.first_air_date||r.release_date||"").slice(0,4)===year&&[r.name,r.title,r.original_name,r.original_title].some(n=>n&&normalizeTitle(n)===normalizeTitle(item.name))&&(kind!=="tv"||(country?r.origin_country?.includes(COLLECTION_COUNTRIES[country]):r.origin_country?.some((c:string)=>["KR","JP","CN","TW","TH","HK"].includes(c)))));
 return matches.length===1?posterUrl(matches[0].poster_path):null;
}
