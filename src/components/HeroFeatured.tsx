import Image from "next/image";
import Link from "next/link";
import { coverAlt } from "@/lib/articles";
import { formatExcerpt } from "@/lib/excerpt";
import { formatDate, t, type Locale } from "@/lib/i18n";

export type ArticleCardData = {
  id?: number;
  slug: string;
  country?: string | null;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  coverImageAltFr: string | null;
  coverImageAltEn: string | null;
  publishedAt: string | null;
  readingTimeMinutes: number;
  categorySlug: string;
  categoryLabelFr: string;
  categoryLabelEn: string;
  authorName: string;
};

export function HeroFeatured({
  article,
  locale,
}: {
  article: ArticleCardData;
  locale: Locale;
}) {
  const copy = t(locale);
  const category =
    locale === "en" ? article.categoryLabelEn : article.categoryLabelFr;
  const image =
    article.coverImageUrl ||
    "https://images.unsplash.com/photo-1523805009345-7448845a9e53?auto=format&fit=crop&w=1800&q=80";

  return (
    <section className="relative min-h-[78vh] w-full overflow-hidden bg-ink text-paper">
      <Image
        src={image}
        alt={coverAlt(article, locale)}
        fill
        priority
        className="object-cover"
        sizes="100vw"
        unoptimized={image.startsWith("https://upload.wikimedia.org/")}
      />
      <div
        className="absolute inset-0"
        style={{ background: "var(--hero-overlay)" }}
      />

      <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-4 sm:px-6 pb-14 pt-28">
        <p className="animate-fade-up text-[0.7rem] uppercase tracking-[0.28em] text-paper/80">
          {copy.brand}
        </p>
        <p className="animate-fade-up mt-3 text-xs uppercase tracking-[0.18em] text-paper/75">
          {category}
          {article.publishedAt
            ? ` - ${formatDate(article.publishedAt, locale)}`
            : ""}
        </p>
        <h1 className="animate-fade-up-delay mt-4 max-w-3xl text-3xl sm:text-5xl md:text-6xl font-semibold leading-[1.08] tracking-[-0.035em] line-clamp-3">
          {article.title}
        </h1>
        <p className="animate-fade-up-delay mt-5 max-w-2xl text-base sm:text-lg text-paper/90 leading-relaxed">
          {formatExcerpt(article.excerpt)}
        </p>
        <div className="animate-fade-up-delay mt-8">
          <Link
            href={`/${locale}/article/${article.slug}`}
            className="inline-flex items-center border border-paper/70 px-5 py-2.5 text-sm font-medium tracking-wide text-paper hover:bg-paper hover:text-ink transition-colors"
          >
            {copy.read}
          </Link>
        </div>
      </div>
    </section>
  );
}
