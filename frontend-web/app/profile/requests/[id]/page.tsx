"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/dashboard/table";
import { Btn, Input, Modal, Select, Textarea, fmtDate, jobStatusColor, money, useToast } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Party { id: string; first_name: string; last_name: string; phone?: string | null; avatar_url?: string | null }
interface Quote { id: string; version: number; status: string; total: number; inspection_credit: number; valid_until: string | null; line_items: { label: string; qty: number; unit_amount: number; amount: number }[]; adjustments: { label: string; amount: number }[] }
interface Job { id: string; request_code: string; title: string; service_category: string; kind: string; status: string; quote_total: number | null; tip: number; consumer_charged: number | null; inspection_fee: number; inspection_fee_credit: number;
  location_address: string | null; location_city: string | null; scheduled_start: string | null; return_visit_at: string | null; auto_confirm_at: string | null; en_route_eta_minutes: number | null; pause_reason: string | null; completion_note: string | null;
  contractor?: Party | null; quotes?: Quote[]; inspection_report?: { findings: string | null; photos: { url: string; label?: string }[]; pdf_url: string | null } | null; images: string[]; covered_by: string | null; reschedule_pending_by: string | null; created_at: string }
interface Ev { id: string; event_type: string; to_status: string | null; created_at: string; actor_role: string | null }
interface Evidence { kind: string; url: string; note: string | null; created_at: string }
interface Summary { name: string; rating_avg: number; ratings_count: number; jobs_completed: number; qualified_categories: string[]; member_since: string }

const stages = ["Submitted", "Quote", "Contractor", "Work", "Done"];
function stageIndex(s: string) {
  if (["submitted", "inspection_booked", "inspection_done", "quote_generating"].includes(s)) return 0;
  if (["quote_ready", "quote_declined"].includes(s)) return 1;
  if (["matching", "no_match_waitlist", "assigned", "reassigning"].includes(s)) return 2;
  if (["completed_paid", "dispute_upheld"].includes(s)) return 4;
  return 3;
}

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [j, setJ] = useState<Job | null>(null);
  const [events, setEvents] = useState<Ev[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [modal, setModal] = useState<"decline" | "confirm" | "issue" | "reschedule" | "cancel" | null>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const [cancelInfo, setCancelInfo] = useState<{ fee_amount: number; fee_pct: number; blocked: boolean } | null>(null);
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    const r = await api<Job>(`/jobs/${id}`);
    if (!r.data) return;
    setJ(r.data);
    api<Ev[]>(`/jobs/${id}/events`).then((e) => setEvents(e.data ?? []));
    api<{ items: Evidence[] }>(`/jobs/${id}/evidence`).then((e) => setEvidence(e.data?.items ?? []));
    if (r.data.contractor) api<Summary>(`/contractors/${r.data.contractor.id}/summary`).then((s) => setSummary(s.data ?? null));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function act(path: string, body: unknown, ok: string, method = "POST") {
    const r = await api(`/jobs/${id}/${path}`, { method, body });
    if (!r.success) { show(r.error ?? "Something went wrong", true); return; }
    show(ok); setModal(null); setF({}); load();
  }
  async function openCancel() {
    const r = await api<{ fee_amount: number; fee_pct: number; blocked: boolean }>(`/jobs/${id}/cancel-preview`);
    setCancelInfo(r.data ?? null); setModal("cancel");
  }

  if (!j) return <div className="text-sm text-gray-500">Loading…</div>;
  const quote = j.quotes?.[0];
  const si = stageIndex(j.status);
  const completion = evidence.filter((e) => e.kind === "completion");
  const before = evidence.filter((e) => ["area", "product", "damage"].includes(e.kind));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/profile" className="text-sm text-gray-500 hover:underline">← My requests</Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="text-xs text-gray-500">{j.request_code} · <span className="capitalize">{j.service_category}</span> · {fmtDate(j.created_at)}</div><h1 className="text-2xl font-semibold text-gray-900">{j.title}</h1><div className="text-sm text-gray-600">{j.location_address}, {j.location_city}</div></div>
        <Badge color={jobStatusColor[j.status] ?? "gray"}>{j.status.replace(/_/g, " ")}</Badge>
      </div>

      <ol className="flex items-center gap-2 text-xs">
        {stages.map((s, i) => <li key={s} className="flex items-center gap-2"><span className={`flex h-6 w-6 items-center justify-center rounded-full ${i <= si ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-500"}`}>{i + 1}</span><span className={i <= si ? "font-medium text-gray-900" : "text-gray-400"}>{s}</span>{i < stages.length - 1 && <span className="mx-1 h-px w-6 bg-gray-300" />}</li>)}
      </ol>

      {/* Quote */}
      {j.status === "quote_ready" && quote && (
        <div className="rounded-xl border border-brand-200 bg-white p-6">
          <div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold">Your quote</h2><p className="text-xs text-gray-500">v{quote.version}{quote.valid_until ? ` · valid until ${fmtDate(quote.valid_until)}` : ""}</p></div><div className="text-2xl font-semibold">{money(quote.total)}</div></div>
          <div className="mt-4 divide-y divide-gray-100 text-sm">{quote.line_items.map((li, i) => <div key={i} className="flex justify-between py-1.5"><span>{li.label}{li.qty !== 1 ? ` × ${li.qty}` : ""}</span><span>{money(li.amount)}</span></div>)}
            {quote.inspection_credit > 0 && <div className="flex justify-between py-1.5 text-emerald-700"><span>Inspection fee credited</span><span>−{money(quote.inspection_credit)}</span></div>}
          </div>
          <p className="mt-3 text-xs text-gray-500">You're charged only after you confirm the completed work. Price is set by MrBuilder; the contractor cannot change it.</p>
          <div className="mt-4 flex gap-2"><Btn onClick={() => act("quote/approve", {}, "Quote approved — finding your contractor")}>Approve quote</Btn><Btn kind="secondary" onClick={() => setModal("decline")}>Decline</Btn></div>
        </div>
      )}
      {j.status === "quote_declined" && <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">You declined this quote. <Link href="/profile/requests/new" className="text-brand-700 underline">Start a new request</Link> if your needs change.</div>}
      {j.status === "no_match_waitlist" && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No qualified contractor is available in your area yet. You're on the waitlist and we'll notify you the moment one is.</div>}

      {/* Contractor */}
      {j.contractor && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">{j.contractor.first_name[0]}{j.contractor.last_name[0]}</span>
            <div className="flex-1"><div className="font-semibold">{summary?.name ?? `${j.contractor.first_name} ${j.contractor.last_name[0]}.`} <span className="ml-1 rounded bg-brand-50 px-1.5 text-xs text-brand-700">PRO</span></div>
              <div className="text-xs text-gray-500">{summary ? `★ ${summary.rating_avg.toFixed(1)} (${summary.ratings_count}) · ${summary.jobs_completed} jobs · ${summary.qualified_categories.join(", ")}` : ""}</div></div>
            {j.status === "en_route" && j.en_route_eta_minutes && <div className="text-sm font-medium text-blue-700">On the way · ~{j.en_route_eta_minutes} min</div>}
            {j.status === "paused_safety" && <div className="text-sm font-medium text-red-700">Paused: {j.pause_reason}</div>}
          </div>
          {(j.scheduled_start || j.return_visit_at) && <div className="mt-3 text-sm text-gray-700">{j.return_visit_at ? `Return visit: ${fmtDate(j.return_visit_at)}` : `Scheduled: ${fmtDate(j.scheduled_start)}`}{j.reschedule_pending_by && <span className="ml-2 text-xs text-amber-700">· reschedule proposed by {j.reschedule_pending_by}</span>}</div>}
          {["assigned", "dispute_rejected", "return_visit_scheduled"].includes(j.status) && <div className="mt-3"><Btn small kind="secondary" onClick={() => setModal("reschedule")}>Propose another time</Btn></div>}
        </div>
      )}

      {/* Confirmation */}
      {j.status === "awaiting_confirmation" && (
        <div className="rounded-xl border border-orange-200 bg-white p-6">
          <h2 className="text-lg font-semibold">The contractor marked this job complete</h2>
          {j.completion_note && <p className="mt-1 text-sm text-gray-700">"{j.completion_note}"</p>}
          {completion.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-5">{completion.map((e, i) => <a key={i} href={e.url} target="_blank" className="block aspect-square overflow-hidden rounded-lg bg-gray-100"><img src={e.url} alt="" className="h-full w-full object-cover" /></a>)}</div>}
          <p className="mt-3 text-xs text-gray-500">Confirming releases payment of {money(j.quote_total)}{j.inspection_fee_credit ? ` (minus ${money(j.inspection_fee_credit)} inspection credit)` : ""}.{j.auto_confirm_at ? ` Auto-confirms ${fmtDate(j.auto_confirm_at)} if no action.` : ""}</p>
          <div className="mt-4 flex gap-2"><Btn onClick={() => setModal("confirm")}>Confirm & pay</Btn><Btn kind="secondary" onClick={() => setModal("issue")}>Report an issue</Btn></div>
        </div>
      )}
      {["completed_paid", "dispute_upheld"].includes(j.status) && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Completed · charged {money(j.consumer_charged)}{j.tip ? ` incl. ${money(j.tip)} tip` : ""}. Invoice and photos are in <Link href="/profile/documents" className="underline">Documents</Link>.</div>}

      {/* Inspection report */}
      {j.inspection_report && <div className="rounded-xl border border-gray-200 bg-white p-5"><h3 className="font-semibold">Inspection report</h3>{j.inspection_report.findings && <p className="mt-1 text-sm text-gray-700">{j.inspection_report.findings}</p>}<div className="mt-2 flex gap-2">{(j.inspection_report.photos ?? []).map((p, i) => <a key={i} href={p.url} target="_blank" className="h-16 w-16 overflow-hidden rounded bg-gray-100"><img src={p.url} alt={p.label} className="h-full w-full object-cover" /></a>)}</div>{j.inspection_report.pdf_url && <a href={j.inspection_report.pdf_url} className="mt-2 inline-block text-sm text-brand-700 underline">Download PDF</a>}</div>}

      {/* Before-work photos */}
      {before.length > 0 && <div className="rounded-xl border border-gray-200 bg-white p-5"><h3 className="font-semibold">Before-work photos <span className="text-xs font-normal text-gray-500">taken by your contractor before starting</span></h3><div className="mt-2 grid grid-cols-4 gap-2 md:grid-cols-6">{before.map((e, i) => <a key={i} href={e.url} target="_blank" title={e.note ?? e.kind} className={`block aspect-square overflow-hidden rounded-lg bg-gray-100 ${e.kind === "damage" ? "ring-2 ring-red-400" : ""}`}><img src={e.url} alt="" className="h-full w-full object-cover" /></a>)}</div></div>}

      {/* Timeline */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-semibold">Timeline</h3>
        <ol className="mt-2 space-y-1 text-sm">{events.map((e) => <li key={e.id} className="flex justify-between"><span className="text-gray-700">{e.event_type.replace(/_/g, " ")}</span><span className="text-xs text-gray-400">{fmtDate(e.created_at)}</span></li>)}</ol>
      </div>

      {!["completed_paid", "dispute_upheld", "cancelled_by_client", "cancelled_by_contractor", "quote_declined", "awaiting_confirmation", "dispute_open"].includes(j.status) && <div className="text-right"><button onClick={openCancel} className="text-xs text-gray-400 hover:text-red-600">Cancel this request</button></div>}

      <Modal open={modal === "decline"} onClose={() => setModal(null)} title="Decline quote">
        <Select label="Reason" value={f.reason ?? "too_expensive"} onChange={(v) => setF({ ...f, reason: v })} options={[{ value: "too_expensive", label: "Too expensive" }, { value: "changed_mind", label: "Changed my mind" }, { value: "found_elsewhere", label: "Found another option" }, { value: "other", label: "Other" }]} />
        <div className="mt-4 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setModal(null)}>Back</Btn><Btn kind="danger" onClick={() => act("quote/decline", { reason: f.reason ?? "too_expensive" }, "Quote declined")}>Decline</Btn></div>
      </Modal>
      <Modal open={modal === "confirm"} onClose={() => setModal(null)} title="Confirm & pay">
        <p className="text-sm text-gray-700">Total {money(j.quote_total)}. Add a tip for your contractor? 100% goes to them.</p>
        <div className="mt-3 flex gap-2">{[0, 20, 50, 100].map((t) => <button key={t} onClick={() => setF({ ...f, tip: String(t) })} className={`rounded-lg border px-3 py-1.5 text-sm ${(f.tip ?? "0") === String(t) ? "border-brand-500 bg-brand-50" : "border-gray-200"}`}>{t ? money(t) : "No tip"}</button>)}</div>
        <div className="mt-4 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setModal(null)}>Back</Btn><Btn onClick={() => act("confirm", { tip: Number(f.tip ?? 0) }, "Thank you — payment released")}>Confirm & pay {money((j.quote_total ?? 0) - j.inspection_fee_credit + Number(f.tip ?? 0))}</Btn></div>
      </Modal>
      <Modal open={modal === "issue"} onClose={() => setModal(null)} title="Report an issue">
        <Select label="What's wrong?" value={f.reason ?? "incomplete"} onChange={(v) => setF({ ...f, reason: v })} options={[{ value: "incomplete", label: "Work incomplete" }, { value: "damage", label: "Something was damaged" }, { value: "quality", label: "Quality problem" }, { value: "not_as_quoted", label: "Not what was quoted" }, { value: "other", label: "Other" }]} />
        <div className="mt-3"><Textarea label="Details" value={f.text ?? ""} onChange={(v) => setF({ ...f, text: v })} /></div>
        <p className="mt-2 text-xs text-gray-500">Payment stays on hold. The contractor can fix it or dispute; MrBuilder reviews disputes.</p>
        <div className="mt-4 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setModal(null)}>Back</Btn><Btn kind="danger" onClick={() => act("issue", { reason: f.reason ?? "incomplete", text: f.text }, "Issue reported")}>Send report</Btn></div>
      </Modal>
      <Modal open={modal === "reschedule"} onClose={() => setModal(null)} title="Propose another time">
        <Input label="Proposed start" type="datetime-local" value={f.start ?? ""} onChange={(v) => setF({ ...f, start: v })} />
        <div className="mt-3"><Input label="Message (optional)" value={f.msg ?? ""} onChange={(v) => setF({ ...f, msg: v })} /></div>
        <p className="mt-2 text-xs text-gray-500">Your current appointment stays until the contractor accepts.</p>
        <div className="mt-4 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setModal(null)}>Back</Btn><Btn disabled={!f.start} onClick={() => act("reschedule", { kind: j.return_visit_at ? "return" : "start", proposed_start: new Date(f.start).toISOString(), message: f.msg || undefined }, "Proposal sent")}>Send</Btn></div>
      </Modal>
      <Modal open={modal === "cancel"} onClose={() => setModal(null)} title="Cancel request">
        {cancelInfo?.blocked ? <p className="text-sm text-red-700">This request can't be cancelled right now.</p> : <p className="text-sm text-gray-700">{cancelInfo && cancelInfo.fee_amount > 0 ? `A cancellation fee of ${money(cancelInfo.fee_amount)} (${cancelInfo.fee_pct}%) applies.` : "No fee applies."}</p>}
        <div className="mt-3"><Select label="Reason" value={f.reason ?? "changed_mind"} onChange={(v) => setF({ ...f, reason: v })} options={[{ value: "changed_mind", label: "Changed my mind" }, { value: "schedule", label: "Scheduling" }, { value: "price", label: "Price" }, { value: "other", label: "Other" }]} /></div>
        <div className="mt-4 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setModal(null)}>Keep it</Btn>{!cancelInfo?.blocked && <Btn kind="danger" onClick={() => act("cancel", { reason: f.reason ?? "changed_mind" }, "Request cancelled", "PATCH")}>Cancel request</Btn>}</div>
      </Modal>
      {toast}
    </div>
  );
}
