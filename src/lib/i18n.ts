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
  previous: string;
  next: string;
  page: string;
  of: string;
  articlesCount: string;
  installTitle: string;
  installBody: string;
  installIosHint: string;
  installCta: string;
  installLater: string;
  installing: string;
  installError: string;
  installManual: string;
};

const fr: Dictionary = {
  brand: "Africa Insight",
  tagline: "L'Afrique expliquée - pas seulement racontée",
  read: "Lire",
  readMore: "Voir tout",
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
  previous: "Précédent",
  next: "Suivant",
  page: "Page",
  of: "sur",
  articlesCount: "articles",
  installTitle: "Installer Africa Insight",
  installBody:
    "Ajoutez l’app à votre écran d’accueil pour un accès rapide aux analyses.",
  installIosHint:
    "Sur iPhone : touchez Partager, puis « Sur l’écran d’accueil ».",
  installCta: "Installer",
  installLater: "Plus tard",
  installing: "Installation…",
  installError: "Installation interrompue. Réessayez ou utilisez le menu du navigateur.",
  installManual: "Utilisez le menu ⋮ du navigateur → « Installer l’application ».",
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
  previous: "Previous",
  next: "Next",
  page: "Page",
  of: "of",
  articlesCount: "articles",
  installTitle: "Install Africa Insight",
  installBody:
    "Add the app to your home screen for quick access to African analysis.",
  installIosHint:
    "On iPhone: tap Share, then “Add to Home Screen”.",
  installCta: "Install",
  installLater: "Not now",
  installing: "Installing…",
  installError: "Install interrupted. Try again or use your browser menu.",
  installManual: "Use the browser ⋮ menu → “Install app”.",
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
