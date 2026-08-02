import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";

function pageWindow(current: number, total: number, span = 2) {
  const pages: number[] = [];
  const start = Math.max(1, current - span);
  const end = Math.min(total, current + span);
  for (let p = start; p <= end; p += 1) pages.push(p);
  return pages;
}

export function Pagination({
  locale,
  page,
  totalPages,
  hrefForPage,
  className = "",
}: {
  locale: Locale;
  page: number;
  totalPages: number;
  totalItems?: number;
  hrefForPage: (page: number) => string;
  className?: string;
}) {
  const copy = t(locale);
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);
  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;

  return (
    <nav
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
      aria-label={copy.page}
    >
      <p className="text-xs text-ink-soft">
        {copy.page} {page} {copy.of} {totalPages}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {prev ? (
          <Link
            href={hrefForPage(prev)}
            className="border border-line px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-navy hover:border-navy transition-colors"
          >
            {copy.previous}
          </Link>
        ) : (
          <span className="border border-line/50 px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-ink-soft/50">
            {copy.previous}
          </span>
        )}
        {pages[0] > 1 ? (
          <>
            <Link
              href={hrefForPage(1)}
              className="min-w-8 border border-line px-2 py-1.5 text-center text-xs text-navy hover:border-navy"
            >
              1
            </Link>
            {pages[0] > 2 ? (
              <span className="px-1 text-xs text-ink-soft">…</span>
            ) : null}
          </>
        ) : null}
        {pages.map((p) =>
          p === page ? (
            <span
              key={p}
              className="min-w-8 border border-navy bg-navy px-2 py-1.5 text-center text-xs text-paper"
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={hrefForPage(p)}
              className="min-w-8 border border-line px-2 py-1.5 text-center text-xs text-navy hover:border-navy"
            >
              {p}
            </Link>
          ),
        )}
        {pages[pages.length - 1] < totalPages ? (
          <>
            {pages[pages.length - 1] < totalPages - 1 ? (
              <span className="px-1 text-xs text-ink-soft">…</span>
            ) : null}
            <Link
              href={hrefForPage(totalPages)}
              className="min-w-8 border border-line px-2 py-1.5 text-center text-xs text-navy hover:border-navy"
            >
              {totalPages}
            </Link>
          </>
        ) : null}
        {next ? (
          <Link
            href={hrefForPage(next)}
            className="border border-line px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-navy hover:border-navy transition-colors"
          >
            {copy.next}
          </Link>
        ) : (
          <span className="border border-line/50 px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-ink-soft/50">
            {copy.next}
          </span>
        )}
      </div>
    </nav>
  );
}

/** Client-side pager buttons (for home category cards). */
export function PaginationControls({
  locale,
  page,
  totalPages,
  onChange,
  className = "",
}: {
  locale: Locale;
  page: number;
  totalPages: number;
  totalItems?: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  const copy = t(locale);
  if (totalPages <= 1) return null;
  const pages = pageWindow(page, totalPages);

  const btn =
    "min-w-8 border border-line px-2 py-1.5 text-center text-xs text-navy hover:border-navy disabled:opacity-40 disabled:hover:border-line";

  return (
    <nav
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
      aria-label={copy.page}
    >
      <p className="text-xs text-ink-soft">
        {copy.page} {page} {copy.of} {totalPages}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={`${btn} px-3 uppercase tracking-[0.12em]`}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          {copy.previous}
        </button>
        {pages[0] > 1 ? (
          <>
            <button type="button" className={btn} onClick={() => onChange(1)}>
              1
            </button>
            {pages[0] > 2 ? (
              <span className="px-1 text-xs text-ink-soft">…</span>
            ) : null}
          </>
        ) : null}
        {pages.map((p) =>
          p === page ? (
            <span
              key={p}
              className="min-w-8 border border-navy bg-navy px-2 py-1.5 text-center text-xs text-paper"
            >
              {p}
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={btn}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          ),
        )}
        {pages[pages.length - 1] < totalPages ? (
          <>
            {pages[pages.length - 1] < totalPages - 1 ? (
              <span className="px-1 text-xs text-ink-soft">…</span>
            ) : null}
            <button
              type="button"
              className={btn}
              onClick={() => onChange(totalPages)}
            >
              {totalPages}
            </button>
          </>
        ) : null}
        <button
          type="button"
          className={`${btn} px-3 uppercase tracking-[0.12em]`}
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          {copy.next}
        </button>
      </div>
    </nav>
  );
}
