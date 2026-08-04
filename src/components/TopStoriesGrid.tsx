import Link from "next/link";
import type { ArticleCardData } from "@/components/HeroFeatured";
import { CoverPhoto } from "@/components/CoverPhoto";
import { coverAlt } from "@/lib/articles";
import { formatExcerpt } from "@/lib/excerpt";
import { formatDate, t, type Locale } from "@/lib/i18n";

export function TopStoriesGrid({
  lead,
  side,
  locale,
}: {
  lead: ArticleCardData;
  side: ArticleCardData[];
  locale: Locale;
}) {
  const copy = t(locale);
  const leadCat =
    locale === "en" ? lead.categoryLabelEn : lead.categoryLabelFr;
  const leadImage =
    lead.coverImageUrl ||
    "https://upload.wikimedia.org/wikipedia/commons/a/ad/Lake_Kivu.jpg";

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
      <div className="mb-6 flex items-end justify-between gap-4 border-b-2 border-navy pb-3">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-navy">
          {copy.featured}
        </h1>
        <p className="hidden sm:block text-sm text-ink-soft max-w-sm text-right">
          {copy.tagline}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <article className="lg:col-span-7">
          <Link
            href={`/${locale}/article/${lead.slug}`}
            className="group block"
          >
            <CoverPhoto
              src={leadImage}
              alt={coverAlt(lead, locale)}
              priority
              fit="cover"
              className="aspect-[16/10]"
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-accent-deep">
              {leadCat}
              {lead.publishedAt
                ? ` - ${formatDate(lead.publishedAt, locale)}`
                : ""}
            </p>
            <h2 className="mt-2 text-2xl sm:text-4xl font-semibold tracking-[-0.035em] leading-[1.12] line-clamp-3 group-hover:text-accent-deep transition-colors">
              {lead.title}
            </h2>
            <p className="mt-3 text-base text-ink-soft leading-relaxed">
              {formatExcerpt(lead.excerpt)}
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-accent-deep">
              {copy.read} →
            </span>
          </Link>
        </article>

        <aside className="lg:col-span-5 flex flex-col divide-y divide-line border-t lg:border-t-0 lg:border-l border-line lg:pl-8">
          {side.map((article) => {
            const cat =
              locale === "en"
                ? article.categoryLabelEn
                : article.categoryLabelFr;
            const img =
              article.coverImageUrl ||
              "https://upload.wikimedia.org/wikipedia/commons/a/ad/Lake_Kivu.jpg";
            return (
              <Link
                key={article.slug}
                href={`/${locale}/article/${article.slug}`}
                className="group grid grid-cols-[112px_1fr] gap-3 py-4 first:pt-0 sm:grid-cols-[132px_1fr]"
              >
                <CoverPhoto
                  src={img}
                  alt={coverAlt(article, locale)}
                  fit="cover"
                  className="aspect-[4/3]"
                  sizes="132px"
                />
                <div className="min-w-0">
                  <p className="text-[0.65rem] uppercase tracking-[0.14em] text-ink-soft">
                    {cat}
                  </p>
                  <h3 className="mt-1 text-base sm:text-lg font-semibold tracking-[-0.02em] leading-snug line-clamp-2 group-hover:text-accent-deep transition-colors">
                    {article.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                    {formatExcerpt(article.excerpt, 160)}
                  </p>
                </div>
              </Link>
            );
          })}
        </aside>
      </div>
    </section>
  );
}
