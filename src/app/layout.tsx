import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Africa Insight",
    template: "%s - Africa Insight",
  },
  description:
    "Africa Insight - média d'analyse africaine. L'Afrique expliquée, pas seulement racontée.",
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
