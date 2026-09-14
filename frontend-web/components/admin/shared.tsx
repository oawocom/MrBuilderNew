"use client";

import { AdminTable, Badge, SearchInput } from "@/components/dashboard/table";
import { api } from "@/lib/api";
import { useState } from "react";

export const statusColor: Record<string, string> = {
  active: "success", pending: "warning", suspended: "error", deactivated: "gray",
  posted: "blue", accepted: "purple", in_progress: "warning", completed: "success",
  confirmed: "success", cancelled: "gray", paid: "success", expired: "gray",
  under_review: "blue", approved: "success", denied: "error", resolved: "success",
  activated: "success",
};

export function SectionCard({ title, subtitle, actions, children }: { title: string; subtitle: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function ExportButton({ rows, filename }: { rows: object[]; filename: string }) {
  function onExport() {
    if (!rows.length) return;
    const recs = rows as Record<string, unknown>[];
    const headers = Object.keys(recs[0]);
    const csv = [headers.join(","), ...recs.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.csv`;
    a.click();
  }
  return (
    <button onClick={onExport} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      Export
    </button>
  );
}

export interface AdminUserRow { id: string; email: string; first_name: string; last_name: string; role: string; status: string; created_at: string; }

export function UsersSection({ users, typeBadge, reload }: { users: AdminUserRow[]; typeBadge: string; reload: () => void }) {
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const q = search.toLowerCase();
  const rows = users.filter((u) => !q || u.email.toLowerCase().includes(q) || `${u.first_name} ${u.last_name}`.toLowerCase().includes(q));

  async function setStatus(id: string, status: string) {
    setBusy(true);
    await api(`/admin/users/${id}/status`, { method: "PATCH", body: { status } });
    reload();
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search users..." />
      </div>
      <AdminTable headers={["User", "Account Type", "Status", "Joined", "Actions"]}>
        {rows.map((u) => (
          <tr key={u.id} className="hover:bg-gray-50">
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">{u.first_name?.[0]}{u.last_name?.[0]}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.first_name} {u.last_name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
              </div>
            </td>
            <td className="px-6 py-4"><Badge color={typeBadge === "CONTRACTOR" ? "success" : "blue"}>{typeBadge}</Badge></td>
            <td className="px-6 py-4"><Badge color={statusColor[u.status]}>{u.status}</Badge></td>
            <td className="px-6 py-4 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
            <td className="px-6 py-4 text-right">
              {u.status === "active" ? (
                <button disabled={busy} onClick={() => setStatus(u.id, "suspended")} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-gray-50">Suspend</button>
              ) : (
                <button disabled={busy} onClick={() => setStatus(u.id, "active")} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">Activate</button>
              )}
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}

export interface AdminJobRow { id: string; title: string; job_type: string; status: string; payment_amount: number | null; created_at: string; consumer: string; contractor: string; }

export function JobsSection({ jobs, withSearch = true }: { jobs: AdminJobRow[]; withSearch?: boolean }) {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();
  const rows = jobs.filter((j) => !q || j.title.toLowerCase().includes(q) || j.consumer.toLowerCase().includes(q) || (j.contractor ?? "").toLowerCase().includes(q));
  return (
    <div className="space-y-4">
      {withSearch && (
        <div className="flex flex-col gap-4 sm:flex-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Search..." />
        </div>
      )}
      <AdminTable headers={["Job", "Type", "Consumer", "Contractor", "Amount", "Status", "Created"]}>
        {rows.map((j) => (
          <tr key={j.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 text-sm font-medium text-gray-900">{j.title}</td>
            <td className="px-6 py-4"><Badge color="gray">{j.job_type}</Badge></td>
            <td className="px-6 py-4 text-sm text-gray-700">{j.consumer}</td>
            <td className="px-6 py-4 text-sm text-gray-700">{j.contractor || "—"}</td>
            <td className="px-6 py-4 text-sm font-medium text-gray-900">{j.payment_amount ? `$${j.payment_amount}` : "—"}</td>
            <td className="px-6 py-4"><Badge color={statusColor[j.status]}>{j.status.replace("_", " ")}</Badge></td>
            <td className="px-6 py-4 text-sm text-gray-500">{new Date(j.created_at).toLocaleDateString()}</td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
