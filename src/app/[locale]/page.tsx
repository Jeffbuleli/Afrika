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
  getFeaturedArticles,
  getPublishedArticles,
} from "@/lib/articles";
import { isLocale, type Locale } from "@/lib/i18n";
import { SITE_NAME, siteDescription, siteUrl } from "@/lib/site";
import { pageAlternates } from "@/lib/seo";
import { homeKeywords } from "@/lib/seo-keywords";

/** Homepage country importance: DRC first, then Rwanda, Sudan, Uganda, Mali, Djibouti, Burkina. */
const COUNTRY_PRIORITY = [
  "DRC",
  "RWANDA",
  "SUDAN",
  "UGANDA",
  "MALI",
  "DJIBOUTI",
  "BURKINA",
] as const;

const HOME_PRIORITY = new Set<string>(COUNTRY_PRIORITY);
/** Cap home payload - was loading ALL published articles (~3k) into HTML. */
const TOP_FEED = 48;
const PER_CATEGORY = 10;
const HERO_SLUG =
  "constitutional-referendum-dispute-widens-as-opposition-plans-national-ma-7144cc";

type Props = {
  params: Promise<{ locale: string }>;
};

type HomeArticle = Awaited<ReturnType<typeof getPublishedArticles>>[number];

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
    alternates: pageAlternates(locale, "/"),
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
  if (!country) return 99;
  const idx = COUNTRY_PRIORITY.indexOf(
    country.toUpperCase() as (typeof COUNTRY_PRIORITY)[number],
  );
  return idx === -1 ? 50 : idx;
}

/** Round-robin pick across countries for a varied rail / ticker. */
function pickBalanced(
  pool: HomeArticle[],
  count: number,
  preferFeatured = true,
): HomeArticle[] {
  const buckets = new Map<string, HomeArticle[]>();
  for (const a of pool) {
    const key = (a.country || "OTHER").toUpperCase();
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(a);
  }
  for (const list of buckets.values()) {
    list.sort((a, b) => {
      if (preferFeatured) {
        const fa = a.featured ? 0 : 1;
        const fb = b.featured ? 0 : 1;
        if (fa !== fb) return fa - fb;
      }
      const sc = countryScore(a.country) - countryScore(b.country);
      if (sc !== 0) return sc;
      return (b.publishedAt || "").localeCompare(a.publishedAt || "");
    });
  }

  const order = [
    ...COUNTRY_PRIORITY.filter((c) => buckets.has(c)),
    ...[...buckets.keys()].filter(
      (c) => !COUNTRY_PRIORITY.includes(c as (typeof COUNTRY_PRIORITY)[number]),
    ),
  ];
  const pointers = Object.fromEntries(order.map((c) => [c, 0]));
  const picked: HomeArticle[] = [];
  const used = new Set<string>();

  while (picked.length < count) {
    let progressed = false;
    for (const c of order) {
      const list = buckets.get(c) || [];
      while (pointers[c] < list.length) {
        const next = list[pointers[c]++];
        if (used.has(next.slug)) continue;
        picked.push(next);
        used.add(next.slug);
        progressed = true;
        break;
      }
      if (picked.length >= count) break;
    }
    if (!progressed) break;
  }
  return picked;
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  const [featured, featuredList, articles, categories] = await Promise.all([
    getFeaturedArticle(locale),
    getFeaturedArticles(locale, 20),
    getPublishedArticles(locale, TOP_FEED),
    getCategories(),
  ]);

  const categoryFeeds = await Promise.all(
    categories.map(async (category) => ({
      slug: category.slug,
      items: await getArticlesByCategory(locale, category.slug, PER_CATEGORY),
    })),
  );

  // Merge curated featured into the home feed so Mali/Djibouti slots are not dropped by date cap.
  const bySlug = new Map<string, HomeArticle>();
  for (const a of [...featuredList, ...articles]) {
    if (!bySlug.has(a.slug)) bySlug.set(a.slug, a);
  }
  const feed = [...bySlug.values()];

  const ranked = [...feed].sort((a, b) => {
    const fa = a.featured ? 0 : 1;
    const fb = b.featured ? 0 : 1;
    if (fa !== fb) return fa - fb;
    const sc = countryScore(a.country) - countryScore(b.country);
    if (sc !== 0) return sc;
    return (b.publishedAt || "").localeCompare(a.publishedAt || "");
  });

  const heroLock = ranked.find((a) => a.slug === HERO_SLUG);
  const lead =
    heroLock ||
    (featured && HOME_PRIORITY.has((featured.country || "").toUpperCase())
      ? featured
      : null) ||
    ranked.find((a) => a.featured) ||
    ranked[0];

  if (!lead) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-24">
        <h1 className="text-3xl font-semibold">Africa Insight</h1>
      </section>
    );
  }

  const rest = ranked.filter((a) => a.slug !== lead.slug);
  // Slot 2: strongest Rwanda if available, else balanced pick
  const rwandaSecond =
    rest.find(
      (a) =>
        (a.country || "").toUpperCase() === "RWANDA" &&
        (a.featured || (a.publishedAt || "").startsWith("2026-08")),
    ) || rest.find((a) => (a.country || "").toUpperCase() === "RWANDA");

  const sidePool = rest.filter((a) => a.slug !== rwandaSecond?.slug);
  const sideRest = pickBalanced(sidePool, 3, true);
  const side = [rwandaSecond, ...sideRest].filter(Boolean).slice(0, 4) as HomeArticle[];

  const usedSlugs = new Set([lead.slug, ...side.map((a) => a.slug)]);
  const trio = pickBalanced(
    rest.filter((a) => !usedSlugs.has(a.slug)),
    3,
    true,
  );

  const tickerPool = ranked.filter(
    (a) =>
      a.slug === lead.slug ||
      a.featured ||
      HOME_PRIORITY.has((a.country || "").toUpperCase()),
  );
  const tickerPicked = [
    lead,
    ...pickBalanced(
      tickerPool.filter((a) => a.slug !== lead.slug),
      11,
      true,
    ),
  ];
  const tickerItems = tickerPicked.slice(0, 12).map((a) => ({
    slug: a.slug,
    title: a.title,
    categoryLabel: locale === "en" ? a.categoryLabelEn : a.categoryLabelFr,
  }));

  const byCategory: Record<string, HomeArticle[]> = {};
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
