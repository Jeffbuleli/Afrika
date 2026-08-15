import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { searchArticles } from "@/lib/articles";
import { isLocale, type Locale } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IndexArticle = {
  slug: string;
  country?: string | null;
  category?: string;
  title_fr: string;
  title_en: string;
  excerpt_fr?: string;
  excerpt_en?: string;
  publishedAt?: string;
  featured?: boolean;
};

type SearchIndex = {
  synonyms: Record<string, string[]>;
  articles: IndexArticle[];
};

let cached: SearchIndex | null = null;

async function loadIndex(): Promise<SearchIndex> {
  if (cached) return cached;
  const file = path.join(process.cwd(), "public/search-index.json");
  const raw = await readFile(file, "utf8");
  cached = JSON.parse(raw) as SearchIndex;
  return cached;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s/-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandQuery(q: string, synonyms: Record<string, string[]>) {
  const n = normalize(q);
  const terms = new Set<string>([n, ...n.split(" ").filter(Boolean)]);
  for (const [key, vals] of Object.entries(synonyms)) {
    const bag = [key, ...vals].map(normalize);
    if (bag.some((t) => n.includes(t) || t.includes(n))) {
      bag.forEach((t) => terms.add(t));
    }
  }
  return [...terms];
}

function scoreArticle(a: IndexArticle, terms: string[], locale: Locale) {
  const title = normalize(locale === "en" ? a.title_en : a.title_fr);
  const excerpt = normalize(
    locale === "en" ? a.excerpt_en || "" : a.excerpt_fr || "",
  );
  let score = 0;
  for (const t of terms) {
    if (!t) continue;
    if (title.startsWith(t)) score += 12;
    else if (title.includes(t)) score += 8;
    if (excerpt.includes(t)) score += 3;
    if (a.featured) score += 1;
    if ((a.country || "").toUpperCase() === "DRC") score += 0.5;
  }
  return score;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const localeRaw = searchParams.get("locale") || "fr";
  if (!isLocale(localeRaw)) {
    return NextResponse.json({ suggestions: [], predicted: null });
  }
  const locale = localeRaw as Locale;
  if (q.length < 1) {
    return NextResponse.json({ suggestions: [], predicted: null, intent: null });
  }

  const index = await loadIndex();
  const terms = expandQuery(q, index.synonyms);
  const ranked = index.articles
    .map((a) => ({ a, score: scoreArticle(a, terms, locale) }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 8);

  let dbHits: Awaited<ReturnType<typeof searchArticles>> = [];
  try {
    dbHits = await searchArticles(locale, q);
  } catch {
    dbHits = [];
  }

  const suggestions = ranked.map(({ a, score }) => ({
    slug: a.slug,
    title: locale === "en" ? a.title_en : a.title_fr,
    excerpt: locale === "en" ? a.excerpt_en : a.excerpt_fr,
    country: a.country,
    category: a.category,
    score,
    href: `/${locale}/article/${a.slug}`,
  }));

  // Predicted intent: best matching synonym key or top title fragment
  let intent: string | null = null;
  const nq = normalize(q);
  for (const [key, vals] of Object.entries(index.synonyms)) {
    if ([key, ...vals].some((v) => normalize(v).includes(nq) || nq.includes(normalize(v)))) {
      intent = key;
      break;
    }
  }

  const predicted =
    suggestions[0]?.title ||
    (dbHits[0] ? dbHits[0].title : null);

  return NextResponse.json({
    query: q,
    intent,
    predicted,
    expandedTerms: terms.slice(0, 12),
    suggestions,
    dbCount: dbHits.length,
  });
}
