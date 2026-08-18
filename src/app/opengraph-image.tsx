import { SITE_NAME } from "@/lib/site";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = SITE_NAME;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 86_400;

export default async function Image() {
  return renderOgCard({
    title: SITE_NAME,
    locale: "fr",
  });
}
