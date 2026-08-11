import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCategories } from "@/lib/articles";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { SITE_NAME, siteDescription, siteUrl } from "@/lib/site";

type Props = { params: Promise<{ locale: string }> };

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
  const categories = await getCategories();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader locale={locale} categories={categories} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-navy">
          {locale === "fr" ? "À propos" : "About"}
        </h1>
        {locale === "fr" ? (
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink">
            <p>
              <strong>{SITE_NAME}</strong> est un média d&apos;analyse
              indépendant consacré à l&apos;Afrique. Nous publions en français et
              en anglais des briefs factuels et contextualisés sur la politique,
              la sécurité, l&apos;économie, la société et la justice.
            </p>
            <p>
              Notre ligne éditoriale privilégie les faits vérifiés, le
              dateline, et ce qui compte vraiment pour comprendre une situation
              — pas le bruit des réseaux.
            </p>
            <p>
              Pour une suggestion d&apos;article ou contacter la rédaction,
              utilisez le{" "}
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
          </div>
        ) : (
          <div className="mt-8 space-y-5 text-base leading-relaxed text-ink">
            <p>
              <strong>{SITE_NAME}</strong> is an independent African analysis
              outlet. We publish in French and English: verified, dated briefs
              on politics, security, economy, society and justice.
            </p>
            <p>
              Our editorial line prioritises verified facts, clear datelines,
              and what actually matters — not social-media noise.
            </p>
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
          </div>
        )}
        <p className="mt-10 text-sm text-ink-soft">
          <Link href={`/${locale}/legal`} className="underline hover:text-ink">
            {copy.navLegal}
          </Link>
        </p>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
