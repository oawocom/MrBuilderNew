"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdminTable, Badge, SearchInput } from "@/components/dashboard/table";
import { SectionCard, ExportButton, statusColor } from "@/components/admin/shared";

interface W { id: string; full_name: string; email: string; phone: string | null; interested_role: string | null; state: string | null; city: string | null; status: string; created_at: string; }

const ROLE_LABEL: Record<string, string> = { inspector: "MrInspector", service_team: "Service Team", installation_team: "Installation Team" };

export default function WaitlistPage() {
  const [rows, setRows] = useState<W[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<W[]>("/admin/waitlist").then((r) => r.success && r.data && setRows(r.data));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function activate(id: string) {
    setBusy(true);
    await api(`/admin/waitlist/${id}/activate`, { method: "PATCH" });
    load();
    setBusy(false);
  }

  const q = search.toLowerCase();
  const filtered = rows.filter((w) =>
    (!q || w.full_name.toLowerCase().includes(q) || w.email.toLowerCase().includes(q)) &&
    (!status || w.status === status) &&
    (!role || w.interested_role === role)
  );

  return (
    <SectionCard title="Waitlist Management" subtitle="Manage early access requests and convert leads" actions={<ExportButton rows={rows} filename="waitlist" />}>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Search waitlist..." />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 shadow-sm focus:border-brand-500 focus:outline-none">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="activated">Activated</option>
          </select>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 shadow-sm focus:border-brand-500 focus:outline-none">
            <option value="">All Roles</option>
            <option value="inspector">MrInspector</option>
            <option value="service_team">Service Team</option>
            <option value="installation_team">Installation Team</option>
          </select>
        </div>
        <AdminTable headers={["Name", "Contact", "Interested Role", "Location", "Status", "Joined", ""]}>
          {filtered.map((w) => (
            <tr key={w.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">{w.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}</span>
                  <p className="text-sm font-medium text-gray-900">{w.full_name}</p>
                </div>
              </td>
              <td className="px-6 py-4">
                <p className="text-sm text-gray-700">{w.email}</p>
                {w.phone && <p className="text-sm text-gray-500">{w.phone}</p>}
              </td>
              <td className="px-6 py-4">{w.interested_role ? <Badge color="purple">{ROLE_LABEL[w.interested_role] ?? w.interested_role}</Badge> : "—"}</td>
              <td className="px-6 py-4">
                <p className="text-sm text-gray-700">{w.city ? `${w.city}, ${w.state ?? ""}` : w.state ?? "—"}</p>
                <p className="text-sm text-gray-500">US</p>
              </td>
              <td className="px-6 py-4"><Badge color={statusColor[w.status]}>{w.status}</Badge></td>
              <td className="px-6 py-4 text-sm text-gray-500">{new Date(w.created_at).toLocaleDateString()}</td>
              <td className="px-6 py-4 text-right">
                {w.status === "pending" && (
                  <button disabled={busy} onClick={() => activate(w.id)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Activate</button>
                )}
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </SectionCard>
  );
}
