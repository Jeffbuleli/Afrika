import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { marked } from "marked";
import { ArticleList } from "@/components/ArticleList";
import { CoverPhoto } from "@/components/CoverPhoto";
import {
  coverAlt,
  getArticleBySlug,
  getAvailableLocales,
  getRelatedArticles,
} from "@/lib/articles";
import { formatDate, isLocale, otherLocale, t, type Locale } from "@/lib/i18n";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) return {};
  const article = await getArticleBySlug(raw as Locale, slug);
  if (!article) return {};
  return {
    title: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt,
  };
}

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: Props) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const article = await getArticleBySlug(locale, slug);
  if (!article) notFound();

  const copy = t(locale);
  const category =
    locale === "en" ? article.categoryLabelEn : article.categoryLabelFr;
  const bodyHtml = await marked.parse(article.body);
  const available = await getAvailableLocales(article.id);
  const sister = otherLocale(locale);
  const hasSister = available.includes(sister);
  const related = await getRelatedArticles(locale, article.categorySlug, slug);
  const image =
    article.coverImageUrl ||
    "https://images.unsplash.com/photo-1523805009345-7448845a9e53?auto=format&fit=crop&w=1600&q=80";

  return (
    <article key={`${locale}-${slug}`} lang={locale}>
      <CoverPhoto
        src={image}
        alt={coverAlt(article, locale)}
        priority
        fit="contain"
        className="h-[42vh] min-h-[280px] w-full border-b border-line bg-ink"
        sizes="100vw"
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-[68ch] -mt-16 relative bg-paper px-4 sm:px-8 py-8 sm:py-10 border border-line">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">
            <Link
              href={`/${locale}/${article.categorySlug}`}
              className="hover:text-accent-deep"
            >
              {category}
            </Link>
            {article.publishedAt
              ? ` - ${formatDate(article.publishedAt, locale)}`
              : ""}
          </p>
          <h1 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-[-0.035em] leading-[1.12]">
            {article.title}
          </h1>
          <p className="mt-5 text-lg text-ink-soft leading-relaxed">
            {article.excerpt}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-soft border-t border-b site-rule py-4">
            <span>
              {copy.by}{" "}
              <span className="text-ink font-medium">{article.authorName}</span>
            </span>
            <span>
              {article.readingTimeMinutes} {copy.minRead}
            </span>
            {hasSister ? (
              <a
                href={`/${sister}/article/${article.slug}`}
                className="text-accent-deep hover:text-accent font-medium"
                hrefLang={sister}
                lang={sister}
              >
                {copy.switchTo}
              </a>
            ) : null}
          </div>

          <div
            className="prose-article mt-8"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </div>

        {related.length > 0 ? (
          <section className="mt-16 mb-20 max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-[-0.03em] border-b site-rule pb-3">
              {copy.related}
            </h2>
            <ArticleList articles={related} locale={locale} />
          </section>
        ) : (
          <div className="mb-16" />
        )}
      </div>
    </article>
  );
}
