"use client";

import { useEffect, useRef, useState } from "react";

export interface DemoStep { screen: string; title: string; caption: string; tall?: boolean }

// Auto-advancing sequence of app screens inside a phone frame with a caption rail.
export function PhoneDemo({ steps, app, interval = 3200 }: { steps: DemoStep[]; app: "Consumer app" | "Contractor app"; interval?: number }) {
  const [i, setI] = useState(0); const [playing, setPlaying] = useState(true); const ref = useRef<HTMLDivElement>(null); const visible = useRef(true);
  useEffect(() => { const el = ref.current; if (!el) return; const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting; }, { threshold: 0.3 }); io.observe(el); return () => io.disconnect(); }, []);
  useEffect(() => { if (!playing) return; if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; const t = setInterval(() => { if (visible.current && !document.hidden) setI((x) => (x + 1) % steps.length); }, interval); return () => clearInterval(t); }, [playing, interval, steps.length]);
  const s = steps[i];
  return (
    <div ref={ref} className="grid items-center gap-8 md:grid-cols-[260px_1fr]">
      <div className="relative mx-auto w-full max-w-[260px] rounded-[36px] border-[6px] border-[#181D27] bg-[#181D27] shadow-[0_24px_60px_-20px_rgba(24,29,39,.45)]">
        <div className="absolute left-1/2 top-2 z-10 h-[18px] w-[80px] -translate-x-1/2 rounded-full bg-[#181D27]" />
        <div className="h-[520px] overflow-hidden rounded-[30px] bg-white">{steps.map((st, k) => <img key={k} src={st.screen} alt={st.title} className={`w-full transition-opacity duration-500 ${k === i ? "opacity-100" : "absolute opacity-0"}`} style={k === i ? {} : { position: "absolute", left: 0, top: 0 }} />)}</div>
        <div className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-white px-2 py-1 shadow">{steps.map((_, k) => <button key={k} onClick={() => { setI(k); setPlaying(false); }} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-[#EF6820]" : "w-1.5 bg-gray-300"}`} aria-label={`Step ${k + 1}`} />)}</div>
      </div>
      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[#EF6820]">{app} · step {i + 1} of {steps.length}</div>
        <div className="text-2xl font-bold text-[#181D27]">{s.title}</div>
        <p className="mt-2 text-[15px] leading-6 text-gray-600">{s.caption}</p>
        <div className="mt-4 flex gap-2"><button onClick={() => { setI((i - 1 + steps.length) % steps.length); setPlaying(false); }} className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium">‹ Back</button><button onClick={() => { setI((i + 1) % steps.length); setPlaying(false); }} className="rounded-full border border-gray-300 px-3 py-1.5 text-sm font-medium">Next ›</button><button onClick={() => setPlaying(!playing)} className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium">{playing ? "Pause" : "Play"}</button></div>
        <ol className="mt-5 hidden gap-1 md:grid">{steps.map((st, k) => <li key={k}><button onClick={() => { setI(k); setPlaying(false); }} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm ${k === i ? "bg-[#FEF6EE] text-[#B93815]" : "text-gray-500 hover:bg-gray-50"}`}><span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${k === i ? "bg-[#EF6820] text-white" : "bg-gray-200"}`}>{k + 1}</span>{st.title}</button></li>)}</ol>
      </div>
    </div>
  );
}
