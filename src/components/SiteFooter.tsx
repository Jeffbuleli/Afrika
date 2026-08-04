import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: Locale }) {
  const copy = t(locale);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t site-rule bg-paper-deep">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="max-w-xl">
          <div className="relative h-12 w-[168px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-africa-insight-mark.png"
              alt="Africa Insight"
              width={168}
              height={65}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain object-left"
            />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            {copy.footerAbout}
          </p>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-soft">
          <p>
            © {year} Africa Insight. {copy.footerRights}
          </p>
          <Link href="/admin" className="hover:text-ink transition-colors">
            {copy.admin}
          </Link>
        </div>
      </div>
    </footer>
  );
}
