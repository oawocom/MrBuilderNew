"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdminTable, Badge, SearchInput } from "@/components/dashboard/table";
import { SectionCard, ExportButton, statusColor } from "@/components/admin/shared";

interface Inv { id: string; amount: number; status: string; created_at: string; paid_at: string | null; job_title: string; consumer: string; contractor: string; }

export default function TransactionsPage() {
  const [invoices, setInvoices] = useState<Inv[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    api<Inv[]>("/admin/invoices?limit=100").then((r) => r.success && r.data && setInvoices(r.data));
  }, []);
  const q = search.toLowerCase();
  const rows = invoices.filter((i) => !q || i.job_title.toLowerCase().includes(q) || i.consumer.toLowerCase().includes(q) || i.contractor.toLowerCase().includes(q));
  return (
    <SectionCard title="Transactions" subtitle="All invoices and payments on the platform" actions={<ExportButton rows={invoices} filename="transactions" />}>
      <div className="space-y-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search transactions..." />
        <AdminTable headers={["Invoice", "Consumer", "Contractor", "Amount", "Status", "Created"]}>
          {rows.map((i) => (
            <tr key={i.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">{i.job_title}</td>
              <td className="px-6 py-4 text-sm text-gray-700">{i.consumer}</td>
              <td className="px-6 py-4 text-sm text-gray-700">{i.contractor}</td>
              <td className="px-6 py-4 text-sm font-medium text-gray-900">${i.amount}</td>
              <td className="px-6 py-4"><Badge color={statusColor[i.status]}>{i.status}</Badge></td>
              <td className="px-6 py-4 text-sm text-gray-500">{new Date(i.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </SectionCard>
  );
}
