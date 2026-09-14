"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroGrid from "@/components/HeroGrid";
import { api } from "@/lib/api";

const ROLES = [
  { label: "Inspector", value: "inspector" },
  { label: "Service Team", value: "service_team" },
  { label: "Installation Team", value: "installation_team" },
];

export default function ForContractorsPage() {
  const [f, setF] = useState({ full_name: "", email: "", phone: "", interested_role: "", state: "", city: "" });
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const input = "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-base shadow-sm focus:border-brand-500 focus:outline-none";

  async function onSubmit() {
    setError("");
    if (!f.full_name || !f.email) { setError("Name and email are required"); return; }
    setLoading(true);
    const res = await api("/waitlist", { method: "POST", body: { ...f, country: "US", interested_role: f.interested_role || undefined } });
    setLoading(false);
    if (!res.success) { setError(res.error ?? "Failed to submit"); return; }
    setDone(true);
  }

  return (
    <>
      <Header />
      <main className="relative min-h-[70vh]">
        <HeroGrid />
        <section className="mx-auto grid max-w-[1280px] gap-12 px-4 py-16 lg:grid-cols-2 lg:px-0">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-700">For contractors</p>
            <h1 className="font-display text-4xl font-medium leading-tight sm:text-5xl">
              Grow your pergola business with MrBuilder
            </h1>
            <p className="mt-4 max-w-xl text-lg text-gray-600">
              Join America&apos;s first pergola-focused platform. Get matched with homeowners in your area, send
              quotes, manage jobs, and get paid — all in one place.
            </p>
            <ul className="mt-8 space-y-4">
              {["Steady stream of pergola jobs in your area", "Set your own prices with quotes", "Built-in messaging and job management", "Ratings that grow your reputation"].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <span className="text-gray-700">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[20px] border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
            {done ? (
              <div className="py-16 text-center">
                <h3 className="text-2xl font-semibold text-gray-900">You&apos;re on the list! 🎉</h3>
                <p className="mt-2 text-gray-500">We&apos;ll reach out as soon as onboarding opens in your area.</p>
              </div>
            ) : (
              <>
                <h2 className="font-display text-2xl font-semibold">Join the waitlist</h2>
                {error && <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-medium text-gray-700">Full name*</label><input className={input} value={f.full_name} onChange={(e) => set("full_name", e.target.value)} /></div>
                  <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Email*</label><input type="email" className={input} value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
                  <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label><input className={input} value={f.phone} onChange={(e) => set("phone", e.target.value)} /></div>
                  <div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-medium text-gray-700">I work as</label>
                    <select className={input} value={f.interested_role} onChange={(e) => set("interested_role", e.target.value)}>
                      <option value="">Select a role</option>
                      {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div><label className="mb-1.5 block text-sm font-medium text-gray-700">State</label><input className={input} value={f.state} onChange={(e) => set("state", e.target.value)} /></div>
                  <div><label className="mb-1.5 block text-sm font-medium text-gray-700">City</label><input className={input} value={f.city} onChange={(e) => set("city", e.target.value)} /></div>
                </div>
                <button onClick={onSubmit} disabled={loading} className="mt-6 w-full rounded-lg bg-brand-600 py-3 font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-60">
                  {loading ? "Submitting..." : "Join waitlist"}
                </button>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
