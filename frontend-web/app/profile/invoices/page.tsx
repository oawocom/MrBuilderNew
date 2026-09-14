"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Invoice } from "@/lib/types";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/dashboard/ui";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Invoice[]>("/invoices/me?limit=50").then((res) => {
      setInvoices(res.success && res.data ? res.data : []);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <PageHeader title="My invoices" subtitle="Invoices generated from accepted quotes" />
      {loading ? null : invoices.length === 0 ? (
        <EmptyState text="No invoices yet." />
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Link key={inv.id} href={`/profile/service-history/${inv.job_id}`} className="block">
              <Card className="flex items-center justify-between transition hover:border-brand-300">
                <div>
                  <p className="font-semibold">${inv.amount}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{inv.description ?? "Invoice"} · {new Date(inv.created_at).toLocaleDateString()}</p>
                </div>
                <StatusBadge status={inv.status} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
