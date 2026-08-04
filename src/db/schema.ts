import { relations, sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const authors = sqliteTable("authors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  bioFr: text("bio_fr"),
  bioEn: text("bio_en"),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  labelFr: text("label_fr").notNull(),
  labelEn: text("label_en").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const articles = sqliteTable("articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  authorId: integer("author_id")
    .notNull()
    .references(() => authors.id),
  status: text("status", { enum: ["draft", "published"] })
    .notNull()
    .default("draft"),
  country: text("country"),
  coverImageUrl: text("cover_image_url"),
  coverImageAltFr: text("cover_image_alt_fr"),
  coverImageAltEn: text("cover_image_alt_en"),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  readingTimeMinutes: integer("reading_time_minutes").notNull().default(5),
  publishedAt: text("published_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const articleTranslations = sqliteTable(
  "article_translations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    locale: text("locale", { enum: ["fr", "en"] }).notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    body: text("body").notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
  },
  (table) => [uniqueIndex("article_locale_uidx").on(table.articleId, table.locale)],
);

export const media = sqliteTable("media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  url: text("url").notNull(),
  altFr: text("alt_fr"),
  altEn: text("alt_en"),
  width: integer("width"),
  height: integer("height"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const admins = sqliteTable("admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/** Public page views — IP, where, when, browser. */
export const visitLogs = sqliteTable("visit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  path: text("path").notNull(),
  method: text("method").notNull().default("GET"),
  ip: text("ip"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  userAgent: text("user_agent"),
  browser: text("browser"),
  os: text("os"),
  device: text("device"),
  referrer: text("referrer"),
  locale: text("locale"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/** Admin login attempts — success / fail, IP, where, browser. */
export const adminAuthLogs = sqliteTable("admin_auth_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  event: text("event", {
    enum: ["login_success", "login_failure", "logout"],
  }).notNull(),
  ip: text("ip"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  userAgent: text("user_agent"),
  browser: text("browser"),
  os: text("os"),
  device: text("device"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/** Public suggestions / editor contact — no personal staff info exposed. */
export const contactMessages = sqliteTable("contact_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind", { enum: ["suggestion", "contact"] })
    .notNull()
    .default("contact"),
  name: text("name").notNull(),
  email: text("email"),
  message: text("message").notNull(),
  locale: text("locale"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  status: text("status", { enum: ["new", "read", "archived"] })
    .notNull()
    .default("new"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type ContactMessage = typeof contactMessages.$inferSelect;

export const authorsRelations = relations(authors, ({ many }) => ({
  articles: many(articles),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  category: one(categories, {
    fields: [articles.categoryId],
    references: [categories.id],
  }),
  author: one(authors, {
    fields: [articles.authorId],
    references: [authors.id],
  }),
  translations: many(articleTranslations),
}));

export const articleTranslationsRelations = relations(
  articleTranslations,
  ({ one }) => ({
    article: one(articles, {
      fields: [articleTranslations.articleId],
      references: [articles.id],
    }),
  }),
);

export type Article = typeof articles.$inferSelect;
export type ArticleTranslation = typeof articleTranslations.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Author = typeof authors.$inferSelect;
