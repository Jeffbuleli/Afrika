import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { articleTranslations, articles } from "@/db/schema";
import { getSession } from "@/lib/auth";

export default async function AdminHomePage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      status: articles.status,
      featured: articles.featured,
      updatedAt: articles.updatedAt,
      publishedAt: articles.publishedAt,
      titleFr: articleTranslations.title,
    })
    .from(articles)
    .leftJoin(
      articleTranslations,
      eq(articleTranslations.articleId, articles.id),
    )
    .orderBy(desc(articles.updatedAt));

  const byId = new Map<
    number,
    {
      id: number;
      slug: string;
      status: string;
      featured: boolean;
      updatedAt: string;
      title: string;
    }
  >();

  for (const row of rows) {
    const current = byId.get(row.id);
    if (!current) {
      byId.set(row.id, {
        id: row.id,
        slug: row.slug,
        status: row.status,
        featured: row.featured,
        updatedAt: row.updatedAt,
        title: row.titleFr || row.slug,
      });
    } else if (row.titleFr && !current.title) {
      current.title = row.titleFr;
    }
  }

  const list = Array.from(byId.values());

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">Articles</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Publier, éditer, mettre à la une
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-accent-deep"
        >
          Nouvel article
        </Link>
      </div>

      <ul className="mt-8 divide-y divide-line border-t border-line">
        {list.map((article) => (
          <li
            key={article.id}
            className="flex flex-wrap items-center justify-between gap-3 py-4"
          >
            <div>
              <p className="font-medium">{article.title}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {article.status}
                {article.featured ? " - une" : ""} - {article.slug}
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <Link
                href={`/fr/article/${article.slug}`}
                className="text-ink-soft hover:text-ink"
              >
                Voir
              </Link>
              <Link
                href={`/admin/articles/${article.id}/edit`}
                className="text-accent-deep hover:text-accent"
              >
                Éditer
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
