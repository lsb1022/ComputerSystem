import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';import path from 'node:path';
const filename=path.resolve(process.env.DATABASE_PATH||'data/study.sqlite');fs.mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});
const connection=new DatabaseSync(filename,{timeout:5000});
connection.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
connection.exec('CREATE TABLE IF NOT EXISTS ec2_migrations(name TEXT PRIMARY KEY)');
for(const name of fs.readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort()){
 if(connection.prepare('SELECT name FROM ec2_migrations WHERE name=?').get(name))continue;
 connection.exec('BEGIN IMMEDIATE');try{connection.exec(fs.readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));connection.prepare('INSERT INTO ec2_migrations VALUES(?)').run(name);connection.exec('COMMIT')}catch(e){connection.exec('ROLLBACK');throw e}
}
connection.exec('CREATE INDEX IF NOT EXISTS study_entries_user ON study_entries(user_id); CREATE INDEX IF NOT EXISTS study_activity_user ON study_activity(user_id,id); CREATE INDEX IF NOT EXISTS study_sessions_expiry ON study_sessions(expires_at);');
function prepare(sql,args=[]){return{
 bind(...values){return prepare(sql,values)},
 async first(){return connection.prepare(sql).get(...args)??null},
 async all(){return {results:connection.prepare(sql).all(...args)}},
 execute(){const result=connection.prepare(sql).run(...args);return {success:true,meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}}},
 async run(){return this.execute()}
}}
const database={prepare,async batch(statements){connection.exec('BEGIN IMMEDIATE');try{const result=statements.map(s=>s.execute());connection.exec('COMMIT');return result}catch(e){connection.exec('ROLLBACK');throw e}}};
export function db(){return database}
export const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function sameOrigin(request){return request.headers.get('origin')===new URL(request.url).origin&&request.headers.get('sec-fetch-site')!=='cross-site'}
