import { currentUser } from '../../server/auth';
import assets from '../../server/course-assets.json';
export async function GET(request:Request){if(!await currentUser(request))return Response.redirect(new URL('/login.html',request.url),302);return new Response(Uint8Array.from(atob(assets['index.html'].data),c=>c.charCodeAt(0)),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});}
