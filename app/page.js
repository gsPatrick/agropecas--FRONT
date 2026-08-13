import Header from '@/components/Header/Header';
import Hero from '@/components/Hero/Hero';
import Audience from '@/components/Audience/Audience';
import HowItWorks from '@/components/HowItWorks/HowItWorks';
import PopularParts from '@/components/PopularParts/PopularParts';
import NearbyAds from '@/components/NearbyAds/NearbyAds';
import WhyUs from '@/components/WhyUs/WhyUs';
import Numbers from '@/components/Numbers/Numbers';
import Footer from '@/components/Footer/Footer';
import FooterBackground from '@/components/FooterBackground/FooterBackground';
import styles from './page.module.css';

export default function Home() {
  return (
    <>
      {/* .page é a "folha" opaca que cobre a paisagem enquanto se rola */}
      <div className={styles.page}>
        <Header />
        <main className={styles.root}>
          <Hero />
          <Audience />
          <HowItWorks />
          <PopularParts />
          <NearbyAds />
          <WhyUs />
          <Numbers />
        </main>
        <Footer />
      </div>

      {/* irmão do .page, nunca dentro dele */}
      <FooterBackground />
    </>
  );
}
