"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroGrid from "@/components/HeroGrid";
import { api } from "@/lib/api";

const TYPES = [
  { label: "Manufacturer", value: "manufacturer" },
  { label: "Retailer or Reseller", value: "retailer_or_reseller" },
  { label: "Designer or Builder", value: "designer_or_builder" },
  { label: "Architect or Home Developer", value: "architect_or_home_developer" },
  { label: "Other", value: "other" },
];

export default function PartnerPage() {
  const [f, setF] = useState({ company_name: "", contact_person: "", email: "", phone: "", website_url: "", type_of_business: "", message: "" });
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const input = "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-base shadow-sm focus:border-brand-500 focus:outline-none";

  async function onSubmit() {
    setError("");
    if (!f.company_name || !f.contact_person || !f.email || !f.type_of_business) { setError("Please fill all required fields"); return; }
    setLoading(true);
    const res = await api("/partner-requests", { method: "POST", body: { ...f, country: "US" } });
    setLoading(false);
    if (!res.success) { setError(res.error ?? "Failed to submit"); return; }
    setDone(true);
  }

  return (
    <>
      <Header />
      <main className="relative min-h-[70vh]">
        <HeroGrid />
        <section className="mx-auto max-w-[720px] px-4 py-16 lg:px-0">
          <div className="text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-700">Partner with us</p>
            <h1 className="font-display text-4xl font-medium leading-tight sm:text-5xl">Let&apos;s build together</h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
              Manufacturers, retailers, designers, and developers — partner with MrBuilder to reach pergola owners
              across America.
            </p>
          </div>

          <div className="mt-10 rounded-[20px] border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
            {done ? (
              <div className="py-16 text-center">
                <h3 className="text-2xl font-semibold text-gray-900">Request received! 🎉</h3>
                <p className="mt-2 text-gray-500">Our partnerships team will contact you shortly.</p>
              </div>
            ) : (
              <>
                {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Company name*</label><input className={input} value={f.company_name} onChange={(e) => set("company_name", e.target.value)} /></div>
                  <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Contact person*</label><input className={input} value={f.contact_person} onChange={(e) => set("contact_person", e.target.value)} /></div>
                  <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Email*</label><input type="email" className={input} value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
                  <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label><input className={input} value={f.phone} onChange={(e) => set("phone", e.target.value)} /></div>
                  <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Website</label><input className={input} value={f.website_url} onChange={(e) => set("website_url", e.target.value)} placeholder="https://" /></div>
                  <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Type of business*</label>
                    <select className={input} value={f.type_of_business} onChange={(e) => set("type_of_business", e.target.value)}>
                      <option value="">Select type</option>
                      {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-medium text-gray-700">Message</label><textarea rows={4} className={input} value={f.message} onChange={(e) => set("message", e.target.value)} /></div>
                </div>
                <button onClick={onSubmit} disabled={loading} className="mt-6 w-full rounded-lg bg-brand-600 py-3 font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-60">
                  {loading ? "Submitting..." : "Submit"}
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
