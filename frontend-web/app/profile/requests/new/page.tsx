"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Btn, Input, Select, Textarea } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Cat { slug: string; name: string }
interface Pergola { id: string; name: string; address_line1: string | null; city: string | null; state: string | null; zip_code: string | null; structure_type: string | null; mounting: string | null; width_ft: number | null; length_ft: number | null; height_ft: number | null }

const enclosureTypes = [["screen", "Screen"], ["glass", "Glass panel"], ["privacy_wall", "Privacy wall"], ["louvered_wall", "Louvered side wall"], ["zip_shade", "Zip shade"]];
const accessoryTypes = [["led_lighting", "LED lighting"], ["fan", "Fan"], ["electric_heater", "Electric heater"], ["speaker", "Speaker"], ["motor_controls", "Motor / remote controls"]];

export default function NewRequest() {
  const router = useRouter();
  const [cats, setCats] = useState<Cat[]>([]);
  const [pergolas, setPergolas] = useState<Pergola[]>([]);
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ service_category: "installation", quote_method: "instant", pergola_id: "", title: "", location_address: "", location_city: "", location_state: "", location_zip: "", property_type: "residential",
    mounting: "attached", structure_type: "louvered", width_ft: "", length_ft: "", height_ft: "", footings_involved: true, footings_ready: true, footings_count: "4", enclosures: {} as Record<string, number>, accessories: {} as Record<string, number>,
    preferred_start_date: "", preferred_end_date: "", notes: "", issue_description: "", urgency: "medium" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Cat[]>("/categories").then((r) => setCats(r.data ?? []));
    api<Pergola[]>("/pergolas").then((r) => setPergolas(r.data ?? []));
  }, []);

  function pickPergola(id: string) {
    const p = pergolas.find((x) => x.id === id);
    setF({ ...f, pergola_id: id, ...(p ? { location_address: p.address_line1 ?? f.location_address, location_city: p.city ?? f.location_city, location_state: p.state ?? f.location_state, location_zip: p.zip_code ?? f.location_zip, mounting: p.mounting ?? f.mounting, structure_type: p.structure_type ?? f.structure_type, width_ft: p.width_ft ? String(p.width_ft) : f.width_ft, length_ft: p.length_ft ? String(p.length_ft) : f.length_ft, height_ft: p.height_ft ? String(p.height_ft) : f.height_ft } : {}) });
  }

  const isInstall = f.service_category === "installation";
  const isRepair = f.service_category === "repair";

  async function submit() {
    setErr(""); setBusy(true);
    const enclosures = Object.entries(f.enclosures).flatMap(([type, n]) => Array.from({ length: n }, () => ({ type })));
    const accessories = Object.entries(f.accessories).filter(([, n]) => n > 0).map(([type, qty]) => ({ type, qty }));
    const body = {
      service_category: f.service_category, quote_method: f.service_category === "inspection" ? "inspection" : f.quote_method, pergola_id: f.pergola_id || undefined, title: f.title || undefined,
      location_address: f.location_address || undefined, location_city: f.location_city || undefined, location_state: f.location_state || undefined, location_zip: f.location_zip || undefined, property_type: f.property_type,
      mounting: f.mounting, width_ft: f.width_ft ? Number(f.width_ft) : undefined, length_ft: f.length_ft ? Number(f.length_ft) : undefined, height_ft: f.height_ft ? Number(f.height_ft) : undefined,
      pergola_spec: { structure_type: f.structure_type, enclosures, accessories, footings: { involved: f.footings_involved, ready: f.footings_ready, count: Number(f.footings_count || 0) } },
      preferred_start_date: f.preferred_start_date || undefined, preferred_end_date: f.preferred_end_date || undefined, notes: f.notes || undefined,
      issue_description: isRepair ? f.issue_description || undefined : undefined, urgency: isRepair ? f.urgency : undefined,
    };
    const r = await api<{ id: string }>("/jobs", { method: "POST", body });
    setBusy(false);
    if (!r.success || !r.data) { setErr(r.error ?? "Could not submit"); return; }
    router.replace(`/profile/requests/${r.data.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-semibold text-gray-900">New request</h1><p className="text-sm text-gray-600">Step {step} of 3 · {step === 1 ? "What do you need" : step === 2 ? "Your pergola" : "Schedule & notes"}</p></div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {cats.map((c) => <button key={c.slug} onClick={() => setF({ ...f, service_category: c.slug })} className={`rounded-lg border p-3 text-left text-sm font-medium ${f.service_category === c.slug ? "border-brand-500 bg-brand-50 text-brand-800" : "border-gray-200 hover:bg-gray-50"}`}>{c.name}</button>)}
            </div>
            {f.service_category !== "inspection" && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setF({ ...f, quote_method: "instant" })} className={`rounded-lg border p-4 text-left ${f.quote_method === "instant" ? "border-brand-500 bg-brand-50" : "border-gray-200"}`}><div className="font-semibold">Instant quote</div><div className="text-xs text-gray-600">Priced from your details right now</div></button>
                <button onClick={() => setF({ ...f, quote_method: "inspection" })} className={`rounded-lg border p-4 text-left ${f.quote_method === "inspection" ? "border-brand-500 bg-brand-50" : "border-gray-200"}`}><div className="font-semibold">Inspection first</div><div className="text-xs text-gray-600">A PRO measures on site · $99, credited to the job if you approve the quote</div></button>
              </div>
            )}
            {isRepair && <><Textarea label="What's wrong?" value={f.issue_description} onChange={(v) => setF({ ...f, issue_description: v })} /><Select label="Urgency" value={f.urgency} onChange={(v) => setF({ ...f, urgency: v })} options={[{ value: "low", label: "Low — whenever" }, { value: "medium", label: "Medium — this week" }, { value: "high", label: "High — same day if possible" }]} /></>}
            <Input label="Give it a name (optional)" value={f.title} onChange={(v) => setF({ ...f, title: v })} placeholder="e.g. Backyard pergola" />
            <div className="flex justify-end"><Btn onClick={() => setStep(2)}>Continue</Btn></div>
          </>
        )}
        {step === 2 && (
          <>
            {pergolas.length > 0 && <Select label="Which pergola?" value={f.pergola_id} onChange={pickPergola} options={[{ value: "", label: "New / not saved yet" }, ...pergolas.map((p) => ({ value: p.id, label: `${p.name} · ${p.city ?? ""}` }))]} />}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Input label="Address" value={f.location_address} onChange={(v) => setF({ ...f, location_address: v })} /></div>
              <Input label="City" value={f.location_city} onChange={(v) => setF({ ...f, location_city: v })} />
              <div className="grid grid-cols-2 gap-3"><Input label="State" value={f.location_state} onChange={(v) => setF({ ...f, location_state: v })} /><Input label="ZIP" value={f.location_zip} onChange={(v) => setF({ ...f, location_zip: v })} /></div>
              <Select label="Property" value={f.property_type} onChange={(v) => setF({ ...f, property_type: v })} options={[{ value: "residential", label: "Residential" }, { value: "commercial", label: "Commercial" }, { value: "hoa", label: "HOA" }, { value: "government", label: "Government" }]} />
              <Select label="Structure type" value={f.structure_type} onChange={(v) => setF({ ...f, structure_type: v })} options={[{ value: "louvered", label: "Louvered roof" }, { value: "fixed_roof", label: "Fixed roof" }, { value: "retractable", label: "Retractable" }]} />
              <Select label="Mounting" value={f.mounting} onChange={(v) => setF({ ...f, mounting: v })} options={[{ value: "attached", label: "Wall-attached" }, { value: "free_standing", label: "Free-standing" }]} />
              <div className="grid grid-cols-3 gap-3"><Input label="Width ft" type="number" value={f.width_ft} onChange={(v) => setF({ ...f, width_ft: v })} /><Input label="Length ft" type="number" value={f.length_ft} onChange={(v) => setF({ ...f, length_ft: v })} /><Input label="Height ft" type="number" value={f.height_ft} onChange={(v) => setF({ ...f, height_ft: v })} /></div>
            </div>
            {isInstall && (
              <>
                <div className="rounded-lg bg-gray-50 p-3 text-sm">
                  <div className="font-medium">Footings</div>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={f.footings_involved} onChange={(e) => setF({ ...f, footings_involved: e.target.checked })} /> Footings involved</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={f.footings_ready} onChange={(e) => setF({ ...f, footings_ready: e.target.checked })} /> Already in place</label>
                    <input type="number" value={f.footings_count} onChange={(e) => setF({ ...f, footings_count: e.target.value })} className="w-20 rounded border border-gray-300 px-2 py-1" /> <span className="text-gray-500">count</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">MrBuilder contractors don't build footings — if they aren't ready, prep is priced separately.</p>
                </div>
                <div><div className="mb-1 text-xs font-medium text-gray-600">Side enclosures (per side)</div><div className="grid grid-cols-2 gap-2 md:grid-cols-3">{enclosureTypes.map(([k, l]) => <Counter key={k} label={l} value={f.enclosures[k] ?? 0} onChange={(n) => setF({ ...f, enclosures: { ...f.enclosures, [k]: n } })} />)}</div></div>
                <div><div className="mb-1 text-xs font-medium text-gray-600">Accessories (mounting only — no electrical work)</div><div className="grid grid-cols-2 gap-2 md:grid-cols-3">{accessoryTypes.map(([k, l]) => <Counter key={k} label={l} value={f.accessories[k] ?? 0} onChange={(n) => setF({ ...f, accessories: { ...f.accessories, [k]: n } })} />)}</div></div>
              </>
            )}
            <div className="flex justify-between"><Btn kind="secondary" onClick={() => setStep(1)}>Back</Btn><Btn onClick={() => setStep(3)}>Continue</Btn></div>
          </>
        )}
        {step === 3 && (
          <>
            <div className="grid grid-cols-2 gap-3"><Input label="Earliest start" type="date" value={f.preferred_start_date} onChange={(v) => setF({ ...f, preferred_start_date: v })} /><Input label="Latest start" type="date" value={f.preferred_end_date} onChange={(v) => setF({ ...f, preferred_end_date: v })} /></div>
            <Textarea label="Notes for the contractor (gate code, pets, parking…)" value={f.notes} onChange={(v) => setF({ ...f, notes: v })} />
            {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
            <div className="flex justify-between"><Btn kind="secondary" onClick={() => setStep(2)}>Back</Btn><Btn onClick={submit} disabled={busy}>{busy ? "Submitting…" : f.quote_method === "inspection" || f.service_category === "inspection" ? "Book inspection" : "Get my quote"}</Btn></div>
          </>
        )}
      </div>
    </div>
  );
}

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
      <span>{label}</span>
      <span className="flex items-center gap-2"><button onClick={() => onChange(Math.max(0, value - 1))} className="h-6 w-6 rounded bg-gray-100">−</button><span className="w-4 text-center">{value}</span><button onClick={() => onChange(value + 1)} className="h-6 w-6 rounded bg-gray-100">+</button></span>
    </div>
  );
}

