"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ArticleCardData } from "@/components/HeroFeatured";
import { CoverPhoto } from "@/components/CoverPhoto";
import { PaginationControls } from "@/components/Pagination";
import { formatDate, t, type Locale } from "@/lib/i18n";

type CategoryInfo = {
  id: number;
  slug: string;
  labelFr: string;
  labelEn: string;
};

const FALLBACK_IMG =
  "https://upload.wikimedia.org/wikipedia/commons/a/ad/Lake_Kivu.jpg";

const PAGE_SIZE = 5;

function labelFor(category: CategoryInfo, locale: Locale) {
  return locale === "en" ? category.labelEn : category.labelFr;
}

function altFor(article: ArticleCardData, locale: Locale) {
  if (locale === "en") {
    return article.coverImageAltEn || article.title || "";
  }
  return article.coverImageAltFr || article.title || "";
}

function CategorySectionCard({
  category,
  items,
  locale,
  active,
  onActive,
}: {
  category: CategoryInfo;
  items: ArticleCardData[];
  locale: Locale;
  active: boolean;
  onActive: (slug: string) => void;
}) {
  const copy = t(locale);
  const label = labelFor(category, locale);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const [page, setPage] = useState(1);
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, safePage]);

  useEffect(() => {
    const el = document.getElementById(`section-${category.slug}`);
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onActive(category.slug);
      },
      {
        rootMargin: "-20% 0px -45% 0px",
        threshold: 0.15,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [category.slug, onActive]);

  const [lead, ...rest] = pageItems;
  if (!lead) return null;
  const leadImg = lead.coverImageUrl || FALLBACK_IMG;

  return (
    <section
      id={`section-${category.slug}`}
      className="scroll-mt-40 border border-line bg-paper/40"
    >
      <div
        className={`flex items-center justify-between gap-3 border-b-4 bg-navy px-4 py-3 transition-colors ${
          active ? "border-gold" : "border-gold/50"
        }`}
      >
        <div className="min-w-0">
          <h2
            className={`text-base sm:text-lg font-semibold tracking-[-0.02em] transition-colors ${
              active ? "text-gold" : "text-paper"
            }`}
          >
            {label}
          </h2>
          <p className="mt-0.5 text-[0.65rem] uppercase tracking-[0.14em] text-paper/70">
            {items.length} {copy.articlesCount}
          </p>
        </div>
        <Link
          href={`/${locale}/${category.slug}`}
          className="shrink-0 text-[0.65rem] uppercase tracking-[0.14em] text-gold hover:text-paper transition-colors"
        >
          {copy.readMore}
        </Link>
      </div>

      <div className="p-4 sm:p-5">
        <Link
          href={`/${locale}/article/${lead.slug}`}
          className="group grid gap-4 sm:grid-cols-[150px_1fr]"
        >
          <CoverPhoto
            src={leadImg}
            alt={altFor(lead, locale)}
            fit="cover"
            className="aspect-[4/3]"
            sizes="150px"
          />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-[-0.02em] leading-snug line-clamp-2 text-navy group-hover:text-gold-deep transition-colors">
              {lead.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm text-ink-soft leading-relaxed">
              {lead.excerpt}
            </p>
            {lead.publishedAt ? (
              <p className="mt-2 text-[0.7rem] text-ink-soft">
                {formatDate(lead.publishedAt, locale)}
              </p>
            ) : null}
          </div>
        </Link>

        {rest.length > 0 ? (
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {rest.map((article) => {
              const img = article.coverImageUrl || FALLBACK_IMG;
              return (
                <li key={article.slug}>
                  <Link
                    href={`/${locale}/article/${article.slug}`}
                    className="group grid grid-cols-[72px_1fr] gap-3 py-3 sm:grid-cols-[88px_1fr]"
                  >
                    <CoverPhoto
                      src={img}
                      alt={altFor(article, locale)}
                      fit="cover"
                      className="aspect-[4/3]"
                      sizes="88px"
                    />
                    <div className="min-w-0 self-center">
                      <p className="text-sm font-medium leading-snug line-clamp-2 text-navy group-hover:text-gold-deep transition-colors">
                        {article.title}
                      </p>
                      {article.publishedAt ? (
                        <p className="mt-1 text-[0.7rem] text-ink-soft">
                          {formatDate(article.publishedAt, locale)}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}

        <PaginationControls
          locale={locale}
          page={safePage}
          totalPages={totalPages}
          totalItems={items.length}
          onChange={setPage}
          className="mt-5 border-t border-line pt-4"
        />
      </div>
    </section>
  );
}

/**
 * Rubriques bas de page - titre de section, article phare + liste paginée.
 */
export function CategorySections({
  categories,
  byCategory,
  locale,
}: {
  categories: CategoryInfo[];
  byCategory: Record<string, ArticleCardData[]>;
  locale: Locale;
}) {
  const active = categories.filter((c) => (byCategory[c.slug] || []).length > 0);
  const [activeSlug, setActiveSlug] = useState(active[0]?.slug ?? "");

  return (
    <section className="border-t site-rule bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-2">
          {active.map((category) => (
            <CategorySectionCard
              key={category.id}
              category={category}
              items={byCategory[category.slug] || []}
              locale={locale}
              active={activeSlug === category.slug}
              onActive={setActiveSlug}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
