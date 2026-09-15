"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminTable, Badge } from "@/components/dashboard/table";
import { Btn, fmtDate, jobStatusColor, money, useToast } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Payout { id: string; contractor_id: string; contractor: string; email: string; amount: number; status: string; method: string | null; is_auto: boolean; created_at: string }

export default function PayoutsPage() {
  const [rows, setRows] = useState<Payout[]>([]);
  const [status, setStatus] = useState("pending");
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    const r = await api<Payout[]>(`/admin/payouts?limit=100${status ? `&status=${status}` : ""}`);
    setRows(r.data ?? []);
  }, [status]);
  useEffect(() => { load(); }, [load]);

  async function decide(p: Payout, s: string) {
    let reason: string | undefined;
    if (s === "rejected") { reason = window.prompt("Reason (sent to the contractor, balance is returned):") ?? undefined; if (reason === undefined) return; }
    const r = await api(`/admin/payouts/${p.id}`, { method: "PATCH", body: { status: s, reason } });
    show(r.success ? `Payout ${s}` : r.error ?? "Failed", !r.success); load();
  }

  const pending = rows.filter((r) => r.status === "pending" || r.status === "approved").reduce((a, r) => a + Number(r.amount), 0);
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Payouts" subtitle={`Contractor withdrawal requests · ${money(pending)} awaiting`} />
      <div className="flex gap-2">{["pending", "approved", "completed", "rejected", ""].map((s) => <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1 text-sm capitalize ${status === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}>{s || "all"}</button>)}</div>
      <AdminTable headers={["Contractor", "Amount", "Method", "Type", "Status", "Requested", "Actions"]}>
        {rows.map((p) => (
          <tr key={p.id} className="hover:bg-gray-50">
            <td className="px-6 py-3"><div className="text-sm font-medium">{p.contractor}</div><div className="text-xs text-gray-500">{p.email}</div></td>
            <td className="px-6 py-3 text-sm font-semibold">{money(p.amount)}</td>
            <td className="px-6 py-3 text-sm">{p.method ?? "—"}</td>
            <td className="px-6 py-3 text-xs">{p.is_auto ? "auto" : "manual"}</td>
            <td className="px-6 py-3"><Badge color={jobStatusColor[p.status]}>{p.status}</Badge></td>
            <td className="px-6 py-3 text-xs text-gray-500">{fmtDate(p.created_at)}</td>
            <td className="px-6 py-3"><div className="flex gap-2">
              {p.status === "pending" && <Btn small kind="secondary" onClick={() => decide(p, "approved")}>Approve</Btn>}
              {(p.status === "pending" || p.status === "approved") && <><Btn small onClick={() => decide(p, "completed")}>Mark paid</Btn><Btn small kind="danger" onClick={() => decide(p, "rejected")}>Reject</Btn></>}
            </div></td>
          </tr>
        ))}
      </AdminTable>
      <p className="text-xs text-gray-400">"Mark paid" records the transfer. Once Stripe Connect is enabled in Integrations, approval triggers the transfer automatically.</p>
      {toast}
    </div>
  );
}
