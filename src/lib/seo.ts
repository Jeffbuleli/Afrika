import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";

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
