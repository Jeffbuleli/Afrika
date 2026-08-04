import Link from "next/link";
import type { ArticleCardData } from "@/components/HeroFeatured";
import { CoverPhoto } from "@/components/CoverPhoto";
import { coverAlt } from "@/lib/articles";
import { formatExcerpt } from "@/lib/excerpt";
import { formatDate, t, type Locale } from "@/lib/i18n";

const FALLBACK =
  "https://upload.wikimedia.org/wikipedia/commons/a/ad/Lake_Kivu.jpg";

export function SecondaryTrio({
  articles,
  locale,
}: {
  articles: ArticleCardData[];
  locale: Locale;
}) {
  const copy = t(locale);
  const items = articles.slice(0, 3);
  if (items.length < 2) return null;

  return (
    <section className="border-y border-line bg-paper-deep/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12">
        <div className="mb-7 flex items-end justify-between gap-4 border-b border-navy/70 pb-3">
          <h2 className="section-kicker text-navy">{copy.latest}</h2>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {items.map((article) => {
            const cat =
              locale === "en"
                ? article.categoryLabelEn
                : article.categoryLabelFr;
            return (
              <Link
                key={article.slug}
                href={`/${locale}/article/${article.slug}`}
                className="group block"
              >
                <CoverPhoto
                  src={article.coverImageUrl || FALLBACK}
                  alt={coverAlt(article, locale)}
                  fit="cover"
                  className="story-media aspect-[16/10]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <p className="mt-3 text-[0.65rem] uppercase tracking-[0.14em] text-accent-deep">
                  {cat}
                  {article.publishedAt
                    ? ` - ${formatDate(article.publishedAt, locale)}`
                    : ""}
                </p>
                <h3 className="mt-1.5 text-lg sm:text-xl font-semibold tracking-[-0.025em] leading-snug line-clamp-3 group-hover:text-accent-deep transition-colors">
                  {article.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-ink-soft leading-relaxed">
                  {formatExcerpt(article.excerpt, 150)}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
