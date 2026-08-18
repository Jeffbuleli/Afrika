import { getArticleBySlug } from "@/lib/articles";
import { isLocale, type Locale } from "@/lib/i18n";
import { SITE_NAME } from "@/lib/site";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = SITE_NAME;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 3_600;
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }> | { locale: string; slug: string };
};

export default async function Image({ params }: Props) {
  const { locale: raw, slug } = await Promise.resolve(params);
  const locale: Locale = isLocale(raw) ? raw : "fr";

  try {
    const article = await getArticleBySlug(locale, slug);
    if (!article) {
      return renderOgCard({ title: SITE_NAME, locale });
    }
    const kicker = locale === "en" ? article.categoryLabelEn : article.categoryLabelFr;
    return renderOgCard({
      title: article.title,
      kicker,
      coverUrl: article.coverImageUrl,
      locale,
    });
  } catch {
    return renderOgCard({ title: SITE_NAME, locale });
  }
}
