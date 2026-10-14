// Read-only link check after restoring SQL and file backups into the new destination.
import { createRequire } from 'node:module';
import { realpath, lstat } from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(new URL('../lib/db/package.json',import.meta.url));
const {Client}=require('pg');
if(!process.env.DATABASE_URL || !process.env.OBJECT_STORAGE_DIR) throw new Error('Set destination DATABASE_URL and OBJECT_STORAGE_DIR securely');
const root=await realpath(process.env.OBJECT_STORAGE_DIR);
const db=new Client({connectionString:process.env.DATABASE_URL});
await db.connect();
try{
 await db.query('BEGIN READ ONLY');
 const rows=(await db.query('SELECT object_path FROM notes_images')).rows;
 let missing=0;
 for(const row of rows){
  const prefix='/objects/'; const value=row.object_path;
  if(typeof value!=='string'||!value.startsWith(prefix)||value.slice(prefix.length).split('/').some(p=>!p||p==='.'||p==='..'||/[\\\0%]/.test(p))){ missing++;continue; }
  const candidate=path.join(root,value.slice(prefix.length));
  try{const resolved=await realpath(candidate);if(!resolved.startsWith(root+path.sep)||!(await lstat(candidate)).isFile())missing++;}
  catch(e){if(e.code==='ENOENT')missing++;else throw e;}
 }
 await db.query('COMMIT');
 console.log(`Checked ${rows.length} stored image references; ${missing} missing or unsafe. No data changed.`);
 if(missing) process.exitCode=1;
}finally{await db.end();}
