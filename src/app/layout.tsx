import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
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
});

const base = siteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: {
    default: SITE_NAME,
    template: `%s - ${SITE_NAME}`,
  },
  description: `${SITE_NAME} - ${SITE_TAGLINE_FR}`,
  applicationName: SITE_NAME,
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
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
        {children}
      </body>
    </html>
  );
}
