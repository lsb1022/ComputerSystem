import { curate } from './review/apply-curation.mjs';
import { formatQuestionText } from './format-question-text.mjs';
import fs from 'node:fs';
import crypto from 'node:crypto';
const manifests=JSON.parse(fs.readFileSync('scripts/original-exam-manifest.json'));
const materials=JSON.parse(fs.readFileSync('scripts/original-materials.json'));
const answers=JSON.parse(fs.readFileSync('scripts/original-answers.json'));
const examFiles={gm:'/resources/2025-globalmedia-midterm.pdf',mm:'/resources/2025-media-midterm.pdf',mf:'/resources/2025-media-final.pdf'};
const originals=manifests.map(m=>{
 const [week,difficulty,topic,title,answer,explanation]=answers[m.key];const detail=materials[m.key];const prompt=detail.prompt;const img=detail.diagram?m.image.replace('.png','-diagram.png'):null;const png=img?fs.readFileSync('course'+img):null;
 return {...m,week,difficulty,topic,prompt,answer,explanation,sourceType:'기출',source:m.exam+' · '+m.number+'번',sourceUrl:examFiles[m.key.split('-')[0]]+'#page='+m.page,grading:'self',provenance:{kind:'original',document:m.exam,question:m.number,page:m.page,key:m.key},title,code:detail.code,table:detail.table,originalImage:m.image,materialImage:img,width:png?png.readUInt32BE(16):null,height:png?png.readUInt32BE(20):null,referenceImage:m.key.startsWith('mf-')&&m.number>=6?'/exam-originals/pep8-instructions.png':null};
});
const historical=JSON.parse(fs.readFileSync('scripts/historical-questions.json'));
const additional=[];
for(const q of historical){
 const ref={key:q.key,document:q.document,question:q.number,page:q.page,section:q.section,file:q.sourceFile};
 if(q.merge){const target=additional.find(t=>t.provenance.key===q.merge);target.sourceRefs.push(ref);target.source+=' · '+q.document+' '+q.number+'번';continue;}
 additional.push({...q,difficulty:q.difficulty,topic:q.week===1?'컴퓨터 기초':q.week===2?'수 표현':q.week<=4?'논리회로':'구조와 명령',sourceType:'기출',source:q.document+' · '+q.number+'번',grading:'self',explanation:'',provenance:{kind:'historical-original',key:q.key,document:q.document,question:q.number,page:q.page,section:q.section},sourceRefs:[ref],materialImage:q.materialImage|| (q.diagram?'/exam-originals/'+q.diagram+'.svg':null)});
}
for(const q of originals)if(q.key.startsWith('mm-')){q.source+=' · 2024 기출 '+q.number+'번';q.sourceRefs=[{document:'2024 기출 (2025 미경 중간과 동일 파일)',question:q.number,key:'y24exam-'+q.number}];}
let result=[...originals,...additional];
const historicalCrops=JSON.parse(fs.readFileSync('scripts/historical-crops.json'));
for(const q of result){
 if(q.sourceType==='기출'||q.sourceType==='기출 변형'){
  q.originalImages=q.originalImage?[{image:q.originalImage,label:q.source}]:[];
  for(const ref of q.sourceRefs||[]){
   const crop=historicalCrops[ref.key];
   if(crop)q.originalImages.push({image:crop.image,label:ref.document+' '+ref.question+'번'});
  }
  if(!q.originalImage)q.originalImage=q.originalImages[0]?.image;
  if(!q.originalImage)throw Error('Missing cropped original: '+q.provenance.key);
  delete q.originalPdf;delete q.originalLinks;
 }
}
result=curate(result);
const savedUids=JSON.parse(fs.readFileSync('scripts/question-uids.json'));
result.forEach((q,i)=>{q.id=i+1;const identity=q.legacyId?'legacy:'+q.legacyId:q.provenance.kind+':'+q.provenance.key;q.uid=q.uid||savedUids[identity]||crypto.createHash('sha256').update(identity).digest('hex').slice(0,16);for(const key of ['prompt','answer','explanation','title'])if(q[key])q[key]=formatQuestionText(q[key]);});
// Preserve editorial difficulty decisions by stable identity across rebuilds.
const difficultyReview=JSON.parse(fs.readFileSync('scripts/review/difficulty-review.json'));
const reviewed=new Map(difficultyReview.rows.map(r=>[r.uid,r]));
if(reviewed.size!==result.length)throw Error('Difficulty review coverage mismatch');
for(const q of result){const r=reviewed.get(q.uid);if(!r||r.id!==q.id)throw Error('Unreviewed or reordered question: '+q.id);q.difficulty=r.after;}
const curation=JSON.parse(fs.readFileSync('scripts/review/curation-report.json'));
curation.difficultyReview=difficultyReview;
curation.difficultyByWeek=Array.from({length:8},(_,i)=>({week:i+1,...Object.fromEntries(['초급','중급','상급'].map(d=>[d,result.filter(q=>q.week===i+1&&q.difficulty===d).length]))}));
const retainedIdentities=JSON.parse(fs.readFileSync('scripts/review/retained-book.json'));
for(const r of curation.retainedBook){const uid=retainedIdentities.find(q=>q.id===r.previousId)?.uid;const q=result.find(q=>q.uid===uid);if(q)r.difficulty=q.difficulty;}
fs.writeFileSync('scripts/review/curation-report.json',JSON.stringify(curation,null,2));
const count=(key)=>Object.fromEntries([...new Set(result.map(q=>q[key]))].map(v=>[v,result.filter(q=>q[key]===v).length]));
if(result.length!==220||count('sourceType')['교재 기반']!==110)throw Error('Curated ratio mismatch');
fs.writeFileSync('course/question-bank.js','// Generated from reviewed source mappings; see scripts/rebuild-bank.mjs.\nwindow.challengeBank='+JSON.stringify(result,null,2)+';\n');
fs.writeFileSync('course/exam-coverage.json',JSON.stringify({historicalScreening:JSON.parse(fs.readFileSync('scripts/historical-screening.json')),historicalReferences:historical.map(q=>({key:q.key,question:q.number,document:q.document,section:q.section,id:result.find(r=>r.sourceRefs?.some(x=>x.key===q.key))?.id})),originalCount:49,byExam:{'2025 글미 중간':19,'2025 미경 중간':18,'2025 미경 기말':12},difficulty:count('difficulty'),sources:count('sourceType'),weeks:count('week'),originals:result.filter(q=>q.sourceType==='기출').map(q=>({id:q.id,source:q.source,key:q.provenance.key,page:q.page,image:q.materialImage}))},null,2));
console.log(JSON.stringify({total:result.length,difficulty:count('difficulty'),sources:count('sourceType'),weeks:count('week')}));
