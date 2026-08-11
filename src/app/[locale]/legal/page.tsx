import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { SITE_NAME, siteUrl } from "@/lib/site";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw as Locale;
  return {
    title: locale === "fr" ? "Mentions légales" : "Legal notice",
    alternates: {
      canonical: `${siteUrl()}/${locale}/legal`,
      languages: {
        fr: `${siteUrl()}/fr/legal`,
        en: `${siteUrl()}/en/legal`,
      },
    },
  };
}

export default async function LegalPage({ params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const copy = t(locale);
  const year = new Date().getFullYear();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs uppercase tracking-[0.16em] text-accent-deep">
        {SITE_NAME}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-navy sm:text-4xl">
        {locale === "fr" ? "Mentions légales" : "Legal notice"}
      </h1>

      {locale === "fr" ? (
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-ink sm:text-base">
          <section>
            <h2 className="text-lg font-semibold text-navy">Éditeur</h2>
            <p className="mt-3 text-ink-soft">
              Le site <strong className="text-ink">{SITE_NAME}</strong>{" "}
              (africa-insight.org) est édité par la rédaction Africa Insight.
            </p>
            <p className="mt-2 text-ink-soft">
              Contact :{" "}
              <a
                href="mailto:info@africa-insight.org"
                className="text-accent-deep underline"
              >
                info@africa-insight.org
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy">Hébergement</h2>
            <p className="mt-3 text-ink-soft">
              Infrastructure dédiée avec protection CDN / WAF (Cloudflare).
            </p>
            <p className="mt-2 text-ink-soft">
              Domaine canonique :{" "}
              <strong className="text-ink">www.africa-insight.org</strong>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy">
              Propriété intellectuelle
            </h2>
            <p className="mt-3 text-ink-soft">
              Les contenus publiés (textes, titres, analyses) sont protégés.
            </p>
            <p className="mt-2 text-ink-soft">
              Toute reproduction non autorisée est interdite, sauf citation courte
              avec lien vers la source.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy">Données personnelles</h2>
            <p className="mt-3 text-ink-soft">
              Les messages envoyés via le formulaire de contact sont traités
              uniquement pour répondre à votre demande.
            </p>
            <p className="mt-2 text-ink-soft">
              Ils ne sont pas revendus. Pour une suppression, écrivez à
              info@africa-insight.org.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy">Responsabilité</h2>
            <p className="mt-3 text-ink-soft">
              Les analyses reflètent l&apos;état des informations disponibles au
              moment de la publication.
            </p>
            <p className="mt-2 text-ink-soft">
              Africa Insight s&apos;efforce d&apos;être exacte sans garantir
              l&apos;exhaustivité.
            </p>
          </section>

          <p className="text-xs text-ink-soft">© {year} {SITE_NAME}</p>
        </div>
      ) : (
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-ink sm:text-base">
          <section>
            <h2 className="text-lg font-semibold text-navy">Publisher</h2>
            <p className="mt-3 text-ink-soft">
              <strong className="text-ink">{SITE_NAME}</strong> (africa-insight.org)
              is published by the Africa Insight editorial desk.
            </p>
            <p className="mt-2 text-ink-soft">
              Contact:{" "}
              <a
                href="mailto:info@africa-insight.org"
                className="text-accent-deep underline"
              >
                info@africa-insight.org
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy">Hosting</h2>
            <p className="mt-3 text-ink-soft">
              Dedicated infrastructure with CDN / WAF protection (Cloudflare).
            </p>
            <p className="mt-2 text-ink-soft">
              Canonical domain:{" "}
              <strong className="text-ink">www.africa-insight.org</strong>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy">
              Intellectual property
            </h2>
            <p className="mt-3 text-ink-soft">
              Published content (text, headlines, analysis) is protected.
            </p>
            <p className="mt-2 text-ink-soft">
              Unauthorised reproduction is prohibited, except short quotation with
              a link to the source.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy">Personal data</h2>
            <p className="mt-3 text-ink-soft">
              Contact-form messages are processed only to reply to your request.
            </p>
            <p className="mt-2 text-ink-soft">
              They are not sold. For deletion requests, email info@africa-insight.org.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy">Liability</h2>
            <p className="mt-3 text-ink-soft">
              Analysis reflects information available at publication time.
            </p>
            <p className="mt-2 text-ink-soft">
              Africa Insight strives for accuracy without claiming exhaustiveness.
            </p>
          </section>

          <p className="text-xs text-ink-soft">© {year} {SITE_NAME}</p>
        </div>
      )}

      <p className="mt-10 text-sm text-ink-soft">
        <Link href={`/${locale}/about`} className="underline hover:text-ink">
          {copy.navAbout}
        </Link>
      </p>
    </div>
  );
}
