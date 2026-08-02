import Link from "next/link";
import type { ArticleCardData } from "@/components/HeroFeatured";
import { CoverPhoto } from "@/components/CoverPhoto";
import type { Category } from "@/db/schema";
import { categoryLabel, coverAlt } from "@/lib/articles";
import { formatDate, t, type Locale } from "@/lib/i18n";

const FALLBACK_IMG =
  "https://upload.wikimedia.org/wikipedia/commons/a/ad/Lake_Kivu.jpg";

/**
 * Rubriques bas de page - titre de section, article phare + liste avec images.
 */
export function CategorySections({
  categories,
  byCategory,
  locale,
}: {
  categories: Category[];
  byCategory: Record<string, ArticleCardData[]>;
  locale: Locale;
}) {
  const copy = t(locale);
  const active = categories.filter((c) => (byCategory[c.slug] || []).length > 0);

  return (
    <section className="border-t site-rule bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-2">
          {active.map((category) => {
            const items = byCategory[category.slug] || [];
            const [lead, ...rest] = items;
            const label = categoryLabel(category, locale);
            const leadImg = lead.coverImageUrl || FALLBACK_IMG;

            return (
              <section
                key={category.id}
                className="border border-line bg-paper/40"
              >
                <div className="flex items-center justify-between gap-3 border-b-4 border-gold bg-navy px-4 py-3">
                  <h2 className="text-base sm:text-lg font-semibold tracking-[-0.02em] text-paper">
                    {label}
                  </h2>
                  <Link
                    href={`/${locale}/${category.slug}`}
                    className="text-[0.65rem] uppercase tracking-[0.14em] text-gold hover:text-paper transition-colors"
                  >
                    {copy.readMore}
                  </Link>
                </div>

                <div className="p-4 sm:p-5">
                  <Link
                    href={`/${locale}/article/${lead.slug}`}
                    className="group grid gap-4 sm:grid-cols-[150px_1fr]"
                  >
                    <CoverPhoto
                      src={leadImg}
                      alt={coverAlt(lead, locale)}
                      fit="cover"
                      className="aspect-[4/3]"
                      sizes="150px"
                    />
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold tracking-[-0.02em] leading-snug text-navy group-hover:text-gold-deep transition-colors">
                        {lead.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm text-ink-soft leading-relaxed">
                        {lead.excerpt}
                      </p>
                      {lead.publishedAt ? (
                        <p className="mt-2 text-[0.7rem] text-ink-soft">
                          {formatDate(lead.publishedAt, locale)}
                        </p>
                      ) : null}
                    </div>
                  </Link>

                  {rest.length > 0 ? (
                    <ul className="mt-5 divide-y divide-line border-t border-line">
                      {rest.slice(0, 4).map((article) => {
                        const img = article.coverImageUrl || FALLBACK_IMG;
                        return (
                          <li key={article.slug}>
                            <Link
                              href={`/${locale}/article/${article.slug}`}
                              className="group grid grid-cols-[72px_1fr] gap-3 py-3 sm:grid-cols-[88px_1fr]"
                            >
                              <CoverPhoto
                                src={img}
                                alt={coverAlt(article, locale)}
                                fit="cover"
                                className="aspect-[4/3]"
                                sizes="88px"
                              />
                              <div className="min-w-0 self-center">
                                <p className="text-sm font-medium leading-snug text-navy group-hover:text-gold-deep transition-colors">
                                  {article.title}
                                </p>
                                {article.publishedAt ? (
                                  <p className="mt-1 text-[0.7rem] text-ink-soft">
                                    {formatDate(article.publishedAt, locale)}
                                  </p>
                                ) : null}
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
