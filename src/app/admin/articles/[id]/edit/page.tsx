import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { getSession } from "@/lib/auth";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const article = await db.query.articles.findFirst({
    where: eq(articles.id, Number(id)),
    with: { translations: true },
  });
  if (!article) notFound();

  const [categories, authors] = await Promise.all([
    db.query.categories.findMany({
      orderBy: (c, { asc }) => [asc(c.sortOrder)],
    }),
    db.query.authors.findMany(),
  ]);

  const fr = article.translations.find((t) => t.locale === "fr");
  const en = article.translations.find((t) => t.locale === "en");

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-[-0.03em]">
        Éditer - {fr?.title || en?.title || article.slug}
      </h1>
      <div className="mt-8">
        <ArticleForm
          categories={categories}
          authors={authors}
          initial={{
            id: article.id,
            slug: article.slug,
            categoryId: article.categoryId,
            authorId: article.authorId,
            status: article.status,
            featured: article.featured,
            coverImageUrl: article.coverImageUrl,
            titleFr: fr?.title,
            titleEn: en?.title,
            excerptFr: fr?.excerpt,
            excerptEn: en?.excerpt,
            bodyFr: fr?.body,
            bodyEn: en?.body,
          }}
        />
      </div>
    </div>
  );
}
