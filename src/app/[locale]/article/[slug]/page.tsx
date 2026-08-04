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
import { JsonLd, articleJsonLd } from "@/components/JsonLd";
import { SITE_NAME, absoluteUrl, siteUrl } from "@/lib/site";
import { formatExcerpt } from "@/lib/excerpt";
import { articleKeywords } from "@/lib/seo-keywords";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw as Locale;
  const article = await getArticleBySlug(locale, slug);
  if (!article) return {};

  const categoryLabel =
    locale === "en" ? article.categoryLabelEn : article.categoryLabelFr;
  const title = article.seoTitle || article.title;
  const description = formatExcerpt(
    article.seoDescription || article.excerpt || "",
  );
  const url = `${siteUrl()}/${locale}/article/${article.slug}`;
  const image = absoluteUrl(article.coverImageUrl);
  const imageAlt = coverAlt(article, locale) || title;
  const keywords = articleKeywords({
    title: article.title,
    locale,
    categoryLabel,
    country: article.country,
  });

  return {
    title,
    description,
    keywords,
    authors: article.authorName
      ? [{ name: article.authorName }]
      : [{ name: SITE_NAME }],
    category: categoryLabel,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: url,
      languages: {
        fr: `${siteUrl()}/fr/article/${article.slug}`,
        en: `${siteUrl()}/en/article/${article.slug}`,
      },
    },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: locale === "en" ? "en_GB" : "fr_FR",
      publishedTime: article.publishedAt || undefined,
      authors: article.authorName ? [article.authorName] : undefined,
      section: categoryLabel,
      tags: keywords.slice(0, 12),
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
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
      <JsonLd
        data={articleJsonLd({
          title: article.title,
          excerpt: formatExcerpt(article.excerpt || article.title),
          slug: article.slug,
          locale,
          publishedAt: article.publishedAt,
          coverImageUrl: article.coverImageUrl,
          authorName: article.authorName,
          categoryLabel: category,
          country: article.country,
          keywords: articleKeywords({
            title: article.title,
            locale,
            categoryLabel: category,
            country: article.country,
          }),
        })}
      />
      <CoverPhoto
        src={image}
        alt={coverAlt(article, locale)}
        priority
        fit="cover"
        className="h-[42vh] min-h-[280px] w-full bg-ink"
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
