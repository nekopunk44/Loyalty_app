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
  title: {
    default: "Villa Jaconda — Приватная вилла на Днестре, Слободзея",
    template: "%s | Villa Jaconda",
  },
  description:
    "Приватная вилла Villa Jaconda в Слободзее на берегу Днестра. Аренда номеров от 100 PRB: студия, люкс, задний двор, выкуп виллы. Бассейн, сауна, мангал, программа лояльности.",
  keywords: [
    "вилла аренда Слободзея",
    "Villa Jaconda",
    "вилла Жаконда",
    "отдых Приднестровье",
    "аренда виллы с бассейном",
    "приватная вилла Днестр",
    "выкуп виллы мероприятие",
    "номера Слободзея",
    "корпоратив вилла",
    "villa rental Slobodzia",
  ],
  authors: [{ name: "Villa Jaconda", url: siteUrl }],
  creator: "Villa Jaconda",
  publisher: "Villa Jaconda",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "Villa Jaconda — Приватная вилла на Днестре",
    description:
      "Аренда приватной виллы в Слободзее. Студия, люкс, задний двор, выкуп виллы. Бассейн, сауна, мангальная зона, программа лояльности для постоянных гостей.",
    images: [
      {
        url: "/images/property1.png",
        width: 1200,
        height: 630,
        alt: "Villa Jaconda — приватная вилла на берегу Днестра",
      },
    ],
    type: "website",
    locale: "ru_RU",
    siteName: "Villa Jaconda",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Villa Jaconda — Приватная вилла на Днестре",
    description:
      "Аренда приватной виллы в Слободзее. Бассейн, сауна, мангал. От 100 PRB / ночь.",
    images: ["/images/property1.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: "/favicon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={`${serif.variable} ${sans.variable}`}>
      <body className="noise">{children}</body>
    </html>
  );
}
