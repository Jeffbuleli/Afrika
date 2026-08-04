import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import type { Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  className?: string;
  size?: "header" | "footer";
};

export function BrandLogo({ locale, className = "", size = "header" }: Props) {
  const box =
    size === "footer"
      ? "h-12 w-[168px] sm:h-14 sm:w-[196px]"
      : "h-11 w-[148px] sm:h-12 sm:w-[168px]";

  return (
    <Link
      href={`/${locale}`}
      className={`relative block ${box} shrink-0 ${className}`}
      aria-label={SITE_NAME}
    >
      <Image
        src="/logo-africa-insight-mark.png"
        alt={SITE_NAME}
        fill
        priority={size === "header"}
        unoptimized
        className="object-contain object-left"
        sizes="196px"
      />
    </Link>
  );
}
