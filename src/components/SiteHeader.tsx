import Link from "next/link";
import { Suspense } from "react";
import type { Category } from "@/db/schema";
import { CategoryNav } from "@/components/CategoryNav";
import { LanguageSwitch } from "@/components/LanguageSwitch";
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

          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <Link
              href={`/${locale}/search`}
              className="text-sm text-ink-soft hover:text-ink transition-colors"
            >
              {copy.search}
            </Link>
            <Suspense
              fallback={
                <span className="text-sm font-medium text-accent-deep">
                  {copy.switchTo}
                </span>
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
