"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, getUser, User } from "@/lib/api";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/dashboard/ui";

interface Warranty {
  id: string; job_id: string; job_title: string; warranty_type: string;
  status: string; start_date: string; end_date: string;
}

export default function WarrantyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [list, setList] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimFor, setClaimFor] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    api<Warranty[]>("/warranties/me").then((res) => {
      setList(res.success && res.data ? res.data : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setUser(getUser());
    load();
  }, [load]);

  async function fileClaim(wid: string) {
    if (!desc.trim()) return;
    const res = await api(`/warranties/${wid}/claims`, { method: "POST", body: { issue_description: desc.trim() } });
    setMsg(res.success ? "Claim submitted ✓" : res.error ?? "Failed");
    setClaimFor(null);
    setDesc("");
  }

  if (!user) return null;
  const isConsumer = user.role === "consumer";

  return (
    <div>
      <PageHeader title="Warranty documents" subtitle="Warranties issued for your completed jobs" />
      {msg && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</div>}
      {loading ? null : list.length === 0 ? (
        <EmptyState text="No warranty documents yet. Warranties appear here after completed jobs." />
      ) : (
        <div className="space-y-3">
          {list.map((w) => (
            <Card key={w.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold capitalize">{w.warranty_type} warranty — <Link href={`/profile/service-history/${w.job_id}`} className="text-brand-700 hover:underline">{w.job_title}</Link></p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {new Date(w.start_date).toLocaleDateString()} → {new Date(w.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={w.status} />
                  {isConsumer && w.status === "active" && (
                    <button onClick={() => setClaimFor(claimFor === w.id ? null : w.id)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700">
                      File a claim
                    </button>
                  )}
                </div>
              </div>
              {claimFor === w.id && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Describe the issue</label>
                  <textarea rows={3} className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 focus:border-brand-500 focus:outline-none" value={desc} onChange={(e) => setDesc(e.target.value)} />
                  <button onClick={() => fileClaim(w.id)} className="mt-3 rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white">Submit claim</button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
