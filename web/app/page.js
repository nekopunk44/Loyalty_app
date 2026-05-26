import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Rooms from '@/components/Rooms';
import Tour from '@/components/Tour';
import LoyaltyTiers from '@/components/LoyaltyTiers';
import Reviews from '@/components/Reviews';
import BookingSection from '@/components/BookingSection';
import MapSection from '@/components/MapSection';
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
        <Reviews />
        <BookingSection />
        <MapSection />
      </main>
      <Footer />
    </>
  );
}
