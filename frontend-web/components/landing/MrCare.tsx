"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Plan { slug: string; offering: string; name: string; annual_price: number; visits_per_year: number; features: string[] }

export default function MrCare() {
  const [plans, setPlans] = useState<Plan[]>([]);
  useEffect(() => { fetch("/api/v1/mrcare/plans").then((r) => r.json()).then((b) => setPlans(b.data?.plans ?? [])).catch(() => {}); }, []);
  const maint = plans.filter((p) => p.offering === "maintenance");
  const elec = plans.filter((p) => p.offering === "electronics");
  return (
    <section id="mrcare" className="bg-brand-25 py-20">
      <div className="mx-auto max-w-[1280px] px-4 lg:px-0">
        <div className="mb-12 text-center"><p className="text-sm font-semibold text-brand-600">MrCare</p><h2 className="mt-2 text-3xl font-semibold text-gray-900 md:text-4xl">Keep it perfect, year after year</h2><p className="mt-3 text-gray-600">Two plans, per pergola, billed yearly. Book visits and file claims from your account.</p></div>
        <div className="grid gap-6 lg:grid-cols-4">
          {maint.map((p) => (
            <div key={p.slug} className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase text-gray-500">Service & Maintenance</p>
              <h3 className="mt-1 text-xl font-semibold">{p.name}</h3>
              <p className="mt-2 text-3xl font-semibold">${p.annual_price}<span className="text-base font-normal text-gray-500">/yr</span></p>
              <ul className="mt-4 space-y-1 text-sm text-gray-600">{(p.features ?? []).map((f) => <li key={f}>· {f}</li>)}</ul>
            </div>
          ))}
          {elec.map((p) => (
            <div key={p.slug} className="rounded-2xl border-2 border-brand-300 bg-white p-6">
              <p className="text-xs font-semibold uppercase text-brand-600">Electronics Protection</p>
              <h3 className="mt-1 text-xl font-semibold">{p.name}</h3>
              <p className="mt-2 text-3xl font-semibold">${p.annual_price}<span className="text-base font-normal text-gray-500">/yr</span></p>
              <ul className="mt-4 space-y-1 text-sm text-gray-600">{(p.features ?? []).map((f) => <li key={f}>· {f}</li>)}</ul>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center"><Link href="/register" className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">Protect my pergola</Link></div>
      </div>
    </section>
  );
}
