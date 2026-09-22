import { db,json,sameOrigin } from '../../../../server/db';
import { ensureEnrollment,derive,constantEqual,digest,hex,cookie } from '../../../../server/auth';
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'잘못된 요청입니다.'},403);
 try{
  const data=await request.json() as {id?:unknown;password?:unknown};const id=String(data.id||'');const password=String(data.password||'');
  if(!/^\d{8}$/.test(id)||password.length<4||password.length>128)return json({error:'학번과 비밀번호를 확인해 주세요.'},401);
  await ensureEnrollment();const now=Date.now();
  const limitKeys=[await digest('account:'+id),await digest('ip:'+(request.headers.get('cf-connecting-ip')||'preview'))];
  for(const key of limitKeys){const r=await db().prepare('SELECT attempts,reset_at FROM login_limits WHERE key=?').bind(key).first<{attempts:number;reset_at:number}>();if(r&&r.reset_at>now&&r.attempts>=(key===limitKeys[0]?6:60))return json({error:'시도 횟수가 많습니다. 15분 후 다시 시도해 주세요.'},429);}
  const user=await db().prepare('SELECT id,password_hash,salt FROM students WHERE id=?').bind(id).first<{id:string;password_hash:string;salt:string}>();
  const hash=await derive(password,user?.salt||'invalid-user-fixed-salt');
  if(!user||!constantEqual(hash,user.password_hash)){
   await db().batch(limitKeys.map(key=>db().prepare('INSERT INTO login_limits(key,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN reset_at<? THEN 1 ELSE attempts+1 END,reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END').bind(key,now+900000,now,now)));
   return json({error:'학번과 비밀번호를 확인해 주세요.'},401);
  }
  const token=hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
  await db().batch([db().prepare('DELETE FROM login_limits WHERE key=?').bind(limitKeys[0]),db().prepare('DELETE FROM study_sessions WHERE expires_at<?').bind(now),db().prepare('INSERT INTO study_sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await digest(token),id,now+604800000),db().prepare('UPDATE students SET last_seen=? WHERE id=?').bind(now,id),db().prepare('INSERT INTO study_activity(user_id,kind,detail,created_at) VALUES(?,?,?,?)').bind(id,'login','로그인',now)]);
  return Response.json({ok:true},{headers:{'Set-Cookie':cookie(token,604800,request),'Cache-Control':'no-store'}});
 }catch{return json({error:'로그인 연결에 실패했습니다. 잠시 뒤 다시 시도해 주세요.'},503);}
}
