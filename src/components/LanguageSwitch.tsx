"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { otherLocale, t, type Locale } from "@/lib/i18n";

/** Hard navigation so locale changes always reload article content. */
export function LanguageSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;
  const searchParams = useSearchParams();
  const switchLocale = otherLocale(locale);
  const rest = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "") || "";
  const query = searchParams?.toString();
  const href = `/${switchLocale}${rest}${query ? `?${query}` : ""}`;
  const copy = t(locale);

  return (
    <a
      href={href}
      className="text-sm font-medium text-accent-deep hover:text-accent transition-colors"
      hrefLang={switchLocale}
      lang={switchLocale}
    >
      {copy.switchTo}
    </a>
  );
}
