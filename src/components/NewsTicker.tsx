"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

export type TickerItem = {
  slug: string;
  title: string;
  categoryLabel: string;
};

export function NewsTicker({
  items,
  locale,
}: {
  items: TickerItem[];
  locale: Locale;
}) {
  const [top, setTop] = useState(0);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-site-header]");
    if (!header) return;

    const sync = () => setTop(header.getBoundingClientRect().height);
    sync();

    const observer = new ResizeObserver(sync);
    observer.observe(header);
    window.addEventListener("resize", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  if (!items.length) return null;

  const loop = [...items, ...items];

  return (
    <div
      className="sticky z-30 border-b border-line bg-navy text-paper overflow-hidden shadow-[0_6px_18px_rgba(26,43,72,0.12)]"
      style={{ top }}
    >
      <div className="mx-auto flex max-w-6xl items-stretch">
        <div className="shrink-0 bg-gold px-3 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-navy">
          {locale === "fr" ? "En continu" : "Breaking"}
        </div>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="ticker-track flex whitespace-nowrap py-2.5">
            {loop.map((item, i) => (
              <Link
                key={`${item.slug}-${i}`}
                href={`/${locale}/article/${item.slug}`}
                aria-label={item.title}
                className="mx-6 inline-flex items-center gap-2 text-sm hover:text-paper/90"
              >
                <span className="text-gold uppercase tracking-[0.12em] text-[0.65rem]" aria-hidden>
                  {item.categoryLabel}
                </span>
                <span className="text-paper/50" aria-hidden>
                  -
                </span>
                <span className="max-w-[28rem] truncate" aria-hidden>
                  {item.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
