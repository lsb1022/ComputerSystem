import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const nodes=new Map(),entries={};function el(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',value:'all',style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){},querySelectorAll:()=>[],querySelector:()=>el('button'),reset(){},focus(){}});return nodes.get(id)}
const ctx={window:{addEventListener(){},scrollTo(){},studyStore:{getItem:k=>entries[k]??null,setItem:(k,v)=>entries[k]=v,visit(){}}},document:{getElementById:el,querySelectorAll:()=>[],querySelector:()=>el('query'),addEventListener(){},createElement(){return{set textContent(v){this.innerHTML=String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')},innerHTML:''}}},location:{hash:'#/'},history:{pushState(_a,_b,path){ctx.location.hash=path}},Intl,Date,fetch:async()=>({ok:true,json:async()=>({posts:[]})})};vm.createContext(ctx);
for(const f of ['lesson-content.js','advanced-challenge.js','question-bank.js','exam-ui.js','assignments.js','app.js'])vm.runInContext(fs.readFileSync('course/'+f,'utf8'),ctx);
for(let week=1;week<=8;week++){
 vm.runInContext(`openWeek(${week})`,ctx);assert.ok(el('lessonDetail').innerHTML.includes('data-complete-week="'+week+'"'));if(week>1)assert.ok(el('lessonDetail').innerHTML.includes('disabled'));
 vm.runInContext(`openAssignmentWeek(${week})`,ctx);const a=ctx.window.weekAssignments[week-1];assert.equal((el('assignmentDetail').innerHTML.match(/data-response=/g)||[]).length,a.required.length+a.applied.length+a.challenge.length);assert.ok(el('assignmentDetail').innerHTML.includes('필수 '+a.required.length));assert.equal(ctx.location.hash,'#/assignments/'+week);
}
assert.equal(el('query').disabled,true);
for(const id of ctx.window.weekAssignments[0].required)entries['response-assignment-'+ctx.window.challengeBank[id-1].uid]='검증';vm.runInContext('openAssignmentWeek(1)',ctx);assert.equal(el('query').disabled,false);
entries['response-assignment-'+ctx.window.challengeBank[ctx.window.weekAssignments[0].required[0]-1].uid]='';vm.runInContext('openAssignmentWeek(1)',ctx);assert.equal(el('query').disabled,true);
console.log('PASS: all 8 lesson and assignment routes, variable answer counts, UID-linked fields and required-answer completion gate');
vm.runInContext('completed.clear()',ctx);
for(let week=1;week<=8;week++){
 vm.runInContext(`refreshLessonCompletion(${week})`,ctx);assert.equal(el('query').disabled,true);
 for(let i=0;i<ctx.window.lessonDetails[week].practice.length;i++)entries[`response-lesson-${week}-${i}`]='답안';
 vm.runInContext(`refreshLessonCompletion(${week})`,ctx);assert.equal(el('query').disabled,false);
 entries[`response-lesson-${week}-0`]='   ';vm.runInContext(`refreshLessonCompletion(${week})`,ctx);assert.equal(el('query').disabled,true);
 entries[`response-lesson-${week}-0`]='답안';vm.runInContext(`completed.add(${week})`,ctx);
}
vm.runInContext('completed.delete(1);completed.delete(8);refreshLessonCompletion(8)',ctx);assert.equal(el('query').disabled,true);
console.log('PASS: all 8 practice completion buttons, blank answers and prior-week lock');
