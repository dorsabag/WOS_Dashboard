// Add verified files to a NEW restored destination. Existing objects are never replaced.
import { createRequire } from 'node:module';
import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const require=createRequire(new URL('../lib/db/package.json',import.meta.url));
const {Client}=require('pg');
const root=process.argv[2];
if(!root || !process.env.DATABASE_URL) throw new Error('Set destination DATABASE_URL securely and pass the restored bundle directory');
const files=[];
for(const [directory,prefix] of [['objects/uploads','/objects/uploads/'],['static/icons','/assets/icons/']]) {
 for(const name of await readdir(path.join(root,directory))) {
  if(name.endsWith('.metadata.json')) continue;
  if(!/^[a-zA-Z0-9_. -]+$/.test(name)||name==='.'||name==='..') throw new Error('Unsafe file name');
  const filename=path.join(root,directory,name);
  if(!(await lstat(filename)).isFile()) throw new Error('Only regular files can be imported');
  const contents=await readFile(filename);
  let contentType;
  if(prefix.startsWith('/objects/')) contentType=JSON.parse(await readFile(filename+'.metadata.json','utf8')).contentType;
  else contentType=({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml'})[name.split('.').pop().toLowerCase()];
  if(typeof contentType!=='string'||!contentType) throw new Error('Missing content type');
  files.push({key:prefix+name,contents,contentType,sha:createHash('sha256').update(contents).digest('hex')});
 }
}
const db=new Client({connectionString:process.env.DATABASE_URL}); await db.connect();
try {
 await db.query('BEGIN');
 await db.query('LOCK TABLE file_objects IN EXCLUSIVE MODE');
 if(Number((await db.query('SELECT count(*) FROM file_objects')).rows[0].count)!==0) throw new Error('Destination file_objects must be empty; no existing files were changed');
 for(const file of files) await db.query('INSERT INTO file_objects(object_path,content_type,contents,sha256) VALUES($1,$2,$3,$4)',[file.key,file.contentType,file.contents,file.sha]);
 const stored=(await db.query('SELECT object_path,contents,sha256 FROM file_objects')).rows;
 const expected=new Map(files.map(f=>[f.key,f.sha]));
 if(stored.length!==files.length||stored.some(f=>expected.get(f.object_path)!==f.sha256||createHash('sha256').update(f.contents).digest('hex')!==f.sha256)) throw new Error('File verification failed');
 await db.query('COMMIT');
 console.log(`Imported and verified ${files.length} files (${files.reduce((n,f)=>n+f.contents.length,0)} bytes). Original files unchanged.`);
} catch(error) { await db.query('ROLLBACK'); throw error; } finally { await db.end(); }
