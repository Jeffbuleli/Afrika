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

const GUEST_LENS_RE = /\[guest-lens-start\]([\s\S]*?)\[guest-lens-end\]/;

export async function renderArticleMarkdown(source: string): Promise<string> {
  const normalized = normalizeArticleParagraphs(source);
  const guestMatch = normalized.match(GUEST_LENS_RE);
  let main = normalized;
  let guestMd = "";
  if (guestMatch) {
    main = normalized.replace(guestMatch[0], "").trim();
    guestMd = guestMatch[1].trim();
  }
  let html = await marked.parse(main);
  if (guestMd) {
    const guestHtml = await marked.parse(guestMd);
    html += `<aside class="guest-policy-lens" aria-label="Guest policy lens"><div class="guest-policy-lens-inner">${guestHtml}</div></aside>`;
  }
  return html;
}
