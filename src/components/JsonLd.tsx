import { SITE_NAME, absoluteUrl, siteUrl } from "@/lib/site";
import type { Locale } from "@/lib/i18n";

type ArticleJsonLdInput = {
  title: string;
  excerpt: string;
  slug: string;
  locale: Locale;
  publishedAt: string | null;
  updatedAt?: string | null;
  coverImageUrl: string | null;
  authorName: string;
  categoryLabel: string;
};

export function articleJsonLd(article: ArticleJsonLdInput) {
  const url = `${siteUrl()}/${article.locale}/article/${article.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    image: [absoluteUrl(article.coverImageUrl)],
    datePublished: article.publishedAt || undefined,
    dateModified: article.updatedAt || article.publishedAt || undefined,
    author: {
      "@type": "Person",
      name: article.authorName,
    },
    publisher: {
      "@type": "NewsMediaOrganization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl()}/icon-512.png`,
      },
      url: siteUrl(),
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    articleSection: article.categoryLabel,
    inLanguage: article.locale === "en" ? "en" : "fr",
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: SITE_NAME,
    url: siteUrl(),
    logo: `${siteUrl()}/icon-512.png`,
    sameAs: [],
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
