"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ArticleCardData } from "@/components/HeroFeatured";
import { CoverPhoto } from "@/components/CoverPhoto";
import { PaginationControls } from "@/components/Pagination";
import { categoryBlurb } from "@/lib/category-blurbs";
import { formatExcerpt } from "@/lib/excerpt";
import { formatDate, type Locale } from "@/lib/i18n";

type CategoryInfo = {
  id: number;
  slug: string;
  labelFr: string;
  labelEn: string;
};

type LayoutKind = "featureWide" | "split" | "trio" | "textRail";

const FALLBACK =
  "https://upload.wikimedia.org/wikipedia/commons/a/ad/Lake_Kivu.jpg";

const PAGE_BY_LAYOUT: Record<LayoutKind, number> = {
  featureWide: 5,
  split: 5,
  trio: 6,
  textRail: 7,
};

function labelFor(category: CategoryInfo, locale: Locale) {
  return locale === "en" ? category.labelEn : category.labelFr;
}

function altFor(article: ArticleCardData, locale: Locale) {
  if (locale === "en") {
    return article.coverImageAltEn || article.title || "";
  }
  return article.coverImageAltFr || article.title || "";
}

function layoutForIndex(index: number): LayoutKind {
  const kinds: LayoutKind[] = [
    "featureWide",
    "split",
    "trio",
    "textRail",
  ];
  return kinds[index % 4];
}

function moreLabel(label: string, locale: Locale) {
  return locale === "en" ? `More in ${label}` : `Plus : ${label}`;
}

function SectionHeader({
  category,
  locale,
  tone,
}: {
  category: CategoryInfo;
  locale: Locale;
  tone: "paper" | "ruled";
}) {
  const label = labelFor(category, locale);
  return (
    <div
      className={
        tone === "ruled"
          ? "mb-6 flex flex-wrap items-end justify-between gap-3 border-b-2 border-navy pb-3"
          : "mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3"
      }
    >
      <div className="min-w-0 max-w-2xl">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-[-0.03em] text-navy">
          {label}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {categoryBlurb(category.slug, locale)}
        </p>
      </div>
      <Link
        href={`/${locale}/${category.slug}`}
        className="shrink-0 text-[0.65rem] uppercase tracking-[0.14em] text-accent-deep hover:text-navy transition-colors"
      >
        {moreLabel(label, locale)}
      </Link>
    </div>
  );
}

function FeatureWide({
  items,
  locale,
}: {
  items: ArticleCardData[];
  locale: Locale;
}) {
  const [lead, ...rest] = items;
  if (!lead) return null;
  return (
    <div>
      <Link
        href={`/${locale}/article/${lead.slug}`}
        className="group block"
      >
        <CoverPhoto
          src={lead.coverImageUrl || FALLBACK}
          alt={altFor(lead, locale)}
          fit="cover"
          className="story-media aspect-[21/9] sm:aspect-[2.4/1]"
          sizes="(max-width: 1024px) 100vw, 1100px"
        />
        <h3 className="mt-5 max-w-3xl text-2xl sm:text-3xl font-semibold tracking-[-0.03em] leading-[1.15] line-clamp-3 text-navy group-hover:text-accent-deep transition-colors">
          {lead.title}
        </h3>
        <p className="story-deck mt-3 max-w-2xl">
          {formatExcerpt(lead.excerpt, 220)}
        </p>
      </Link>
      {rest.length > 0 ? (
        <ul className="mt-8 grid gap-x-10 gap-y-5 border-t border-line pt-6 sm:grid-cols-2">
          {rest.map((article) => (
            <li key={article.slug}>
              <Link
                href={`/${locale}/article/${article.slug}`}
                className="group block"
              >
                <h4 className="text-base sm:text-lg font-semibold tracking-[-0.02em] leading-snug line-clamp-2 text-navy group-hover:text-accent-deep transition-colors">
                  {article.title}
                </h4>
                {article.publishedAt ? (
                  <p className="mt-1 text-[0.7rem] text-ink-soft">
                    {formatDate(article.publishedAt, locale)}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Split({
  items,
  locale,
}: {
  items: ArticleCardData[];
  locale: Locale;
}) {
  const [lead, ...rest] = items;
  if (!lead) return null;
  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      <Link
        href={`/${locale}/article/${lead.slug}`}
        className="group block lg:col-span-7"
      >
        <CoverPhoto
          src={lead.coverImageUrl || FALLBACK}
          alt={altFor(lead, locale)}
          fit="cover"
          className="story-media aspect-[4/3]"
          sizes="(max-width: 1024px) 100vw, 55vw"
        />
        <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] leading-snug line-clamp-3 text-navy group-hover:text-accent-deep transition-colors">
          {lead.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm text-ink-soft leading-relaxed">
          {formatExcerpt(lead.excerpt, 180)}
        </p>
      </Link>
      <ul className="flex flex-col divide-y divide-line lg:col-span-5">
        {rest.map((article) => (
          <li key={article.slug}>
            <Link
              href={`/${locale}/article/${article.slug}`}
              className="group block py-4 first:pt-0"
            >
              <h4 className="text-base sm:text-lg font-semibold tracking-[-0.02em] leading-snug line-clamp-2 text-navy group-hover:text-accent-deep transition-colors">
                {article.title}
              </h4>
              <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">
                {formatExcerpt(article.excerpt, 120)}
              </p>
              {article.publishedAt ? (
                <p className="mt-1.5 text-[0.7rem] text-ink-soft">
                  {formatDate(article.publishedAt, locale)}
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Trio({
  items,
  locale,
}: {
  items: ArticleCardData[];
  locale: Locale;
}) {
  const cards = items.slice(0, 3);
  if (!cards.length) return null;
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
      {cards.map((article) => (
        <Link
          key={article.slug}
          href={`/${locale}/article/${article.slug}`}
          className="group block"
        >
          <CoverPhoto
            src={article.coverImageUrl || FALLBACK}
            alt={altFor(article, locale)}
            fit="cover"
            className="story-media aspect-[16/10]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em] leading-snug line-clamp-3 text-navy group-hover:text-accent-deep transition-colors">
            {article.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-ink-soft leading-relaxed">
            {formatExcerpt(article.excerpt, 130)}
          </p>
          {article.publishedAt ? (
            <p className="mt-2 text-[0.7rem] text-ink-soft">
              {formatDate(article.publishedAt, locale)}
            </p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

function TextRail({
  items,
  locale,
}: {
  items: ArticleCardData[];
  locale: Locale;
}) {
  if (!items.length) return null;
  return (
    <ul className="divide-y divide-line border-t border-line">
      {items.map((article) => (
        <li key={article.slug}>
          <Link
            href={`/${locale}/article/${article.slug}`}
            className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4"
          >
            <h3 className="min-w-0 flex-1 text-base sm:text-lg font-semibold tracking-[-0.02em] leading-snug text-navy group-hover:text-accent-deep transition-colors">
              {article.title}
            </h3>
            {article.publishedAt ? (
              <time className="shrink-0 text-[0.7rem] uppercase tracking-[0.08em] text-ink-soft">
                {formatDate(article.publishedAt, locale)}
              </time>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CategorySectionBand({
  category,
  items,
  locale,
  layout,
  index,
  active,
  onActive,
}: {
  category: CategoryInfo;
  items: ArticleCardData[];
  locale: Locale;
  layout: LayoutKind;
  index: number;
  active: boolean;
  onActive: (slug: string) => void;
}) {
  const pageSize = PAGE_BY_LAYOUT[layout];
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const [page, setPage] = useState(1);
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  useEffect(() => {
    const el = document.getElementById(`section-${category.slug}`);
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onActive(category.slug);
      },
      { rootMargin: "-20% 0px -45% 0px", threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [category.slug, onActive]);

  if (!pageItems.length) return null;

  const tone: "paper" | "ruled" =
    layout === "split" || layout === "textRail" ? "ruled" : "paper";
  const bandBg =
    index % 2 === 1 ? "bg-white" : "bg-paper";

  return (
    <section
      id={`section-${category.slug}`}
      className={`scroll-mt-40 border-b border-line ${bandBg}`}
      data-active={active ? "true" : "false"}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12">
        <SectionHeader category={category} locale={locale} tone={tone} />
        {layout === "featureWide" ? (
          <FeatureWide items={pageItems} locale={locale} />
        ) : null}
        {layout === "split" ? (
          <Split items={pageItems} locale={locale} />
        ) : null}
        {layout === "trio" ? <Trio items={pageItems} locale={locale} /> : null}
        {layout === "textRail" ? (
          <TextRail items={pageItems} locale={locale} />
        ) : null}
        {totalPages > 1 ? (
          <PaginationControls
            locale={locale}
            page={safePage}
            totalPages={totalPages}
            onChange={setPage}
            className="mt-8 border-t border-line pt-4"
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * Rubriques pleine largeur - 4 compositions en rotation (rythme type Gazette).
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
    <section className="border-t site-rule" aria-label={locale === "en" ? "Sections" : "Rubriques"}>
      {active.map((category, index) => (
        <CategorySectionBand
          key={category.id}
          category={category}
          items={byCategory[category.slug] || []}
          locale={locale}
          layout={layoutForIndex(index)}
          index={index}
          active={activeSlug === category.slug}
          onActive={setActiveSlug}
        />
      ))}
    </section>
  );
}
