"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Btn, fmtDate, useToast } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Doc { id: string; type: string; title: string; job_id: string | null; request_code: string | null; url: string | null; payload: Record<string, unknown>; shared: boolean; created_at: string }
const labels: Record<string, string> = { invoice: "Invoices", receipt: "Receipts", certificate: "MrCare certificates", inspection_report: "Inspection reports", warranty: "Warranties", completion_photos: "Completion photos", order_receipt: "Store orders", other: "Other" };

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [type, setType] = useState("");
  const { toast, show } = useToast();
  const load = useCallback(async () => { const r = await api<Doc[]>(`/documents?limit=100${type ? `&type=${type}` : ""}`); setDocs(r.data ?? []); }, [type]);
  useEffect(() => { load(); }, [load]);

  async function share(d: Doc) {
    const r = await api<{ path: string }>(`/documents/${d.id}/share`, { method: "POST" });
    if (!r.success || !r.data) { show(r.error ?? "Failed", true); return; }
    const url = `${window.location.origin}${r.data.path}`;
    await navigator.clipboard?.writeText(url);
    show("Share link copied (valid 7 days)"); load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><h1 className="text-2xl font-semibold">Documents</h1><p className="text-sm text-gray-600">Invoices, certificates, reports and photo sets — kept for you automatically.</p></div>
      <div className="flex flex-wrap gap-2">{["", ...Object.keys(labels)].map((t) => <button key={t} onClick={() => setType(t)} className={`rounded-full px-3 py-1 text-sm ${type === t ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}>{t ? labels[t] : "All"}</button>)}</div>
      {docs.length === 0 && <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">Nothing here yet.</div>}
      <div className="grid gap-3 md:grid-cols-2">
        {docs.map((d) => (
          <div key={d.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3"><div><div className="text-xs uppercase text-gray-400">{labels[d.type] ?? d.type}</div><div className="font-medium text-gray-900">{d.title}</div><div className="text-xs text-gray-500">{fmtDate(d.created_at)}{d.job_id && <> · <Link href={`/profile/requests/${d.job_id}`} className="underline">{d.request_code ?? "request"}</Link></>}</div></div>
              <div className="flex gap-1">{d.url && <a href={d.url} target="_blank" className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700">Open</a>}<Btn small kind="secondary" onClick={() => share(d)}>{d.shared ? "Re-share" : "Share"}</Btn></div></div>
            {d.type === "invoice" && <div className="mt-2 text-sm">Amount: <b>${Number(d.payload.amount ?? 0).toFixed(2)}</b> · {d.payload.paid ? "paid" : "pending"}</div>}
            {d.type === "completion_photos" && Array.isArray(d.payload.photos) && <div className="mt-2 grid grid-cols-5 gap-1">{(d.payload.photos as string[]).slice(0, 5).map((u, i) => <a key={i} href={u} target="_blank" className="aspect-square overflow-hidden rounded bg-gray-100"><img src={u} alt="" className="h-full w-full object-cover" /></a>)}</div>}
            {d.type === "certificate" && <div className="mt-2 text-sm">{String(d.payload.plan ?? "")} · ${Number(d.payload.total ?? 0).toFixed(2)}/yr</div>}
          </div>
        ))}
      </div>
      {toast}
    </div>
  );
}
