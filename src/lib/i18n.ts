export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function otherLocale(locale: Locale): Locale {
  return locale === "fr" ? "en" : "fr";
}

type Dictionary = {
  brand: string;
  tagline: string;
  read: string;
  readMore: string;
  featured: string;
  latest: string;
  categories: string;
  search: string;
  searchPlaceholder: string;
  searchResults: string;
  noResults: string;
  by: string;
  minRead: string;
  published: string;
  related: string;
  switchTo: string;
  home: string;
  allNews: string;
  footerAbout: string;
  footerRights: string;
  admin: string;
  notFound: string;
  backHome: string;
};

const fr: Dictionary = {
  brand: "Africa Insight",
  tagline: "L'Afrique expliquée - pas seulement racontée",
  read: "Lire",
  readMore: "Lire la suite",
  featured: "À la une",
  latest: "Dernières publications",
  categories: "Rubriques",
  search: "Recherche",
  searchPlaceholder: "Rechercher un article…",
  searchResults: "Résultats",
  noResults: "Aucun article trouvé.",
  by: "Par",
  minRead: "min de lecture",
  published: "Publié le",
  related: "À lire aussi",
  switchTo: "English",
  home: "Accueil",
  allNews: "Toute l'actualité",
  footerAbout:
    "Africa Insight est un média d'analyse africaine. Faits, contexte, et ce qui compte vraiment.",
  footerRights: "Tous droits réservés.",
  admin: "Rédaction",
  notFound: "Article introuvable",
  backHome: "Retour à l'accueil",
};

const en: Dictionary = {
  brand: "Africa Insight",
  tagline: "Africa explained - not just reported",
  read: "Read",
  readMore: "Read more",
  featured: "Top stories",
  latest: "Latest",
  categories: "Sections",
  search: "Search",
  searchPlaceholder: "Search articles…",
  searchResults: "Results",
  noResults: "No articles found.",
  by: "By",
  minRead: "min read",
  published: "Published",
  related: "Related reading",
  switchTo: "Français",
  home: "Home",
  allNews: "All news",
  footerAbout:
    "Africa Insight is an African analysis outlet. Facts, context, and what actually matters.",
  footerRights: "All rights reserved.",
  admin: "Newsroom",
  notFound: "Article not found",
  backHome: "Back to home",
};

export function t(locale: Locale): Dictionary {
  return locale === "en" ? en : fr;
}

export function formatDate(iso: string | null | undefined, locale: Locale) {
  if (!iso) return "";
  const date = new Date(iso);
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
