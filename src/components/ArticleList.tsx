import Link from "next/link";
import type { ArticleCardData } from "@/components/HeroFeatured";
import { CoverPhoto } from "@/components/CoverPhoto";
import { coverAlt } from "@/lib/articles";
import { formatDate, t, type Locale } from "@/lib/i18n";

const FALLBACK_IMG =
  "https://upload.wikimedia.org/wikipedia/commons/a/ad/Lake_Kivu.jpg";

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
        const img = article.coverImageUrl || FALLBACK_IMG;
        return (
          <li key={article.id ?? article.slug}>
            <Link
              href={`/${locale}/article/${article.slug}`}
              className="article-row group grid grid-cols-[96px_1fr] gap-4 py-5 sm:grid-cols-[140px_1fr] sm:gap-5"
            >
              <CoverPhoto
                src={img}
                alt={coverAlt(article, locale)}
                fit="cover"
                className="aspect-[4/3]"
                sizes="(max-width: 640px) 96px, 140px"
              />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">
                  {category}
                  {article.publishedAt
                    ? ` - ${formatDate(article.publishedAt, locale)}`
                    : ""}
                </p>
                <h3 className="mt-2 text-xl sm:text-2xl font-semibold tracking-[-0.03em] leading-snug line-clamp-2 group-hover:text-accent-deep transition-colors">
                  {article.title}
                </h3>
                <p className="mt-2 max-w-3xl text-sm sm:text-base text-ink-soft leading-relaxed line-clamp-2 sm:line-clamp-3">
                  {article.excerpt}
                </p>
                <p className="mt-3 text-xs text-ink-soft">
                  {copy.by} {article.authorName} - {article.readingTimeMinutes}{" "}
                  {copy.minRead}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
