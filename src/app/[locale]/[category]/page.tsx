import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArticleList } from "@/components/ArticleList";
import { Pagination } from "@/components/Pagination";
import {
  categoryLabel,
  countArticlesByCategory,
  getArticlesByCategory,
  getCategoryBySlug,
} from "@/lib/articles";
import { isLocale, t, type Locale } from "@/lib/i18n";

const PAGE_SIZE = 12;

type Props = {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<{ page?: string }>;
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

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale: raw, category: slug } = await params;
  const { page: pageRaw } = await searchParams;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  if (slug === "article" || slug === "search") notFound();

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const total = await countArticlesByCategory(slug);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requested = Math.max(1, Number.parseInt(pageRaw || "1", 10) || 1);
  const page = Math.min(requested, totalPages);
  const offset = (page - 1) * PAGE_SIZE;

  const articles = await getArticlesByCategory(locale, slug, PAGE_SIZE, offset);
  const copy = t(locale);
  const label = categoryLabel(category, locale);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
        {copy.categories}
      </p>
      <h1 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-[-0.035em] text-gold-deep">
        {label}
      </h1>
      <p className="mt-4 max-w-2xl text-ink-soft">
        {locale === "fr"
          ? `${total} articles dans la rubrique ${label} - janvier à juillet 2026.`
          : `${total} articles in ${label} - January to July 2026.`}
      </p>
      <div className="mt-10 border-t site-rule">
        <ArticleList articles={articles} locale={locale} />
      </div>
      <Pagination
        locale={locale}
        page={page}
        totalPages={totalPages}
        totalItems={total}
        hrefForPage={(p) =>
          p <= 1 ? `/${locale}/${slug}` : `/${locale}/${slug}?page=${p}`
        }
        className="mt-10 border-t site-rule pt-6"
      />
    </div>
  );
}
