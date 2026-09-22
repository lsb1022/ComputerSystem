import vm from 'node:vm';
import fs from 'node:fs';import path from 'node:path';
const files={};function walk(dir,prefix=''){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const name=prefix+entry.name;if(entry.isDirectory())walk(path.join(dir,entry.name),name+'/');else if(name!=='challenge.js')files[name]=fs.readFileSync(path.join(dir,entry.name));}}walk('course');
const result={};for(const[name,b]of Object.entries(files)){
 let value=b;
 if(/\.(js|html|json)$/.test(name)){let s=b.toString('utf8');s=s.replace(/(?:\.\/|\/)(exam-originals|resources)\/([^\s"'<>`]+?\.(?:png|svg|pdf))/g,(_,folder,file)=>'/api/assets?name='+folder+'/'+file);value=Buffer.from(s);}
 const ext=path.extname(name);result[name]={mime:({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.pdf':'application/pdf'})[ext]||'application/octet-stream',data:value.toString('base64')};
}
fs.writeFileSync('server/course-assets.json',JSON.stringify(result));console.log(Object.keys(result).length+' protected course assets');

const lessons={window:{}};vm.createContext(lessons);vm.runInContext(fs.readFileSync('course/lesson-content.js','utf8'),lessons);
fs.writeFileSync('server/lesson-practice-counts.json',JSON.stringify(Object.fromEntries(Object.entries(lessons.window.lessonDetails).map(([w,d])=>[w,d.practice.length]))));
