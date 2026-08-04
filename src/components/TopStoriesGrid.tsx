import Link from "next/link";
import type { ArticleCardData } from "@/components/HeroFeatured";
import { CoverPhoto } from "@/components/CoverPhoto";
import { coverAlt } from "@/lib/articles";
import { formatExcerpt } from "@/lib/excerpt";
import { formatDate, t, type Locale } from "@/lib/i18n";

const FALLBACK =
  "https://upload.wikimedia.org/wikipedia/commons/a/ad/Lake_Kivu.jpg";

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
  const leadImage = lead.coverImageUrl || FALLBACK;
  const [railLead, ...railRest] = side;

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 flex items-end justify-between gap-4 border-b border-navy/80 pb-3">
        <h1 className="section-kicker text-navy">{copy.featured}</h1>
        <p className="hidden sm:block max-w-sm text-right text-sm text-ink-soft">
          {copy.tagline}
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
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
              className="story-media aspect-[3/2]"
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
            <p className="mt-5 text-xs uppercase tracking-[0.16em] text-accent-deep">
              {leadCat}
              {lead.publishedAt
                ? ` - ${formatDate(lead.publishedAt, locale)}`
                : ""}
            </p>
            <h2 className="mt-2 text-3xl sm:text-4xl md:text-[2.75rem] font-semibold tracking-[-0.035em] leading-[1.1] line-clamp-3 group-hover:text-accent-deep transition-colors">
              {lead.title}
            </h2>
            <p className="story-deck mt-4 max-w-xl">
              {formatExcerpt(lead.excerpt, 200)}
            </p>
            <span className="mt-5 inline-block text-sm font-medium text-accent-deep">
              {copy.read} →
            </span>
          </Link>
        </article>

        <aside className="lg:col-span-5 flex flex-col lg:border-l lg:border-line lg:pl-10">
          {railLead ? (
            <Link
              href={`/${locale}/article/${railLead.slug}`}
              className="group block pb-6 border-b border-line"
            >
              <CoverPhoto
                src={railLead.coverImageUrl || FALLBACK}
                alt={coverAlt(railLead, locale)}
                fit="cover"
                className="story-media aspect-[16/10]"
                sizes="(max-width: 1024px) 100vw, 35vw"
              />
              <p className="mt-3 text-[0.65rem] uppercase tracking-[0.14em] text-ink-soft">
                {locale === "en"
                  ? railLead.categoryLabelEn
                  : railLead.categoryLabelFr}
              </p>
              <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.025em] leading-snug line-clamp-3 group-hover:text-accent-deep transition-colors">
                {railLead.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm text-ink-soft leading-relaxed">
                {formatExcerpt(railLead.excerpt, 140)}
              </p>
            </Link>
          ) : null}

          <div className="flex flex-col divide-y divide-line">
            {railRest.map((article) => {
              const cat =
                locale === "en"
                  ? article.categoryLabelEn
                  : article.categoryLabelFr;
              const img = article.coverImageUrl || FALLBACK;
              return (
                <Link
                  key={article.slug}
                  href={`/${locale}/article/${article.slug}`}
                  className="group grid grid-cols-[88px_1fr] gap-3 py-4 sm:grid-cols-[100px_1fr]"
                >
                  <CoverPhoto
                    src={img}
                    alt={coverAlt(article, locale)}
                    fit="cover"
                    className="story-media aspect-[4/3]"
                    sizes="100px"
                  />
                  <div className="min-w-0 self-center">
                    <p className="text-[0.65rem] uppercase tracking-[0.14em] text-ink-soft">
                      {cat}
                    </p>
                    <h3 className="mt-1 text-base font-semibold tracking-[-0.02em] leading-snug line-clamp-2 group-hover:text-accent-deep transition-colors">
                      {article.title}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}
