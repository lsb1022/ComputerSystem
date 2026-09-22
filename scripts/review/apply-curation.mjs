import fs from 'node:fs';import crypto from 'node:crypto';import {diagram} from './diagrams.mjs';
const read=n=>JSON.parse(fs.readFileSync('scripts/review/'+n+'.json'));
export function curate(pool){
 const originals=pool.filter(q=>q.sourceType==='기출');
 const retained=read('retained-book');
 const uid=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,16);
 const topic=w=>w===1?'컴퓨터 기초':w===2?'수 표현':w===3?'논리회로':w===4?'중간 종합':w===5?'CPU와 메모리':w===6?'Pep/8':w===7?'분기와 반복':'기말 종합';
 const book=read('new-book').map((q,i)=>({...q,uid:uid('review-book-'+(i+1)),sourceType:'교재 기반',source:'TypeBook '+q.section,topic:topic(q.week),grading:'self',provenance:{kind:'reviewed-textbook',key:'review-book-'+(i+1),section:q.section},review:{focus:q.focus,status:'reviewed',basis:'제공 교재 해당 절과 기출 요구 수준 비교'}}));
 const variants=read('exam-variants').map((q,i)=>{
  const original=originals.find(o=>o.provenance.key===q.originalKey);if(!original)throw Error(q.originalKey);
  return {...q,uid:uid('review-variant-'+(i+1)),sourceType:'기출 변형',source:original.provenance.document+' '+original.provenance.question+'번 · 변형',topic:topic(q.week),grading:'self',provenance:{kind:'reviewed-exam-adaptation',key:'review-variant-'+(i+1),originalKey:q.originalKey,document:original.provenance.document,question:original.provenance.question},originalImage:original.originalImage,originalImages:original.originalImages,review:{focus:q.focus,change:q.delta,status:'reviewed',basis:'원문의 요구 동작과 다른 추론 단계; 정답 및 경계 조건 검토'}};
 });
 const result=[...originals,...retained,...book,...variants].sort((a,b)=>a.week-b.week);
 for(const q of result){if(q.diagram&&q.sourceType!=='기출')q.visual=diagram(q.diagram);}
 if(originals.length!==91||retained.length+book.length!==110||variants.length!==19)throw Error('Unexpected curated size');
 fs.writeFileSync('scripts/review/curation-report.json',JSON.stringify({previousCount:1000,total:result.length,sources:{original:91,adaptation:19,textbook:110},policy:'기출 난도 우선. 주차별 균등 수량 및 초600/중300/상100 할당 폐기. 반복·과잉 난도 문항 제외.',notClaimed:'같은 개념의 연도별 실제 기출은 보존하므로 전체가 서로 다른 개념이라는 뜻은 아님. 변형 500개 확보를 보장하지 않음.',removedLegacyAdaptations:18,reviewedNewAdaptations:variants.map(q=>({key:q.provenance.key,original:q.originalKey,focus:q.focus,change:q.delta})),retainedBook:retained.map(q=>({previousId:q.id,difficulty:q.difficulty,focus:q.review.focus})),addedBook:book.map(q=>({key:q.provenance.key,focus:q.focus})),difficultyByWeek:Array.from({length:8},(_,i)=>({week:i+1,...Object.fromEntries(['초급','중급','상급'].map(d=>[d,result.filter(q=>q.week===i+1&&q.difficulty===d).length]))}))},null,2));
 return result;
}
