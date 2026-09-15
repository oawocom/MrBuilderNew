"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminTable, Badge, SearchInput } from "@/components/dashboard/table";
import { Btn, Input, KV, Modal, Select, fmtDate, jobStatusColor, money, useToast } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Qual { category: string; status: string }
interface Contractor { id: string; email: string; first_name: string; last_name: string; phone: string | null; status: string; created_at: string; rating_avg: number; jobs_completed: number; city: string; state: string; balance: number; qualifications: Qual[]; locked: boolean; core_done: boolean; safety_done: boolean }
interface Training { lock: { locked: boolean; approved: boolean; core_done: boolean; safety_done: boolean; qualified: string[]; practical_pending: string[]; in_training: string[]; reasons: string[] }; progress: { lesson: string; completed_at: string | null; best_score: number | null; attempts: number | null }[] }
interface Cat { slug: string; name: string; requires_practical: boolean }

export default function ContractorsPage() {
  const [rows, setRows] = useState<Contractor[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sel, setSel] = useState<Contractor | null>(null);
  const [training, setTraining] = useState<Training | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [add, setAdd] = useState<Record<string, string> | null>(null);
  const [addCats, setAddCats] = useState<string[]>([]);
  const [created, setCreated] = useState<{ email: string; temporary_password: string; emailed: boolean } | null>(null);
  const { toast, show } = useToast();

  async function createContractor() {
    if (!add) return;
    const r = await api<{ temporary_password: string; emailed: boolean }>("/admin/users", { method: "POST", body: { role: "contractor", first_name: add.first_name, last_name: add.last_name, email: add.email, phone: add.phone || undefined, password: add.password || undefined, city: add.city || undefined, state: add.state || undefined, categories: addCats } });
    if (!r.success || !r.data) { show(r.error ?? "Failed", true); return; }
    setCreated({ email: add.email, temporary_password: r.data.temporary_password, emailed: r.data.emailed }); setAdd(null); setAddCats([]); load();
  }

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100" });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const [r, c] = await Promise.all([api<Contractor[]>(`/admin/contractors?${params}`), api<Cat[]>("/categories?all=1")]);
    setRows(r.data ?? []); setCats(c.data ?? []);
  }, [q, status]);
  useEffect(() => { load(); }, [load]);

  async function open(c: Contractor) {
    setSel(c); setForm({});
    const t = await api<Training>(`/admin/contractors/${c.id}/training`);
    setTraining(t.data ?? null);
  }
  async function refresh() {
    if (!sel) return;
    await load();
    const r = await api<Contractor[]>(`/admin/contractors?q=${encodeURIComponent(sel.email)}`);
    const c = (r.data ?? []).find((x) => x.id === sel.id);
    if (c) open(c);
  }
  async function setAccount(s: string) {
    const r = await api(`/admin/users/${sel!.id}/status`, { method: "PATCH", body: { status: s } });
    show(r.success ? `Account ${s}` : r.error ?? "Failed", !r.success); refresh();
  }
  async function setQual(category: string, st: string) {
    const r = await api(`/admin/contractors/${sel!.id}/qualifications/${category}`, { method: "PUT", body: { status: st } });
    show(r.success ? `${category} → ${st}` : r.error ?? "Failed", !r.success); refresh();
  }
  async function practical(result: string) {
    if (!form.p_cat) return;
    const r = await api(`/admin/contractors/${sel!.id}/practical`, { method: "POST", body: { category: form.p_cat, result, job_id: form.p_job || undefined, notes: form.p_notes || undefined } });
    show(r.success ? `Practical ${result} recorded` : r.error ?? "Failed", !r.success); refresh();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Contractors" subtitle="Approval, training state, qualifications and the supervised first job" actions={<Btn onClick={() => setAdd({ first_name: "", last_name: "", email: "", phone: "", city: "", state: "", password: "" })}>+ Add contractor</Btn>} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Search name or email…" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><option value="">All statuses</option><option value="pending">Pending approval</option><option value="active">Active</option><option value="suspended">Suspended</option></select>
      </div>
      <AdminTable headers={["Contractor", "Account", "Training", "Qualifications", "Jobs", "Balance", "Joined"]}>
        {rows.map((c) => (
          <tr key={c.id} onClick={() => open(c)} className="cursor-pointer hover:bg-gray-50">
            <td className="px-6 py-3"><div className="text-sm font-medium text-gray-900">{c.first_name} {c.last_name}</div><div className="text-xs text-gray-500">{c.email} · {c.city}{c.state ? `, ${c.state}` : ""}</div></td>
            <td className="px-6 py-3"><Badge color={jobStatusColor[c.status] ?? "gray"}>{c.status}</Badge></td>
            <td className="px-6 py-3"><Badge color={c.locked ? "warning" : "success"}>{c.locked ? "locked" : "active"}</Badge></td>
            <td className="px-6 py-3"><div className="flex flex-wrap gap-1">{c.qualifications.map((qq) => <Badge key={qq.category} color={jobStatusColor[qq.status] ?? "gray"}>{qq.category}: {qq.status.replace("_", " ")}</Badge>)}</div></td>
            <td className="px-6 py-3 text-sm">{c.jobs_completed} · ★ {Number(c.rating_avg).toFixed(1)}</td>
            <td className="px-6 py-3 text-sm">{money(c.balance)}</td>
            <td className="px-6 py-3 text-xs text-gray-500">{fmtDate(c.created_at)}</td>
          </tr>
        ))}
      </AdminTable>

      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? `${sel.first_name} ${sel.last_name}` : ""} wide>
        {sel && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div>
              <KV k="Email" v={sel.email} /><KV k="Phone" v={sel.phone ?? "—"} /><KV k="Account" v={<Badge color={jobStatusColor[sel.status]}>{sel.status}</Badge>} />
              <KV k="Jobs completed" v={sel.jobs_completed} /><KV k="Balance" v={money(sel.balance)} />
              <div className="mt-3 flex gap-2">
                {sel.status !== "active" && <Btn small onClick={() => setAccount("active")}>Approve / activate</Btn>}
                {sel.status === "active" && <Btn small kind="danger" onClick={() => setAccount("suspended")}>Suspend</Btn>}
              </div>
              {training && (
                <div className="mt-5 space-y-1 text-sm">
                  <div className="font-semibold">Training</div>
                  <KV k="Core" v={training.lock.core_done ? "✓ done" : "in progress"} />
                  <KV k="Safety" v={training.lock.safety_done ? "✓ done" : "in progress"} />
                  <KV k="Marketplace" v={training.lock.locked ? `locked: ${training.lock.reasons.join(", ")}` : "unlocked"} />
                  <details className="mt-2 text-xs text-gray-500"><summary>Lesson progress ({training.progress.length})</summary>
                    {training.progress.map((p) => <div key={p.lesson} className="flex justify-between"><span>{p.lesson}</span><span>{p.completed_at ? `✓ ${p.best_score ?? ""}%` : `${p.attempts ?? 0} attempts`}</span></div>)}
                  </details>
                </div>
              )}
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold">Qualifications</div>
              <div className="space-y-2">
                {cats.map((c) => {
                  const cur = sel.qualifications.find((x) => x.category === c.slug);
                  return (
                    <div key={c.slug} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
                      <div><span className="font-medium">{c.name}</span>{c.requires_practical && <span className="ml-1 text-xs text-gray-400">(practical)</span>}<div>{cur ? <Badge color={jobStatusColor[cur.status]}>{cur.status.replace("_", " ")}</Badge> : <span className="text-xs text-gray-400">not chosen</span>}</div></div>
                      <select value={cur?.status ?? ""} onChange={(e) => e.target.value && setQual(c.slug, e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-xs">
                        <option value="">set…</option><option value="training">training</option><option value="practical_pending">practical pending</option><option value="qualified">qualified</option><option value="revoked">revoked</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold">Record practical assessment</div>
              <div className="space-y-3">
                <Select label="Category" value={form.p_cat ?? ""} onChange={(v) => setForm({ ...form, p_cat: v })} options={[{ value: "", label: "Choose…" }, ...cats.filter((c) => c.requires_practical).map((c) => ({ value: c.slug, label: c.name }))]} />
                <Input label="Assessment job ID (optional)" value={form.p_job ?? ""} onChange={(v) => setForm({ ...form, p_job: v })} />
                <Input label="Notes" value={form.p_notes ?? ""} onChange={(v) => setForm({ ...form, p_notes: v })} />
                <div className="flex gap-2"><Btn small disabled={!form.p_cat} onClick={() => practical("pass")}>Pass</Btn><Btn small kind="danger" disabled={!form.p_cat} onClick={() => practical("fail")}>Fail</Btn></div>
                <p className="text-xs text-gray-400">Assign the supervised job from the Jobs page (tick "assessment"). A pass here activates the category.</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={!!add} onClose={() => setAdd(null)} title="Add contractor (pre-approved)">
        {add && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" value={add.first_name} onChange={(v) => setAdd({ ...add, first_name: v })} />
            <Input label="Last name" value={add.last_name} onChange={(v) => setAdd({ ...add, last_name: v })} />
            <Input label="Email" value={add.email} onChange={(v) => setAdd({ ...add, email: v })} />
            <Input label="Phone" value={add.phone} onChange={(v) => setAdd({ ...add, phone: v })} placeholder="+1…" />
            <Input label="City" value={add.city} onChange={(v) => setAdd({ ...add, city: v })} />
            <Input label="State" value={add.state} onChange={(v) => setAdd({ ...add, state: v })} />
            <div className="col-span-2"><Input label="Password (leave empty to generate a temporary one)" value={add.password} onChange={(v) => setAdd({ ...add, password: v })} /></div>
            <div className="col-span-2">
              <div className="mb-1 text-xs font-medium text-gray-600">Pre-qualified categories (skips training — use for vetted installers)</div>
              <div className="flex flex-wrap gap-2">{cats.map((c) => <label key={c.slug} className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-sm"><input type="checkbox" checked={addCats.includes(c.slug)} onChange={(e) => setAddCats(e.target.checked ? [...addCats, c.slug] : addCats.filter((x) => x !== c.slug))} />{c.name}</label>)}</div>
            </div>
            <div className="col-span-2 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setAdd(null)}>Cancel</Btn><Btn onClick={createContractor} disabled={!add.first_name || !add.last_name || !add.email}>Create</Btn></div>
          </div>
        )}
      </Modal>
      <Modal open={!!created} onClose={() => setCreated(null)} title="Contractor created">
        {created && (
          <div className="space-y-3 text-sm">
            <p>Login: <b>{created.email}</b></p>
            <p>Temporary password: <code className="rounded bg-gray-100 px-2 py-1 text-base">{created.temporary_password}</code></p>
            <p className="text-gray-500">{created.emailed ? "An email with these details was sent." : "Email is not configured — share these details yourself. Shown only once."}</p>
            <div className="flex justify-end"><Btn onClick={() => setCreated(null)}>Done</Btn></div>
          </div>
        )}
      </Modal>
      {toast}
    </div>
  );
}
