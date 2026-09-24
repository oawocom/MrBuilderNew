"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/dashboard/table";
import { Btn, useToast } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface T { subject: string; title: string; body: string; cta: string; audience: string; group: string; enabled: boolean }
interface Outbox { id: string; to: string; event: string; subject: string; status: string; attempts: number; error: string; created_at: string }
const API = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
const VARS = "{{name}} {{job_code}} {{job_title}} {{contractor}} {{amount}} {{city}} {{eta}} {{deadline}} {{proposed}} {{plan}} {{pergola}} {{order}} {{inviter}}";

export default function EmailsPage() {
  const [tpl, setTpl] = useState<Record<string, T>>({}); const [def, setDef] = useState<Record<string, T>>({}); const [smtp, setSmtp] = useState(false); const [counts, setCounts] = useState<Record<string, number>>({}); const [sel, setSel] = useState(""); const [draft, setDraft] = useState<T | null>(null); const [tab, setTab] = useState<"templates" | "outbox">("templates"); const [outbox, setOutbox] = useState<Outbox[]>([]); const [testTo, setTestTo] = useState(""); const [nonce, setNonce] = useState(0);
  const { toast, show } = useToast();
  const load = useCallback(async () => { const r = await api<{ templates: Record<string, T>; defaults: Record<string, T>; smtp_enabled: boolean; outbox: Record<string, number> }>("/admin/emails/templates"); setTpl(r.data?.templates ?? {}); setDef(r.data?.defaults ?? {}); setSmtp(!!r.data?.smtp_enabled); setCounts(r.data?.outbox ?? {}); if (!sel) { const first = Object.keys(r.data?.templates ?? {}).sort()[0]; setSel(first); setDraft(r.data?.templates?.[first] ?? null); } }, [sel]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === "outbox") api<Outbox[]>("/admin/emails/outbox").then((r) => setOutbox(r.data ?? [])); }, [tab]);
  const groups = Object.entries(tpl).reduce<Record<string, string[]>>((a, [k, v]) => { (a[v.group] ??= []).push(k); return a; }, {});
  async function save() { if (!draft) return; const r = await api("/admin/emails/templates", { method: "PUT", body: { ...Object.fromEntries(Object.entries(tpl).filter(([k]) => JSON.stringify(tpl[k]) !== JSON.stringify(def[k]))), [sel]: draft } }); show(r.success ? "Saved" : r.error ?? "Failed", !r.success); setTpl({ ...tpl, [sel]: draft }); setNonce((n) => n + 1); }
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Email templates" subtitle={`${smtp ? "SMTP enabled — emails are being sent" : "SMTP not enabled — emails are queued and sent once Integrations → Email is switched on"} · queue: ${counts.pending ?? 0} pending, ${counts.sent ?? 0} sent, ${counts.failed ?? 0} failed`} />
      <div className="flex gap-2">{(["templates", "outbox"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-full border px-3 py-1 text-sm capitalize ${tab === t ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white"}`}>{t}</button>)}</div>
      {tab === "templates" && <div className="grid gap-6 lg:grid-cols-[260px_1fr_1fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-2">{Object.entries(groups).sort().map(([g, keys]) => <div key={g} className="mb-2"><div className="px-2 py-1 text-[11px] font-bold uppercase text-gray-400">{g}</div>{keys.sort().map((k) => <button key={k} onClick={() => { setSel(k); setDraft(tpl[k]); }} className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm ${sel === k ? "bg-orange-50 text-orange-800" : "hover:bg-gray-50"}`}><span>{k.replace(/_/g, " ")}</span>{!tpl[k].enabled && <span className="text-[10px] text-gray-400">off</span>}</button>)}</div>)}</div>
        {draft && <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between"><div><div className="font-semibold">{sel.replace(/_/g, " ")}</div><div className="text-xs text-gray-500">to: {draft.audience}</div></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />Enabled</label></div>
          {(["subject", "title", "body", "cta"] as const).map((f) => <label key={f} className="block"><span className="text-xs font-semibold uppercase text-gray-500">{f}</span>{f === "body" ? <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={6} className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm" /> : <input value={draft[f]} onChange={(e) => setDraft({ ...draft, [f]: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />}</label>)}
          <div className="text-xs text-gray-500">Placeholders: <code>{VARS}</code></div>
          <div className="flex flex-wrap items-center gap-2"><Btn onClick={save}>Save</Btn><Btn small onClick={() => { setDraft(def[sel]); }}>Reset to default</Btn><input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@email.com" className="rounded-lg border border-gray-300 px-2 py-1 text-sm" /><Btn small onClick={async () => { const r = await api("/admin/emails/test", { method: "POST", body: { event: sel, to: testTo } }); show(r.success ? "Test email sent" : r.error ?? "Failed", !r.success); }}>Send test</Btn></div>
        </div>}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100"><div className="border-b border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">Preview (saved version)</div><iframe key={sel + nonce} title="preview" src={`${API}/emails/preview?event=${sel}&t=${nonce}`} className="h-[720px] w-full bg-white" /></div>
      </div>}
      {tab === "outbox" && <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white"><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-3 py-2">Queued</th><th className="px-3 py-2">To</th><th className="px-3 py-2">Event</th><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Status</th></tr></thead><tbody>{outbox.map((o) => <tr key={o.id} className="border-t border-gray-100"><td className="px-3 py-2 whitespace-nowrap text-gray-500">{new Date(o.created_at).toLocaleString()}</td><td className="px-3 py-2">{o.to}</td><td className="px-3 py-2">{o.event}</td><td className="px-3 py-2 max-w-md truncate">{o.subject}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${o.status === "sent" ? "bg-green-50 text-green-700" : o.status === "failed" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"}`}>{o.status}</span>{o.error && <div className="max-w-xs truncate text-xs text-red-500" title={o.error}>{o.error}</div>}</td></tr>)}{outbox.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400">Nothing queued yet.</td></tr>}</tbody></table></div>}
      {toast}
    </div>
  );
}
