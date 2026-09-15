"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminTable, Badge } from "@/components/dashboard/table";
import { Btn, fmtDate, jobStatusColor, money, useToast } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Claim { id: string; job_id: string; request_code: string | null; consumer: string; issue_code: string; priority: string; review_status: string; service_call_fee: number; created_at: string }

export default function MrCarePage() {
  const [rows, setRows] = useState<Claim[]>([]);
  const [status, setStatus] = useState("under_review");
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    const r = await api<Claim[]>(`/admin/mrcare/claims?limit=100${status ? `&status=${status}` : ""}`);
    setRows(r.data ?? []);
  }, [status]);
  useEffect(() => { load(); }, [load]);

  async function review(c: Claim, s: "approved" | "denied") {
    const notes = window.prompt(s === "approved" ? "Note for the customer (optional):" : "Reason (sent to the customer):") ?? "";
    if (s === "denied" && !notes) return;
    const r = await api(`/admin/mrcare/claims/${c.id}`, { method: "PATCH", body: { status: s, notes: notes || undefined } });
    show(r.success ? `Claim ${s}` : r.error ?? "Failed", !r.success); load();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="MrCare · Electronics claims" subtitle="Approve → job is matched to a repair-qualified contractor. Deny → customer notified, claim quota restored." />
      <div className="flex gap-2">{["under_review", "approved", "denied", ""].map((s) => <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1 text-sm capitalize ${status === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}>{s ? s.replace("_", " ") : "all"}</button>)}</div>
      <AdminTable headers={["Request", "Customer", "Issue", "Priority", "Service fee", "Status", "Submitted", "Actions"]}>
        {rows.map((c) => (
          <tr key={c.id} className="hover:bg-gray-50">
            <td className="px-6 py-3 text-sm font-medium">{c.request_code ?? c.job_id.slice(0, 8)}</td>
            <td className="px-6 py-3 text-sm">{c.consumer}</td>
            <td className="px-6 py-3 text-sm">{c.issue_code.replace(/_/g, " ")}</td>
            <td className="px-6 py-3"><Badge color={c.priority === "high" ? "error" : c.priority === "low" ? "gray" : "blue"}>{c.priority}</Badge></td>
            <td className="px-6 py-3 text-sm">{money(c.service_call_fee)}</td>
            <td className="px-6 py-3"><Badge color={jobStatusColor[c.review_status]}>{c.review_status.replace("_", " ")}</Badge></td>
            <td className="px-6 py-3 text-xs text-gray-500">{fmtDate(c.created_at)}</td>
            <td className="px-6 py-3"><div className="flex gap-2">{c.review_status === "under_review" && <><Btn small onClick={() => review(c, "approved")}>Approve</Btn><Btn small kind="danger" onClick={() => review(c, "denied")}>Deny</Btn></>}</div></td>
          </tr>
        ))}
      </AdminTable>
      <p className="text-xs text-gray-400">Plans and add-ons are edited on the Pricing page. Maintenance bookings appear in Jobs as kind "maintenance_booking".</p>
      {toast}
    </div>
  );
}
