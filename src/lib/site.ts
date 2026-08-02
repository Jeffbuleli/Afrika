import type { Locale } from "@/lib/i18n";

export const SITE_NAME = "Africa Insight";
export const SITE_TAGLINE_FR =
  "L'Afrique expliquée - pas seulement racontée.";
export const SITE_TAGLINE_EN = "Africa explained - not just reported.";

export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://africa.mcbuleli.org";
  return raw.replace(/\/$/, "");
}

export function absoluteUrl(pathOrUrl: string | null | undefined): string {
  const fallback = `${siteUrl()}/og-default.jpg`;
  if (!pathOrUrl) return fallback;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${siteUrl()}${path}`;
}

export function siteDescription(locale: Locale): string {
  return locale === "en"
    ? "African analysis media. Facts, context, and what actually matters."
    : "Média d'analyse africaine. Faits, contexte, et ce qui compte vraiment.";
}
