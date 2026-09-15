"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminTable, Badge, SearchInput } from "@/components/dashboard/table";
import { Btn, Input, Modal, fmtDate, jobStatusColor, money, useToast } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Customer { id: string; email: string; first_name: string; last_name: string; phone: string | null; status: string; created_at: string; city: string; state: string; jobs: number; jobs_paid: number; spent: number; pergolas: number; subscriptions: number; household_members: number }

const blank = { first_name: "", last_name: "", email: "", phone: "", city: "", state: "", password: "" };

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<typeof blank | null>(null);
  const [edit, setEdit] = useState<(Customer & { password: string }) | null>(null);
  const [created, setCreated] = useState<{ email: string; temporary_password: string; emailed: boolean } | null>(null);
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    const r = await api<Customer[]>(`/admin/customers?limit=100${q ? `&q=${encodeURIComponent(q)}` : ""}`);
    setRows(r.data ?? []);
  }, [q]);
  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!form) return;
    const r = await api<{ temporary_password: string; emailed: boolean }>("/admin/users", { method: "POST", body: { role: "consumer", ...form, phone: form.phone || undefined, password: form.password || undefined, city: form.city || undefined, state: form.state || undefined } });
    if (!r.success || !r.data) { show(r.error ?? "Failed", true); return; }
    setCreated({ email: form.email, temporary_password: r.data.temporary_password, emailed: r.data.emailed }); setForm(null); load();
  }
  async function save() {
    if (!edit) return;
    const r = await api(`/admin/users/${edit.id}`, { method: "PATCH", body: { first_name: edit.first_name, last_name: edit.last_name, email: edit.email, phone: edit.phone || undefined, password: edit.password || undefined } });
    show(r.success ? "Saved" : r.error ?? "Failed", !r.success); if (r.success) { setEdit(null); load(); }
  }
  async function setStatus(c: Customer, s: string) {
    const r = await api(`/admin/users/${c.id}/status`, { method: "PATCH", body: { status: s } });
    show(r.success ? `Account ${s}` : r.error ?? "Failed", !r.success); load();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Customers" subtitle="Consumer accounts, their pergolas, plans and requests" actions={<Btn onClick={() => setForm({ ...blank })}>+ Add customer</Btn>} />
      <SearchInput value={q} onChange={setQ} placeholder="Search name, email or phone…" />
      <AdminTable headers={["Customer", "Account", "Requests", "Spent", "Pergolas", "MrCare", "Household", "Joined", ""]}>
        {rows.map((c) => (
          <tr key={c.id} className="hover:bg-gray-50">
            <td className="px-6 py-3"><div className="text-sm font-medium">{c.first_name} {c.last_name}</div><div className="text-xs text-gray-500">{c.email}{c.phone ? ` · ${c.phone}` : ""}{c.city ? ` · ${c.city}` : ""}</div></td>
            <td className="px-6 py-3"><Badge color={jobStatusColor[c.status] ?? "gray"}>{c.status}</Badge></td>
            <td className="px-6 py-3 text-sm">{c.jobs} <span className="text-xs text-gray-400">({c.jobs_paid} paid)</span></td>
            <td className="px-6 py-3 text-sm">{money(c.spent)}</td>
            <td className="px-6 py-3 text-sm">{c.pergolas}</td>
            <td className="px-6 py-3 text-sm">{c.subscriptions ? <Badge color="success">{c.subscriptions} active</Badge> : "—"}</td>
            <td className="px-6 py-3 text-sm">{c.household_members || "—"}</td>
            <td className="px-6 py-3 text-xs text-gray-500">{fmtDate(c.created_at)}</td>
            <td className="px-6 py-3"><div className="flex gap-2">
              <Btn small kind="secondary" onClick={() => setEdit({ ...c, password: "" })}>Edit</Btn>
              {c.status === "active" ? <Btn small kind="danger" onClick={() => setStatus(c, "suspended")}>Suspend</Btn> : <Btn small onClick={() => setStatus(c, "active")}>Activate</Btn>}
            </div></td>
          </tr>
        ))}
      </AdminTable>

      <Modal open={!!form} onClose={() => setForm(null)} title="Add customer">
        {form && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} />
            <Input label="Last name" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} />
            <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+1…" />
            <Input label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            <Input label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
            <div className="col-span-2"><Input label="Password (leave empty to generate a temporary one)" value={form.password} onChange={(v) => setForm({ ...form, password: v })} /></div>
            <div className="col-span-2 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setForm(null)}>Cancel</Btn><Btn onClick={create} disabled={!form.first_name || !form.last_name || !form.email}>Create</Btn></div>
          </div>
        )}
      </Modal>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit customer">
        {edit && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" value={edit.first_name} onChange={(v) => setEdit({ ...edit, first_name: v })} />
            <Input label="Last name" value={edit.last_name} onChange={(v) => setEdit({ ...edit, last_name: v })} />
            <Input label="Email" value={edit.email} onChange={(v) => setEdit({ ...edit, email: v })} />
            <Input label="Phone" value={edit.phone ?? ""} onChange={(v) => setEdit({ ...edit, phone: v })} />
            <div className="col-span-2"><Input label="New password (optional — logs the user out everywhere)" value={edit.password} onChange={(v) => setEdit({ ...edit, password: v })} /></div>
            <div className="col-span-2 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setEdit(null)}>Cancel</Btn><Btn onClick={save}>Save</Btn></div>
          </div>
        )}
      </Modal>
      <Modal open={!!created} onClose={() => setCreated(null)} title="Customer created">
        {created && (
          <div className="space-y-3 text-sm">
            <p>Login: <b>{created.email}</b></p>
            <p>Temporary password: <code className="rounded bg-gray-100 px-2 py-1 text-base">{created.temporary_password}</code></p>
            <p className="text-gray-500">{created.emailed ? "An email with these details was sent." : "Email is not configured — share these details with the customer yourself. This password is shown only once."}</p>
            <div className="flex justify-end"><Btn onClick={() => setCreated(null)}>Done</Btn></div>
          </div>
        )}
      </Modal>
      {toast}
    </div>
  );
}
