import ts from 'typescript';import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const assignments=JSON.parse(fs.readFileSync('server/assignment-manifest.json'));const legacy=JSON.parse(fs.readFileSync('server/legacy-assignment-manifest.json'));
let source=fs.readFileSync('server/progress.ts','utf8').replace(/import (\w+) from '(\.\/[^']+\.json)';/g,(_,name,p)=>'const '+name+'='+fs.readFileSync('server/'+p.slice(2),'utf8')+';');
const context={exports:{}};vm.createContext(context);vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);const {validEntry,validateCompletion,normalizeEntries,summarize}=context.exports;
for(const a of assignments){let entries={'comsigae-assignment-complete-v2':JSON.stringify([a.week])};assert.ok(validateCompletion(entries));for(const id of a.required){const q=a.questions.find(q=>q.id===id);const key='response-assignment-'+q.uid;assert.ok(validEntry(key,'풀이'));entries[key]='풀이';}assert.equal(validateCompletion(entries),null);const q=a.questions.find(q=>q.id===a.required[0]);entries['response-assignment-'+q.uid]=' ';assert.ok(validateCompletion(entries));}
assert.equal(validEntry('response-assignment-ffffffffffffffff','풀이'),false);assert.ok(validateCompletion({'comsigae-complete':'[2]'}));assert.ok(validateCompletion({'comsigae-complete':'[1,2]'}));
const counts=JSON.parse(fs.readFileSync('server/lesson-practice-counts.json'));
const entries={'comsigae-complete':'[]'};
for(let week=1;week<=8;week++){
 entries['comsigae-complete']=JSON.stringify(Array.from({length:week},(_,i)=>i+1));
 assert.ok(validateCompletion(entries));
 for(let i=0;i<counts[week];i++)entries[`response-lesson-${week}-${i}`]='풀이';
 assert.equal(validateCompletion(entries),null);
 const key=`response-lesson-${week}-0`;entries[key]='  ';assert.ok(validateCompletion(entries));entries[key]='풀이';
}
assert.equal(validateCompletion({'comsigae-complete':'[1]'}, {'comsigae-complete':'[1]'}),null);
assert.ok(validateCompletion({'comsigae-complete':'[1]','response-lesson-1-0':''},{'comsigae-complete':'[1]','response-lesson-1-0':'답'}));
let found;for(const a of legacy){for(const [i,q]of a.questions.entries())if(assignments.some(n=>n.questions.some(x=>x.uid===q.uid))){found={a,i,q};break;}if(found)break;}
const oldkey=`response-${found.a.week}-${found.i+1}`,newkey='response-assignment-'+found.q.uid;const migrated=normalizeEntries({[oldkey]:'기존 답안'});assert.equal(migrated[newkey],'기존 답안');assert.equal(migrated[oldkey],'기존 답안');assert.equal(normalizeEntries({[oldkey]:'기존 답안',[newkey]:''})[newkey],'');
// Same position with a new question must never inherit an unrelated answer.
for(const a of legacy)for(const [i,q] of a.questions.entries()){const e=normalizeEntries({[`response-${a.week}-${i+1}`]:'old'});const current=assignments[a.week-1].questions[i];if(current&&current.uid!==q.uid)assert.notEqual(e['response-assignment-'+current.uid],'old');}
const s=summarize({[oldkey]:'기존 답안','exam-removed-question':JSON.stringify({value:'old',checked:true,correct:true})});assert.equal(s.attempted,0);assert.equal(s.questionTotal,220);assert.equal(s.assignmentTotal,174);assert.equal(s.weeks.length,8);
console.log('PASS: variable required completion, UID migration, no stale positional answers, active totals');
