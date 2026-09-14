"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "50px" }
    );
    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative h-[327px] w-full overflow-hidden rounded-2xl bg-gray-100 lg:h-[690px]">
      <video
        ref={videoRef}
        src={isVisible ? "/videos/bg-hero-home.mp4" : undefined}
        autoPlay={isVisible}
        muted
        loop
        playsInline
        preload="none"
        className="h-full w-full object-cover"
        aria-label="Pergola installation showcase video"
      />
    </div>
  );
}

export default function Hero() {
  return (
    <section id="hero" className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] opacity-60">
        <Image src="/images/block.svg" alt="" fill className="object-cover object-top" />
      </div>
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 pt-6 lg:gap-12 lg:px-0 lg:pt-10">
        <div className="flex w-full flex-col items-center gap-8 md:gap-12">
          <div className="flex w-full flex-col items-center gap-4 text-center md:gap-6">
            <div className="hidden items-center gap-2 rounded-full border border-brand-200 bg-white py-1 pl-1 pr-3 text-sm md:inline-flex">
              <span className="rounded-full border border-brand-200 bg-white px-2.5 py-0.5 font-medium text-brand-700">
                Something new is coming!
              </span>
              <span className="text-brand-700">
                We&apos;re launching smarter ways to handle pergola service requests - Stay tuned!
              </span>
            </div>
            <h1 className="font-display text-3xl font-medium leading-tight text-gray-900 sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
              America&apos;s First Platform for Pergola Installation &amp; Maintenance
            </h1>
            <p className="max-w-3xl text-base text-gray-600 sm:text-lg md:text-xl">
              Whether your pergola needs expert installation, professional servicing, or a quick fix - MrBuilder is
              the first and only platform built exclusively for pergola systems.
            </p>
          </div>
          <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <a
              href="#request-service"
              className="w-full rounded-lg bg-brand-600 px-7 py-4 text-center font-semibold text-white shadow hover:bg-brand-700 sm:w-auto"
            >
              Request a service
            </a>
            <a
              href="#about"
              className="w-full rounded-lg border border-gray-300 bg-white px-7 py-4 text-center font-semibold text-gray-700 hover:bg-gray-50 sm:w-auto"
            >
              What we do?
            </a>
          </div>
        </div>
        <HeroVideo />
      </div>
    </section>
  );
}
