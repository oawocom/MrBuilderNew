"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/dashboard/table";
import { Btn, useToast } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Lead { id: string; kind: "contractor" | "consumer" | "partner"; name: string; email: string; phone: string; company: string; payload: Record<string, unknown>; status: string; notes: string; created_at: string }
const KINDS = [["", "All"], ["consumer", "Service requests"], ["contractor", "Contractor waitlist"], ["partner", "Partnership inquiries"]];
const STATUSES = ["new", "contacted", "converted", "closed"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]); const [counts, setCounts] = useState<Record<string, number>>({}); const [kind, setKind] = useState(""); const [status, setStatus] = useState(""); const [q, setQ] = useState(""); const [open, setOpen] = useState<Lead | null>(null); const [notes, setNotes] = useState("");
  const { toast, show } = useToast();
  const load = useCallback(async () => { const r = await api<{ leads: Lead[]; counts: Record<string, number> }>(`/admin/leads?kind=${kind}&status=${status}&q=${encodeURIComponent(q)}`); setLeads(r.data?.leads ?? []); setCounts(r.data?.counts ?? {}); }, [kind, status, q]);
  useEffect(() => { load(); }, [load]);
  async function update(id: string, body: { status?: string; notes?: string }) { const r = await api(`/admin/leads/${id}`, { method: "PATCH", body }); show(r.success ? "Updated" : r.error ?? "Failed", !r.success); load(); }
  const fmt = (v: unknown) => Array.isArray(v) ? v.join(", ") : typeof v === "object" && v ? JSON.stringify(v) : String(v ?? "");
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Website leads" subtitle={`${counts.new ?? 0} new · ${counts.consumer ?? 0} service requests · ${counts.contractor ?? 0} contractors · ${counts.partner ?? 0} partners`} />
      <div className="flex flex-wrap items-center gap-2">
        {KINDS.map(([k, l]) => <button key={k} onClick={() => setKind(k)} className={`rounded-full border px-3 py-1 text-sm ${kind === k ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white"}`}>{l}</button>)}
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 text-sm"><option value="">Any status</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, company" className="rounded-lg border border-gray-300 px-3 py-1 text-sm" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-3 py-2">Received</th><th className="px-3 py-2">Kind</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Summary</th><th className="px-3 py-2">Status</th><th className="px-3 py-2"></th></tr></thead>
          <tbody>{leads.map((l) => <tr key={l.id} className="border-t border-gray-100"><td className="px-3 py-2 whitespace-nowrap text-gray-500">{new Date(l.created_at).toLocaleString()}</td><td className="px-3 py-2 capitalize">{l.kind}</td><td className="px-3 py-2 font-medium">{l.name || "—"}{l.company && <div className="text-xs text-gray-500">{l.company}</div>}</td><td className="px-3 py-2"><a href={`mailto:${l.email}`} className="text-orange-700">{l.email}</a>{l.phone && <div className="text-xs text-gray-500">{l.phone}</div>}</td><td className="px-3 py-2 max-w-md truncate text-gray-600">{fmt(l.payload.desc ?? l.payload.services ?? l.payload.servicesNeeded ?? l.payload.city ?? "")}</td><td className="px-3 py-2"><select value={l.status} onChange={(e) => update(l.id, { status: e.target.value })} className="rounded border border-gray-300 px-1 py-0.5 text-xs">{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></td><td className="px-3 py-2"><Btn small onClick={() => { setOpen(l); setNotes(l.notes); }}>Details</Btn></td></tr>)}{leads.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">No leads yet.</td></tr>}</tbody></table>
      </div>
      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(null)}><div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}><div className="mb-3 flex items-start justify-between"><div><h2 className="text-lg font-semibold">{open.name || open.email}</h2><div className="text-sm text-gray-500 capitalize">{open.kind} · {new Date(open.created_at).toLocaleString()}</div></div><button onClick={() => setOpen(null)} className="text-gray-400">✕</button></div>
        <dl className="grid grid-cols-3 gap-x-3 gap-y-1 text-sm">{[["Email", open.email], ["Phone", open.phone], ["Company", open.company], ...Object.entries(open.payload).filter(([k]) => !["email", "phone", "company", "name", "contact", "submittedAt", "source"].includes(k)).map(([k, v]) => [k.replace(/([A-Z])/g, " $1"), fmt(v)])].filter(([, v]) => v).map(([k, v]) => <div key={k as string} className="contents"><dt className="text-gray-500 capitalize">{k}</dt><dd className="col-span-2 break-words">{v as string}</dd></div>)}</dl>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes" rows={3} className="mt-4 w-full rounded-lg border border-gray-300 p-2 text-sm" /><div className="mt-2 flex justify-end gap-2"><Btn onClick={() => { update(open.id, { notes }); setOpen(null); }}>Save notes</Btn></div></div></div>}
      {toast}
    </div>
  );
}
