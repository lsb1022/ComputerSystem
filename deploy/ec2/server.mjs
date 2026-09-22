import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const base=path.dirname(new URL(import.meta.url).pathname);
const origin=new URL(process.env.APP_ORIGIN||'http://localhost:3000');
if(process.env.NODE_ENV==='production'&&origin.protocol!=='https:')throw Error('APP_ORIGIN must use HTTPS');
const routes=new Map();for(const name of ['course','index.html','api/assets','api/auth/login','api/auth/logout','api/session','api/progress','api/admin','api/posts'])routes.set('/'+name,await import('./app/'+name+'/route.js'));
const publicFiles=new Map(fs.readdirSync(base+'/public').filter(n=>fs.statSync(base+'/public/'+n).isFile()).map(n=>['/'+n,fs.readFileSync(base+'/public/'+n)]));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,origin);if(url.origin!==origin.origin){res.writeHead(400);res.end();return}
 if(url.pathname==='/healthz'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok');return}
 if(url.pathname==='/'){res.writeHead(302,{Location:'/login.html'});res.end();return}
 if(publicFiles.has(url.pathname)&&['GET','HEAD'].includes(req.method)){res.writeHead(200,{'Content-Type':mime[path.extname(url.pathname)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:publicFiles.get(url.pathname));return}
 const handler=routes.get(url.pathname)?.[req.method];if(!handler){res.writeHead(routes.has(url.pathname)?405:404);res.end();return}
 const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>200000){res.writeHead(413);res.end();return}chunks.push(chunk)}
 const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);
 // Only Caddy can reach the app. It overwrites this header; never trust Cloudflare headers from the browser.
 headers.set('cf-connecting-ip',process.env.TRUST_PROXY==='1'?(req.headers['x-real-ip']||req.socket.remoteAddress):req.socket.remoteAddress);
 const request=new Request(url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
 const response=await handler(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error('Request failed:',e.message);if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json'});res.end('{"error":"서버 오류가 발생했습니다."}')}
});
server.requestTimeout=30000;server.headersTimeout=15000;
server.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log('EC2 app ready'));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
