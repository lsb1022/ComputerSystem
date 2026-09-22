import { currentUser,ensureEnrollment } from '../../../server/auth';
import { db,json } from '../../../server/db';
import { summarize,questionMap,normalizeEntries } from '../../../server/progress';
import legacyAssignments from '../../../server/legacy-assignment-manifest.json';
import assignments from '../../../server/assignment-manifest.json';
export async function GET(request:Request){const user=await currentUser(request);if(!user)return json({error:'로그인이 필요합니다.'},401);if(user.role!=='admin'||user.id!=='20253307')return json({error:'관리자만 접근할 수 있습니다.'},403);await ensureEnrollment();
 const id=new URL(request.url).searchParams.get('id');if(id&&!/^\d{8}$/.test(id))return json({error:'Invalid id'},400);
 const users=await db().prepare("SELECT id,name,year,last_seen FROM students WHERE role='student' ORDER BY name").all<{id:string;name:string;year:string;last_seen:number|null}>();
 const rows=await db().prepare('SELECT user_id,key,value,updated_at FROM study_entries').all<{user_id:string;key:string;value:string;updated_at:number}>();
 if(id){const student=users.results.find(s=>s.id===id);if(!student)return json({error:'수강생을 찾을 수 없습니다.'},404);const own=rows.results.filter(r=>r.user_id===id);const entries=normalizeEntries(Object.fromEntries(own.map(r=>[r.key,r.value])));const activity=await db().prepare('SELECT kind,detail,created_at FROM study_activity WHERE user_id=? ORDER BY id DESC LIMIT 100').bind(id).all();return json({student,summary:summarize(entries),entries,updatedAt:Object.fromEntries(own.map(r=>[r.key,r.updated_at])),activity:activity.results,assignments,legacyAssignments,questions:[...questionMap.values()].filter(q=>entries['exam-'+q.uid])});}
 return json({students:users.results.map(student=>({...student,...summarize(Object.fromEntries(rows.results.filter(r=>r.user_id===student.id).map(r=>[r.key,r.value])))}))});
}
