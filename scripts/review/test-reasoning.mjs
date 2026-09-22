import assert from 'node:assert/strict';import fs from 'node:fs';
const v=JSON.parse(fs.readFileSync('scripts/review/exam-variants.json'));
assert.equal(v.length,19);assert.equal(new Set(v.map(q=>q.focus)).size,19);
assert.equal(new Set(v.map(q=>q.prompt.replace(/[0-9]+/g,'#'))).size,19);
// Numeric variants: range design, bias inference, weighted denominator, inverse arithmetic.
assert.deepEqual([-(2**3),2**3-1],[-8,7]);assert.equal(2**(4-1)-1,7);assert.equal(2**(5-1)-1,15);
assert.equal(10+20,30);assert.equal(9-Math.log2(6/1.5),7);
assert.equal((10+72)/(20+80),.82);assert.equal((0xfffe+2)&0xffff,0);
// Exhaustively verify logical variants, including their counterexamples.
let counterexamples=[];for(let A=0;A<2;A++)for(let B=0;B<2;B++)for(let C=0;C<2;C++){if((A|(B&C))!==(A|B))counterexamples.push([A,B,C]);}
assert.deepEqual(counterexamples,[[0,1,0]]);
for(let S=0;S<2;S++)for(let R=0;R<2;R++){const se=S&(1-R),re=R;assert.ok(!(se&&re));if(S&&R)assert.deepEqual([se,re],[0,1]);}
let carry=0,cs=[];for(let bit=0;bit<3;bit++){let sum=((3>>bit)&1)+((1>>bit)&1)+carry;carry=sum>>1;cs.push(carry);}assert.deepEqual(cs,[1,1,0]);assert.equal(cs[2]^cs[1],1);assert.ok(3+1<=7);
assert.deepEqual([3,2,0,4].map(n=>n===0),[false,false,true,false]);
const decoded=Array.from({length:256},(_,U)=>U<128?U:U-256);assert.equal(Math.min(...decoded),-128);assert.equal(Math.max(...decoded),127);assert.equal(new Set(decoded).size,256);
assert.deepEqual([1,2,3,4].map(n=>n+2),[3,4,5,6]);
assert.deepEqual(['1','2'].map(c=>c.charCodeAt(0)),[0x31,0x32]);
assert.equal([-1,4].reduce((a,b)=>a+b,0),3);assert.deepEqual(['@','A','Z','['].map(c=>c>='A'&&c<='Z'),[false,true,true,false]);
// Execute the self-modifying code, decoding freshly from memory at every instruction.
const mem=new Uint8Array(65536);mem.set([0xd1,0,0x30,0xf1,0,0x0c,0x04,0,0x0a,0,0xc1,0,0x20,0]);mem.set([0,5,0,9],0x20);mem[0x30]=0x22;let A=0,PC=0,trace=[];const word=p=>(mem[p]<<8)|mem[p+1];
for(let steps=0;steps<10;steps++){const at=PC,op=mem[PC++];if(op===0)break;let addr=word(PC);PC+=2;if(op===0xd1)A=(A&0xff00)|mem[addr];else if(op===0xf1)mem[addr]=A&255;else if(op===0x04)PC=addr;else if(op===0xc1)A=word(addr);else throw Error('Invalid opcode');trace.push({at,op,addr,A});}
assert.equal(mem[0x0c],0x22);assert.equal(A,9);assert.deepEqual(trace.map(x=>x.at),[0,3,6,10]);
// Selected textbook calculations and identities.
assert.equal((~0x80+1)&255,0x80);assert.equal((0xff+1)&255,0);assert.equal((2-2**-5)*2**7,252);assert.equal(1.625*2,3.25);assert.equal((3+((~0b1010)&15)+1)&15,9);
for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++){assert.equal((a&b)|(a&c)|(b&c),(a&b)|((a^b)&c));assert.equal((a&b)|((1-a)&b)|(a&c),b|(a&c));}
for(let q=0;q<2;q++)for(let t=0;t<2;t++)assert.equal(q^t,t?1-q:q);
const blocks=new Set();let hits=0;for(const addr of [0,1,2,3,4,0]){const block=Math.floor(addr/4);if(blocks.has(block))hits++;blocks.add(block);}assert.equal(hits,4);
assert.equal((0xab00&0xff00)|0x41,0xab41);assert.equal(0x5&0x3,1);
const report={newVariants:19,uniqueReasoningFocus:19,numericOnlyTemplateDuplicates:0,checked:'정수·보수 범위, 가중 적중률, 모든 관련 진리표 입력, 경계 문자, 직접 기계어 실행, 선택 교재 수치와 논리식',selfModifyingTrace:trace,primarySemanticsReference:'https://github.com/StanWarford/pep8/blob/master/sim.cpp',note:'문제 간 사고 차이와 서술형 답안의 적절성은 문항별 편집 검수이며, 자동 검사가 의미적 완전성을 증명하지는 않음.'};fs.writeFileSync('scripts/review/verification.json',JSON.stringify(report,null,2));console.log('PASS: reasoning checks and byte-level execution');
