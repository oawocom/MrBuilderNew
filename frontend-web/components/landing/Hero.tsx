"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) { setIsVisible(true); observer.disconnect(); } }); }, { rootMargin: "50px" });
    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="relative h-[327px] w-full overflow-hidden rounded-2xl bg-gray-100 lg:h-[600px]">
      <video ref={videoRef} src={isVisible ? "/videos/bg-hero-home.mp4" : undefined} autoPlay={isVisible} muted loop playsInline preload="none" className="h-full w-full object-cover" aria-label="Pergola installation showcase video" />
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-3 bg-gradient-to-t from-black/60 to-transparent p-5 text-white lg:p-8">
        {["Fixed price before work starts", "Trained & assessed PROs", "Before / after photos", "Pay only when you confirm"].map((t) => <span key={t} className="rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">{t}</span>)}
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section id="hero" className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] opacity-60"><Image src="/images/block.svg" alt="" fill className="object-cover object-top" /></div>
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 pt-6 lg:gap-12 lg:px-0 lg:pt-10">
        <div className="flex w-full flex-col items-center gap-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white py-1 pl-1 pr-3 text-sm">
            <span className="rounded-full border border-brand-200 bg-white px-2.5 py-0.5 font-medium text-brand-700">Now live</span>
            <span className="text-brand-700">America&apos;s first platform built only for pergolas</span>
          </div>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-gray-900 md:text-6xl">Pergola installation, repair and care — <span className="text-brand-600">priced upfront</span>, paid when you&apos;re happy.</h1>
          <p className="max-w-2xl text-lg text-gray-600">Describe your pergola, get an instant quote set by MrBuilder — not the contractor — and a trained, assessed PRO does the work with photo evidence at every step.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-brand-700">Get an instant quote</Link>
            <Link href="/register?role=contractor" className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50">Become a MrBuilder PRO</Link>
          </div>
        </div>
        <HeroVideo />
      </div>
    </section>
  );
}
