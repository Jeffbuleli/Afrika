"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { LocaleFlag } from "@/components/LocaleFlag";
import { otherLocale, t, type Locale } from "@/lib/i18n";

/** Hard navigation so locale changes always reload article content. */
export function LanguageSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;
  const searchParams = useSearchParams();
  const switchLocale = otherLocale(locale);
  const rest = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "") || "";
  const params = new URLSearchParams(searchParams?.toString() || "");
  params.delete("lang");
  const query = params.toString();
  const href = `/${switchLocale}${rest}${query ? `?${query}` : ""}`;
  const copy = t(locale);

  return (
    <a
      href={href}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-navy/20 bg-paper text-accent-deep transition-colors hover:border-accent hover:bg-paper-deep/60"
      hrefLang={switchLocale}
      lang={switchLocale}
      data-locale-switch={switchLocale}
      aria-label={copy.switchTo}
      title={copy.switchTo}
    >
      <LocaleFlag locale={switchLocale} className="h-3.5 w-[1.15rem] rounded-[1px] shadow-sm ring-1 ring-black/10" />
    </a>
  );
}
