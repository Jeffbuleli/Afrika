import type { Locale } from "@/lib/i18n";

/** Compact flag marks - France for FR, USA for EN (not UK). */
export function LocaleFlag({
  locale,
  className = "h-4 w-5",
}: {
  locale: Locale;
  className?: string;
}) {
  if (locale === "fr") {
    return (
      <svg
        viewBox="0 0 3 2"
        className={className}
        aria-hidden="true"
        focusable="false"
      >
        <rect width="1" height="2" x="0" fill="#002395" />
        <rect width="1" height="2" x="1" fill="#fff" />
        <rect width="1" height="2" x="2" fill="#ed2939" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 19 10"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="19" height="10" fill="#b22234" />
      <rect y="0.77" width="19" height="0.77" fill="#fff" />
      <rect y="2.31" width="19" height="0.77" fill="#fff" />
      <rect y="3.85" width="19" height="0.77" fill="#fff" />
      <rect y="5.38" width="19" height="0.77" fill="#fff" />
      <rect y="6.92" width="19" height="0.77" fill="#fff" />
      <rect y="8.46" width="19" height="0.77" fill="#fff" />
      <rect width="7.6" height="5.38" fill="#3c3b6e" />
    </svg>
  );
}
