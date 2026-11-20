import {pacificDate} from "./pacificTime.ts";
import {collections} from './collectionService.ts';
import {COLLECTION_COUNTRIES} from './collections.ts';
// Val Town checks both UTC offsets for midnight Pacific.
// Request-time week validation also covers a delayed or missed scheduled run.
export default async function(){
 const {date,hour}=pacificDate(Date.now());
 if(hour!==0)return [];
 if(date.getUTCDay()!==1)return [];
 const results=[];
 for(const country of Object.keys(COLLECTION_COUNTRIES)){
  try{const data=await collections.weekly(country);results.push({country,status:data.status,titles:data.collections.reduce((n:any,c:any)=>n+c.items.length,0)})}
  catch{results.push({country,status:'unavailable'})}
 }
 console.log(JSON.stringify({weeklyRefresh:results}));return results;
}
