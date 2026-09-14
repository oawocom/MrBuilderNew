"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/dashboard/ui";

interface Claim {
  id: string; job_id: string; job_title: string; warranty_type: string;
  issue_description: string; status: string; created_at: string;
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Claim[]>("/claims/me").then((res) => {
      setClaims(res.success && res.data ? res.data : []);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <PageHeader title="My claims" subtitle="Warranty claims and their status" />
      {loading ? null : claims.length === 0 ? (
        <EmptyState text="No claims yet. You can file a claim from an active warranty document." />
      ) : (
        <div className="space-y-3">
          {claims.map((cl) => (
            <Card key={cl.id} className="flex items-center justify-between">
              <div>
                <p className="font-semibold capitalize">{cl.warranty_type} claim — <Link href={`/profile/service-history/${cl.job_id}`} className="text-brand-700 hover:underline">{cl.job_title}</Link></p>
                <p className="mt-0.5 text-sm text-gray-500">{cl.issue_description}</p>
                <p className="mt-0.5 text-xs text-gray-400">{new Date(cl.created_at).toLocaleDateString()}</p>
              </div>
              <StatusBadge status={cl.status} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
