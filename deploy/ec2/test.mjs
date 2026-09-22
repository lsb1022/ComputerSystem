import {DatabaseSync} from 'node:sqlite';import {spawn} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {createHash,pbkdf2Sync} from 'node:crypto';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'comsigae-ec2-'));const filename=path.join(dir,'test.sqlite');const origin='http://127.0.0.1:3189';
const child=spawn(process.execPath,['dist-ec2/server.mjs'],{env:{...process.env,APP_ORIGIN:origin,PORT:'3189',HOST:'127.0.0.1',DATABASE_PATH:filename,NODE_ENV:'test'},stdio:['ignore','pipe','inherit']});
try{
 await new Promise((resolve,reject)=>{child.stdout.on('data',b=>{if(b.toString().includes('ready'))resolve()});child.on('exit',()=>reject(Error('Server exited')));setTimeout(()=>reject(Error('Startup timed out')),10000).unref()});
 const database=new DatabaseSync(filename);const hash=s=>createHash('sha256').update(s).digest('hex');
 const password='test-fixture-only',salt='fixture';const passwordHash=pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex');
 const users=Array.from({length:30},(_,i)=>({id:String(99000000+i),token:hash('test-session-'+i)}));
 for(const u of users){database.prepare('INSERT INTO students(id,name,year,role,password_hash,salt,created_at) VALUES(?,?,?,?,?,?,?)').run(u.id,'테스트','1','student',passwordHash,salt,Date.now());database.prepare('INSERT INTO study_sessions VALUES(?,?,?)').run(hash(u.token),u.id,Date.now()+60000)}
 const call=(p,options={})=>fetch(origin+p,{redirect:'manual',...options});
 assert.equal((await call('/course')).status,302);assert.equal((await call('/api/assets?name=question-bank.js')).status,401);
 assert.equal((await call('/server/enrollment.json')).status,404);assert.equal((await call('/../server/enrollment.json')).status,404);
 let r=await call('/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({id:users[0].id,password})});assert.equal(r.status,200);assert.ok(r.headers.get('set-cookie').includes('HttpOnly'));
 const headers={Origin:origin,'Content-Type':'application/json',Cookie:'study_session='+users[0].token};
 assert.equal((await call('/api/admin',{headers})).status,403);
 assert.equal((await call('/api/progress',{method:'POST',headers:{...headers,Origin:'https://wrong.example'},body:JSON.stringify({changes:{}})})).status,403);
 assert.equal((await call('/api/progress',{method:'POST',headers,body:JSON.stringify({changes:{'comsigae-complete':'[1]'}})})).status,409);
 r=await call('/api/posts',{method:'POST',headers,body:JSON.stringify({title:'확인',content:'게시글',anonymous:true})});assert.equal(r.status,201);assert.equal((await r.json()).post.author,'익명');
 await Promise.all(users.map(async u=>{const response=await call('/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({id:u.id,password})});assert.equal(response.status,200)}));
 const durations=[];let requests=0;const start=performance.now();
 await Promise.all(users.map(async u=>{const h={...headers,Cookie:'study_session='+u.token};for(let round=0;round<3;round++)for(const [p,opt]of [['/api/session',{}],['/api/assets?name=question-bank.js',{}],['/api/progress',{method:'POST',body:JSON.stringify({changes:{'response-lesson-1-0':'동시 저장 '+round}})}]]){const t=performance.now();const response=await call(p,{...opt,headers:h});assert.equal(response.status,200);await response.arrayBuffer();durations.push(performance.now()-t);requests++}}));
 const written=database.prepare("SELECT count(*) n FROM study_entries WHERE value='동시 저장 2'").get().n;assert.equal(written,30);
 r=await call('/api/posts',{headers});assert.equal((await r.json()).posts[0].isAnonymous,true);
 database.close();durations.sort((a,b)=>a-b);
 console.log(JSON.stringify({concurrentUsers:30,requests,errors:0,persistedAnswers:written,elapsedMs:Math.round(performance.now()-start),p95Ms:Math.round(durations[Math.ceil(durations.length*.95)-1]),environment:'local Node process; not an EC2 capacity guarantee'},null,2));
}finally{child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));fs.rmSync(dir,{recursive:true,force:true})}
