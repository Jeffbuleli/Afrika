import { siteUrl } from "@/lib/site";

/** Canonical public URLs for a published article (FR + EN). */
export function articlePublicUrls(slug: string): string[] {
  const base = siteUrl();
  const safe = slug.trim();
  return [`${base}/fr/article/${safe}`, `${base}/en/article/${safe}`];
}
