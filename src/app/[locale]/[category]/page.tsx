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
import { categoryBlurb } from "@/lib/category-blurbs";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { SITE_NAME, siteUrl } from "@/lib/site";

const PAGE_SIZE = 12;

type Props = {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, category: slug } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw as Locale;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  const title = categoryLabel(category, locale);
  const description = categoryBlurb(slug, locale);
  const url = `${siteUrl()}/${locale}/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `${title} - ${SITE_NAME}`,
      description,
      url,
      locale: locale === "en" ? "en_GB" : "fr_FR",
      images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} - ${SITE_NAME}`,
      description,
      images: ["/og-default.jpg"],
    },
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
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
        {categoryBlurb(slug, locale)}
      </p>
      <div className="mt-10 border-t site-rule">
        <ArticleList articles={articles} locale={locale} />
      </div>
      <Pagination
        locale={locale}
        page={page}
        totalPages={totalPages}
        hrefForPage={(p) =>
          p <= 1 ? `/${locale}/${slug}` : `/${locale}/${slug}?page=${p}`
        }
        className="mt-10 border-t site-rule pt-6"
      />
    </div>
  );
}
