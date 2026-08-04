import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CategorySections } from "@/components/CategorySections";
import { ContactSuggestions } from "@/components/ContactSuggestions";
import { NewsTicker } from "@/components/NewsTicker";
import { SecondaryTrio } from "@/components/SecondaryTrio";
import { TopStoriesGrid } from "@/components/TopStoriesGrid";
import {
  getArticlesByCategory,
  getCategories,
  getFeaturedArticle,
  getPublishedArticles,
} from "@/lib/articles";
import { isLocale, type Locale } from "@/lib/i18n";
import { SITE_NAME, siteDescription, siteUrl } from "@/lib/site";
import { homeKeywords } from "@/lib/seo-keywords";

const HOME_PRIORITY = new Set(["DRC", "RWANDA", "UGANDA"]);
/** Cap home payload - was loading ALL published articles (~3k) into HTML. */
const TOP_FEED = 36;
const PER_CATEGORY = 10;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw as Locale;
  const description = siteDescription(locale);
  const url = `${siteUrl()}/${locale}`;

  return {
    title: SITE_NAME,
    description,
    keywords: homeKeywords(locale),
    alternates: {
      canonical: url,
      languages: { fr: `${siteUrl()}/fr`, en: `${siteUrl()}/en` },
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: SITE_NAME,
      description,
      url,
      locale: locale === "en" ? "en_GB" : "fr_FR",
      images: [
        { url: "/og-default.jpg", width: 1200, height: 630, alt: SITE_NAME },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description,
      images: ["/og-default.jpg"],
    },
  };
}

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
    getPublishedArticles(locale, TOP_FEED),
    getCategories(),
  ]);

  const categoryFeeds = await Promise.all(
    categories.map(async (category) => ({
      slug: category.slug,
      items: await getArticlesByCategory(locale, category.slug, PER_CATEGORY),
    })),
  );

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
  const sidePriority = rest.filter((a) =>
    HOME_PRIORITY.has((a.country || "").toUpperCase()),
  );
  const sideOther = rest.filter(
    (a) => !HOME_PRIORITY.has((a.country || "").toUpperCase()),
  );
  const side = [...sidePriority, ...sideOther].slice(0, 4);

  const usedSlugs = new Set([lead.slug, ...side.map((a) => a.slug)]);
  const trio = rest.filter((a) => !usedSlugs.has(a.slug)).slice(0, 3);

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
  for (const feed of categoryFeeds) {
    byCategory[feed.slug] = feed.items;
  }

  return (
    <>
      <NewsTicker items={tickerItems} locale={locale} />
      <TopStoriesGrid lead={lead} side={side} locale={locale} />
      <SecondaryTrio articles={trio} locale={locale} />
      <CategorySections
        categories={categories}
        byCategory={byCategory}
        locale={locale}
      />
      <ContactSuggestions locale={locale} />
    </>
  );
}
