import {collections} from './collectionService.ts';
import {COLLECTION_COUNTRIES} from './collections.ts';
// Val Town schedule: 0 0 * * 1 (Monday, 00:00 UTC).
// Request-time week validation also covers a delayed or missed scheduled run.
export default async function(){
 const results=[];
 for(const country of Object.keys(COLLECTION_COUNTRIES)){
  try{const data=await collections.weekly(country);results.push({country,status:data.status,titles:data.collections.reduce((n:any,c:any)=>n+c.items.length,0)})}
  catch{results.push({country,status:'unavailable'})}
 }
 console.log(JSON.stringify({weeklyRefresh:results}));return results;
}
