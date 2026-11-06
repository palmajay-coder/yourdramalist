import {extractListOwner,listUrl,handleListOwner} from './listOwnerApi.ts';
const url='https://mydramalist.com/list/ABC';
let passed=0;function check(ok:unknown,name:string){if(!ok)throw Error(name);passed++;console.log('PASS '+name)}
const page=(body:string)=>'<link rel="canonical" href="'+url+'">'+body;
const owner=extractListOwner(page('<div class="last-updated"><a href="/profile/Cryssy">Cryssy Anne</a></div><a href="/profile/Other">Commenter</a>'),url);
check(owner.profile==='Cryssy'&&owner.profileName==='Cryssy Anne','creator from author area, not comments');
for(const body of ['<div class="last-updated"><a href="https://evil.com/profile/Fake">Fake</a></div>','<a href="/profile/Commenter">Commenter</a>','<div class="last-updated"><a href="/profile/A">A</a><a href="/profile/B">B</a></div>']){
let threw=false;try{extractListOwner(page(body),url)}catch{threw=true}check(threw,'reject missing unsafe or ambiguous creator')}
let threw=false;try{extractListOwner(page('<div class="last-updated"><a href="/profile/A">A</a></div>'),'https://mydramalist.com/list/OTHER')}catch{threw=true}check(threw,'canonical identity mismatch');
for(const u of ['http://mydramalist.com/list/ABC','https://evil.com/list/ABC','https://mydramalist.com/list/create','https://mydramalist.com:444/list/ABC'])check(listUrl(u)===null,'invalid list URL');
check(listUrl(url+'?sort=1#comment')===url,'canonical normalization');
check((await handleListOwner(new Request('https://test/?url=https://evil.com/list/ABC'))).status===400,'endpoint invalid URL');
check((await handleListOwner(new Request('https://test/',{method:'POST'}))).status===405,'endpoint GET only');
console.log(JSON.stringify({passed}));