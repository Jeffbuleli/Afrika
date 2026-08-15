import { notFound } from "next/navigation";
import { ArticleList } from "@/components/ArticleList";
import { SmartSearchBar } from "@/components/SmartSearchBar";
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
      <p className="mt-3 max-w-2xl text-ink-soft">
        {locale === "fr"
          ? "Recherche assistée par IA : prédisez un sujet, une personnalité ou un lieu déjà couvert dans Africa Insight."
          : "AI-assisted search: predict a topic, public figure, or place already covered in Africa Insight."}
      </p>
      <div className="mt-8">
        <SmartSearchBar
          locale={locale}
          label={copy.search}
          placeholder={copy.searchPlaceholder}
          smartLabel={copy.searchSmart}
          predictingLabel={copy.searchPredicting}
          variant="page"
          initialQuery={q}
        />
      </div>

      <div className="mt-10 border-t site-rule">
        {q ? (
          <>
            <p className="pt-6 text-sm text-ink-soft">
              {copy.searchResults}
              {q ? ` - "${q}"` : ""}
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
