import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "Villa Jaconda - Приватная вилла и программа лояльности",
  description:
    "Villa Jaconda - luxury-вилла с атмосферным отдыхом, персональным сервисом и программой лояльности для постоянных гостей.",
  keywords: [
    "Villa Jaconda",
    "вилла",
    "программа лояльности",
    "luxury stay",
    "отдых",
    "приватная вилла",
  ],
  openGraph: {
    title: "Villa Jaconda - Приватная вилла и программа лояльности",
    description:
      "Откройте формат отдыха, где каждая следующая поездка приносит новые привилегии, персональные предложения и premium-сервис.",
    images: [
      {
        url: "/images/property1.png",
        width: 1200,
        height: 630,
        alt: "Villa Jaconda",
      },
    ],
    type: "website",
    locale: "ru_RU",
  },
  twitter: {
    card: "summary_large_image",
    title: "Villa Jaconda - Приватная вилла и программа лояльности",
    description:
      "Premium-лендинг для luxury-виллы с акцентом на привилегии, атмосферу и конверсию.",
    images: ["/images/property1.png"],
  },
  icons: {
    icon: "/favicon.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
