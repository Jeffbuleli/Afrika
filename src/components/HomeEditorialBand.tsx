import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";

const PILLARS = {
  fr: ["Politique", "Économie", "Société", "Justice", "Sécurité"],
  en: ["Politics", "Economy", "Society", "Justice", "Security"],
};

export function HomeEditorialBand({ locale }: { locale: Locale }) {
  const copy = t(locale);
  const pillars = PILLARS[locale];

  return (
    <section className="border-b border-line bg-paper-deep/40">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-accent-deep">
              {copy.brand}
            </p>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink">
              {locale === "fr" ? (
                <>
                  Briefs factuels et datés sur l&apos;Afrique - politique,
                  économie, société, justice et sécurité. Faits, contexte, et ce
                  qui compte vraiment.
                </>
              ) : (
                <>
                  Verified, dated briefs on Africa - politics, economy, society,
                  justice, and security. Facts, context, and what actually
                  matters.
                </>
              )}
            </p>
            <Link
              href={`/${locale}/about`}
              className="mt-3 inline-block text-sm font-medium text-accent-deep hover:text-navy"
            >
              {locale === "fr" ? "En savoir plus →" : "Learn more →"}
            </Link>
          </div>
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-ink-soft">
              {locale === "fr" ? "Rubriques d'analyse" : "Analysis sections"}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {pillars.map((label) => (
                <li
                  key={label}
                  className="border border-line bg-white px-3 py-1.5 text-xs font-medium text-navy"
                >
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
