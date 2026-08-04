import type { MetadataRoute } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { articleTranslations, articles } from "@/db/schema";
import { siteUrl } from "@/lib/site";

// Must stay dynamic: build image has no SQLite schema yet.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${base}/fr`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${base}/en`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${base}/fr/search`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.3,
    },
    {
      url: `${base}/en/search`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.3,
    },
  ];

  try {
    const cats = await db.query.categories.findMany({
      orderBy: (c, { asc }) => [asc(c.sortOrder)],
    });
    for (const cat of cats) {
      staticEntries.push(
        {
          url: `${base}/fr/${cat.slug}`,
          lastModified: now,
          changeFrequency: "daily",
          priority: 0.8,
        },
        {
          url: `${base}/en/${cat.slug}`,
          lastModified: now,
          changeFrequency: "daily",
          priority: 0.8,
        },
      );
    }

    const rows = await db
      .select({
        slug: articles.slug,
        publishedAt: articles.publishedAt,
        updatedAt: articles.updatedAt,
        locale: articleTranslations.locale,
      })
      .from(articles)
      .innerJoin(
        articleTranslations,
        eq(articleTranslations.articleId, articles.id),
      )
      .where(eq(articles.status, "published"))
      .orderBy(desc(articles.publishedAt))
      .limit(20000);

    const articleEntries: MetadataRoute.Sitemap = rows.map((row) => ({
      url: `${base}/${row.locale}/article/${row.slug}`,
      lastModified: new Date(row.updatedAt || row.publishedAt || now),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    return [...staticEntries, ...articleEntries];
  } catch {
    // Build-time / empty DB — still ship a valid sitemap shell.
    return staticEntries;
  }
}
