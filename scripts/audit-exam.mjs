import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const nodes=new Map();
function element(id){if(!nodes.has(id))nodes.set(id,{value:'all',innerHTML:'',textContent:'',style:{},options:[],querySelectorAll:()=>[],setAttribute(){},addEventListener(){}});return nodes.get(id)}
const context={window:{},localStorage:{getItem:()=>null,setItem(){}},document:{getElementById:element,querySelector:()=>null},location:{hash:'#/challenge'},history:{pushState(){}}};
vm.createContext(context);
for(const file of ['advanced-challenge.js','question-bank.js'])vm.runInContext(fs.readFileSync('course/'+file,'utf8'),context);
context.window.studyStore=context.localStorage;
const before=context.window.challengeBank.map(q=>({...q}));
const coverage=JSON.parse(fs.readFileSync('course/exam-coverage.json'));
assert.equal(before.length,220);assert.equal(coverage.sources['교재 기반'],110);assert.equal(coverage.sources['기출'],91);assert.equal(coverage.sources['기출 변형'],19);
for(const [key,count] of [['gm',19],['mm',18],['mf',12]]){for(let n=1;n<=count;n++)assert.equal(before.filter(q=>q.provenance?.kind==='original'&&q.provenance.key===key+'-'+n).length,1)}
for(const q of before){assert.ok(q.provenance);for(const path of [q.originalImage,q.materialImage,q.referenceImage].filter(Boolean))assert.ok(fs.existsSync('course'+path));}

assert.equal(coverage.historicalReferences.length,48);assert.equal(coverage.historicalScreening.excluded.length,9);assert.ok(coverage.historicalReferences.every(q=>q.id));assert.equal(new Set(before.map(q=>q.uid)).size,220);
const withOriginal=before.filter(q=>['기출','기출 변형'].includes(q.sourceType));
assert.equal(withOriginal.length,110);
for(const q of withOriginal){assert.ok(q.originalImage);assert.ok(q.originalImages.length);for(const ref of q.originalImages)assert.ok(fs.existsSync('course'+ref.image));}
const seen=new Map();const rows=before.map(q=>{const duplicateOf=seen.get(q.prompt)||null;if(!duplicateOf)seen.set(q.prompt,q.id);return{id:q.id,week:q.week,duplicateOf,semanticReview:q.review?'문항별 조건·정답·사고 과정 검토':'기존 원문 대조 유지',focus:q.review?.focus||null}});
vm.runInContext(fs.readFileSync('course/exam-ui.js','utf8'),context);
assert.equal(context.window.challengeBank.length,220);
for(const q of withOriginal){const html=context.window.originalReference(q);assert.ok(!html.includes('<iframe'));assert.ok(!html.includes('.pdf'));assert.ok(html.includes('<img'));}
assert.equal(context.window.advancedProblems.length,10);
for(let i=1;i<=220;i++){context.location.hash='#/challenge/'+i;context.window.challengeApp.openFromRoute();assert.ok(element('challengeProblem').innerHTML.includes('문제 '+i));assert.ok(element('challengeProblem').innerHTML.includes('examReveal'));if(['기출','기출 변형'].includes(before[i-1].sourceType))assert.ok(element('challengeProblem').innerHTML.includes('기출 원문 보기'));}
for(let i=1;i<=10;i++){context.location.hash='#/challenge/advanced/'+i;context.window.challengeApp.openFromRoute();assert.ok(element('challengeProblem').innerHTML.includes('예시 답안'));assert.ok(element('advancedNumbers').innerHTML.includes('심화 X'));if(i<=5)assert.ok(element('challengeProblem').innerHTML.includes('기출 원문 보기'));}
for(let week=1;week<=8;week++)assert.ok(before.some(q=>q.week===week));
assert.equal(before.filter(q=>q.week===1&&q.sourceType==='교재 기반'&&q.difficulty==='상급').length,0);
assert.equal(before.filter(q=>q.week===5&&q.sourceType==='교재 기반'&&q.difficulty==='상급').length,0);
assert.equal(new Set(before.map(q=>q.id)).size,220);
const summary={total:220,originalExams:coverage.byExam,originalQuestionCoverage:49,historicalReferences:coverage.historicalReferences.length,historicalExcluded:coverage.historicalScreening.excluded.length,difficulty:coverage.difficulty,sources:coverage.sources,uniquePromptsBefore:seen.size,exactRepeatsBefore:rows.filter(q=>q.duplicateOf).length,numberNormalizedShapes:new Set(before.map(q=>q.prompt.replace(/[0-9]+/g,'#'))).size,weekCounts:Array.from({length:8},(_,i)=>before.filter(q=>q.week===i+1).length),originalViewersVerified:115,renderSmokeTestsPassed:230,diagramsAdded:context.window.challengeBank.filter(q=>q.visual).length,reviewScope:'교재 110개 선별·수정 및 변형 19개 개별 검토. 실제 기출 91개와 별도 심화 10개는 유지.',allDifferentReasoningClaim:false};
console.log(JSON.stringify(process.argv.includes('--rows')?{summary,rows}:summary,null,2));
