"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdminTable, Badge } from "@/components/dashboard/table";
import { SectionCard, ExportButton, statusColor } from "@/components/admin/shared";

interface W { id: string; warranty_type: string; status: string; start_date: string; end_date: string; job_title: string; consumer: string; contractor: string; }
interface Cl { id: string; status: string; warranty_type: string; issue_description: string; admin_notes: string | null; created_at: string; job_title: string; consumer: string; }

const NEXT: Record<string, string[]> = { pending: ["under_review", "denied"], under_review: ["approved", "denied"], approved: ["resolved"] };

export default function WarrantiesPage() {
  const [warranties, setWarranties] = useState<W[]>([]);
  const [claims, setClaims] = useState<Cl[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<W[]>("/admin/warranties").then((r) => r.success && r.data && setWarranties(r.data));
    api<Cl[]>("/admin/claims").then((r) => r.success && r.data && setClaims(r.data));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: string) {
    setBusy(true);
    const notes = prompt("Admin notes (optional):") || undefined;
    await api(`/admin/claims/${id}`, { method: "PATCH", body: { status, admin_notes: notes } });
    load();
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Warranties" subtitle="All warranty documents on the platform" actions={<ExportButton rows={warranties} filename="warranties" />}>
        <AdminTable headers={["Warranty", "Consumer", "Contractor", "Type", "Valid Until", "Status"]}>
          {warranties.map((w) => (
            <tr key={w.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">{w.job_title}</td>
              <td className="px-6 py-4 text-sm text-gray-700">{w.consumer}</td>
              <td className="px-6 py-4 text-sm text-gray-700">{w.contractor || "—"}</td>
              <td className="px-6 py-4"><Badge color="gray">{w.warranty_type}</Badge></td>
              <td className="px-6 py-4 text-sm text-gray-500">{new Date(w.end_date).toLocaleDateString()}</td>
              <td className="px-6 py-4"><Badge color={statusColor[w.status]}>{w.status}</Badge></td>
            </tr>
          ))}
        </AdminTable>
      </SectionCard>

      <SectionCard title="Warranty Claims" subtitle="Review and resolve warranty claims">
        <AdminTable headers={["Claim", "Consumer", "Type", "Status", "Actions"]}>
          {claims.map((cl) => (
            <tr key={cl.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <p className="text-sm font-medium text-gray-900">{cl.job_title}</p>
                <p className="max-w-xs truncate text-sm text-gray-500" title={cl.issue_description}>{cl.issue_description}</p>
                {cl.admin_notes && <p className="text-xs italic text-gray-400">Notes: {cl.admin_notes}</p>}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">{cl.consumer}</td>
              <td className="px-6 py-4"><Badge color="gray">{cl.warranty_type}</Badge></td>
              <td className="px-6 py-4"><Badge color={statusColor[cl.status]}>{cl.status.replace("_", " ")}</Badge></td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  {(NEXT[cl.status] ?? []).map((s) => (
                    <button key={s} disabled={busy} onClick={() => setStatus(cl.id, s)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold capitalize text-gray-700 hover:bg-gray-50">{s.replace("_", " ")}</button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      </SectionCard>
    </div>
  );
}
