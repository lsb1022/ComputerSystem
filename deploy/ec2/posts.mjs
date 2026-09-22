import {currentUser} from '../../../server/auth.js';
import {db,json,sameOrigin} from '../../../server/db.js';
const format=p=>({...p,isAnonymous:!!p.is_anonymous,createdAt:new Date(p.created_at*1000).toISOString()});
export async function GET(request){if(!await currentUser(request))return json({error:'로그인이 필요합니다.'},401);const rows=await db().prepare('SELECT * FROM community_posts ORDER BY created_at DESC,id DESC LIMIT 100').all();return json({posts:rows.results.map(format)})}
export async function POST(request){
 if(!sameOrigin(request))return json({error:'Forbidden'},403);
 const user=await currentUser(request);if(!user)return json({error:'로그인이 필요합니다.'},401);
 let data;try{data=await request.json()}catch{return json({error:'잘못된 요청입니다.'},400)}
 const category=data.category==='의견'?'의견':'질문',title=typeof data.title==='string'?data.title.trim().slice(0,80):'',content=typeof data.content==='string'?data.content.trim().slice(0,2000):'';
 if(!title||!content)return json({error:'제목과 내용을 입력해 주세요.'},400);
 const anonymous=Boolean(data.anonymous),author=anonymous?'익명':user.name;
 const post=await db().prepare('INSERT INTO community_posts(category,title,content,author,is_anonymous,created_at) VALUES(?,?,?,?,?,?) RETURNING *').bind(category,title,content,author,Number(anonymous),Math.floor(Date.now()/1000)).first();return json({post:format(post)},201);
}
