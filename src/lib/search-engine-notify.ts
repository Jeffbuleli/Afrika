import { articlePublicUrls } from "@/lib/article-public-urls";
import { submitIndexNowUrls } from "@/lib/indexnow";

/** Fire-and-forget IndexNow ping after a published article is created or updated. */
export function notifySearchEnginesArticlePublished(slug: string): void {
  const urls = articlePublicUrls(slug);
  void submitIndexNowUrls(urls).then((result) => {
    if (!result.ok && result.reason !== "indexnow_not_configured") {
      console.warn("[indexnow]", result.reason, slug);
    }
  });
}
