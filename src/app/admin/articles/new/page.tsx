import { redirect } from "next/navigation";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { db } from "@/db";
import { getSession } from "@/lib/auth";

export default async function NewArticlePage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const [categories, authors] = await Promise.all([
    db.query.categories.findMany({
      orderBy: (c, { asc }) => [asc(c.sortOrder)],
    }),
    db.query.authors.findMany(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-[-0.03em]">
        Nouvel article
      </h1>
      <div className="mt-8">
        <ArticleForm categories={categories} authors={authors} />
      </div>
    </div>
  );
}
