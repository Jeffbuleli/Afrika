import { notFound } from "next/navigation";
import { CategorySections } from "@/components/CategorySections";
import { NewsTicker } from "@/components/NewsTicker";
import { TopStoriesGrid } from "@/components/TopStoriesGrid";
import {
  getCategories,
  getFeaturedArticle,
  getPublishedArticles,
} from "@/lib/articles";
import { isLocale, type Locale } from "@/lib/i18n";

const HOME_PRIORITY = new Set(["DRC", "RWANDA", "UGANDA"]);

function countryScore(country: string | null | undefined) {
  if (!country) return 2;
  const c = country.toUpperCase();
  if (c === "DRC") return 0;
  if (c === "RWANDA" || c === "UGANDA") return 1;
  return 2;
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const [featured, articles, categories] = await Promise.all([
    getFeaturedArticle(locale),
    getPublishedArticles(locale, 0),
    getCategories(),
  ]);

  const ranked = [...articles].sort((a, b) => {
    const sc = countryScore(a.country) - countryScore(b.country);
    if (sc !== 0) return sc;
    return (b.publishedAt || "").localeCompare(a.publishedAt || "");
  });

  const priorityPool = ranked.filter((a) =>
    HOME_PRIORITY.has((a.country || "").toUpperCase()),
  );
  const lead =
    (featured && HOME_PRIORITY.has((featured.country || "").toUpperCase())
      ? featured
      : null) ||
    priorityPool[0] ||
    featured ||
    ranked[0];

  if (!lead) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-24">
        <h1 className="text-3xl font-semibold">Africa Insight</h1>
      </section>
    );
  }

  const rest = ranked.filter((a) => a.slug !== lead.slug);
  // Side rail: mix DRC / Rwanda / Uganda first, then others
  const sidePriority = rest.filter((a) =>
    HOME_PRIORITY.has((a.country || "").toUpperCase()),
  );
  const sideOther = rest.filter(
    (a) => !HOME_PRIORITY.has((a.country || "").toUpperCase()),
  );
  const side = [...sidePriority, ...sideOther].slice(0, 4);

  const tickerSource = [
    lead,
    ...sidePriority.slice(0, 8),
    ...sideOther.slice(0, 4),
  ];
  const tickerItems = tickerSource.slice(0, 12).map((a) => ({
    slug: a.slug,
    title: a.title,
    categoryLabel: locale === "en" ? a.categoryLabelEn : a.categoryLabelFr,
  }));

  const byCategory: Record<string, typeof articles> = {};
  for (const article of ranked) {
    const key = article.categorySlug;
    if (!byCategory[key]) byCategory[key] = [];
    byCategory[key].push(article);
  }

  return (
    <>
      <NewsTicker items={tickerItems} locale={locale} />
      <TopStoriesGrid lead={lead} side={side} locale={locale} />
      <CategorySections
        categories={categories}
        byCategory={byCategory}
        locale={locale}
      />
    </>
  );
}
