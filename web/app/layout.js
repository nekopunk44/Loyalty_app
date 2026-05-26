import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500"],
  display: "swap",
  variable: "--font-serif",
});

const sans = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
  variable: "--font-sans",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://villajaconda.com";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "Villa Jaconda — Приватная вилла",
  description:
    "Приватная вилла Villa Jaconda. Восемь премиальных номеров, виртуальный тур, программа лояльности для постоянных гостей.",
  openGraph: {
    title: "Villa Jaconda — Приватная вилла",
    description:
      "Восемь премиальных номеров. Виртуальный тур. Программа лояльности для постоянных гостей.",
    images: [{ url: "/images/property1.png", width: 1200, height: 630, alt: "Villa Jaconda" }],
    type: "website",
    locale: "ru_RU",
  },
  icons: { icon: "/favicon.png", apple: "/logo.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={`${serif.variable} ${sans.variable}`}>
      <body className="noise">{children}</body>
    </html>
  );
}
