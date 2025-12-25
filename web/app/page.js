import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Rooms from '@/components/Rooms';
import Tour from '@/components/Tour';
import LoyaltyApp from '@/components/LoyaltyTiers';
import BookingModal from '@/components/BookingModal';
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
        <LoyaltyApp />
        <FAQ />
      </main>
      <Footer />
      <BookingModal />
    </>
  );
}
