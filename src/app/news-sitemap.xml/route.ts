import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { articleTranslations, articles } from "@/db/schema";
import { safeLastmod } from "@/lib/seo";
import { SITE_NAME, siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 900;

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const base = siteUrl();
  const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 48);
  let rows: {
    slug: string;
    locale: string;
    title: string;
    publishedAt: string | null;
  }[] = [];

  try {
    rows = await db
      .select({
        slug: articles.slug,
        locale: articleTranslations.locale,
        title: articleTranslations.title,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .innerJoin(
        articleTranslations,
        eq(articleTranslations.articleId, articles.id),
      )
      .where(eq(articles.status, "published"))
      .orderBy(desc(articles.publishedAt))
      .limit(800);
  } catch {
    rows = [];
  }

  const recent = rows.filter((row) => {
    const published = safeLastmod(row.publishedAt);
    return published >= cutoff;
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${recent
  .map((row) => {
    const published = safeLastmod(row.publishedAt).toISOString();
    const loc = `${base}/${row.locale}/article/${row.slug}`;
    const lang = row.locale === "en" ? "en" : "fr";
    return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${xmlEscape(SITE_NAME)}</news:name>
        <news:language>${lang}</news:language>
      </news:publication>
      <news:publication_date>${published}</news:publication_date>
      <news:title>${xmlEscape(row.title)}</news:title>
    </news:news>
  </url>`;
  })
  .join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900",
    },
  });
}
