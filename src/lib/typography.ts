/** Normalize long dashes to plain hyphen for public copy. */
export function normalizeDashes(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/[\u2014\u2013]/g, "-");
}
