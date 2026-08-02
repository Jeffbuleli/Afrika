import Link from "next/link";
import type { ArticleCardData } from "@/components/HeroFeatured";
import { formatDate, t, type Locale } from "@/lib/i18n";

export function ArticleList({
  articles,
  locale,
}: {
  articles: ArticleCardData[];
  locale: Locale;
}) {
  const copy = t(locale);

  if (!articles.length) {
    return <p className="text-ink-soft">{copy.noResults}</p>;
  }

  return (
    <ul className="divide-y divide-line">
      {articles.map((article) => {
        const category =
          locale === "en" ? article.categoryLabelEn : article.categoryLabelFr;
        return (
          <li key={article.id ?? article.slug}>
            <Link
              href={`/${locale}/article/${article.slug}`}
              className="article-row block py-5"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                {category}
                {article.publishedAt
                  ? ` - ${formatDate(article.publishedAt, locale)}`
                  : ""}
              </p>
              <h3 className="mt-2 text-xl sm:text-2xl font-semibold tracking-[-0.03em] leading-snug">
                {article.title}
              </h3>
              <p className="mt-2 max-w-3xl text-sm sm:text-base text-ink-soft leading-relaxed">
                {article.excerpt}
              </p>
              <p className="mt-3 text-xs text-ink-soft">
                {copy.by} {article.authorName} - {article.readingTimeMinutes}{" "}
                {copy.minRead}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
