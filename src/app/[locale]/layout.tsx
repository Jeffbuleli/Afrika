import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { VisitBeacon } from "@/components/VisitBeacon";
import { getCategories } from "@/lib/articles";
import { isLocale, type Locale } from "@/lib/i18n";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const categories = await getCategories();

  return (
    <>
      <VisitBeacon locale={locale} />
      <SiteHeader locale={locale} categories={categories} />
      <main key={locale} className="flex-1" lang={locale}>
        {children}
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
