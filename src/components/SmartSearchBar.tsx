"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

type Suggestion = {
  slug: string;
  title: string;
  excerpt?: string;
  country?: string | null;
  category?: string;
  href: string;
  score: number;
};

type Props = {
  locale: Locale;
  placeholder: string;
  label: string;
  smartLabel: string;
  predictingLabel: string;
  variant?: "header" | "page";
  initialQuery?: string;
};

export function SmartSearchBar({
  locale,
  placeholder,
  label,
  smartLabel,
  predictingLabel,
  variant = "header",
  initialQuery = "",
}: Props) {
  const router = useRouter();
  const id = useId();
  const [q, setQ] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predicted, setPredicted] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggest = useCallback(
    async (value: string) => {
      if (!value.trim()) {
        setSuggestions([]);
        setPredicted(null);
        setIntent(null);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search/suggest?locale=${locale}&q=${encodeURIComponent(value.trim())}`,
        );
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setPredicted(data.predicted || null);
        setIntent(data.intent || null);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [locale],
  );

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchSuggest(q), 180);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, fetchSuggest]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = q.trim() || predicted || "";
    if (!target) return;
    // If exact top suggestion, go to article
    const hit = suggestions.find(
      (s) => s.title.toLowerCase() === target.toLowerCase(),
    );
    if (hit) {
      router.push(hit.href);
      return;
    }
    router.push(`/${locale}/search?q=${encodeURIComponent(target)}`);
    setOpen(false);
  };

  const shell =
    variant === "header"
      ? "relative w-[min(100%,18rem)] sm:w-[22rem]"
      : "relative w-full max-w-2xl";

  const hint = useMemo(() => {
    if (loading) return predictingLabel;
    if (predicted && q && predicted.toLowerCase() !== q.toLowerCase()) {
      return `${smartLabel}: ${predicted}`;
    }
    if (intent) return `${smartLabel}: ${intent}`;
    return null;
  }, [loading, predicted, q, smartLabel, predictingLabel, intent]);

  return (
    <div ref={boxRef} className={shell}>
      <form onSubmit={onSubmit} className="relative">
        <label className="sr-only" htmlFor={id}>
          {label}
        </label>
        <div className="flex overflow-hidden rounded-full border border-navy/25 bg-paper shadow-[0_1px_0_rgba(26,43,72,0.06)] focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
          <input
            id={id}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => q.trim() && setOpen(true)}
            placeholder={placeholder}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-sm outline-none placeholder:text-ink-soft sm:px-4"
          />
          <button
            type="submit"
            aria-label={label}
            title={label}
            className="inline-flex shrink-0 items-center justify-center bg-navy px-3.5 text-paper transition hover:bg-accent-deep sm:px-4"
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
          </button>
        </div>
      </form>

      {hint ? (
        <p className="mt-1.5 truncate px-1 text-[11px] text-accent-deep">
          {hint}
        </p>
      ) : null}

      {open && suggestions.length > 0 ? (
        <ul className="absolute z-50 mt-2 max-h-80 w-full overflow-auto rounded-xl border border-line bg-paper shadow-lg">
          {suggestions.map((s) => (
            <li key={s.slug} className="border-b border-line/70 last:border-0">
              <Link
                href={s.href}
                className="block px-4 py-3 hover:bg-paper-deep/80"
                onClick={() => setOpen(false)}
              >
                <span className="block text-sm font-medium leading-snug text-ink">
                  {s.title}
                </span>
                {s.excerpt ? (
                  <span className="mt-0.5 line-clamp-2 text-xs text-ink-soft">
                    {s.excerpt}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.1em] text-accent-deep hover:bg-paper-deep/70"
              onClick={() => {
                router.push(
                  `/${locale}/search?q=${encodeURIComponent(q.trim() || predicted || "")}`,
                );
                setOpen(false);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
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
              →
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
