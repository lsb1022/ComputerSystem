import { currentUser } from '../../../server/auth';
import { json } from '../../../server/db';
import assets from '../../../server/course-assets.json';
export async function GET(request:Request){if(!await currentUser(request))return json({error:'로그인이 필요합니다.'},401);const name=new URL(request.url).searchParams.get('name')||'';const asset=(assets as Record<string,{data:string;mime:string}>)[name];if(!asset||name==='index.html')return json({error:'Not found'},404);return new Response(Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0)),{headers:{'Content-Type':asset.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(asset.mime==='application/pdf'?{'Content-Disposition':'inline; filename="'+name.split('/').pop()+'"'}:{})}});}
