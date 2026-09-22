import { currentUser } from '../../../server/auth';
import { sameOrigin,json } from '../../../server/db';
import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { communityPosts } from "../../../db/schema";

export async function GET(request:Request) {
  if(!await currentUser(request))return json({error:"로그인이 필요합니다."},401);
  try {
    const posts = await getDb().select().from(communityPosts).orderBy(desc(communityPosts.createdAt), desc(communityPosts.id)).limit(100);
    return Response.json({ posts });
  } catch {
    return Response.json({ error: "게시글을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if(!sameOrigin(request))return json({error:"Forbidden"},403);
  const user=await currentUser(request);if(!user)return json({error:"로그인이 필요합니다."},401);
  try {
    const data = await request.json() as { category?: string; title?: string; content?: string; author?: string; anonymous?: boolean };
    const category = data.category === "의견" ? "의견" : "질문";
    const title = data.title?.trim().slice(0, 80) ?? "";
    const content = data.content?.trim().slice(0, 2000) ?? "";
    const isAnonymous = Boolean(data.anonymous);
    const author = isAnonymous ? "익명" : user.name;
    if (!title || !content) return Response.json({ error: "제목과 내용을 입력해 주세요." }, { status: 400 });
    const [post] = await getDb().insert(communityPosts).values({ category, title, content, author, isAnonymous }).returning();
    return Response.json({ post }, { status: 201 });
  } catch {
    return Response.json({ error: "게시글을 저장하지 못했습니다." }, { status: 500 });
  }
}
