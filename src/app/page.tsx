import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { defaultLocale, isLocale } from "@/lib/i18n";

export default async function RootPage() {
  const h = await headers();
  const accept = h.get("accept-language") || "";
  const preferred = accept.toLowerCase().startsWith("en") ? "en" : defaultLocale;
  redirect(`/${isLocale(preferred) ? preferred : defaultLocale}`);
}
