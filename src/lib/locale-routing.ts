import { defaultLocale, type Locale } from "@/lib/i18n";

/** Phones only - tablets and desktops get English by default. */
export function isMobilePhone(userAgent: string): boolean {
  return /Android.*Mobile|iPhone|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(
    userAgent,
  );
}

export function resolveRootLocale(
  userAgent: string,
  acceptLanguage: string,
): Locale {
  if (!isMobilePhone(userAgent)) return "en";

  const accept = acceptLanguage.toLowerCase();
  return accept.startsWith("en") ? "en" : defaultLocale;
}
