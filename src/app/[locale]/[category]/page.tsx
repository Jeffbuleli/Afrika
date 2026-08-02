import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArticleList } from "@/components/ArticleList";
import {
  categoryLabel,
  getArticlesByCategory,
  getCategoryBySlug,
} from "@/lib/articles";
import { isLocale, t, type Locale } from "@/lib/i18n";

type Props = {
  params: Promise<{ locale: string; category: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, category: slug } = await params;
  if (!isLocale(raw)) return {};
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: categoryLabel(category, raw as Locale),
  };
}

export default async function CategoryPage({ params }: Props) {
  const { locale: raw, category: slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  // Reserved paths handled by sibling routes; still guard reserved words
  if (slug === "article" || slug === "search") notFound();

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const articles = await getArticlesByCategory(locale, slug);
  const copy = t(locale);
  const label = categoryLabel(category, locale);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
        {copy.categories}
      </p>
      <h1 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-[-0.035em]">
        {label}
      </h1>
      <p className="mt-4 max-w-2xl text-ink-soft">
        {locale === "fr"
          ? `Analyses et reportages - rubrique ${label}.`
          : `Analysis and reporting - ${label} desk.`}
      </p>
      <div className="mt-10 border-t site-rule">
        <ArticleList articles={articles} locale={locale} />
      </div>
    </div>
  );
}
