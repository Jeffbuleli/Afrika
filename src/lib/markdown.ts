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

export async function renderArticleMarkdown(source: string): Promise<string> {
  return marked.parse(normalizeDashes(source || ""));
}
