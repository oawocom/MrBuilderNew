import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Services from "@/components/landing/Services";
import Why from "@/components/landing/Why";
import MrCare from "@/components/landing/MrCare";
import ForPros from "@/components/landing/ForPros";

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      <HowItWorks />
      <Services />
      <Why />
      <MrCare />
      <ForPros />
      <Footer />
    </>
  );
}
