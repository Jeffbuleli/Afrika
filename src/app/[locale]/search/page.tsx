import { notFound } from "next/navigation";
import { ArticleList } from "@/components/ArticleList";
import { searchArticles } from "@/lib/articles";
import { isLocale, t, type Locale } from "@/lib/i18n";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const { q = "" } = await searchParams;
  const copy = t(locale);
  const results = q ? await searchArticles(locale, q) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em]">
        {copy.search}
      </h1>
      <form action={`/${locale}/search`} className="mt-8 max-w-xl">
        <label className="sr-only" htmlFor="q">
          {copy.search}
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder={copy.searchPlaceholder}
          className="w-full border border-line bg-paper px-4 py-3 text-base outline-none focus:border-accent"
        />
      </form>

      <div className="mt-10 border-t site-rule">
        {q ? (
          <>
            <p className="pt-6 text-sm text-ink-soft">
              {copy.searchResults}
              {q ? ` - “${q}”` : ""}
            </p>
            <ArticleList articles={results} locale={locale} />
          </>
        ) : (
          <p className="pt-6 text-ink-soft">{copy.searchPlaceholder}</p>
        )}
      </div>
    </div>
  );
}
