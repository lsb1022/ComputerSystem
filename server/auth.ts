import { db } from './db';
import enrollment from './enrollment.json';
export type Student={id:string;name:string;year:string;role:string};
export const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
export async function digest(s:string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));}
export async function derive(password:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256));}
export function constantEqual(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
let seeded:Promise<unknown>|undefined;
export function ensureEnrollment(){return seeded??=db().batch(enrollment.map(u=>db().prepare('INSERT OR IGNORE INTO students(id,name,year,role,password_hash,salt,created_at) VALUES(?,?,?,?,?,?,?)').bind(u.id,u.name,u.year,u.role,u.passwordHash,u.salt,Date.now()))).catch(e=>{seeded=undefined;throw e});}
export async function currentUser(request:Request):Promise<Student|null>{const token=request.headers.get('cookie')?.match(/(?:^|;\s*)study_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)return null;return db().prepare('SELECT u.id,u.name,u.year,u.role FROM students u JOIN study_sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token),Date.now()).first<Student>();}
export const cookie=(token:string,seconds:number,request:Request)=>`study_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
