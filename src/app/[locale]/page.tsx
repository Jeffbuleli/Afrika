import { notFound } from "next/navigation";
import { CategorySections } from "@/components/CategorySections";
import { NewsTicker } from "@/components/NewsTicker";
import { TopStoriesGrid } from "@/components/TopStoriesGrid";
import {
  getCategories,
  getFeaturedArticle,
  getPublishedArticles,
} from "@/lib/articles";
import { isLocale, type Locale } from "@/lib/i18n";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const [featured, articles, categories] = await Promise.all([
    getFeaturedArticle(locale),
    getPublishedArticles(locale, 80),
    getCategories(),
  ]);

  const lead = featured || articles[0];
  if (!lead) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-24">
        <h1 className="text-3xl font-semibold">Africa Insight</h1>
      </section>
    );
  }

  const rest = articles.filter((a) => a.slug !== lead.slug);
  const side = rest.slice(0, 4);
  const tickerItems = [lead, ...rest].slice(0, 12).map((a) => ({
    slug: a.slug,
    title: a.title,
    categoryLabel:
      locale === "en" ? a.categoryLabelEn : a.categoryLabelFr,
  }));

  const byCategory: Record<string, typeof articles> = {};
  for (const article of articles) {
    const key = article.categorySlug;
    if (!byCategory[key]) byCategory[key] = [];
    byCategory[key].push(article);
  }

  return (
    <>
      <NewsTicker items={tickerItems} locale={locale} />
      <TopStoriesGrid lead={lead} side={side} locale={locale} />
      <CategorySections
        categories={categories}
        byCategory={byCategory}
        locale={locale}
      />
    </>
  );
}
