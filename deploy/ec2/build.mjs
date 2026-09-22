import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
await import('../../scripts/bundle-course.mjs');
const output='dist-ec2';fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(output+'/server',{recursive:true});
function compile(file){
 let source=stripTypeScriptTypes(fs.readFileSync(file,'utf8'));
 source=source.replace(/from\s+(['"])(\.[^'"]+)\1/g,(_,quote,p)=>p.endsWith('.json')?`from ${quote}${p}${quote} with { type: 'json' }`:`from ${quote}${p.endsWith('.js')?p:p+'.js'}${quote}`);
 const dest=path.join(output,file.replace(/\.ts$/,'.js'));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,source);
}
for(const f of fs.readdirSync('server'))if(f.endsWith('.ts')&&f!=='db.ts')compile('server/'+f);else if(f.endsWith('.json'))fs.copyFileSync('server/'+f,path.join(output,'server',f));
const routes=['course','index.html','api/assets','api/auth/login','api/auth/logout','api/session','api/progress','api/admin'];
for(const route of routes)compile('app/'+route+'/route.ts');
fs.mkdirSync(output+'/app/api/posts',{recursive:true});
fs.copyFileSync('deploy/ec2/posts.mjs',output+'/app/api/posts/route.js');
fs.copyFileSync('deploy/ec2/db.mjs',output+'/server/db.js');
fs.copyFileSync('deploy/ec2/server.mjs',output+'/server.mjs');
fs.cpSync('public',output+'/public',{recursive:true});fs.cpSync('drizzle',output+'/drizzle',{recursive:true});
fs.writeFileSync(output+'/package.json',JSON.stringify({private:true,type:'module'}));
console.log('EC2 runtime built (Node 24, no npm install required).');
