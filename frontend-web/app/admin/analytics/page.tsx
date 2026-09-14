"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Stats {
  users: { total: number; consumers: number; contractors: number };
  jobs: Record<string, number>;
  quotes: { total: number; pending: number };
  invoices: { total: number; paid: number; paid_sum: number; pending_sum: number };
}

export default function AnalyticsPage() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => { api<Stats>("/admin/stats").then((r) => r.success && r.data && setS(r.data)); }, []);
  if (!s) return null;

  const totalJobs = s.jobs.total ?? 0;
  const doneJobs = (s.jobs.confirmed ?? 0) + (s.jobs.completed ?? 0);
  const successRate = totalJobs > 0 ? Math.round((doneJobs / totalJobs) * 100) : 0;
  const quoteAccept = s.quotes.total > 0 ? Math.round(((s.quotes.total - s.quotes.pending) / s.quotes.total) * 100) : 0;
  const avgInvoice = s.invoices.total > 0 ? (s.invoices.paid_sum + s.invoices.pending_sum) / s.invoices.total : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 lg:text-4xl">Platform Analytics</h1>
        <p className="mt-1 text-sm text-gray-600">Detailed platform performance insights</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">Service Success Rate</p>
          <p className="mt-1 text-2xl font-semibold text-orange-600">{successRate}%</p>
          <p className="mt-1 text-sm text-gray-500">completed / total jobs</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">Quote Response Rate</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600">{quoteAccept}%</p>
          <p className="mt-1 text-sm text-gray-500">quotes decided</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">Avg. Invoice Value</p>
          <p className="mt-1 text-2xl font-semibold text-purple-600">${avgInvoice.toFixed(2)}</p>
          <p className="mt-1 text-sm text-gray-500">total value / invoices</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">Contractor Ratio</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">{s.users.contractors} / {s.users.consumers}</p>
          <p className="mt-1 text-sm text-gray-500">contractors / consumers</p>
        </div>
      </div>
    </div>
  );
}
