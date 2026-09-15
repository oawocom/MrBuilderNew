"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminTable, Badge, SearchInput } from "@/components/dashboard/table";
import { Btn, Input, KV, Modal, Select, Textarea, fmtDate, jobStatusColor, money, useToast } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Party { id: string; first_name: string; last_name: string; phone?: string | null }
interface Quote { id: string; version: number; total: number; platform_fee: number; contractor_net: number; status: string; generated_by: string; valid_until: string | null; line_items: { label: string; qty: number; unit_amount: number; amount: number }[] }
interface Job { id: string; request_code: string; title: string; service_category: string; kind: string; status: string; quote_total: number | null; contractor_net: number | null; platform_fee: number | null; tip: number; consumer_charged: number | null;
  location_city: string | null; location_address: string | null; created_at: string; updated_at: string; consumer?: Party; contractor?: Party | null; quotes?: Quote[]; covered_by: string | null; is_assessment: boolean; pause_reason: string | null; issue_reason: string | null; issue_text: string | null; return_visit_at: string | null; scheduled_start: string | null; auto_confirm_at: string | null }
interface Detail { job: Job; events: { event_type: string; from: string | null; to: string | null; actor_role: string | null; data: string; created_at: string }[]; dispute: { reason: string; status: string; decision: string | null; resolution: string | null } | null; evidence: { kind: string; url: string; note: string | null }[] }
interface Contractor { id: string; first_name: string; last_name: string; qualifications: { category: string; status: string }[]; locked: boolean }

const attention = ["dispute_open", "paused_safety", "no_match_waitlist", "quote_declined", "issue_reported"];
const filters = [{ value: "", label: "All" }, { value: "attention", label: "Needs attention" }, { value: "quote_ready,quote_declined,submitted,inspection_booked,inspection_done", label: "Quote stage" }, { value: "matching,no_match_waitlist,reassigning", label: "Matching" },
  { value: "assigned,en_route,arrived,in_progress,paused_safety", label: "In the field" }, { value: "awaiting_confirmation,issue_reported,dispute_open,dispute_rejected,return_visit_scheduled", label: "Completion" }, { value: "completed_paid,dispute_upheld", label: "Paid" }, { value: "cancelled_by_client,cancelled_by_contractor", label: "Cancelled" }];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("attention");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [nr, setNr] = useState<Record<string, string> | null>(null);
  const [customers, setCustomers] = useState<{ id: string; first_name: string; last_name: string; email: string }[]>([]);
  const [cats, setCats] = useState<{ slug: string; name: string }[]>([]);
  const { toast, show } = useToast();

  async function openNew() {
    const [c, k] = await Promise.all([api<{ id: string; first_name: string; last_name: string; email: string }[]>("/admin/customers?limit=100"), api<{ slug: string; name: string }[]>("/categories")]);
    setCustomers(c.data ?? []); setCats(k.data ?? []);
    setNr({ owner_id: "", service_category: "installation", quote_method: "instant", title: "", location_address: "", location_city: "", location_state: "", location_zip: "", mounting: "attached", structure_type: "louvered", width_ft: "", length_ft: "", height_ft: "", notes: "" });
  }
  async function createRequest() {
    if (!nr?.owner_id) return;
    const body: Record<string, unknown> = { owner_id: nr.owner_id, service_category: nr.service_category, quote_method: nr.quote_method, title: nr.title || undefined, location_address: nr.location_address || undefined, location_city: nr.location_city || undefined, location_state: nr.location_state || undefined, location_zip: nr.location_zip || undefined, mounting: nr.mounting || undefined, notes: nr.notes || undefined,
      width_ft: nr.width_ft ? Number(nr.width_ft) : undefined, length_ft: nr.length_ft ? Number(nr.length_ft) : undefined, height_ft: nr.height_ft ? Number(nr.height_ft) : undefined, pergola_spec: { structure_type: nr.structure_type } };
    const r = await api<Job>("/admin/jobs", { method: "POST", body });
    if (!r.success || !r.data) { show(r.error ?? "Failed", true); return; }
    show(`${r.data.request_code} created · ${r.data.status.replace(/_/g, " ")}`); setNr(null); load(); open(r.data.id);
  }

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: "100" });
    if (filter === "attention") params.set("attention", "1"); else if (filter) params.set("status", filter);
    if (q) params.set("q", q);
    const r = await api<Job[]>(`/admin/jobs2?${params}`);
    setJobs(r.data ?? []); setTotal(r.meta?.total ?? 0);
  }, [filter, q]);
  useEffect(() => { load(); }, [load]);

  async function open(id: string) {
    const [d, c] = await Promise.all([api<Detail>(`/admin/jobs2/${id}`), api<Contractor[]>("/admin/contractors?limit=100")]);
    if (d.data) setDetail(d.data);
    setContractors(c.data ?? []);
    setForm({});
  }
  async function act(path: string, body: unknown, ok: string) {
    const r = await api(`/admin/jobs/${detail!.job.id}/${path}`, { method: path === "dispute" ? "PATCH" : "POST", body });
    if (!r.success) { show(r.error ?? "Failed", true); return; }
    show(ok); open(detail!.job.id); load();
  }

  const j = detail?.job;
  const currentQuote = j?.quotes?.[0];
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Jobs" subtitle={`${total} request(s) · one ID across both apps`} actions={<Btn onClick={openNew}>+ New request for a customer</Btn>} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="Search by code, title, city…" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">{filters.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
      </div>
      <AdminTable headers={["Request", "Category", "Customer", "Contractor", "Total", "Net", "Status", "Updated"]}>
        {jobs.map((x) => (
          <tr key={x.id} onClick={() => open(x.id)} className="cursor-pointer hover:bg-gray-50">
            <td className="px-6 py-3"><div className="text-sm font-medium text-gray-900">{x.request_code}</div><div className="text-xs text-gray-500">{x.title}{x.covered_by && <span className="ml-2 rounded bg-emerald-50 px-1.5 text-emerald-700">MrCare</span>}{x.is_assessment && <span className="ml-2 rounded bg-purple-50 px-1.5 text-purple-700">assessment</span>}</div></td>
            <td className="px-6 py-3 text-sm capitalize">{x.service_category}</td>
            <td className="px-6 py-3 text-sm">{x.consumer ? `${x.consumer.first_name} ${x.consumer.last_name}` : "—"}</td>
            <td className="px-6 py-3 text-sm">{x.contractor ? `${x.contractor.first_name} ${x.contractor.last_name}` : "—"}</td>
            <td className="px-6 py-3 text-sm">{money(x.quote_total)}</td>
            <td className="px-6 py-3 text-sm">{money(x.contractor_net)}</td>
            <td className="px-6 py-3"><Badge color={jobStatusColor[x.status] ?? "gray"}>{x.status.replace(/_/g, " ")}</Badge></td>
            <td className="px-6 py-3 text-xs text-gray-500">{fmtDate(x.updated_at)}</td>
          </tr>
        ))}
      </AdminTable>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={j ? `${j.request_code} · ${j.title}` : ""} wide>
        {j && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-1">
              <div className="mb-2 flex items-center gap-2"><Badge color={jobStatusColor[j.status] ?? "gray"}>{j.status.replace(/_/g, " ")}</Badge>{attention.includes(j.status) && <Badge color="error">needs attention</Badge>}</div>
              <KV k="Category" v={<span className="capitalize">{j.service_category} · {j.kind}</span>} />
              <KV k="Customer" v={j.consumer ? `${j.consumer.first_name} ${j.consumer.last_name}` : "—"} />
              <KV k="Contractor" v={j.contractor ? `${j.contractor.first_name} ${j.contractor.last_name}` : "—"} />
              <KV k="Address" v={`${j.location_address ?? ""} ${j.location_city ?? ""}`} />
              <KV k="Quote total" v={money(j.quote_total)} />
              <KV k="Platform fee" v={money(j.platform_fee)} />
              <KV k="Contractor net" v={money(j.contractor_net)} />
              {j.tip > 0 && <KV k="Tip" v={money(j.tip)} />}
              {j.consumer_charged !== null && <KV k="Charged" v={money(j.consumer_charged)} />}
              {j.scheduled_start && <KV k="Scheduled" v={fmtDate(j.scheduled_start)} />}
              {j.auto_confirm_at && <KV k="Auto-confirms" v={fmtDate(j.auto_confirm_at)} />}
              {j.return_visit_at && <KV k="Return visit" v={fmtDate(j.return_visit_at)} />}
              {j.pause_reason && <KV k="Pause reason" v={j.pause_reason} />}
              {j.issue_reason && <KV k="Issue" v={`${j.issue_reason}: ${j.issue_text ?? ""}`} />}
              {detail?.dispute && <KV k="Dispute" v={`${detail.dispute.status} · ${detail.dispute.reason}`} />}
              {currentQuote && (
                <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs">
                  <div className="mb-1 font-semibold">Quote v{currentQuote.version} · {currentQuote.status} · {currentQuote.generated_by}</div>
                  {currentQuote.line_items.map((li, i) => <div key={i} className="flex justify-between"><span>{li.label} × {li.qty}</span><span>{money(li.amount)}</span></div>)}
                </div>
              )}
              {detail && detail.evidence.length > 0 && <div className="mt-3 text-xs text-gray-500">Evidence: {detail.evidence.map((e) => e.kind).join(", ")}</div>}
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Actions</h4>
              {["quote_ready", "quote_declined", "inspection_done", "submitted"].includes(j.status) && (
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase text-gray-500">Re-quote with adjustment</div>
                  <Input label="Adjustment label" value={form.adj_label ?? ""} onChange={(v) => setForm({ ...form, adj_label: v })} placeholder="e.g. Loyalty discount" />
                  <Input label="Amount (negative = discount)" type="number" value={form.adj_amount ?? ""} onChange={(v) => setForm({ ...form, adj_amount: v })} />
                  <div className="mt-2"><Btn small onClick={() => act("requote", { adjustments: form.adj_label ? [{ label: form.adj_label, amount: Number(form.adj_amount || 0) }] : [], note: form.adj_label }, "New quote version sent")}>Regenerate quote</Btn></div>
                </div>
              )}
              {["matching", "no_match_waitlist", "reassigning"].includes(j.status) && (
                <div className="rounded-lg border border-gray-200 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase text-gray-500">Assign contractor</div>
                  <Select value={form.contractor_id ?? ""} onChange={(v) => setForm({ ...form, contractor_id: v })} options={[{ value: "", label: "Choose…" }, ...contractors.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}${c.locked ? " (locked)" : ""} · ${c.qualifications.filter((x) => x.status === "qualified").map((x) => x.category).join(",") || "no quals"}` }))]} />
                  <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_assessment === "1"} onChange={(e) => setForm({ ...form, is_assessment: e.target.checked ? "1" : "" })} /> Supervised assessment job</label>
                  <div className="mt-2"><Btn small disabled={!form.contractor_id} onClick={() => act("assign", { contractor_id: form.contractor_id, is_assessment: form.is_assessment === "1" }, "Assigned")}>Assign</Btn></div>
                </div>
              )}
              {j.status === "dispute_open" && (
                <div className="rounded-lg border border-red-200 p-3">
                  <div className="mb-2 text-xs font-semibold uppercase text-red-600">Dispute decision</div>
                  <Textarea label="Resolution note (sent to both parties)" value={form.resolution ?? ""} onChange={(v) => setForm({ ...form, resolution: v })} />
                  <Input label="Return visit date/time (for 'rejected')" type="datetime-local" value={form.return_at ?? ""} onChange={(v) => setForm({ ...form, return_at: v })} />
                  <div className="mt-2 flex gap-2">
                    <Btn small kind="danger" disabled={!form.resolution} onClick={() => act("dispute", { decision: "rejected", resolution: form.resolution, return_visit_at: form.return_at ? new Date(form.return_at).toISOString() : undefined }, "Dispute rejected — contractor must return")}>Reject (contractor returns)</Btn>
                    <Btn small disabled={!form.resolution} onClick={() => act("dispute", { decision: "upheld", resolution: form.resolution }, "Dispute upheld — customer charged")}>Uphold (pay contractor)</Btn>
                  </div>
                </div>
              )}
              {!["quote_ready", "quote_declined", "inspection_done", "submitted", "matching", "no_match_waitlist", "reassigning", "dispute_open"].includes(j.status) && <p className="text-sm text-gray-500">No admin action in this status. The parties drive the next step from their apps.</p>}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Timeline</h4>
              <ol className="space-y-2 text-xs">
                {detail?.events.map((e, i) => (
                  <li key={i} className="border-l-2 border-gray-200 pl-3">
                    <div className="font-medium text-gray-800">{e.event_type.replace(/_/g, " ")} <span className="text-gray-400">· {e.actor_role}</span></div>
                    <div className="text-gray-500">{fmtDate(e.created_at)}{e.to && e.from !== e.to ? ` → ${e.to}` : ""}</div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={!!nr} onClose={() => setNr(null)} title="New request on behalf of a customer">
        {nr && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Select label="Customer" value={nr.owner_id} onChange={(v) => setNr({ ...nr, owner_id: v })} options={[{ value: "", label: "Choose…" }, ...customers.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name} · ${c.email}` }))]} /></div>
            <Select label="Service" value={nr.service_category} onChange={(v) => setNr({ ...nr, service_category: v })} options={cats.map((c) => ({ value: c.slug, label: c.name }))} />
            <Select label="Quote method" value={nr.quote_method} onChange={(v) => setNr({ ...nr, quote_method: v })} options={[{ value: "instant", label: "Instant quote (engine)" }, { value: "inspection", label: "Inspection first" }]} />
            <div className="col-span-2"><Input label="Title" value={nr.title} onChange={(v) => setNr({ ...nr, title: v })} placeholder="e.g. Backyard pergola" /></div>
            <div className="col-span-2"><Input label="Address" value={nr.location_address} onChange={(v) => setNr({ ...nr, location_address: v })} /></div>
            <Input label="City" value={nr.location_city} onChange={(v) => setNr({ ...nr, location_city: v })} />
            <Input label="State / ZIP" value={nr.location_state} onChange={(v) => setNr({ ...nr, location_state: v })} />
            <Select label="Mounting" value={nr.mounting} onChange={(v) => setNr({ ...nr, mounting: v })} options={[{ value: "attached", label: "Wall-attached" }, { value: "free_standing", label: "Free-standing" }]} />
            <Select label="Structure type" value={nr.structure_type} onChange={(v) => setNr({ ...nr, structure_type: v })} options={[{ value: "louvered", label: "Louvered" }, { value: "fixed_roof", label: "Fixed roof" }, { value: "retractable", label: "Retractable" }]} />
            <Input label="Width (ft)" type="number" value={nr.width_ft} onChange={(v) => setNr({ ...nr, width_ft: v })} />
            <Input label="Length (ft)" type="number" value={nr.length_ft} onChange={(v) => setNr({ ...nr, length_ft: v })} />
            <Input label="Height (ft)" type="number" value={nr.height_ft} onChange={(v) => setNr({ ...nr, height_ft: v })} />
            <Input label="Notes for the contractor" value={nr.notes} onChange={(v) => setNr({ ...nr, notes: v })} />
            <div className="col-span-2 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setNr(null)}>Cancel</Btn><Btn onClick={createRequest} disabled={!nr.owner_id}>Create & quote</Btn></div>
          </div>
        )}
      </Modal>
      {toast}
    </div>
  );
}
