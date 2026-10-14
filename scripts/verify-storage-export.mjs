// Offline integrity check; never connects to Replit or a database.
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root=await realpath(process.argv[2] || '');
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
if(manifest.version!==1 || !Array.isArray(manifest.files)) throw new Error('Unsupported export manifest');
for(const entry of manifest.files){
 if(typeof entry.path!=='string' || entry.path.split('/').some(p=>!p||p==='.'||p==='..'||p.includes('\\')) || path.isAbsolute(entry.path)) throw new Error('Unsafe manifest path');
 const file=await realpath(path.join(root,'objects',entry.path));
 if(!file.startsWith(path.join(root,'objects')+path.sep)) throw new Error('Object escapes backup');
 const bytes=await readFile(file);
 if(bytes.length!==entry.size || createHash('sha256').update(bytes).digest('hex')!==entry.sha256) throw new Error('Object integrity mismatch');
 const metadata=JSON.parse(await readFile(file+'.metadata.json','utf8'));
 if(metadata.contentType!==entry.contentType) throw new Error('Content type mismatch');
}
console.log(`Verified ${manifest.files.length} objects. No files or database rows modified.`);
