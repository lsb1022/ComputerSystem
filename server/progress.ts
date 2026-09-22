import practiceCounts from './lesson-practice-counts.json';
import questions from './question-manifest.json';
import assignments from './assignment-manifest.json';
import legacyAssignments from './legacy-assignment-manifest.json';
export const questionMap=new Map(questions.map(q=>[q.uid,q]));
const assignmentUids=new Set(assignments.flatMap(a=>a.questions.map(q=>q.uid)));
export const assignmentTotal=assignments.reduce((n,a)=>n+a.questions.length,0);
export const assignmentAnswerKey=(uid:string)=>'response-assignment-'+uid;
export function normalizeEntries(input:Record<string,string>){
 const entries={...input};
 // Old position-based answers only follow the same immutable question UID.
 for(const a of legacyAssignments)for(const [i,q] of a.questions.entries()){
  const old=entries[`response-${a.week}-${i+1}`],key=assignmentAnswerKey(q.uid);
  if(assignmentUids.has(q.uid)&&old!==undefined&&entries[key]===undefined)entries[key]=old;
 }
 if(entries['comsigae-assignment-complete-v2']===undefined){
  let old:number[]=[];try{old=JSON.parse(entries['comsigae-assignment-complete']||'[]')}catch{}
  entries['comsigae-assignment-complete-v2']=JSON.stringify(old.filter(w=>{const a=assignments[w-1];return a&&a.required.every(id=>{const q=a.questions.find(q=>q.id===id)!;return (entries[assignmentAnswerKey(q.uid)]||'').trim()})}));
 }
 return entries;
}
export function validEntry(key:string,value:unknown):value is string {
 if(typeof value!=='string'||value.length>16000)return false;
 if(key.startsWith('response-assignment-'))return assignmentUids.has(key.slice('response-assignment-'.length));
 if(/^response-([1-8])-([1-9]|1\d|2[0-4])$/.test(key)||/^response-lesson-[1-8]-\d{1,2}$/.test(key))return true;
 if(/^check-[1-8]-goal-\d{1,2}$/.test(key)||/^check-lesson-practice-[1-8]-\d{1,2}$/.test(key))return value==='0'||value==='1';
 try{const v=JSON.parse(value);if(['comsigae-complete','comsigae-assignment-complete','comsigae-assignment-complete-v2'].includes(key))return Array.isArray(v)&&v.length<=8&&v.every(n=>Number.isInteger(n)&&n>=1&&n<=8)&&new Set(v).size===v.length;
 if(key==='challenge-advanced-state-v1')return v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([k,x])=>/^\d$/.test(k)&&typeof x==='string'&&x.length<=10000);
 if(key.startsWith('exam-')&&questionMap.has(key.slice(5)))return v&&typeof v==='object'&&typeof v.value==='string'&&v.value.length<=10000&&Object.keys(v).every(k=>['value','correct','checked','selfAssessed'].includes(k))&&['correct','checked','selfAssessed'].every(k=>!(k in v)||typeof v[k]==='boolean');
 }catch{}return false;
}
export function validateCompletion(input:Record<string,string>,previous:Record<string,string>={}){
 const entries=normalizeEntries(input);const lessons=JSON.parse(entries['comsigae-complete']||'[]') as number[];
 if(lessons.some(n=>Array.from({length:n-1},(_,i)=>i+1).some(p=>!lessons.includes(p))))return '이전 주차 강의를 먼저 완료해 주세요.';
 const prior=JSON.parse(previous['comsigae-complete']||'[]') as number[];
 for(const week of lessons){
  const count=practiceCounts[String(week) as keyof typeof practiceCounts];
  const keys=Array.from({length:count},(_,i)=>`response-lesson-${week}-${i}`);
  // Existing completion is preserved; new completion and edited practice are checked.
  if((!prior.includes(week)||keys.some(k=>entries[k]!==previous[k]))&&keys.some(k=>!(entries[k]||'').trim()))return '이번 주 연습문제의 답안을 모두 작성해 주세요.';
 }
 const complete=JSON.parse(entries['comsigae-assignment-complete-v2']||'[]') as number[];
 for(const week of complete){const a=assignments[week-1];if(a.required.some(id=>!(entries[assignmentAnswerKey(a.questions.find(q=>q.id===id)!.uid)]||'').trim()))return '이번 주 필수 문제의 답안을 모두 작성해 주세요.';}
 return null;
}
export function summarize(input:Record<string,string>){
 const entries=normalizeEntries(input);const parse=(k:string,f:unknown)=>{try{return JSON.parse(entries[k]||'null')??f}catch{return f}};
 const exam=Object.entries(entries).filter(([k])=>k.startsWith('exam-')&&questionMap.has(k.slice(5))).map(([k,v])=>{try{return{...JSON.parse(v),question:questionMap.get(k.slice(5))}}catch{return{}}});
 const weeks=assignments.map(a=>{const w=a.week;const filled=(id:number)=>Boolean((entries[assignmentAnswerKey(a.questions.find(q=>q.id===id)!.uid)]||'').trim());return{week:w,goals:Object.entries(entries).filter(([k,v])=>k.startsWith(`check-${w}-goal-`)&&v==='1').length,lesson:(parse('comsigae-complete',[]) as number[]).includes(w),assignment:(parse('comsigae-assignment-complete-v2',[]) as number[]).includes(w),required:a.required.filter(filled).length,requiredTotal:a.required.length,answered:a.questions.filter(q=>filled(q.id)).length,total:a.questions.length,practice:Object.entries(entries).filter(([k,v])=>k.startsWith(`response-lesson-${w}-`)&&v.trim()).length,challenge:exam.filter(x=>x.question?.week===w&&x.checked).length};});
 return{lessons:weeks.filter(x=>x.lesson).length,assignments:weeks.filter(x=>x.assignment).length,assignmentAnswers:weeks.reduce((s,w)=>s+w.answered,0),assignmentTotal,questionTotal:questions.length,attempted:exam.filter(x=>x.value?.trim()).length,checked:exam.filter(x=>x.checked).length,correct:exam.filter(x=>x.correct).length,selfAssessed:exam.filter(x=>x.checked&&x.selfAssessed).length,advanced:Object.values(parse('challenge-advanced-state-v1',{}) as Record<string,string>).filter(x=>x.trim()).length,weeks};
}
