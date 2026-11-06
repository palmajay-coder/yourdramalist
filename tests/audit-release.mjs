import {readdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,relative} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const patterns=[
 ['GitHub token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/g],
 ['Google API key',/\bAIza[A-Za-z0-9_-]{35}\b/g],
 ['AWS access key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
 ['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
 ['personal install URL',/https?:\/\/[^\s"'<>]+\/addon\/[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{32,}\/manifest\.json/g],
 ['browser CSRF capture',/<meta[^>]+name=["']csrf-token["'][^>]*content=["'][^"']{8,}["']/gi],
];
const findings=[];let scanned=0;
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name),name=relative(root,path);if(entry.isDirectory()){if([".git","node_modules",".deno","coverage"].includes(entry.name))continue;await walk(path);continue;}if(name==='tests/audit-release.mjs')continue;if((/^\.env(?:\.|$)/.test(entry.name)&&entry.name!=='.env.example')||/\.(pem|key|log|har|zip)$/i.test(entry.name)){findings.push({path:name,reason:'private or diagnostic file type'});continue;}if(/\.(png|jpe?g|webp)$/i.test(entry.name))continue;const text=await readFile(path,'utf8');scanned++;for(const [reason,pattern] of patterns){pattern.lastIndex=0;for(const match of text.matchAll(pattern)){findings.push({path:name,line:text.slice(0,match.index).split('\n').length,reason});}}}}
await walk(root);
export const auditReport={scanned,findings};
if(findings.length)throw Error('Release scan failed: '+JSON.stringify(findings));
console.log('PASS release scan: '+scanned+' text files; no matches in configured secret/private-capture checks.');
