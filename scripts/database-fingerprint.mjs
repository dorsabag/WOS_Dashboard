// Read-only, repeatable snapshot. Capture on source; compare on isolated destination.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const require=createRequire(new URL('../lib/db/package.json',import.meta.url));
const {Client}=require('pg');
const [mode,file]=process.argv.slice(2);
if(!['capture','check'].includes(mode)||!file) throw new Error('Usage: node scripts/database-fingerprint.mjs capture|check REPORT.json');
if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required; do not print it');
const client=new Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try{
 await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
 await client.query("SET LOCAL TIME ZONE 'UTC'");
 const tables=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
 const result={version:1,tables:{}};
 for(const {tablename} of tables){
  const quoted='"'+tablename.replaceAll('"','""')+'"';
  const rows=(await client.query(`SELECT to_jsonb(t)::text AS row FROM public.${quoted} t ORDER BY to_jsonb(t)::text`)).rows;
  const hash=createHash('sha256'); for(const row of rows) hash.update(row.row+'\n');
  result.tables[tablename]={rows:rows.length,sha256:hash.digest('hex')};
 }
 await client.query('COMMIT');
 if(mode==='capture') await writeFile(file,JSON.stringify(result,null,2),{flag:'wx',mode:0o600});
 else if(JSON.stringify(result)!==JSON.stringify(JSON.parse(await readFile(file,'utf8')))) throw new Error('Database content differs from the source fingerprint');
 console.log(`${mode==='capture'?'Captured':'Verified'} ${tables.length} table fingerprints using read-only SQL. No row contents printed.`);
}finally{await client.end();}
