import Link from "next/link";
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
  if (!items.length) return null;

  const loop = [...items, ...items];

  return (
    <div className="border-b border-line bg-navy text-paper overflow-hidden">
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
                className="mx-6 inline-flex items-center gap-2 text-sm hover:text-paper/80"
              >
                <span className="text-gold uppercase tracking-[0.12em] text-[0.65rem]">
                  {item.categoryLabel}
                </span>
                <span className="text-paper/35">-</span>
                <span className="max-w-[28rem] truncate">{item.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
