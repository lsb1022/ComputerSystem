import { currentUser } from '../../../server/auth';
import { db,json,sameOrigin } from '../../../server/db';
import { validEntry,validateCompletion,questionMap } from '../../../server/progress';
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'Forbidden'},403);const user=await currentUser(request);if(!user)return json({error:'로그인이 필요합니다.'},401);
 try{
 const body=await request.text();if(body.length>180000)return json({error:'답안이 너무 깁니다.'},413);const data=JSON.parse(body);const changes=data.changes;
 if(!changes||typeof changes!=='object'||Array.isArray(changes)||Object.keys(changes).length>80||Object.entries(changes).some(([k,v])=>!validEntry(k,v)))return json({error:'저장할 답안을 확인해 주세요.'},400);
 const rows=await db().prepare('SELECT key,value FROM study_entries WHERE user_id=?').bind(user.id).all<{key:string;value:string}>();const merged=Object.fromEntries(rows.results.map(r=>[r.key,r.value]));const previous={...merged};Object.assign(merged,changes);const error=validateCompletion(merged,previous);if(error)return json({error},409);
 for(const key of Object.keys(changes))if(key.startsWith('exam-')){const q=questionMap.get(key.slice(5))!;const value=JSON.parse(changes[key]);if(value.checked){value.selfAssessed=q.grading==='self';if(!value.value.trim())return json({error:'답안을 먼저 입력해 주세요.'},400);if(!value.selfAssessed){const norm=(s:string)=>s.trim().replace(/\s+/g,'').toUpperCase();value.correct=norm(value.value)===norm(q.answer);}}else{delete value.correct;delete value.selfAssessed;}changes[key]=JSON.stringify(value);}
 const now=Date.now();const statements=Object.entries(changes).map(([key,value])=>db().prepare('INSERT INTO study_entries(id,user_id,key,value,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').bind(user.id+':'+key,user.id,key,value,now));
 statements.push(db().prepare('UPDATE students SET last_seen=? WHERE id=?').bind(now,user.id));
 const visit=typeof data.visit==='string'&&/^#\/(?:lessons\/[1-8]|assignments\/[1-8]|challenge(?:\/advanced)?\/\d{1,4}|community|resources)?$/.test(data.visit)?data.visit:null;
 if(Object.keys(changes).length||visit)statements.push(db().prepare('INSERT INTO study_activity(user_id,kind,detail,created_at) VALUES(?,?,?,?)').bind(user.id,Object.keys(changes).length?'progress':'visit',JSON.stringify({keys:Object.keys(changes),visit}),now));
 await db().batch(statements);return json({ok:true,updatedAt:now});
 }catch{return json({error:'진도를 저장하지 못했습니다.'},500);}
}
