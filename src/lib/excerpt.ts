/** Normalize whitespace for comparison / previews. */
export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Card / SEO deck: end on a sentence when possible, never mid-word.
 */
export function formatExcerpt(text: string | null | undefined, maxLen = 220): string {
  const clean = collapseWhitespace(text || "");
  if (!clean) return "";
  if (clean.length <= maxLen) return clean;

  const window = clean.slice(0, maxLen + 40);
  const ends: number[] = [];
  for (const m of window.matchAll(/[.!?…]["”']?\s+/g)) {
    const end = (m.index ?? 0) + m[0].length;
    if (end >= 80 && end <= maxLen + 10) ends.push(end);
  }
  if (ends.length) return clean.slice(0, ends[ends.length - 1]).trim();

  const cut = clean.slice(0, maxLen).replace(/\s+\S*$/, "").replace(/[,;:\-–-]+$/, "");
  return cut ? `${cut}…` : `${clean.slice(0, maxLen)}…`;
}

/**
 * True when the deck repeats the opening of the article body.
 */
export function isRedundantExcerpt(
  excerpt: string | null | undefined,
  body: string | null | undefined,
): boolean {
  const ex = collapseWhitespace(excerpt || "").toLowerCase();
  const bd = collapseWhitespace(body || "").toLowerCase();
  if (!ex || !bd) return false;
  const probe = ex.slice(0, Math.min(ex.length, Math.max(48, Math.floor(ex.length * 0.85))));
  return bd.startsWith(probe);
}
