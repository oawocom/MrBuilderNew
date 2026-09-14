"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { StatCard } from "@/components/dashboard/table";
import { AdminJobRow, JobsSection } from "@/components/admin/shared";

interface Stats {
  users: { total: number; consumers: number; contractors: number; admins: number };
  jobs: Record<string, number>;
  quotes: { total: number; pending: number };
  invoices: { total: number; paid: number; paid_sum: number; pending_sum: number };
  claims_pending: number; waitlist: number; partner_requests: number;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<AdminJobRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [s, j] = await Promise.all([api<Stats>("/admin/stats"), api<AdminJobRow[]>("/admin/jobs?limit=5")]);
    if (s.success && s.data) setStats(s.data);
    if (j.success && j.data) setJobs(j.data);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 lg:text-4xl">Admin Panel</h1>
          <p className="mt-1 text-sm text-gray-600">Manage your platform and monitor system performance</p>
        </div>
        <button onClick={onRefresh} disabled={refreshing} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={refreshing ? "animate-spin" : ""}><path d="M23 4v6h-6M1 20v-6h6" strokeLinecap="round" strokeLinejoin="round" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Users" value={stats.users.total} />
        <StatCard title="Jobs" value={stats.jobs.total ?? 0} />
        <StatCard title="Pending Claims" value={stats.claims_pending} />
        <StatCard title="Paid Revenue" value={`$${stats.invoices.paid_sum.toLocaleString()}`} />
        <StatCard title="Partner Requests" value={stats.partner_requests} />
        <StatCard title="Waitlist" value={stats.waitlist} />
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-gray-900">Recent jobs</h3>
        <JobsSection jobs={jobs} withSearch={false} />
      </div>
    </div>
  );
}
