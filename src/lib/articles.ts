import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  articleTranslations,
  articles,
  authors,
  categories,
} from "@/db/schema";
import type { Locale } from "@/lib/i18n";

export async function getCategories() {
  return db.query.categories.findMany({
    orderBy: (c, { asc }) => [asc(c.sortOrder)],
  });
}

export async function getCategoryBySlug(slug: string) {
  return db.query.categories.findFirst({
    where: eq(categories.slug, slug),
  });
}

export async function getPublishedArticles(locale: Locale, limit = 20) {
  const query = db
    .select({
      id: articles.id,
      slug: articles.slug,
      country: articles.country,
      coverImageUrl: articles.coverImageUrl,
      coverImageAltFr: articles.coverImageAltFr,
      coverImageAltEn: articles.coverImageAltEn,
      featured: articles.featured,
      readingTimeMinutes: articles.readingTimeMinutes,
      publishedAt: articles.publishedAt,
      title: articleTranslations.title,
      excerpt: articleTranslations.excerpt,
      categorySlug: categories.slug,
      categoryLabelFr: categories.labelFr,
      categoryLabelEn: categories.labelEn,
      authorName: authors.name,
      authorSlug: authors.slug,
    })
    .from(articles)
    .innerJoin(
      articleTranslations,
      and(
        eq(articleTranslations.articleId, articles.id),
        eq(articleTranslations.locale, locale),
      ),
    )
    .innerJoin(categories, eq(categories.id, articles.categoryId))
    .innerJoin(authors, eq(authors.id, articles.authorId))
    .where(eq(articles.status, "published"))
    .orderBy(desc(articles.publishedAt));

  if (limit > 0) {
    return query.limit(limit);
  }
  return query;
}

export async function getFeaturedArticle(locale: Locale) {
  const featured = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      country: articles.country,
      coverImageUrl: articles.coverImageUrl,
      coverImageAltFr: articles.coverImageAltFr,
      coverImageAltEn: articles.coverImageAltEn,
      featured: articles.featured,
      readingTimeMinutes: articles.readingTimeMinutes,
      publishedAt: articles.publishedAt,
      title: articleTranslations.title,
      excerpt: articleTranslations.excerpt,
      categorySlug: categories.slug,
      categoryLabelFr: categories.labelFr,
      categoryLabelEn: categories.labelEn,
      authorName: authors.name,
      authorSlug: authors.slug,
    })
    .from(articles)
    .innerJoin(
      articleTranslations,
      and(
        eq(articleTranslations.articleId, articles.id),
        eq(articleTranslations.locale, locale),
      ),
    )
    .innerJoin(categories, eq(categories.id, articles.categoryId))
    .innerJoin(authors, eq(authors.id, articles.authorId))
    .where(and(eq(articles.status, "published"), eq(articles.featured, true)))
    .orderBy(
      sql`case ${articles.country} when 'DRC' then 0 when 'RWANDA' then 1 when 'UGANDA' then 2 else 3 end`,
      desc(articles.publishedAt),
    )
    .limit(1);

  if (featured[0]) return featured[0];
  const fallback = await getPublishedArticles(locale, 1);
  return fallback[0] ?? null;
}

export async function getArticlesByCategory(
  locale: Locale,
  categorySlug: string,
  limit = 30,
  offset = 0,
) {
  return db
    .select({
      id: articles.id,
      slug: articles.slug,
      country: articles.country,
      coverImageUrl: articles.coverImageUrl,
      coverImageAltFr: articles.coverImageAltFr,
      coverImageAltEn: articles.coverImageAltEn,
      featured: articles.featured,
      readingTimeMinutes: articles.readingTimeMinutes,
      publishedAt: articles.publishedAt,
      title: articleTranslations.title,
      excerpt: articleTranslations.excerpt,
      categorySlug: categories.slug,
      categoryLabelFr: categories.labelFr,
      categoryLabelEn: categories.labelEn,
      authorName: authors.name,
      authorSlug: authors.slug,
    })
    .from(articles)
    .innerJoin(
      articleTranslations,
      and(
        eq(articleTranslations.articleId, articles.id),
        eq(articleTranslations.locale, locale),
      ),
    )
    .innerJoin(categories, eq(categories.id, articles.categoryId))
    .innerJoin(authors, eq(authors.id, articles.authorId))
    .where(
      and(eq(articles.status, "published"), eq(categories.slug, categorySlug)),
    )
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .offset(offset);
}

export async function countArticlesByCategory(categorySlug: string) {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .innerJoin(categories, eq(categories.id, articles.categoryId))
    .where(
      and(eq(articles.status, "published"), eq(categories.slug, categorySlug)),
    );
  return Number(rows[0]?.count || 0);
}

export async function getArticleBySlug(locale: Locale, slug: string) {
  const row = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      country: articles.country,
      coverImageUrl: articles.coverImageUrl,
      coverImageAltFr: articles.coverImageAltFr,
      coverImageAltEn: articles.coverImageAltEn,
      featured: articles.featured,
      readingTimeMinutes: articles.readingTimeMinutes,
      publishedAt: articles.publishedAt,
      title: articleTranslations.title,
      excerpt: articleTranslations.excerpt,
      body: articleTranslations.body,
      seoTitle: articleTranslations.seoTitle,
      seoDescription: articleTranslations.seoDescription,
      categorySlug: categories.slug,
      categoryLabelFr: categories.labelFr,
      categoryLabelEn: categories.labelEn,
      authorName: authors.name,
      authorSlug: authors.slug,
      authorBioFr: authors.bioFr,
      authorBioEn: authors.bioEn,
    })
    .from(articles)
    .innerJoin(
      articleTranslations,
      and(
        eq(articleTranslations.articleId, articles.id),
        eq(articleTranslations.locale, locale),
      ),
    )
    .innerJoin(categories, eq(categories.id, articles.categoryId))
    .innerJoin(authors, eq(authors.id, articles.authorId))
    .where(and(eq(articles.status, "published"), eq(articles.slug, slug)))
    .limit(1);

  return row[0] ?? null;
}

export async function getAvailableLocales(articleId: number) {
  const rows = await db
    .select({ locale: articleTranslations.locale })
    .from(articleTranslations)
    .where(eq(articleTranslations.articleId, articleId));
  return rows.map((r) => r.locale);
}

export async function searchArticles(locale: Locale, query: string) {
  const q = `%${query.trim()}%`;
  if (!query.trim()) return [];

  return db
    .select({
      id: articles.id,
      slug: articles.slug,
      country: articles.country,
      coverImageUrl: articles.coverImageUrl,
      coverImageAltFr: articles.coverImageAltFr,
      coverImageAltEn: articles.coverImageAltEn,
      featured: articles.featured,
      readingTimeMinutes: articles.readingTimeMinutes,
      publishedAt: articles.publishedAt,
      title: articleTranslations.title,
      excerpt: articleTranslations.excerpt,
      categorySlug: categories.slug,
      categoryLabelFr: categories.labelFr,
      categoryLabelEn: categories.labelEn,
      authorName: authors.name,
      authorSlug: authors.slug,
    })
    .from(articles)
    .innerJoin(
      articleTranslations,
      and(
        eq(articleTranslations.articleId, articles.id),
        eq(articleTranslations.locale, locale),
      ),
    )
    .innerJoin(categories, eq(categories.id, articles.categoryId))
    .innerJoin(authors, eq(authors.id, articles.authorId))
    .where(
      and(
        eq(articles.status, "published"),
        or(
          like(articleTranslations.title, q),
          like(articleTranslations.excerpt, q),
          like(articleTranslations.body, q),
        ),
      ),
    )
    .orderBy(desc(articles.publishedAt))
    .limit(40);
}

export async function getRelatedArticles(
  locale: Locale,
  categorySlug: string,
  excludeSlug: string,
  limit = 3,
) {
  const rows = await getArticlesByCategory(locale, categorySlug, limit + 5);
  return rows.filter((a) => a.slug !== excludeSlug).slice(0, limit);
}

export function categoryLabel(
  category: { labelFr: string; labelEn: string },
  locale: Locale,
) {
  return locale === "en" ? category.labelEn : category.labelFr;
}

export function coverAlt(
  article: {
    coverImageAltFr: string | null;
    coverImageAltEn: string | null;
    title?: string;
  },
  locale: Locale,
) {
  if (locale === "en") {
    return article.coverImageAltEn || article.title || "";
  }
  return article.coverImageAltFr || article.title || "";
}

export async function estimateReadingTime(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 200));
}

export { sql };
