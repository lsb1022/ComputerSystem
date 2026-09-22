// Prose only: never apply this formatter to code blocks, diagrams, or source badges.
export function formatQuestionText(text){
 if(typeof text!=='string')return text;
 const protectedText=[];
 const protect=value=>'⟪'+(protectedText.push(value)-1)+'⟫';
 let s=text.replace(/`[^`]*`/g,protect).replace(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g,protect);
 s=s.replace(/([가-힣])(?=[A-Za-z0-9])/g,'$1 ');
 s=s.replace(/\b(CPI|PC|bias|fraction|unsigned|signed|Cin|XOR|SRAM|DRAM)(?=[+-]?\d)/g,'$1 ');
 s=s.replace(/,(?!\s|[idsnx]\b)/g,', ');
 s=s.replace(/→/g,' → ').replace(/\s*≈\s*/g,' ≈ ');
 s=s.replace(/\s*=\s*/g,' = ').replace(/!\s+=/g,'!=').replace(/<\s+=/g,'<=').replace(/>\s+=/g,'>=').replace(/=\s+=/g,'==');
 s=s.replace(/[ \t]{2,}/g,' ').replace(/⟪(\d+)⟫/g,(_,i)=>protectedText[Number(i)]);
 const fixes={'01로리셋':'01로 리셋','10으로설정':'10으로 설정','부호확장':'부호 확장','새시간':'새 시간','가속비약':'가속비 약','적중시간':'적중 시간','매클록':'매 클록','주소폭':'주소 폭','데이터폭':'데이터 폭','실행시간':'실행 시간','정적1':'정적 1','최소2':'최소 2','총5':'총 5'};
 for(const[a,b]of Object.entries(fixes))s=s.replaceAll(a,b);
 return s.trim();
}
