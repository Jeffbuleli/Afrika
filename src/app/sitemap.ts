import type { MetadataRoute } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { articleTranslations, articles } from "@/db/schema";
import { safeLastmod } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

// Build image has no SQLite schema yet - sitemap must query the live DB.
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
      url: `${base}/fr/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${base}/en/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${base}/fr/legal`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${base}/en/legal`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
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
        featured: articles.featured,
      })
      .from(articles)
      .innerJoin(
        articleTranslations,
        eq(articleTranslations.articleId, articles.id),
      )
      .where(eq(articles.status, "published"))
      .orderBy(desc(articles.publishedAt))
      .limit(20000);

    const articleEntries: MetadataRoute.Sitemap = rows.map((row) => {
      const lastModified = safeLastmod(row.updatedAt || row.publishedAt || now);
      const published = safeLastmod(row.publishedAt || now);
      const recent = now.getTime() - published.getTime() < 1000 * 60 * 60 * 24 * 14;
      return {
        url: `${base}/${row.locale}/article/${row.slug}`,
        lastModified,
        changeFrequency: recent ? ("daily" as const) : ("weekly" as const),
        priority: row.featured ? 0.9 : recent ? 0.8 : 0.6,
      };
    });

    return [...staticEntries, ...articleEntries];
  } catch {
    return staticEntries;
  }
}
