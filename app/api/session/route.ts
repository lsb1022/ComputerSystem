import {normalizeEntries} from '../../../server/progress';
import { currentUser } from '../../../server/auth';
import { db,json } from '../../../server/db';
export async function GET(request:Request){const user=await currentUser(request);if(!user)return json({error:'로그인이 필요합니다.'},401);const rows=await db().prepare('SELECT key,value FROM study_entries WHERE user_id=?').bind(user.id).all<{key:string;value:string}>();return json({user,entries:normalizeEntries(Object.fromEntries(rows.results.map(r=>[r.key,r.value])))});}
