export function GET(request:Request){return Response.redirect(new URL('/course',request.url),302);}
