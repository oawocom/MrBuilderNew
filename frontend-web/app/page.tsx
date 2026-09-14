import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import RequestSection from "@/components/landing/Request";
import CTA from "@/components/landing/CTA";
import ComingSoon from "@/components/landing/ComingSoon";

export default function Home() {
  return (
    <>
      <Header />
      <Hero />
      <Features />
      <RequestSection />
      <CTA />
      <ComingSoon />
      <Footer />
    </>
  );
}
