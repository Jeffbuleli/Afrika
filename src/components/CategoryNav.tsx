"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

type NavCategory = {
  id: number;
  slug: string;
  labelFr: string;
  labelEn: string;
};

type Props = {
  locale: Locale;
  categories: NavCategory[];
};

function labelFor(category: NavCategory, locale: Locale) {
  return locale === "en" ? category.labelEn : category.labelFr;
}

export function CategoryNav({ locale, categories }: Props) {
  const pathname = usePathname();
  const copy = t(locale);
  const homeHref = `/${locale}`;
  const homeActive = pathname === homeHref || pathname === `${homeHref}/`;

  return (
    <nav
      className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 text-sm font-bold text-navy"
      aria-label={copy.categories}
    >
      <Link
        href={homeHref}
        className={
          homeActive
            ? "whitespace-nowrap text-gold-deep transition-colors"
            : "whitespace-nowrap hover:text-gold-deep transition-colors"
        }
        aria-current={homeActive ? "page" : undefined}
      >
        {copy.home}
      </Link>
      {categories.map((category) => {
        const href = `/${locale}/${category.slug}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={category.id}
            href={href}
            className={
              active
                ? "whitespace-nowrap text-gold-deep transition-colors"
                : "whitespace-nowrap hover:text-gold-deep transition-colors"
            }
            aria-current={active ? "page" : undefined}
          >
            {labelFor(category, locale)}
          </Link>
        );
      })}
    </nav>
  );
}
