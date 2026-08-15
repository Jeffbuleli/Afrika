import Link from "next/link";
import { Suspense } from "react";
import type { Category } from "@/db/schema";
import { CategoryNav } from "@/components/CategoryNav";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { SmartSearchBar } from "@/components/SmartSearchBar";
import { t, type Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  categories: Category[];
};

export function SiteHeader({ locale, categories }: Props) {
  const copy = t(locale);

  return (
    <header
      data-site-header
      className="border-b site-rule bg-paper/95 backdrop-blur-sm sticky top-0 z-40"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 py-3 sm:py-4">
          <Link
            href={`/${locale}`}
            className="relative block h-11 w-[148px] sm:h-12 sm:w-[168px] shrink-0"
            aria-label="Africa Insight"
          >
            {/* Fixed small asset - avoid huge Next image srcset on mobile LCP path */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-africa-insight-mark.png"
              alt="Africa Insight"
              width={168}
              height={65}
              decoding="async"
              fetchPriority="low"
              className="h-full w-full object-contain object-left"
            />
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="hidden md:block">
              <SmartSearchBar
                locale={locale}
                label={copy.search}
                placeholder={copy.searchPlaceholder}
                smartLabel={copy.searchSmart}
                predictingLabel={copy.searchPredicting}
                variant="header"
              />
            </div>
            <Link
              href={`/${locale}/search`}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-navy/20 bg-paper text-navy transition-colors hover:border-accent hover:text-accent-deep"
              aria-label={copy.search}
              title={copy.search}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </Link>
            <Suspense
              fallback={
                <span
                  className="inline-flex h-9 w-9 rounded-full border border-navy/20 bg-paper"
                  aria-hidden="true"
                />
              }
            >
              <LanguageSwitch locale={locale} />
            </Suspense>
          </div>
        </div>

        <CategoryNav locale={locale} categories={categories} />
      </div>
    </header>
  );
}
