import Image from "next/image";
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
            <Image
              src="/logo-africa-insight.png"
              alt="Africa Insight"
              fill
              className="object-contain object-left"
              sizes="168px"
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
