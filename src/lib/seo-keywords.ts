import type { Locale } from "@/lib/i18n";
import { SITE_NAME } from "@/lib/site";

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "from",
  "by",
  "as",
  "at",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "its",
  "it",
  "this",
  "that",
  "these",
  "those",
  "le",
  "la",
  "les",
  "des",
  "un",
  "une",
  "du",
  "de",
  "et",
  "ou",
  "en",
  "dans",
  "sur",
  "pour",
  "avec",
  "par",
  "au",
  "aux",
  "ce",
  "ces",
  "son",
  "sa",
  "ses",
  "qui",
  "que",
  "dont",
]);

const COUNTRY_KEYWORDS: Record<string, string[]> = {
  DRC: [
    "DRC",
    "RDC",
    "Congo",
    "Democratic Republic of Congo",
    "République démocratique du Congo",
    "Kinshasa",
  ],
  RWANDA: ["Rwanda", "Kigali"],
  UGANDA: ["Uganda", "Ouganda", "Kampala"],
  MALI: ["Mali", "Bamako", "Sahel"],
  SUDAN: ["Sudan", "Soudan", "Khartoum"],
  DJIBOUTI: ["Djibouti"],
  NIGER: ["Niger", "Niamey", "Sahel"],
  "BURKINA FASO": ["Burkina Faso", "Ouagadougou", "Sahel"],
};

function titleTokens(title: string): string[] {
  return title
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP.has(t.toLowerCase()))
    .slice(0, 12);
}

/** Build searchable keyword list from article fields for meta + discoverability. */
export function articleKeywords(input: {
  title: string;
  locale: Locale;
  categoryLabel: string;
  country?: string | null;
  extra?: string[];
}): string[] {
  const out: string[] = [
    SITE_NAME,
    input.locale === "en" ? "African news" : "actualité africaine",
    input.locale === "en" ? "Africa analysis" : "analyse Afrique",
    input.categoryLabel,
  ];

  if (input.country) {
    const key = input.country.toUpperCase();
    out.push(...(COUNTRY_KEYWORDS[key] || [input.country]));
  }

  out.push(...titleTokens(input.title));
  if (input.extra) out.push(...input.extra);

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const k of out) {
    const n = k.trim();
    if (!n) continue;
    const id = n.toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(n);
    if (unique.length >= 24) break;
  }
  return unique;
}

export function homeKeywords(locale: Locale): string[] {
  return locale === "en"
    ? [
        SITE_NAME,
        "African news",
        "Africa politics",
        "Africa security",
        "Africa economy",
        "DRC news",
        "Mali news",
        "Rwanda news",
        "Sudan news",
        "Uganda news",
        "Sahel",
        "African analysis",
      ]
    : [
        SITE_NAME,
        "actualité africaine",
        "politique Afrique",
        "sécurité Afrique",
        "économie Afrique",
        "actualité RDC",
        "actualité Mali",
        "actualité Rwanda",
        "actualité Soudan",
        "actualité Ouganda",
        "Sahel",
        "analyse Afrique",
      ];
}

export function categoryKeywords(
  locale: Locale,
  categoryLabel: string,
  slug: string,
): string[] {
  const base = homeKeywords(locale);
  return articleKeywords({
    title: categoryLabel,
    locale,
    categoryLabel,
    extra: [slug, ...base.slice(0, 6)],
  });
}
