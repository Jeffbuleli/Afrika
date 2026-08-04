import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { JsonLd, organizationJsonLd } from "@/components/JsonLd";
import {
  SITE_NAME,
  SITE_TAGLINE_FR,
  siteDescription,
  siteUrl,
} from "@/lib/site";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const base = siteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: {
    default: `${SITE_NAME} - ${SITE_TAGLINE_FR}`,
    template: `%s - ${SITE_NAME}`,
  },
  description: siteDescription("fr"),
  applicationName: SITE_NAME,
  keywords: [
    "Afrique",
    "Africa",
    "Africa Insight",
    "actualité africaine",
    "African news",
    "African analysis",
    "politique Afrique",
    "sécurité Afrique",
    "économie Afrique",
    "actualité RDC",
    "DRC news",
    "Mali",
    "Rwanda",
    "Soudan",
    "Sudan",
    "Ouganda",
    "Uganda",
    "Sahel",
    "Kinshasa",
  ],
  authors: [{ name: SITE_NAME, url: base }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "news",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: base,
    languages: {
      fr: `${base}/fr`,
      en: `${base}/en`,
      "x-default": `${base}/fr`,
    },
  },
  // Google Search favicon: square PNG, multiple of 48px (globe = missing/invalid favicon).
  icons: {
    icon: [
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon-48.png",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: siteDescription("fr"),
    url: base,
    locale: "fr_FR",
    alternateLocale: ["en_GB"],
    images: [
      {
        url: "/og-default.jpg",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: siteDescription("fr"),
    images: ["/og-default.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${poppins.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased font-sans bg-paper text-ink">
        <JsonLd data={organizationJsonLd()} />
        {children}
      </body>
    </html>
  );
}
