import SmoothScroll from '@/components/SmoothScroll';
import Cursor from '@/components/Cursor';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Rooms from '@/components/Rooms';
import Tour from '@/components/Tour';
import LoyaltyTiers from '@/components/LoyaltyTiers';
import Reviews from '@/components/Reviews';
import LoyaltyCta from '@/components/LoyaltyCta';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Cursor />
      <Navbar />
      <main>
        <Hero />
        <Rooms />
        <Tour />
        <LoyaltyTiers />
        <Reviews />
        <LoyaltyCta />
      </main>
      <Footer />
    </>
  );
}
