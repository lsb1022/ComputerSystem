const box=(x,y,w,h,label)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}"/><text x="${x+w/2}" y="${y+h/2+6}" text-anchor="middle">${label}</text>`;
const line=(path)=>`<path d="${path}"/>`;
const txt=(x,y,t)=>`<text x="${x}" y="${y}">${t}</text>`;
export function diagram(name){
 let s='';
 if(['and','or','not'].includes(name)){
  s=name==='and'?'<path d="M210 55 H265 A45 45 0 0 1 265 145 H210 Z"/>':name==='or'?'<path d="M205 55 Q240 100 205 145 Q285 150 315 100 Q285 50 205 55 Z"/>':'<path d="M215 55 L300 100 L215 145 Z"/><circle cx="307" cy="100" r="7"/>';
  s+=line(name==='not'?'M100 100 H215 M314 100 H455':(name==='and'?'M100 75 H210 M100 125 H210 M310 100 H455':'M100 75 H221 M100 125 H221 M315 100 H455'))+txt(60,name==='not'?106:81,'A')+(name==='not'?'':txt(60,131,'B'))+txt(470,106,'Y');
 }else if(name==='half-adder')s=box(200,45,175,110,'반가산기')+line('M95 75 H200 M95 125 H200 M375 75 H480 M375 125 H480')+txt(60,81,'A')+txt(60,131,'B')+txt(490,81,'S')+txt(490,131,'C');
 else if(name==='reset-priority')s=box(170,30,80,45,'AND')+box(60,130,80,40,'NOT')+box(355,25,125,130,'NOR SR')+line('M20 45 H170 M20 145 H60 M140 150 H150 V62 H170 M250 52 H355 M35 145 V190 H300 V128 H355 M480 60 H535')+txt(5,33,'S')+txt(5,135,'R')+txt(267,42,'Sₑ')+txt(310,118,'Rₑ')+txt(540,65,'Q');
 else if(name==='nor-sr')s=box(200,25,100,55,'NOR')+box(200,130,100,55,'NOR')+line('M75 42 H200 M75 169 H200 M300 50 H510 M300 159 H510 M350 50 V105 H150 V146 H200 M420 159 V95 H130 V65 H200')+txt(40,48,'R')+txt(40,175,'S')+txt(520,56,'Q')+txt(520,165,'Q̅');
 else if(name==='d-to-t')s=box(160,30,110,70,'?')+box(370,30,100,110,'FF')+line('M65 50 H160 M270 65 H370 M470 65 H530 V180 H105 V80 H160 M320 120 H370 M370 110 L382 120 L370 130')+txt(30,56,'T')+txt(340,55,'D')+txt(490,52,'Q')+txt(300,112,'CLK');
 else if(name==='jk-to-d')s=box(180,35,100,115,'?')+box(380,35,100,115,'FF')+line('M70 85 H180 M280 65 H380 M280 120 H380 M480 70 H545')+txt(40,91,'D')+txt(345,57,'J')+txt(345,111,'K')+txt(540,58,'Q')+line('M330 140 H380 M380 130 L390 140 L380 150')+txt(290,160,'CLK');
 else if(name==='d-ff')s=box(230,30,130,120,'')+line('M100 60 H230 M100 120 H230 M230 110 L243 120 L230 130 M360 60 H485')+txt(70,66,'D')+txt(50,126,'CLK')+txt(490,66,'Q');
 else if(name==='missing-carry'||name==='adder')s=box(130,110,85,50,'XOR')+box(315,40,140,110,'4-bit ADD')+line('M65 60 H315 M65 128 H130 M65 183 H100 V146 H130 M215 135 H315 M390 185 V150 M455 90 H535')+txt(20,66,'A')+txt(20,133,'B')+txt(15,187,'Sub')+txt(365,205,name==='missing-carry'?'C₀=0':'C₀=Sub')+txt(540,96,'S');
 else if(name==='zero-detector')s=box(260,40,130,120,'XOR')+[0,1,2,3].map((i)=>line(`M100 ${60+i*25} H260`)+txt(50,66+i*25,'S'+(3-i))).join('')+line('M390 100 H510')+txt(520,106,'Z');
 else if(name==='ripple-counter')s=[0,1,2].map(i=>box(70+i*175,50,90,90,'T=1')+line(`M${160+i*175} 75 H${190+i*175}`)+(i<2?line(`M${190+i*175} 75 V115 H${240+i*175}`):'')+`<circle cx="${65+i*175}" cy="115" r="5"/><path d="M${70+i*175} 105 L${80+i*175} 115 L${70+i*175} 125"/>`+txt(164+i*175,62,'Q'+i)).join('')+line('M15 115 H60')+txt(5,100,'CLK')+txt(70,182,'하강 에지 · Q → 다음 단 CLK');
 else throw Error('Unknown diagram '+name);
 return `<svg viewBox="0 0 590 220" role="img" aria-label="${name} 회로"><g stroke="currentColor" fill="none" stroke-width="2.2" stroke-linejoin="round">${s.replaceAll('<text ','<text stroke="none" fill="currentColor" font-size="17" ')}</g></svg>`;
}
