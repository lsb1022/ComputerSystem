import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import fs from 'node:fs';
console.log('Ready for local test credentials on stdin');
const credentials=JSON.parse(fs.readFileSync(0,'utf8'));
const child=spawn(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--inspector-port','0','--port','8791'],{stdio:['ignore','pipe','pipe']});
const base='http://127.0.0.1:8791';let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
const results=[];const check=(name,actual,expected)=>{assert.deepEqual(actual,expected,name);results.push(name);console.log("PASS "+name)};
async function call(path,{cookie,body,origin=base}={}){const r=await fetch(base+path,{method:body?'POST':'GET',redirect:'manual',signal:AbortSignal.timeout(15000),headers:{...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json',Origin:origin}:{})},body:body?JSON.stringify(body):undefined});let data;try{data=await r.json()}catch{}return{r,data,cookie:r.headers.get('set-cookie')?.split(';')[0]}}
try{
 await new Promise((resolve,reject)=>{const timer=setInterval(()=>{if(logs.includes('Ready on')){clearInterval(timer);clearTimeout(timeout);resolve()}},200);const timeout=setTimeout(()=>{clearInterval(timer);reject(Error('Built test server failed to start'))},30000)});
 for(const route of ['/api/session','/api/admin','/api/posts','/api/assets?name=question-bank.js'])check('anonymous '+route,(await call(route)).r.status,401);
 check('course requires login',(await call('/course')).r.status,302);
 check('old static bank unavailable',(await call('/question-bank.js')).r.status,404);
 const admin=await call('/api/auth/login',{body:credentials.admin});check('admin login',admin.r.status,200);assert.ok(admin.cookie);check('httpOnly cookie',admin.r.headers.get('set-cookie').includes('HttpOnly'),true);
 const student=await call('/api/auth/login',{body:credentials.student});check('student login',student.r.status,200);
 const other=await call('/api/auth/login',{body:credentials.other});check('second student login',other.r.status,200);
 check('student cannot read admin',(await call('/api/admin',{cookie:student.cookie})).r.status,403);
 check('cross origin blocked',(await call('/api/progress',{cookie:student.cookie,origin:'http://other.invalid',body:{changes:{}}})).r.status,403);
 const studentInitial=(await call('/api/session',{cookie:student.cookie})).data.entries;
 check('out of order rejected',(await call('/api/progress',{cookie:student.cookie,body:{changes:{'comsigae-complete':'[2]'}}})).r.status,409);
 check('empty assignment rejected',(await call('/api/progress',{cookie:student.cookie,body:{changes:{'comsigae-assignment-complete':'[1]'}}})).r.status,409);
 const answers=Object.fromEntries(Array.from({length:12},(_,i)=>['response-1-'+(i+1),'local verification '+(i+1)]));answers['comsigae-complete']='[1,2]';answers['comsigae-assignment-complete']='[1]';
 check('valid progress accepted',(await call('/api/progress',{cookie:student.cookie,body:{changes:answers}})).r.status,200);
 const fresh=(await call('/api/session',{cookie:student.cookie})).data;check('persisted answer',fresh.entries['response-1-12'],'local verification 12');
 const isolated=(await call('/api/session',{cookie:other.cookie})).data;check('student records isolated',isolated.entries['response-1-12'],undefined);
 const overview=await call('/api/admin',{cookie:admin.cookie});check('roster exactly 21',overview.data.students.length,21);
 const detail=(await call('/api/admin?id='+credentials.student.id,{cookie:admin.cookie})).data;check('admin sees exact progress',[detail.summary.lessons,detail.summary.assignments,detail.summary.assignmentAnswers],[2,1,12]);
 const course=await fetch(base+'/course',{headers:{cookie:student.cookie}});check('authenticated course',course.status,200);const html=await course.text();assert.ok(html.includes('name=bootstrap.js'));
 const bank=await fetch(base+'/api/assets?name=question-bank.js',{headers:{cookie:student.cookie}});check('authenticated material',bank.status,200);
 check('no enrollment endpoint',(await call('/api/assets?name=enrollment.json',{cookie:student.cookie})).r.status,404);
 const reset=Object.fromEntries(Object.keys(answers).map(k=>[k,studentInitial[k]??(k.includes('complete')?'[]':'')]));check('test answers restored',(await call('/api/progress',{cookie:student.cookie,body:{changes:reset}})).r.status,200);
 check('logout',(await call('/api/auth/logout',{cookie:student.cookie,body:{}})).r.status,200);check('revoked session rejected',(await call('/api/session',{cookie:student.cookie})).r.status,401);
 for(const c of[admin.cookie,other.cookie])await call('/api/auth/logout',{cookie:c,body:{}});
 fs.writeFileSync('scripts/access-test-result.json',JSON.stringify({passed:results.length,checks:results},null,2));console.log(JSON.stringify({passed:results.length,checks:results}));
}catch(e){console.error(e.message);process.exitCode=1}finally{child.kill('SIGTERM')}
