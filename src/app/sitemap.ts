import type { MetadataRoute } from "next";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { articleTranslations, articles } from "@/db/schema";
import { safeLastmod } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

// Build image has no SQLite schema yet - sitemap must query the live DB.
export const dynamic = "force-dynamic";

export async function generateSitemaps() {
  return [{ id: "pages" }, { id: "fr" }, { id: "en" }];
}

async function staticPages(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
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
      entries.push(
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
  } catch {
    // empty DB at build
  }
  return entries;
}

async function articlePages(locale: "fr" | "en"): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  try {
    const rows = await db
      .select({
        slug: articles.slug,
        publishedAt: articles.publishedAt,
        updatedAt: articles.updatedAt,
        featured: articles.featured,
      })
      .from(articles)
      .innerJoin(
        articleTranslations,
        eq(articleTranslations.articleId, articles.id),
      )
      .where(
        and(
          eq(articleTranslations.locale, locale),
          eq(articles.status, "published"),
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(20000);

    return rows.map((row) => {
      const lastModified = safeLastmod(row.updatedAt || row.publishedAt || now);
      const published = safeLastmod(row.publishedAt || now);
      const ageMs = now.getTime() - published.getTime();
      const recent = ageMs < 1000 * 60 * 60 * 24 * 14;
      return {
        url: `${base}/${locale}/article/${row.slug}`,
        lastModified,
        changeFrequency: recent ? ("daily" as const) : ("weekly" as const),
        priority: row.featured ? 0.9 : recent ? 0.8 : 0.6,
      };
    });
  } catch {
    return [];
  }
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const sitemapId = await id;
  if (sitemapId === "fr") return articlePages("fr");
  if (sitemapId === "en") return articlePages("en");
  return staticPages();
}
