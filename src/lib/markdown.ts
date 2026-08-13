import { marked } from "marked";
import { normalizeDashes } from "@/lib/typography";

/** Escape raw HTML blocks in Markdown so article XSS cannot ship via admin body. */
marked.use({
  renderer: {
    html({ text }) {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    },
  },
});

/**
 * Seed bodies often use single newlines between paragraphs.
 * Markdown collapses those into one block - promote them to real paragraphs.
 */
export function normalizeArticleParagraphs(source: string): string {
  return normalizeDashes(source || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/([^\n])\n(?!\n)([^\n])/g, "$1\n\n$2")
    .trim();
}

export async function renderArticleMarkdown(source: string): Promise<string> {
  return marked.parse(normalizeArticleParagraphs(source));
}
