"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Cat { slug: string; name: string; description: string | null }
const blurbs: Record<string, string> = {
  installation: "New pergola, attached or free-standing, louvered, fixed or retractable roofs.",
  repair: "Louvers, motors, drainage, hardware — diagnosed and fixed.",
  maintenance: "Seasonal checks, tightening, drainage, motor and sensor tests.",
  cleaning: "Roofs, gutters, screens and glass — the right products for each surface.",
  programming: "Remotes, rain & wind sensors, app pairing and automations.",
  upgrades: "Lighting, fans, heaters, screens and shades — mounted, not wired.",
  inspection: "A PRO measures and documents your pergola. $99, credited to the job.",
  removal: "Safe dismantling, transport and re-installation at a new spot.",
};

export default function Services() {
  const [cats, setCats] = useState<Cat[]>([]);
  useEffect(() => { fetch("/api/v1/categories").then((r) => r.json()).then((b) => setCats(b.data ?? [])).catch(() => {}); }, []);
  return (
    <section id="services" className="bg-gray-50 py-20">
      <div className="mx-auto max-w-[1280px] px-4 lg:px-0">
        <div className="mb-12 text-center"><p className="text-sm font-semibold text-brand-600">Services</p><h2 className="mt-2 text-3xl font-semibold text-gray-900 md:text-4xl">Everything your pergola will ever need</h2></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cats.map((c) => (
            <Link key={c.slug} href="/register" className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-brand-300 hover:shadow-sm">
              <h3 className="font-semibold text-gray-900">{c.name}</h3>
              <p className="mt-2 text-sm text-gray-600">{c.description || blurbs[c.slug] || ""}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-brand-600">Get a quote →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
