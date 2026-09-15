"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminTable, Badge } from "@/components/dashboard/table";
import { Btn, Input, Modal, fmtDate, jobStatusColor, useToast } from "@/components/admin/ui";
import { api, getUser } from "@/lib/api";

interface Admin { id: string; email: string; first_name: string; last_name: string; phone: string | null; status: string; last_login_at: string | null; created_at: string }

export default function TeamPage() {
  const [rows, setRows] = useState<Admin[]>([]);
  const [add, setAdd] = useState<Record<string, string> | null>(null);
  const [reset, setReset] = useState<{ a: Admin; pw: string } | null>(null);
  const [created, setCreated] = useState<{ email: string; pw: string } | null>(null);
  const me = getUser();
  const { toast, show } = useToast();
  const load = useCallback(async () => { const r = await api<Admin[]>("/admin/team"); setRows(r.data ?? []); }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!add) return;
    const r = await api<{ temporary_password: string }>("/admin/users", { method: "POST", body: { role: "admin", first_name: add.first_name, last_name: add.last_name, email: add.email, phone: add.phone || undefined, password: add.password || undefined } });
    if (!r.success || !r.data) { show(r.error ?? "Failed", true); return; }
    setCreated({ email: add.email, pw: r.data.temporary_password }); setAdd(null); load();
  }
  async function doReset() {
    if (!reset || reset.pw.length < 8) { show("Min 8 characters", true); return; }
    const r = await api(`/admin/users/${reset.a.id}`, { method: "PATCH", body: { password: reset.pw } });
    show(r.success ? "Password updated" : r.error ?? "Failed", !r.success); setReset(null);
  }
  async function setStatus(a: Admin, s: string) {
    if (a.id === me?.id) { show("You can't change your own status", true); return; }
    const r = await api(`/admin/users/${a.id}/status`, { method: "PATCH", body: { status: s } });
    show(r.success ? `Account ${s}` : r.error ?? "Failed", !r.success); load();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Team" subtitle="Admin accounts for this panel" actions={<Btn onClick={() => setAdd({ first_name: "", last_name: "", email: "", phone: "", password: "" })}>+ Add admin</Btn>} />
      <AdminTable headers={["Admin", "Status", "Last login", "Added", ""]}>
        {rows.map((a) => (
          <tr key={a.id} className="hover:bg-gray-50">
            <td className="px-6 py-3"><div className="text-sm font-medium">{a.first_name} {a.last_name}{a.id === me?.id && <span className="ml-2 text-xs text-gray-400">(you)</span>}</div><div className="text-xs text-gray-500">{a.email}{a.phone ? ` · ${a.phone}` : ""}</div></td>
            <td className="px-6 py-3"><Badge color={jobStatusColor[a.status]}>{a.status}</Badge></td>
            <td className="px-6 py-3 text-xs text-gray-500">{fmtDate(a.last_login_at)}</td>
            <td className="px-6 py-3 text-xs text-gray-500">{fmtDate(a.created_at)}</td>
            <td className="px-6 py-3"><div className="flex gap-2">
              <Btn small kind="secondary" onClick={() => setReset({ a, pw: "" })}>Reset password</Btn>
              {a.id !== me?.id && (a.status === "active" ? <Btn small kind="danger" onClick={() => setStatus(a, "suspended")}>Suspend</Btn> : <Btn small onClick={() => setStatus(a, "active")}>Activate</Btn>)}
            </div></td>
          </tr>
        ))}
      </AdminTable>
      <Modal open={!!add} onClose={() => setAdd(null)} title="Add admin">
        {add && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" value={add.first_name} onChange={(v) => setAdd({ ...add, first_name: v })} />
            <Input label="Last name" value={add.last_name} onChange={(v) => setAdd({ ...add, last_name: v })} />
            <Input label="Email" value={add.email} onChange={(v) => setAdd({ ...add, email: v })} />
            <Input label="Phone" value={add.phone} onChange={(v) => setAdd({ ...add, phone: v })} />
            <div className="col-span-2"><Input label="Password (empty = generate)" value={add.password} onChange={(v) => setAdd({ ...add, password: v })} /></div>
            <div className="col-span-2 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setAdd(null)}>Cancel</Btn><Btn onClick={create} disabled={!add.first_name || !add.last_name || !add.email}>Create</Btn></div>
          </div>
        )}
      </Modal>
      <Modal open={!!reset} onClose={() => setReset(null)} title={reset ? `Reset password · ${reset.a.email}` : ""}>
        {reset && <div className="space-y-4"><Input label="New password" value={reset.pw} onChange={(v) => setReset({ ...reset, pw: v })} /><div className="flex justify-end gap-2"><Btn kind="secondary" onClick={() => setReset(null)}>Cancel</Btn><Btn onClick={doReset}>Update</Btn></div></div>}
      </Modal>
      <Modal open={!!created} onClose={() => setCreated(null)} title="Admin created">
        {created && <div className="space-y-3 text-sm"><p>Login: <b>{created.email}</b></p><p>Temporary password: <code className="rounded bg-gray-100 px-2 py-1 text-base">{created.pw}</code></p><p className="text-gray-500">Shown only once.</p><div className="flex justify-end"><Btn onClick={() => setCreated(null)}>Done</Btn></div></div>}
      </Modal>
      {toast}
    </div>
  );
}
