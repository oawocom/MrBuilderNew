"use client";

// Port of the client's "Job Handoff": consumer demo + connector lane + contractor demo on one 23-second clock.
import { useEffect, useRef, useState } from "react";
import { AppDemo } from "./AppDemo";

const TOTAL = 23000;
const CAPS = ["The homeowner describes the pergola and asks for a quote.", "MrBuilder prices it instantly. The homeowner reviews and submits the request.", "The request is routed through MrBuilder to contractors nearby. It appears as a new job in Mike's marketplace.", "Mike reviews the scope, dates and payment, and accepts.", 'Both sides now see the same job: "Contractor assigned" for the homeowner, "Accepted" for Mike.'];

export function JobHandoff() {
  const root = useRef<HTMLDivElement>(null);
  const [clock, setClock] = useState(0); const [w, setW] = useState(1200);
  const t0 = useRef(0), elapsed = useRef(0), playing = useRef(false), iv = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const onR = () => setW(root.current ? root.current.getBoundingClientRect().width : window.innerWidth); onR(); window.addEventListener("resize", onR);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setClock(19000); return () => window.removeEventListener("resize", onR); }
    const pause = () => { if (!playing.current) return; playing.current = false; if (iv.current) clearInterval(iv.current); elapsed.current = (performance.now() - t0.current) % TOTAL; };
    const resume = () => { if (playing.current) return; playing.current = true; t0.current = performance.now() - elapsed.current; iv.current = setInterval(() => setClock((performance.now() - t0.current) % TOTAL), 45); };
    const el = root.current; let io: IntersectionObserver | null = null;
    if (el && "IntersectionObserver" in window) { io = new IntersectionObserver((es) => { if (es[0].isIntersecting) resume(); else pause(); }, { threshold: 0.2 }); io.observe(el); } else resume();
    const onVis = () => { if (document.hidden) pause(); else resume(); }; document.addEventListener("visibilitychange", onVis);
    return () => { pause(); io?.disconnect(); window.removeEventListener("resize", onR); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  const c = clock, wide = w >= 720;
  const seg = (t: number, a: number, b: number) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const pos = (p: number) => (wide ? { x: (-6 + p * 112).toFixed(2) + "%", y: "50%" } : { x: "50%", y: (-6 + p * 112).toFixed(2) + "%" });
  const sendP = ease(seg(c, 10400, 12400)), ackP = 1 - ease(seg(c, 17600, 19600));
  const showSend = c >= 10300 && c < 12600, showAck = c >= 17500 && c < 19800;
  const fadeIn = (t: number, a: number) => Math.min(1, Math.max(0, (t - a) / 250)), fadeOut = (t: number, b: number) => Math.min(1, Math.max(0, (b - t) / 250));
  const sp = pos(sendP), ap = pos(ackP);
  const hubPulse = (c >= 11300 && c < 12200) || (c >= 18500 && c < 19400);
  const hubLabel = c < 10400 ? "MrBuilder" : c < 12400 ? "Routing request…" : c < 17600 ? "Offered to nearby pros" : c < 19600 ? "Confirming…" : "Job matched";
  const phaseIdx = c < 5600 ? 0 : c < 10400 ? 1 : c < 14800 ? 2 : c < 18400 ? 3 : 4;
  const Chip = ({ show, x, y, scale, opacity, bg, shadow, text, icon }: { show: boolean; x: string; y: string; scale: string; opacity: string; bg: string; shadow: string; text: string; icon: React.ReactNode }) => show ? <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${scale})`, opacity, padding: "8px 12px", borderRadius: 12, background: bg, color: "#fff", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", boxShadow: shadow, display: "flex", alignItems: "center", gap: 6 }}>{icon}{text}</div> : null;
  return (
    <div ref={root} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: wide ? "row" : "column", alignItems: wide ? "flex-start" : "center", justifyContent: "center", gap: wide ? 0 : 8 }}>
        <div style={{ width: 260, maxWidth: "100%", flex: "0 1 auto", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}><span style={{ padding: "4px 10px", borderRadius: 999, background: "#FEF6EE", color: "#B93815", fontSize: 12, fontWeight: 700 }}>Homeowner · Consumer app</span><div style={{ width: 260, maxWidth: "100%" }}><AppDemo demo="duo-c" clock={c} compact /></div></div>
        <div style={{ position: "relative", flex: "0 0 auto", width: wide ? "clamp(200px,26vw,320px)" : 200, height: wide ? 120 : 170, alignSelf: wide ? "flex-start" : "center", marginTop: wide ? "clamp(180px,26vw,300px)" : 0, zIndex: 2 }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}><line x1={wide ? 0 : 50} y1={wide ? 50 : 0} x2={wide ? 100 : 50} y2={wide ? 50 : 100} stroke="#3A4152" strokeWidth="1.2" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" /></svg>
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 56, height: 56, borderRadius: "50%", background: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center" }}><img src="/site/brand/mrb-mark.png" alt="Mr. Builder" style={{ width: 34, height: "auto", objectFit: "contain" }} />{hubPulse && <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid #EF6820", animation: "jhPulse .9s ease-out both" }} />}</div>
          <span style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,36px)", fontSize: 11, fontWeight: 600, color: "#9AA0AB", whiteSpace: "nowrap" }}>{hubLabel}</span>
          <Chip show={showSend} x={sp.x} y={sp.y} scale={(0.85 + 0.15 * fadeIn(c, 10300)).toFixed(3)} opacity={(fadeIn(c, 10300) * fadeOut(c, 12600)).toFixed(3)} bg="#EF6820" shadow="0 10px 24px rgba(239,104,32,.45)" text="Installation request · $4,500" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M4 4h16v16H4zM4 9h16" /></svg>} />
          <Chip show={showAck} x={ap.x} y={ap.y} scale={(0.85 + 0.15 * fadeIn(c, 17500)).toFixed(3)} opacity={(fadeIn(c, 17500) * fadeOut(c, 19800)).toFixed(3)} bg="#067647" shadow="0 10px 24px rgba(6,118,71,.45)" text="Accepted by Mike J." icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6"><path d="M5 12l5 5L20 7" /></svg>} />
        </div>
        <div style={{ width: 260, maxWidth: "100%", flex: "0 1 auto", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}><span style={{ padding: "4px 10px", borderRadius: 999, background: "#262C38", color: "#fff", fontSize: 12, fontWeight: 700 }}>Contractor · Contractor app</span><div style={{ width: 260, maxWidth: "100%" }}><AppDemo demo="duo-k" clock={c} compact /></div></div>
      </div>
      <div style={{ maxWidth: 720, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, width: "100%", maxWidth: 420 }}>{[0, 1, 2, 3, 4].map((k) => <span key={k} style={{ flex: 1, height: 4, borderRadius: 2, background: k < phaseIdx ? "#F7A26B" : k === phaseIdx ? "#EF6820" : "#3A4152" }} />)}</div>
        <span style={{ fontSize: 15, lineHeight: "22px", fontWeight: 600, color: "#fff", textAlign: "center", minHeight: 44 }}>{CAPS[phaseIdx]}</span>
      </div>
      <style jsx global>{`@keyframes jhPulse{0%{transform:scale(1);opacity:.9}100%{transform:scale(1.9);opacity:0}}`}</style>
    </div>
  );
}
