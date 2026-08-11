import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { SITE_NAME, siteDescription, siteUrl } from "@/lib/site";

type Props = { params: Promise<{ locale: string }> };

const PILLARS = {
  fr: [
    { title: "Politique", body: "Institutions, élections, coalitions et rapports de force." },
    { title: "Économie", body: "Ressources, dette, commerce et choix de développement." },
    { title: "Société", body: "Vies quotidiennes, droits, migrations et tensions sociales." },
    { title: "Justice", body: "Droit, tribunaux, impunité et demandes de responsabilité." },
    { title: "Sécurité", body: "Conflits armés, forces, frontières et stabilité régionale." },
  ],
  en: [
    { title: "Politics", body: "Institutions, elections, coalitions, and power balances." },
    { title: "Economy", body: "Resources, debt, trade, and development choices." },
    { title: "Society", body: "Daily life, rights, migration, and social pressure." },
    { title: "Justice", body: "Law, courts, impunity, and accountability demands." },
    { title: "Security", body: "Armed conflict, forces, borders, and regional stability." },
  ],
} as const;

const COVERAGE = {
  fr: "RDC, Mali, Soudan, Ouganda, Rwanda, Djibouti et l'ensemble du continent.",
  en: "DRC, Mali, Sudan, Uganda, Rwanda, Djibouti, and the wider continent.",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw as Locale;
  const title = locale === "fr" ? "À propos" : "About";
  return {
    title,
    description: siteDescription(locale),
    alternates: {
      canonical: `${siteUrl()}/${locale}/about`,
      languages: {
        fr: `${siteUrl()}/fr/about`,
        en: `${siteUrl()}/en/about`,
      },
    },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const copy = t(locale);
  const pillars = PILLARS[locale];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs uppercase tracking-[0.16em] text-accent-deep">
        {SITE_NAME}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-navy sm:text-4xl">
        {locale === "fr" ? "À propos" : "About"}
      </h1>

      {locale === "fr" ? (
        <div className="mt-8 space-y-8 text-base leading-relaxed text-ink">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-navy">Qui sommes-nous</h2>
            <p>
              <strong>{SITE_NAME}</strong> est un média d&apos;analyse indépendant
              consacré à l&apos;Afrique. Nous publions en français et en anglais des
              briefs factuels, datés et contextualisés.
            </p>
            <p>
              Notre ligne éditoriale privilégie les faits vérifiés, le dateline et ce
              qui compte vraiment pour comprendre une situation - pas le bruit des
              réseaux.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-navy">Nos cinq piliers</h2>
            <p className="text-sm text-ink-soft">
              Chaque publication s&apos;inscrit dans l&apos;une de ces rubriques
              d&apos;analyse :
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {pillars.map((item) => (
                <li
                  key={item.title}
                  className="border border-line bg-paper-deep/30 p-4"
                >
                  <p className="font-semibold text-navy">{item.title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{item.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-navy">Couverture</h2>
            <p>{COVERAGE.fr}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-navy">Contact</h2>
            <p>
              Pour une suggestion d&apos;article ou joindre la rédaction, utilisez le{" "}
              <Link href={`/${locale}#contact`} className="text-accent-deep underline">
                formulaire de contact
              </Link>{" "}
              ou écrivez à{" "}
              <a
                href="mailto:info@africa-insight.org"
                className="text-accent-deep underline"
              >
                info@africa-insight.org
              </a>
              .
            </p>
          </section>
        </div>
      ) : (
        <div className="mt-8 space-y-8 text-base leading-relaxed text-ink">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-navy">Who we are</h2>
            <p>
              <strong>{SITE_NAME}</strong> is an independent African analysis outlet.
              We publish in French and English: verified, dated, contextual briefs.
            </p>
            <p>
              Our editorial line prioritises verified facts, clear datelines, and what
              actually matters - not social-media noise.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-navy">Five pillars</h2>
            <p className="text-sm text-ink-soft">
              Every piece fits one of these analysis sections:
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {pillars.map((item) => (
                <li
                  key={item.title}
                  className="border border-line bg-paper-deep/30 p-4"
                >
                  <p className="font-semibold text-navy">{item.title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{item.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-navy">Coverage</h2>
            <p>{COVERAGE.en}</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-navy">Contact</h2>
            <p>
              For story tips or to reach the desk, use the{" "}
              <Link href={`/${locale}#contact`} className="text-accent-deep underline">
                contact form
              </Link>{" "}
              or email{" "}
              <a
                href="mailto:info@africa-insight.org"
                className="text-accent-deep underline"
              >
                info@africa-insight.org
              </a>
              .
            </p>
          </section>
        </div>
      )}

      <p className="mt-10 text-sm text-ink-soft">
        <Link href={`/${locale}/legal`} className="underline hover:text-ink">
          {copy.navLegal}
        </Link>
      </p>
    </div>
  );
}
