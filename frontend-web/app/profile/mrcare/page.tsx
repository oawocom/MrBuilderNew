"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn, Modal, Select, Textarea, fmtDate, money, useToast } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Plan { id: string; offering: string; slug: string; name: string; annual_price: number; visits_per_year: number; features: string[] }
interface Addon { id: string; offering: string; slug: string; name: string; annual_price: number }
interface Sub { id: string; offering: string; plan: string; status: string; pergola_ids: string[]; price_total: number; visits_per_year: number; visits_used: number; claims_used: number; renew_at: string | null }
interface Pergola { id: string; name: string }
interface Equipment { id: string; pergola_id: string; device_type: string; brand: string | null }

export default function MrCarePage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [pergolas, setPergolas] = useState<Pergola[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [buy, setBuy] = useState<{ offering: string; plan: string; pergola_ids: string[]; addons: string[]; consent: boolean; quote?: { total: number; lines: { label: string; amount: number }[] } } | null>(null);
  const [book, setBook] = useState<{ sub: Sub; pergola_id: string; visit_type: string; notes: string } | null>(null);
  const [claim, setClaim] = useState<{ sub: Sub; pergola_id: string; equipment_id: string; issue_code: string; notes: string; priority: string } | null>(null);
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    const [p, h, g, e] = await Promise.all([api<{ plans: Plan[]; addons: Addon[] }>("/mrcare/plans"), api<{ subscriptions: Sub[] }>("/mrcare"), api<Pergola[]>("/pergolas"), api<Equipment[]>("/equipment")]);
    setPlans(p.data?.plans ?? []); setAddons(p.data?.addons ?? []); setSubs(h.data?.subscriptions ?? []); setPergolas(g.data ?? []); setEquipment(e.data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function quote(b: NonNullable<typeof buy>) {
    if (!b.pergola_ids.length) { setBuy({ ...b, quote: undefined }); return; }
    const addonMap: Record<string, string[]> = {};
    b.pergola_ids.forEach((id) => { addonMap[id] = b.addons; });
    const r = await api<{ total: number; lines: { label: string; amount: number }[] }>("/mrcare/quote", { method: "POST", body: { offering: b.offering, plan: b.plan, pergola_ids: b.pergola_ids, addons: addonMap } });
    setBuy({ ...b, quote: r.data });
  }
  async function purchase() {
    if (!buy) return;
    const addonMap: Record<string, string[]> = {};
    buy.pergola_ids.forEach((id) => { addonMap[id] = buy.addons; });
    const r = await api("/mrcare/subscriptions", { method: "POST", body: { offering: buy.offering, plan: buy.plan, pergola_ids: buy.pergola_ids, addons: addonMap, consent: buy.consent } });
    show(r.success ? "Plan active — certificate saved to Documents" : r.error ?? "Failed", !r.success); if (r.success) { setBuy(null); load(); }
  }
  async function doBook() {
    if (!book) return;
    const r = await api<{ job_id: string }>("/mrcare/bookings", { method: "POST", body: { subscription_id: book.sub.id, pergola_id: book.pergola_id, visit_type: book.visit_type, notes: book.notes || undefined } });
    show(r.success ? "Visit requested — we're finding a technician" : r.error ?? "Failed", !r.success); if (r.success) { setBook(null); load(); }
  }
  async function doClaim() {
    if (!claim) return;
    const r = await api("/mrcare/claims", { method: "POST", body: { subscription_id: claim.sub.id, pergola_id: claim.pergola_id, equipment_id: claim.equipment_id || undefined, issue_code: claim.issue_code, notes: claim.notes || undefined, priority: claim.priority } });
    show(r.success ? "Claim submitted — under review" : r.error ?? "Failed", !r.success); if (r.success) { setClaim(null); load(); }
  }
  async function cancel(s: Sub) { if (!confirm("Cancel this plan? It stays active until the renewal date.")) return; await api(`/mrcare/subscriptions/${s.id}`, { method: "DELETE", body: { reason: "customer" } }); load(); }

  const active = subs.filter((s) => s.status === "active");
  const pname = (id: string) => pergolas.find((p) => p.id === id)?.name ?? "pergola";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div><h1 className="text-2xl font-semibold">MrCare</h1><p className="text-sm text-gray-600">Maintenance plans and electronics protection, per pergola.</p></div>
      {pergolas.length === 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Add a pergola first (My pergolas) — plans are attached to a pergola.</div>}

      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Your plans</h2>
          {active.map((s) => (
            <div key={s.id} className="rounded-xl border border-emerald-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><div className="font-semibold capitalize">{s.offering === "maintenance" ? "Service & Maintenance" : "Electronics Protection"} · {plans.find((p) => p.slug === s.plan)?.name ?? s.plan}</div>
                  <div className="text-xs text-gray-500">{s.pergola_ids.map(pname).join(", ")} · {money(s.price_total)}/yr · renews {fmtDate(s.renew_at)}</div>
                  <div className="mt-1 text-xs text-gray-600">{s.offering === "maintenance" ? `${s.visits_per_year - s.visits_used} of ${s.visits_per_year} visits left this year` : `${s.claims_used} claim(s) used this year`}</div></div>
                <div className="flex gap-2">
                  {s.offering === "maintenance" ? <Btn small onClick={() => setBook({ sub: s, pergola_id: s.pergola_ids[0], visit_type: "seasonal", notes: "" })} disabled={s.visits_used >= s.visits_per_year}>Book a visit</Btn> : <Btn small onClick={() => setClaim({ sub: s, pergola_id: s.pergola_ids[0], equipment_id: "", issue_code: "not_powering", notes: "", priority: "normal" })}>Report an issue</Btn>}
                  <Btn small kind="ghost" onClick={() => cancel(s)}>Cancel</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(["maintenance", "electronics"] as const).map((off) => {
        const covered = active.some((s) => s.offering === off);
        return (
          <div key={off}>
            <h2 className="text-lg font-semibold">{off === "maintenance" ? "Service & Maintenance" : "Electronics Protection"}</h2>
            <p className="mb-3 text-sm text-gray-600">{off === "maintenance" ? "Scheduled visits by a qualified PRO: louvers, drainage, hardware, motors." : "Covers registered motors, lighting, controls and sensors. A $99 pre-inspection registers your equipment; a small service-call fee applies per claim."}</p>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.filter((p) => p.offering === off).map((p) => (
                <div key={p.slug} className="flex flex-col rounded-xl border border-gray-200 bg-white p-5">
                  <div className="font-semibold">{p.name}</div>
                  <div className="mt-1 text-2xl font-semibold">{money(p.annual_price)}<span className="text-sm font-normal text-gray-500">/yr per pergola</span></div>
                  <ul className="mt-3 flex-1 space-y-1 text-sm text-gray-600">{(p.features ?? []).map((f) => <li key={f}>· {f}</li>)}</ul>
                  <div className="mt-4"><Btn small disabled={covered || pergolas.length === 0} onClick={() => { const b = { offering: off, plan: p.slug, pergola_ids: pergolas.map((x) => x.id).slice(0, 1), addons: [], consent: false }; setBuy(b); quote(b); }}>{covered ? "Already covered" : "Choose"}</Btn></div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <Modal open={!!buy} onClose={() => setBuy(null)} title="Set up your plan">
        {buy && (
          <div className="space-y-4">
            <div><div className="mb-1 text-xs font-medium text-gray-600">Pergolas to cover</div>
              <div className="flex flex-wrap gap-2">{pergolas.map((p) => <label key={p.id} className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-sm"><input type="checkbox" checked={buy.pergola_ids.includes(p.id)} onChange={(e) => { const b = { ...buy, pergola_ids: e.target.checked ? [...buy.pergola_ids, p.id] : buy.pergola_ids.filter((x) => x !== p.id) }; setBuy(b); quote(b); }} />{p.name}</label>)}</div></div>
            <div><div className="mb-1 text-xs font-medium text-gray-600">Add-ons (per pergola)</div>
              <div className="flex flex-wrap gap-2">{addons.filter((a) => a.offering === buy.offering).map((a) => <label key={a.slug} className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-sm"><input type="checkbox" checked={buy.addons.includes(a.slug)} onChange={(e) => { const b = { ...buy, addons: e.target.checked ? [...buy.addons, a.slug] : buy.addons.filter((x) => x !== a.slug) }; setBuy(b); quote(b); }} />{a.name} · {money(a.annual_price)}</label>)}</div></div>
            {buy.quote && <div className="rounded-lg bg-gray-50 p-3 text-sm">{buy.quote.lines.map((l, i) => <div key={i} className="flex justify-between"><span>{l.label}</span><span>{money(l.amount)}</span></div>)}<div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-semibold"><span>Per year</span><span>{money(buy.quote.total)}</span></div></div>}
            <label className="flex items-start gap-2 text-xs text-gray-600"><input type="checkbox" checked={buy.consent} onChange={(e) => setBuy({ ...buy, consent: e.target.checked })} className="mt-0.5" /> I agree to the MrCare terms: yearly billing, renews automatically, cancel any time (active until renewal).</label>
            <div className="flex justify-end gap-2"><Btn kind="secondary" onClick={() => setBuy(null)}>Cancel</Btn><Btn onClick={purchase} disabled={!buy.consent || !buy.pergola_ids.length}>Activate plan{buy.quote ? ` · ${money(buy.quote.total)}` : ""}</Btn></div>
          </div>
        )}
      </Modal>
      <Modal open={!!book} onClose={() => setBook(null)} title="Book a maintenance visit">
        {book && (
          <div className="space-y-4">
            <Select label="Pergola" value={book.pergola_id} onChange={(v) => setBook({ ...book, pergola_id: v })} options={book.sub.pergola_ids.map((id) => ({ value: id, label: pname(id) }))} />
            <Select label="Visit type" value={book.visit_type} onChange={(v) => setBook({ ...book, visit_type: v })} options={[{ value: "seasonal", label: "Seasonal check" }, { value: "pre_winter", label: "Pre-winter" }, { value: "post_winter", label: "Post-winter" }, { value: "inspection", label: "Inspection" }]} />
            <Textarea label="Anything the technician should know?" value={book.notes} onChange={(v) => setBook({ ...book, notes: v })} />
            <p className="text-xs text-gray-500">Covered by your plan — no charge. A technician will be matched and you'll see the visit under My requests.</p>
            <div className="flex justify-end gap-2"><Btn kind="secondary" onClick={() => setBook(null)}>Cancel</Btn><Btn onClick={doBook}>Request visit</Btn></div>
          </div>
        )}
      </Modal>
      <Modal open={!!claim} onClose={() => setClaim(null)} title="Report an electronics issue">
        {claim && (
          <div className="space-y-4">
            <Select label="Pergola" value={claim.pergola_id} onChange={(v) => setClaim({ ...claim, pergola_id: v, equipment_id: "" })} options={claim.sub.pergola_ids.map((id) => ({ value: id, label: pname(id) }))} />
            <Select label="Equipment" value={claim.equipment_id} onChange={(v) => setClaim({ ...claim, equipment_id: v })} options={[{ value: "", label: "Not sure / not registered" }, ...equipment.filter((e) => e.pergola_id === claim.pergola_id).map((e) => ({ value: e.id, label: `${e.device_type.replace("_", " ")}${e.brand ? ` · ${e.brand}` : ""}` }))]} />
            <Select label="What's happening?" value={claim.issue_code} onChange={(v) => setClaim({ ...claim, issue_code: v })} options={[{ value: "not_powering", label: "Not powering on" }, { value: "intermittent", label: "Works intermittently" }, { value: "noise", label: "Unusual noise" }, { value: "remote_unresponsive", label: "Remote / app unresponsive" }, { value: "water_ingress", label: "Water ingress" }, { value: "other", label: "Other" }]} />
            <Select label="Priority" value={claim.priority} onChange={(v) => setClaim({ ...claim, priority: v })} options={[{ value: "low", label: "Low" }, { value: "normal", label: "Normal" }, { value: "high", label: "High" }]} />
            <Textarea label="Details" value={claim.notes} onChange={(v) => setClaim({ ...claim, notes: v })} />
            <p className="text-xs text-gray-500">Submitting a claim doesn't guarantee coverage — MrBuilder reviews it first. A service-call fee applies when a technician visits.</p>
            <div className="flex justify-end gap-2"><Btn kind="secondary" onClick={() => setClaim(null)}>Cancel</Btn><Btn onClick={doClaim}>Submit claim</Btn></div>
          </div>
        )}
      </Modal>
      {toast}
    </div>
  );
}
