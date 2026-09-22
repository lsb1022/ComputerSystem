import fs from 'node:fs';import vm from 'node:vm';
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('course/question-bank.js','utf8'),ctx);
const assignments=[];const rank={초급:0,중급:1,상급:2};
for(let week=1;week<=8;week++){
 // No hard-question quota: challenge means the last practice group within this week's scope.
 const seen=new Set();const items=ctx.window.challengeBank.filter(q=>q.week===week).filter(q=>{const k=q.prompt.replace(/\s/g,'');if(seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>rank[a.difficulty]-rank[b.difficulty]||a.id-b.id);
 const chosen=items;const requiredCount=Math.min(12,Math.max(1,Math.floor(Math.min(24,chosen.length)*.6)));
 const challengeCount=Math.min(4,Math.max(1,Math.floor((Math.min(24,chosen.length)-requiredCount)/2)));
 const required=chosen.slice(0,requiredCount).map(q=>q.id),applied=chosen.slice(requiredCount,Math.min(chosen.length-challengeCount,requiredCount+8)).map(q=>q.id),challenge=chosen.slice(-challengeCount).map(q=>q.id);
 assignments.push({week,required,applied,challenge});
}
fs.writeFileSync('course/assignments.js','window.weekAssignments='+JSON.stringify(assignments)+';');
fs.writeFileSync('server/assignment-manifest.json',JSON.stringify(assignments.map(a=>({...a,questions:[...a.required,...a.applied,...a.challenge].map(id=>{const q=ctx.window.challengeBank[id-1];return{id,uid:q.uid,prompt:q.prompt,answer:q.answer,source:q.source}})})),null,2));
fs.writeFileSync('server/question-manifest.json',JSON.stringify(ctx.window.challengeBank.map(q=>({id:q.id,uid:q.uid,week:q.week,prompt:q.prompt,answer:q.answer,source:q.source,grading:q.grading||'auto'})),null,2));
console.log(assignments.map(a=>({week:a.week,required:a.required.length,applied:a.applied.length,challenge:a.challenge.length})));
