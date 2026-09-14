"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const serviceTypes = ["Inspection", "Maintenance", "Repair", "Cleaning", "New Installation"];
const problemTypes = ["Water Leakage", "Motor Issue", "Cleaning/Maintenance", "Remote Control Problem", "Other"];

const bullets = ["24/7 Customer Support", "Fast Response Times", "Certified Technicians"];

export default function RequestSection() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "", address: "", unit: "", city: "", state: "", zip: "",
    country: "United States", email: "", phone: "",
    serviceType: "", problemType: "", date: "", description: "",
  });

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function onSubmit() {
    // Carry the request into registration → job posting flow
    localStorage.setItem("mrb_landing_request", JSON.stringify(form));
    router.push("/register");
  }

  const input =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none";

  return (
    <section id="request-service" className="mx-auto grid max-w-[1280px] grid-cols-1 gap-8 px-4 pb-8 lg:grid-cols-2 lg:px-0 lg:py-16">
      {/* Form card */}
      <div className="rounded-[20px] border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
        <h2 className="font-display text-2xl font-semibold">Request a service</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Full name*</label>
            <input className={input} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Address*</label>
            <input className={input} value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Unit number*</label>
            <input className={input} value={form.unit} onChange={(e) => set("unit", e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">City*</label>
            <input className={input} value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">State*</label>
            <input className={input} value={form.state} onChange={(e) => set("state", e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Zip code*</label>
            <input className={input} value={form.zip} onChange={(e) => set("zip", e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Country*</label>
            <input className={input} value={form.country} onChange={(e) => set("country", e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email*</label>
            <input type="email" className={input} value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Phone number*</label>
            <input className={input} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Service Type*</label>
            <select className={input} value={form.serviceType} onChange={(e) => set("serviceType", e.target.value)}>
              <option value="">Select a service</option>
              {serviceTypes.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Problem Type*</label>
            <select className={input} value={form.problemType} onChange={(e) => set("problemType", e.target.value)}>
              <option value="">Select a problem type</option>
              {problemTypes.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Preferred Service Date*</label>
            <input type="date" className={input} value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Problem description*</label>
            <textarea rows={4} className={input} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
        </div>
        <button
          onClick={onSubmit}
          className="mt-6 w-full rounded-lg bg-brand-600 py-3 font-semibold text-white shadow hover:bg-brand-700"
        >
          Submit Request
        </button>
      </div>

      {/* Content card with background */}
      <div className="relative overflow-hidden rounded-[20px]">
        <Image src="/images/service-bg.png" alt="Request Background" fill className="object-cover" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative flex h-full min-h-[420px] flex-col justify-end gap-4 p-8">
          {bullets.map((b) => (
            <div key={b} className="flex items-center gap-3 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="font-semibold">{b}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
