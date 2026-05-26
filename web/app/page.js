import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Rooms from '@/components/Rooms';
import Tour from '@/components/Tour';
import LoyaltyTiers from '@/components/LoyaltyTiers';
import AppDownload from '@/components/AppDownload';
import Reviews from '@/components/Reviews';
import BookingSection from '@/components/BookingSection';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Rooms />
        <Tour />
        <LoyaltyTiers />
        <AppDownload />
        <Reviews />
        <BookingSection />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
