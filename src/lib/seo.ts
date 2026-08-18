import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";

type OgImages = NonNullable<NonNullable<Metadata["openGraph"]>["images"]>;

/** 1200x630 PNG generated on-domain - WhatsApp / Facebook / Telegram crawlers. */
export function shareImages(imageUrl: string, alt: string): OgImages {
  return [
    {
      url: imageUrl,
      secureUrl: imageUrl,
      width: 1200,
      height: 630,
      type: "image/png",
      alt,
    },
  ];
}

export function articleShareImageUrl(locale: "fr" | "en", slug: string): string {
  return `${siteUrl()}/${locale}/article/${encodeURIComponent(slug)}/opengraph-image`;
}

export function pageShareImageUrl(locale?: "fr" | "en"): string {
  return locale ? `${siteUrl()}/${locale}/opengraph-image` : `${siteUrl()}/opengraph-image`;
}

export function localeLanguages(pathWithoutLocale: string) {
  const base = siteUrl();
  const suffix =
    !pathWithoutLocale || pathWithoutLocale === "/"
      ? ""
      : pathWithoutLocale.startsWith("/")
        ? pathWithoutLocale
        : `/${pathWithoutLocale}`;
  const fr = `${base}/fr${suffix}`;
  const en = `${base}/en${suffix}`;
  return { fr, en, "x-default": fr } as const;
}

export function pageAlternates(
  locale: "fr" | "en",
  pathWithoutLocale: string,
): NonNullable<Metadata["alternates"]> {
  const languages = localeLanguages(pathWithoutLocale);
  return {
    canonical: locale === "en" ? languages.en : languages.fr,
    languages: { ...languages },
  };
}

export function safeLastmod(value: string | Date | null | undefined): Date {
  const d = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime()) || d.getUTCFullYear() < 2020) {
    return new Date();
  }
  return d;
}
