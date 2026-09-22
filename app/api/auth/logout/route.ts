import { db,json,sameOrigin } from '../../../../server/db';
import { digest,cookie } from '../../../../server/auth';
export async function POST(request:Request){if(!sameOrigin(request))return json({error:'Forbidden'},403);const token=request.headers.get('cookie')?.match(/(?:^|;\s*)study_session=([a-f0-9]{64})/)?.[1];if(token)await db().prepare('DELETE FROM study_sessions WHERE token_hash=?').bind(await digest(token)).run();return Response.json({ok:true},{headers:{'Set-Cookie':cookie('',0,request),'Cache-Control':'no-store'}});}
