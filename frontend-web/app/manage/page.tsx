"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageHeader, StatCard } from "@/components/dashboard/table";
import { money } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Dash { [k: string]: number | { date: string; requests: number; paid: number }[] }

export default function DashboardPage() {
  const [d, setD] = useState<Dash | null>(null);
  useEffect(() => { api<Dash>("/admin/dashboard").then((r) => setD(r.data ?? null)); }, []);
  const n = (k: string) => Number((d?.[k] as number) ?? 0);
  const series = (d?.series as { date: string; requests: number; paid: number }[]) ?? [];
  const max = Math.max(1, ...series.map((s) => s.requests));

  const attention = [
    { label: "Open disputes", value: n("disputes_open"), href: "/manage/jobs", color: "text-red-600" },
    { label: "Safety pauses", value: n("safety_pauses"), href: "/manage/jobs", color: "text-red-600" },
    { label: "Waitlisted (no contractor)", value: n("jobs_waitlist"), href: "/manage/contractors", color: "text-amber-600" },
    { label: "Payouts pending", value: money(n("payouts_pending")), href: "/manage/payouts", color: "text-amber-600" },
    { label: "Claims to review", value: n("claims_under_review"), href: "/manage/mrcare", color: "text-amber-600" },
    { label: "Orders to ship", value: n("orders_to_ship"), href: "/manage/store", color: "text-amber-600" },
    { label: "Contractors awaiting approval", value: n("contractors_pending"), href: "/manage/contractors", color: "text-amber-600" },
    { label: "Practical assessments due", value: n("contractors_practical_pending"), href: "/manage/contractors", color: "text-gray-700" },
  ];

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Dashboard" subtitle="What needs a decision today, and how the platform is doing" />
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Needs attention</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {attention.map((a) => (
            <Link key={a.label} href={a.href} className="rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50">
              <p className="text-sm text-gray-600">{a.label}</p>
              <p className={`mt-1 text-2xl font-semibold ${Number(a.value) === 0 || a.value === "$0.00" ? "text-gray-400" : a.color}`}>{a.value}</p>
            </Link>
          ))}
        </div>
      </div>
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Pipeline</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard title="Quotes awaiting customer" value={n("quotes_pending")} />
          <StatCard title="Matching" value={n("jobs_matching")} />
          <StatCard title="In the field" value={n("jobs_active")} />
          <StatCard title="Awaiting confirmation" value={n("jobs_awaiting_confirmation")} />
        </div>
      </div>
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Last 30 days</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard title="Jobs paid" value={n("jobs_paid_30d")} />
          <StatCard title="Customer payments" value={money(n("paid_30d"))} />
          <StatCard title="Platform fees" value={money(n("fees_30d"))} />
          <StatCard title="Requests (7d)" value={n("requests_7d")} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="Active contractors" value={n("contractors_active")} />
        <StatCard title="Customers" value={n("consumers")} />
        <StatCard title="MrCare subscriptions" value={n("subscriptions_active")} />
        <StatCard title="Reported orders" value={n("orders_reported")} />
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-gray-700">Requests per day · last 14 days</p>
        <div className="flex h-32 items-end gap-1">
          {series.map((s) => (
            <div key={s.date} className="flex flex-1 flex-col items-center gap-1" title={`${s.date}: ${s.requests} requests, ${money(s.paid)} paid`}>
              <div className="w-full rounded-t bg-brand-500" style={{ height: `${(s.requests / max) * 100}%`, minHeight: s.requests ? 4 : 0 }} />
              <span className="text-[10px] text-gray-400">{s.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
