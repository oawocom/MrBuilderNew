"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, getUser } from "@/lib/api";
import { Job, Quote } from "@/lib/types";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/dashboard/ui";

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    async function loadConsumer() {
      const jobsRes = await api<Job[]>("/jobs/me?limit=50");
      const jobs = jobsRes.success && jobsRes.data ? jobsRes.data : [];
      const all: Quote[] = [];
      for (const j of jobs) {
        const qr = await api<Quote[]>(`/jobs/${j.id}/quotes`);
        if (qr.success && qr.data) all.push(...qr.data);
      }
      setQuotes(all);
      setLoading(false);
    }
    async function loadContractor() {
      const res = await api<Quote[]>("/quotes/me?limit=50");
      setQuotes(res.success && res.data ? res.data : []);
      setLoading(false);
    }
    if (u?.role === "contractor") loadContractor();
    else loadConsumer();
  }, []);

  return (
    <div>
      <PageHeader title="My quotes" subtitle="Price offers on your jobs" />
      {loading ? null : quotes.length === 0 ? (
        <EmptyState text="No quotes yet." />
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => (
            <Link key={q.id} href={`/profile/service-history/${q.job_id}`} className="block">
              <Card className="flex items-center justify-between transition hover:border-brand-300">
                <div>
                  <p className="font-semibold">${q.amount}{q.title ? ` — ${q.title}` : ""}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{new Date(q.created_at).toLocaleDateString()}</p>
                </div>
                <StatusBadge status={q.status} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
