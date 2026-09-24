"use client";

// Port of the client's "App Demo" component: a timed sequence of real app screens with taps, scrolls of tall
// screenshots, typed text, buttons, chat bubbles and screen transitions. Coordinates are in the 390×844 design space.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Ev = { type: "tap" | "scroll" | "type" | "chk" | "btn" | "bubble" | "fill" | "photo" | "star" | "ring" | "label"; x?: number; y?: number; w?: number; h?: number; t: number; to?: number; text?: string; ms?: number; until?: number; label?: string; bg?: string; fg?: string };
type Tall = { src: string; top: number; h: number; imgH: number };
type Shot = { src: string; dur: number; trans: "fade" | "push" | "sheet" | "back"; cap: string; ev: Ev[]; tall?: Tall };

const S = (n: string) => `/site/screens/${n}.webp`, T = (n: string) => `/site/screens/tall/${n}.webp`;
const tall = (n: string, top: number, h: number, imgH: number): Tall => ({ src: T(n), top, h, imgH });
const tap = (x: number, y: number, t: number): Ev => ({ type: "tap", x, y, t });
const scroll = (to: number, t: number): Ev => ({ type: "scroll", to, t });
const type = (x: number, y: number, w: number, h: number, text: string, t: number, ms?: number, until?: number): Ev => ({ type: "type", x, y, w, h, text, t, ms: ms || Math.max(500, text.length * 55), until });
const chk = (x: number, y: number, t: number): Ev => ({ type: "chk", x: x - 11, y: y - 11, w: 22, h: 22, t });
const btn = (x: number, y: number, w: number, h: number, label: string, t: number): Ev => ({ type: "btn", x, y, w, h, label, t });
const bubble = (text: string, y: number, w: number, t: number): Ev => ({ type: "bubble", x: 366 - w, y, w, h: 44, text, t });
const strip = (x: number, y: number, w: number, h: number, t: number): Ev => ({ type: "fill", x, y, w, h, t, bg: "#FAFAFA" });
const photo = (x: number, y: number, w: number, h: number, t: number): Ev => ({ type: "photo", x, y, w, h, t });
const star = (x: number, y: number, t: number): Ev => ({ type: "star", x: x - 20, y: y - 20, w: 40, h: 40, t });
const label = (x: number, y: number, w: number, h: number, text: string, t: number, fg: string, ring?: boolean): Ev => ({ type: ring ? "ring" : "label", x, y, w, h, text, t, fg });
const sh = (src: string, dur: number, trans: Shot["trans"], cap: string, o?: { ev?: Ev[]; tall?: Tall }): Shot => ({ src: S(src), dur, trans, cap, ev: o?.ev ?? [], tall: o?.tall });

const D: Record<string, Shot[]> = {
  c1: [sh("c-home", 2600, "fade", 'Home: tap "Install a pergola".', { ev: [tap(107, 246, 1400)] }), sh("c-install-empty", 2800, "push", 'New installation request opens. Tap "Use my home address".', { ev: [tap(283, 229, 1500)] }), sh("c-install-form", 2800, "fade", "Address filled from your profile. The form is ready for project details.")],
  c2: [sh("c-install-form", 3600, "fade", 'Scroll to the pergolas section and tap "Add a pergola".', { tall: tall("c-install-form", 115, 626, 1676), ev: [scroll(780, 300), tap(195, 682, 2400)] }), sh("c-add-empty", 3400, "push", "Enter type, brand and W × L × H.", { ev: [type(24, 184, 298, 52, "Louvered pergola", 400), type(24, 270, 298, 52, "Sunline", 1300), type(24, 521, 109, 52, "12", 2000), type(141, 521, 109, 52, "10", 2350), type(257, 521, 109, 52, "9", 2700)] }), sh("c-add-pergola", 3200, "fade", "Mounting, enclosures, footings, accessories and photos, then Save.", { tall: tall("c-add-pergola", 115, 574, 2378), ev: [scroll(1804, 200), tap(195, 728, 2300)] }), sh("c-install-form", 2200, "back", "The pergola is added to your request.")],
  c3: [sh("c-quote-loading", 1800, "fade", "MrBuilder prices the request from your details."), sh("c-quote", 4400, "fade", "Review the itemized quote, then submit the request.", { tall: tall("c-quote", 115, 604, 1346), ev: [scroll(520, 600), tap(195, 758, 3400)] }), sh("c-received", 2600, "sheet", "Request received. Nothing is booked until you approve the price.")],
  c4: [sh("c-requests", 2600, "fade", "Open the request from your Requests list.", { ev: [tap(195, 300, 1500)] }), sh("c-approved", 2800, "push", "Finding a MrBuilder PRO: your job is offered to verified contractors nearby."), sh("c-assigned", 3200, "fade", "Contractor assigned: name, rating and contact options appear on the request.", { tall: tall("c-assigned", 115, 699, 1806), ev: [scroll(380, 800)] })],
  c5: [sh("c-assigned", 2200, "fade", "Contractor assigned, visit window confirmed."), sh("c-enroute", 2400, "fade", "On the way, with live ETA."), sh("c-arrived", 2400, "fade", "Arrived on site. Before-work photos are logged."), sh("c-in-progress", 3200, "fade", "In progress: steps update from the contractor's app.", { tall: tall("c-in-progress", 115, 729, 2348), ev: [scroll(520, 700)] })],
  c6: [sh("c-assigned", 2400, "fade", "Tap the message icon on your request.", { ev: [tap(277, 700, 1400)] }), sh("c-chat", 6400, "push", "Type a message to your technician and send it.", { ev: [type(72, 762, 246, 44, "Gate code is 4471, see you at 9.", 700, 1800, 3050), tap(348, 784, 2900), strip(24, 690, 342, 54, 3050), bubble("Gate code is 4471, see you at 9.", 694, 250, 3100)] })],
  c7: [sh("c-awaiting", 4200, "fade", 'Review the contractor\'s proof photos, then tap "Confirm & pay".', { tall: tall("c-awaiting", 115, 729, 1961), ev: [scroll(840, 400), tap(195, 244, 3000)] }), sh("c-confirm-pay", 2800, "sheet", "Add an optional tip and pay.", { ev: [tap(195, 596, 1700)] }), sh("c-completed", 2800, "fade", "Completed · paid. The receipt stays with the request.")],
  k1: [sh("k-onboarding", 1800, "fade", "Start the application from onboarding.", { ev: [tap(195, 759.5, 1100)] }), sh("k-signup", 9200, "push", "Step 1: account information.", { tall: tall("k-signup", 57.5, 777, 817), ev: [tap(109, 295.5, 300), type(28, 270.5, 162, 50, "John", 400, 500), tap(281, 295.5, 1000), type(200, 270.5, 162, 50, "Peterson", 1100, 750), tap(195, 382.5, 2000), type(28, 357.5, 334, 50, "john.peterson@email.com", 2100, 1500), tap(240, 468.5, 3750), type(28, 443.5, 334, 50, "US (+1)   (555) 014-2276", 3850, 1300), tap(195, 555.5, 5300), type(28, 530.5, 334, 50, "••••••••••", 5400, 900), scroll(65, 6300), tap(195, 616.5, 6800), type(28, 591.5, 334, 50, "••••••••••", 6900, 900), tap(195, 747.5, 8300)] }), sh("k-signup-2", 6600, "push", "Step 2: address.", { ev: [tap(195, 295.5, 300), type(28, 270.5, 334, 50, "2418 Alder Street", 400, 1100), tap(195, 382.5, 1650), type(28, 357.5, 334, 50, "Unit 3", 1750, 500), tap(109, 468.5, 2400), type(28, 443.5, 162, 50, "Portland", 2500, 600), tap(281, 468.5, 3250), type(200, 443.5, 162, 50, "Oregon", 3350, 500), tap(109, 555.5, 4000), type(28, 530.5, 162, 50, "97214", 4100, 500), tap(256, 707.5, 5600)] }), sh("k-signup-3", 2600, "push", "Step 3: choose your role.", { ev: [tap(195, 628, 900), label(28, 556.5, 334, 143, "", 1000, "#181D27", true), tap(256, 738.5, 1900)] }), sh("k-signup-4", 4800, "push", "Step 4: business information.", { ev: [tap(195, 371, 600), label(28, 347.5, 334, 47, "", 700, "#181D27", true), tap(195, 512.5, 1500), type(28, 487.5, 334, 50, "93-4521867", 1600, 900), tap(256, 728.5, 3800)] }), sh("k-signup-5", 5200, "push", "Step 5: insurance & skills.", { tall: tall("k-signup-5", 57.5, 777, 1090), ev: [tap(195, 561.5, 500), type(28, 536.5, 334, 50, "Hartford, GL 2,000,000", 600, 1300), scroll(338, 2400), tap(256, 707.5, 4200)] }), sh("k-signup-6", 3400, "push", "Step 6: choose a plan, then submit.", { tall: tall("k-signup-6", 57.5, 777, 911), ev: [tap(195, 393, 600), label(28, 370.5, 334, 92, "", 700, "#181D27", true), scroll(159, 1600), tap(256, 707.5, 2700)] }), sh("k-submitted", 3200, "push", "Application submitted. MrBuilder reviews it before activating marketplace access.")],
  k2: [sh("k-marketplace", 6000, "fade", "Scroll the marketplace. Each card shows type, location, dates and payment.", { tall: tall("k-marketplace", 118.5, 534, 1136), ev: [scroll(300, 500), scroll(510, 2300), scroll(0, 4000), tap(327, 490.5, 5300)] }), sh("k-accept-modal", 2600, "sheet", "Review the job summary before deciding.")],
  k3: [sh("k-marketplace", 2400, "fade", 'Tap "Accept job".', { ev: [tap(264, 541.5, 1400)] }), sh("k-accept-modal", 2400, "sheet", "Confirm: the customer is notified that a contractor is assigned.", { ev: [tap(195, 711.5, 1500)] }), sh("k-job-accepted", 3600, "push", "Job accepted: dates, payment and pre-job checklist.", { tall: tall("k-job-accepted", 114.5, 575, 2172), ev: [scroll(260, 1500)] })],
  k4: [sh("k-messages", 2400, "fade", "Open the job conversation.", { ev: [tap(195, 189.5, 1400)] }), sh("k-chat", 6400, "push", "Type a message to the client and send it.", { ev: [type(24, 745.5, 286, 48, "On my way, arriving around 9:15.", 700, 1900, 3150), tap(342, 769.5, 3000), bubble("On my way, arriving around 9:15.", 550.5, 250, 3200)] })],
  k5: [sh("k-inspection", 3200, "fade", 'Inspection job: tap "Submit report & quote".', { tall: tall("k-inspection", 114.5, 575, 1940), ev: [tap(195, 728.5, 1800)] }), sh("k-inspection-report", 4400, "sheet", "Findings, photos and itemized lines, then send.", { tall: tall("k-inspection-report", 90.5, 699, 958), ev: [scroll(213, 900), tap(195, 540.5, 3200)] }), sh("k-insp-sent", 2600, "fade", "Awaiting client approval. MrBuilder prices the report for the customer.")],
  k6: [sh("k-job-accepted", 4400, "fade", 'Tick the pre-job checklist, then "Start job".', { ev: [tap(52, 537.5, 400), chk(52, 537.5, 550), tap(52, 585.5, 900), chk(52, 585.5, 1050), tap(52, 633.5, 1400), chk(52, 633.5, 1550), tap(52, 681.5, 1900), chk(52, 681.5, 2050), btn(24, 702.5, 342, 52, "Start job", 2200), tap(195, 728.5, 3200)] }), sh("k-job-started", 2800, "push", 'Job started. The customer sees "In progress".', { tall: tall("k-job-started", 114.5, 575, 1850), ev: [scroll(200, 300), tap(195, 728.5, 2000)] }), sh("k-complete-modal", 3200, "sheet", "Add proof photos and submit for confirmation.", { ev: [tap(78, 596.5, 700), photo(24, 554.5, 109, 84, 900), btn(24, 685.5, 342, 52, "Submit for confirmation", 1100), tap(195, 711.5, 2300)] }), sh("k-job-waiting", 2200, "fade", "Awaiting client confirmation.")],
  k7: [sh("k-job-waiting", 2200, "fade", "The customer reviews your photos."), sh("k-job-confirmed", 2600, "fade", "Job confirmed: earnings and payout date shown.", { ev: [tap(195, 603.5, 1700)] }), sh("k-rate-empty", 7400, "push", "Rate the client: five stars and a short review, then submit.", { ev: [tap(79, 235, 600), star(79, 235, 700), star(137, 235, 850), star(195, 235, 1000), star(253, 235, 1150), star(311, 235, 1300), strip(24, 270, 342, 20, 1300), label(24, 270, 342, 20, "Excellent, 5 / 5", 1350, "#067647"), type(24, 332, 342, 120, "Great client: clear site access, quick decisions, and paid promptly. Would work with John again.", 1900, 2600, 99999), btn(24, 684, 342, 52, "Submit rating", 4700), tap(195, 710, 5600)] }), sh("k-job-completed", 3000, "sheet", "Client confirmed & paid. Rating saved, the job moves to History.")],
  "duo-c": [sh("c-home", 2400, "fade", "", { ev: [tap(107, 246, 1400)] }), sh("c-install-form", 3200, "push", "", { tall: tall("c-install-form", 115, 626, 1676), ev: [scroll(400, 300), tap(195, 780, 2200)] }), sh("c-quote-loading", 1600, "fade", ""), sh("c-quote", 3200, "fade", "", { tall: tall("c-quote", 115, 604, 1346), ev: [scroll(520, 400), tap(195, 758, 2600)] }), sh("c-received", 4400, "sheet", ""), sh("c-approved", 3600, "push", ""), sh("c-assigned", 4600, "fade", "")],
  "duo-k": [sh("k-marketplace", 12400, "fade", ""), sh("k-marketplace", 2600, "fade", "", { ev: [tap(264, 541.5, 1400)] }), sh("k-accept-modal", 2600, "sheet", "", { ev: [tap(195, 711.5, 1600)] }), sh("k-job-accepted", 5400, "push", "")],
};

const L = (x: number) => (x / 390 * 100).toFixed(3) + "%", Tp = (y: number) => (y / 844 * 100).toFixed(3) + "%", W = (w: number) => (w / 390 * 100).toFixed(3) + "%", H = (h: number) => (h / 844 * 100).toFixed(3) + "%", F = (px: number) => (px / 390 * 100).toFixed(2) + "cqw";
const CLIP = "inset(5.924% 2.051% 0.948% 2.051%)";

export function AppDemo({ demo, compact = false, dark = false, clock }: { demo: string; compact?: boolean; dark?: boolean; clock?: number }) {
  const seq = useMemo(() => D[demo] ?? D.c1, [demo]);
  const isK = demo.startsWith("k") || demo === "duo-k";
  const root = useRef<HTMLDivElement>(null);
  const [st, setSt] = useState({ i: 0, now: 0, entering: false, playing: false, userPaused: false });
  const t0 = useRef(0), elapsed = useRef(0), playingRef = useRef(false), iv = useRef<ReturnType<typeof setInterval> | null>(null);
  const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const go = useCallback((i: number) => { t0.current = performance.now(); elapsed.current = 0; setSt((s) => ({ ...s, i, now: 0, entering: true })); requestAnimationFrame(() => requestAnimationFrame(() => setSt((s) => ({ ...s, entering: false })))); }, []);
  const tick = useCallback(() => { setSt((s) => { const cur = seq[s.i]; const now = performance.now() - t0.current; if (now >= cur.dur) { setTimeout(() => go((s.i + 1) % seq.length), 0); return s; } return { ...s, now }; }); }, [seq, go]);
  const pause = useCallback(() => { if (!playingRef.current) return; playingRef.current = false; if (iv.current) clearInterval(iv.current); elapsed.current = performance.now() - t0.current; setSt((s) => ({ ...s, playing: false })); }, []);
  const resume = useCallback(() => { if (playingRef.current) return; playingRef.current = true; t0.current = performance.now() - elapsed.current; setSt((s) => ({ ...s, playing: true })); iv.current = setInterval(tick, 45); }, [tick]);
  useEffect(() => {
    if (clock !== undefined) return;
    if (reduced()) { setSt((s) => ({ ...s, userPaused: true })); return; }
    const el = root.current; let io: IntersectionObserver | null = null;
    if (el && "IntersectionObserver" in window) { io = new IntersectionObserver((es) => { if (es[0].isIntersecting && !st.userPaused) resume(); else pause(); }, { threshold: 0.3 }); io.observe(el); } else resume();
    const onVis = () => { if (document.hidden) pause(); else if (!st.userPaused) resume(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { pause(); io?.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock, demo]);

  // resolve frame
  const n = seq.length; let i = Math.min(st.i, n - 1), now = st.now, ent = st.entering;
  if (clock !== undefined) { const total = seq.reduce((a, x) => a + x.dur, 0); let cl = ((clock % total) + total) % total; i = 0; while (i < n - 1 && cl >= seq[i].dur) { cl -= seq[i].dur; i++; } now = cl; ent = cl < 50; }
  const s = seq[i], prev = seq[(i - 1 + n) % n]; const rm = reduced(); const dur = rm ? "0s" : ".5s";
  const tr = { push: "translateX(100%)", sheet: "translateY(100%)", back: "translateX(-28%)", fade: "none" }[s.trans];
  const curTransform = ent ? tr : "none", curOpacity = (s.trans === "fade" || s.trans === "back") && ent ? 0 : 1;
  const t = s.tall; let scrollTo = 0; s.ev.forEach((e) => { if (e.type === "scroll" && e.t <= now) scrollTo = e.to ?? 0; });
  const taps: { key: string; left: string; top: string }[] = []; const boxes: Record<string, string | number | boolean>[] = [];
  s.ev.forEach((e, k) => {
    if (ent || e.t > now) return; const key = i + "-" + k;
    if (e.type === "tap") { if (now - e.t < 800) taps.push({ key, left: L(e.x!), top: Tp(e.y!) }); return; }
    if (e.type === "scroll") return;
    const base: Record<string, string | number | boolean> = { key, left: L(e.x!), top: Tp(e.y!), width: W(e.w!), height: H(e.h!), anim: "dmIn .22s ease-out both", justify: "flex-start", pad: "0", weight: 500, font: F(15), bg: "transparent", fg: "#181D27", radius: "0", text: "", caret: false, align: "center", ws: "nowrap", pt: "0", border: "0" };
    if (e.type === "type") { if (e.until && now >= e.until) return; const p = Math.min(1, (now - e.t) / e.ms!); const txt = e.text!.slice(0, Math.ceil(e.text!.length * p)); boxes.push({ ...base, left: L(e.x! + 2), top: Tp(e.y! + 2), width: W(e.w! - 4), height: H(e.h! - 4), bg: "#fff", pad: F(14), radius: F(10), text: txt, caret: p < 1 || now - e.t < e.ms! + 1200, anim: "none", align: e.h! > 60 ? "flex-start" : "center", ws: e.h! > 60 ? "normal" : "nowrap", pt: e.h! > 60 ? F(12) : "0", font: e.h! > 60 ? F(14) : F(15) }); }
    else if (e.type === "chk") boxes.push({ ...base, bg: "#EF6820", fg: "#fff", radius: "27%", justify: "center", weight: 800, font: F(13), text: "✓" });
    else if (e.type === "btn") boxes.push({ ...base, bg: "#EF6820", fg: "#fff", radius: F(12), justify: "center", weight: 600, font: F(16), text: e.label! });
    else if (e.type === "bubble") boxes.push({ ...base, bg: "#EF6820", fg: "#fff", radius: `${F(14)} ${F(14)} ${F(4)} ${F(14)}`, pad: F(14), weight: 500, font: F(14), text: e.text! });
    else if (e.type === "fill") boxes.push({ ...base, bg: e.bg!, anim: "none" });
    else if (e.type === "star") boxes.push({ ...base, bg: "transparent", fg: "#EF6820", justify: "center", font: F(40), text: "★", anim: "dmIn .25s cubic-bezier(.3,1.4,.5,1) both" });
    else if (e.type === "ring") boxes.push({ ...base, bg: "transparent", radius: F(12), border: "2px solid #EF6820", anim: "dmIn .2s ease-out both" });
    else if (e.type === "label") boxes.push({ ...base, bg: "#FAFAFA", fg: e.fg!, justify: "center", weight: 600, font: F(13), text: e.text! });
    else if (e.type === "photo") boxes.push({ ...base, bg: "#414651", fg: "#fff", radius: F(12), justify: "center", weight: 600, font: F(11), text: "IMG_2041" });
  });
  const progress = ((seq.slice(0, i).reduce((a, x) => a + x.dur, 0) + Math.min(now, s.dur)) / seq.reduce((a, x) => a + x.dur, 0) * 100).toFixed(1) + "%";
  const img = (src: string, alt = "", extra: React.CSSProperties = {}) => <img src={src} alt={alt} style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "auto", display: "block", ...extra }} />;
  const togglePlay = () => { if (playingRef.current) { setSt((s) => ({ ...s, userPaused: true })); pause(); } else { setSt((s) => ({ ...s, userPaused: false })); resume(); } };
  const replay = () => { go(0); if (!playingRef.current) { setSt((s) => ({ ...s, userPaused: false })); resume(); } };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%" }}>
      <div ref={root} role="img" aria-label={(isK ? "Contractor" : "Consumer") + " app demo: " + s.cap} style={{ position: "relative", width: "100%", aspectRatio: "390/844", containerType: "inline-size", borderRadius: "13.33% / 6.16%", boxShadow: "0 24px 40px -18px rgba(0,0,0,.35)" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "13.33% / 6.16%", overflow: "hidden", background: "#1C1C1E" }}>
          <div style={{ position: "absolute", inset: 0, clipPath: CLIP }}>{img(prev.src)}</div>
          <div style={{ position: "absolute", inset: 0, clipPath: "inset(5.924% 2.051% 0.948% 2.051% round 0 0 11.765%/5.314% 11.765%/5.314%)" }}>
            <div style={{ position: "absolute", inset: 0, transform: curTransform, opacity: curOpacity, transition: ent ? "none" : `transform ${dur} cubic-bezier(.2,.7,.2,1), opacity ${dur} ease` }}>
              <div style={{ position: "absolute", inset: 0, background: "#FAFAFA", clipPath: CLIP }}>
                {img(s.src, s.cap)}
                {t && <div style={{ position: "absolute", left: "2.051%", width: "95.898%", top: Tp(t.top), height: H(t.h), overflow: "hidden", background: "#FAFAFA" }}><img src={t.src} alt="" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "auto", display: "block", transform: `translateY(-${(scrollTo / t.imgH * 100).toFixed(3)}%)`, transition: rm ? "none" : "transform 1.5s cubic-bezier(.3,.6,.2,1)" }} /></div>}
                {boxes.map((b) => <div key={b.key as string} style={{ position: "absolute", left: b.left as string, top: b.top as string, width: b.width as string, height: b.height as string, borderRadius: b.radius as string, background: b.bg as string, color: b.fg as string, border: b.border as string, display: "flex", alignItems: b.align as "center", justifyContent: b.justify as "center", paddingLeft: b.pad as string, paddingRight: b.pad as string, paddingTop: b.pt as string, fontWeight: b.weight as number, fontSize: b.font as string, whiteSpace: b.ws as "nowrap", lineHeight: 1.35, animation: b.anim as string, overflow: "hidden", boxSizing: "border-box", fontFamily: "Inter, system-ui, sans-serif" }}>{b.text as string}{b.caret && <span style={{ display: "inline-block", width: "1.5cqw", height: "1.1em", marginLeft: "0.5cqw", background: "#EF6820", animation: "dmCaret 1s steps(2,start) infinite", verticalAlign: "middle" }} />}</div>)}
              </div>
            </div>
          </div>
          <div style={{ position: "absolute", inset: 0, clipPath: "polygon(0 0,100% 0,100% 100%,0 100%,0 5.924%,2.051% 5.924%,2.051% 99.052%,97.949% 99.052%,97.949% 5.924%,0 5.924%)" }}>{img(s.src)}</div>
        </div>
        {taps.map((tp) => <span key={tp.key} style={{ position: "absolute", left: tp.left, top: tp.top, width: "11.3%", aspectRatio: "1", borderRadius: "50%", background: "rgba(239,104,32,.3)", border: "2px solid #EF6820", animation: "dmTap .7s ease-out both", pointerEvents: "none" }} />)}
      </div>
      {!compact && <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 6 }}>{clock === undefined && <><button type="button" onClick={togglePlay} style={{ padding: "3px 10px", borderRadius: 999, border: "1px solid #D5D7DA", background: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{st.playing ? "Pause" : "Play"}</button><button type="button" onClick={replay} style={{ padding: "3px 10px", borderRadius: 999, border: "1px solid #D5D7DA", background: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Replay</button></>}</div>
          <span style={{ padding: "3px 8px", borderRadius: 6, background: isK ? "#181D27" : "#FEF6EE", color: isK ? "#fff" : "#B93815", fontSize: 11, fontWeight: 700 }}>{isK ? "Contractor app" : "Consumer app"}</span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: dark ? "#3A4152" : "#E9EAEB", overflow: "hidden" }}><div style={{ height: "100%", width: progress, background: "#EF6820", transition: "width .12s linear" }} /></div>
        <span style={{ fontSize: 13, lineHeight: "19px", color: dark ? "#D5D7DA" : "#535862", minHeight: 38 }}>{s.cap}</span>
      </div>}
      <style jsx global>{`@keyframes dmTap{0%{transform:translate(-50%,-50%) scale(.35);opacity:.9}100%{transform:translate(-50%,-50%) scale(1.6);opacity:0}}@keyframes dmIn{0%{opacity:0;transform:scale(.92)}100%{opacity:1;transform:scale(1)}}@keyframes dmCaret{50%{opacity:0}}`}</style>
    </div>
  );
}
