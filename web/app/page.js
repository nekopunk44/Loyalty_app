import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Rooms from '@/components/Rooms';
import Tour from '@/components/Tour';
import LoyaltyApp from '@/components/LoyaltyTiers';
import BookingModal from '@/components/BookingModal';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';
import { FAQS } from '@/data/faqs';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://villajaconda.com';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['LodgingBusiness', 'LocalBusiness'],
      '@id': `${siteUrl}/#business`,
      name: 'Villa Jaconda',
      alternateName: 'Вилла Жаконда',
      description:
        'Приватная вилла на берегу Днестра в Слободзее. Аренда номеров с бассейном, сауной и мангальной зоной. Студия, люкс, задний двор, выкуп виллы.',
      url: siteUrl,
      telephone: '+3737791002',
      email: 'hello@villajaconda.com',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Набережная, 85',
        addressLocality: 'Слободзея',
        addressRegion: 'Приднестровье',
        addressCountry: 'MD',
        postalCode: '5500',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 46.7167,
        longitude: 29.7003,
      },
      image: [
        `${siteUrl}/images/property1.png`,
        `${siteUrl}/images/property2.png`,
        `${siteUrl}/images/luks1.jpg`,
        `${siteUrl}/images/std1.jpg`,
        `${siteUrl}/images/zad1.jpg`,
      ],
      logo: `${siteUrl}/favicon.png`,
      priceRange: 'PRB 100–500',
      currenciesAccepted: 'PRB',
      paymentAccepted: 'Cash, Bank Transfer',
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday', 'Tuesday', 'Wednesday', 'Thursday',
          'Friday', 'Saturday', 'Sunday',
        ],
        opens: '00:00',
        closes: '23:59',
      },
      amenityFeature: [
        { '@type': 'LocationFeatureSpecification', name: 'Открытый бассейн', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Сауна / баня', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Бесплатный WiFi', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Бесплатная парковка', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Мангальная зона', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Беседка', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Кухня', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Программа лояльности', value: true },
      ],
      containsPlace: [
        {
          '@type': 'HotelRoom',
          name: 'Стандарт — Студия',
          description:
            'Студия с террасой, бассейном и сауной. Камерный формат для пары или небольшой компании.',
          occupancy: { '@type': 'QuantitativeValue', maxValue: 10 },
        },
        {
          '@type': 'HotelRoom',
          name: 'Люкс — Апартаменты',
          description:
            'Десять комнат, большой зал и собственная кухня. Гибкий формат для крупной компании.',
          occupancy: { '@type': 'QuantitativeValue', maxValue: 20 },
        },
        {
          '@type': 'HotelRoom',
          name: 'Задний двор — Open-Air',
          description:
            'Открытая территория с бассейном, беседкой и мангальной зоной.',
          occupancy: { '@type': 'QuantitativeValue', maxValue: 15 },
        },
        {
          '@type': 'HotelRoom',
          name: 'Вся территория — Exclusive',
          description:
            'Полный выкуп виллы для корпоратива, юбилея или большого семейного праздника.',
          occupancy: { '@type': 'QuantitativeValue', maxValue: 30 },
        },
      ],
      sameAs: ['https://www.instagram.com/villa_jaconda_relax'],
      hasMap: 'https://maps.google.com/?q=Набережная+85,+Слободзея,+Приднестровье',
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: siteUrl,
      name: 'Villa Jaconda',
      inLanguage: 'ru-RU',
      publisher: { '@id': `${siteUrl}/#business` },
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main>
        <Hero />
        <Rooms />
        <Tour />
        <LoyaltyApp />
        <FAQ />
      </main>
      <Footer />
      <BookingModal />
    </>
  );
}
