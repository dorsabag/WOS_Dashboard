// Run ONLY in the existing Replit workspace. This tool only lists/reads objects.
import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const require = createRequire(new URL('../artifacts/api-server/package.json', import.meta.url));
const { Storage } = require('@google-cloud/storage');
const destination = process.argv[2];
if (!destination) throw new Error('Usage: node scripts/export-replit-files.mjs NEW_BACKUP_DIRECTORY');
// Refuse existing directories so an export cannot replace a previous backup.
await mkdir(destination, {mode:0o700});
const sidecar = 'http://127.0.0.1:1106';
const storage = new Storage({ credentials:{
  audience:'replit', subject_token_type:'access_token', type:'external_account',
  token_url:`${sidecar}/token`, credential_source:{url:`${sidecar}/credential`,format:{type:'json',subject_token_field_name:'access_token'}},
  universe_domain:'googleapis.com',
},projectId:''});
const roots = [{source:process.env.PRIVATE_OBJECT_DIR,target:''},
  ...(process.env.PUBLIC_OBJECT_SEARCH_PATHS || '').split(',').map(s=>s.trim()).filter(Boolean).map(source=>({source,target:'public'}))];
if (!roots[0].source) throw new Error('PRIVATE_OBJECT_DIR must be provided by the existing Replit environment');
const manifest=[];
for (const root of roots) {
  const [bucket,...rest] = root.source.replace(/^\//,'').replace(/\/$/,'').split('/');
  const prefix=rest.join('/')+'/';
  const [files]=await storage.bucket(bucket).getFiles({prefix});
  for (const file of files) {
    if(file.name.endsWith('/')) continue;
    const relative=path.posix.join(root.target,file.name.slice(prefix.length));
    if(relative.split('/').some(p=>!p||p==='.'||p==='..'||p.includes('\\')) || path.isAbsolute(relative)) throw new Error('Unsafe object path in export');
    const local=path.join(destination,'objects',relative);
    await mkdir(path.dirname(local),{recursive:true,mode:0o700});
    const bytes=(await file.download())[0];
    await writeFile(local,bytes,{flag:'wx',mode:0o600});
    const [metadata]=await file.getMetadata();
    const contentType=metadata.contentType || 'application/octet-stream';
    await writeFile(local+'.metadata.json',JSON.stringify({contentType}),{flag:'wx',mode:0o600});
    manifest.push({path:relative,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),contentType});
  }
}
await writeFile(path.join(destination,'manifest.json'),JSON.stringify({version:1,files:manifest},null,2),{flag:'wx',mode:0o600});
console.log(`Exported ${manifest.length} objects; originals unchanged. Keep this directory private.`);
