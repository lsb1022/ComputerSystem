import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const communityPosts = sqliteTable("community_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  isAnonymous: integer("is_anonymous", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const students = sqliteTable('students', {
  id: text('id').primaryKey(), name: text('name').notNull(), year: text('year').notNull(),
  role: text('role').notNull().default('student'), passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(), lastSeen: integer('last_seen'), createdAt: integer('created_at').notNull(),
});
export const sessions = sqliteTable('study_sessions', {
  tokenHash: text('token_hash').primaryKey(), userId: text('user_id').notNull().references(()=>students.id), expiresAt: integer('expires_at').notNull(),
});
export const loginLimits = sqliteTable('login_limits', {
  key: text('key').primaryKey(), attempts: integer('attempts').notNull().default(0), resetAt: integer('reset_at').notNull(),
});
export const studyEntries = sqliteTable('study_entries', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().references(()=>students.id), key: text('key').notNull(), value: text('value').notNull(), updatedAt: integer('updated_at').notNull(),
});
export const studyActivity = sqliteTable('study_activity', {
  id: integer('id').primaryKey({autoIncrement:true}), userId: text('user_id').notNull().references(()=>students.id), kind: text('kind').notNull(), detail: text('detail').notNull(), createdAt: integer('created_at').notNull(),
});
