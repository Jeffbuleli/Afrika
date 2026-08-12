import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveRootLocale } from "@/lib/locale-routing";

export default async function RootPage() {
  const h = await headers();
  const locale = resolveRootLocale(
    h.get("user-agent") || "",
    h.get("accept-language") || "",
  );
  redirect(`/${locale}`);
}
