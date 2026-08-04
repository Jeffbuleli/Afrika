import type { MetadataRoute } from "next";
import { SITE_NAME, siteDescription } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_NAME,
    short_name: "Africa Insight",
    description: siteDescription("fr"),
    start_url: "/fr",
    scope: "/",
    display: "standalone",
    background_color: "#f7f4ee",
    theme_color: "#1a2b48",
    lang: "fr",
    dir: "ltr",
    categories: ["news", "magazines"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
