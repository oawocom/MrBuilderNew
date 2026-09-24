"use client";

import { useEffect, useRef, useState } from "react";

// Home: one request travelling consumer → MrBuilder → contractor, and "Accepted" coming back. 4 beats on a shared clock.
const BEATS = [
  { c: "/site/screens/c-install-form.webp", k: "/site/screens/k-marketplace.webp", chip: null, text: "The homeowner fills in the installation request." },
  { c: "/site/screens/c-quote.webp", k: "/site/screens/k-marketplace.webp", chip: { label: "Installation request", dir: "right" as const }, text: "MrBuilder prices it and the approved job goes to the marketplace." },
  { c: "/site/screens/c-awaiting.webp", k: "/site/screens/k-accept-modal.webp", chip: null, text: "A vetted contractor reviews scope, dates and payment — and accepts." },
  { c: "/site/screens/c-assigned.webp", k: "/site/screens/k-job-accepted.webp", chip: { label: "Accepted", dir: "left" as const }, text: "Both sides see the same status: Contractor assigned · Accepted." },
];

export function JobHandoff() {
  const [i, setI] = useState(0); const ref = useRef<HTMLDivElement>(null); const vis = useRef(true);
  useEffect(() => { const el = ref.current; if (!el) return; const io = new IntersectionObserver(([e]) => { vis.current = e.isIntersecting; }, { threshold: 0.3 }); io.observe(el); return () => io.disconnect(); }, []);
  useEffect(() => { const t = setInterval(() => { if (vis.current && !document.hidden) setI((x) => (x + 1) % BEATS.length); }, 4200); return () => clearInterval(t); }, []);
  const b = BEATS[i];
  const Frame = ({ src, label }: { src: string; label: string }) => <div className="flex flex-col items-center"><div className="relative w-[220px] rounded-[32px] border-[5px] border-[#181D27] bg-[#181D27] shadow-[0_24px_60px_-20px_rgba(24,29,39,.45)]"><div className="h-[440px] overflow-hidden rounded-[27px] bg-white"><img src={src} alt={label} className="w-full transition-opacity duration-500" /></div></div><div className="mt-3 text-[13px] font-semibold text-gray-600">{label}</div></div>;
  return (
    <div ref={ref} className="rounded-[28px] bg-[#181D27] p-6 text-white md:p-10">
      <div className="relative grid items-center gap-6 md:grid-cols-[220px_1fr_220px]">
        <Frame src={b.c} label="Consumer app" />
        <div className="relative flex h-[120px] items-center justify-center md:h-[440px]">
          <div className="absolute inset-x-0 top-1/2 hidden h-px bg-white/15 md:block" />
          <div className="relative z-10 flex flex-col items-center gap-2"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20"><img src="/site/brand/mrb-mark.png" alt="MrBuilder" className="h-10 w-10" /></div><span className="text-xs font-bold uppercase tracking-wide text-white/60">MrBuilder</span></div>
          {b.chip && <div key={i} className={`absolute top-1/2 z-20 -translate-y-1/2 rounded-full px-3 py-1.5 text-[13px] font-semibold shadow-lg ${b.chip.dir === "right" ? "animate-[chipR_2.4s_ease-in-out_forwards] bg-[#EF6820] text-white" : "animate-[chipL_2.4s_ease-in-out_forwards] bg-[#ECFDF3] text-[#067647]"}`}>{b.chip.label}</div>}
        </div>
        <Frame src={b.k} label="Contractor app" />
      </div>
      <div className="mt-6 flex flex-col items-center gap-3 md:flex-row md:justify-between"><p className="text-[15px] text-white/85">{b.text}</p><div className="flex gap-1.5">{BEATS.map((_, k) => <button key={k} onClick={() => setI(k)} className={`h-1.5 rounded-full ${k === i ? "w-6 bg-[#EF6820]" : "w-1.5 bg-white/30"}`} aria-label={`Beat ${k + 1}`} />)}</div></div>
      <style jsx global>{`@keyframes chipR{0%{left:0;opacity:0}15%{opacity:1}50%{left:50%;transform:translate(-50%,-50%)}85%{opacity:1}100%{left:100%;transform:translate(-100%,-50%);opacity:0}}@keyframes chipL{0%{right:0;opacity:0}15%{opacity:1}50%{right:50%;transform:translate(50%,-50%)}85%{opacity:1}100%{right:100%;transform:translate(100%,-50%);opacity:0}}`}</style>
    </div>
  );
}
