"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Btn, Input, Modal, Select, useToast } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Pergola { id: string; name: string; address_line1: string | null; city: string | null; state: string | null; zip_code: string | null; structure_type: string | null; mounting: string | null; width_ft: number | null; length_ft: number | null; height_ft: number | null; brand: string | null; model: string | null; installed_at: string | null; coverage: { maintenance: { plan: string } | null; electronics: { plan: string } | null } }
interface Equipment { id: string; pergola_id: string; device_type: string; brand: string | null; model: string | null }
interface Reminder { id: string; pergola_id: string; kind: string; due_at: string; status: string }

const blank = { name: "", address_line1: "", city: "", state: "", zip_code: "", structure_type: "louvered", mounting: "attached", width_ft: "", length_ft: "", height_ft: "", brand: "", model: "", installed_at: "" };

export default function PergolasPage() {
  const [items, setItems] = useState<Pergola[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [edit, setEdit] = useState<(typeof blank & { id?: string }) | null>(null);
  const [eq, setEq] = useState<{ pergola_id: string; device_type: string; brand: string; model: string } | null>(null);
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    const [p, e, r] = await Promise.all([api<Pergola[]>("/pergolas"), api<Equipment[]>("/equipment"), api<Reminder[]>("/reminders")]);
    setItems(p.data ?? []); setEquipment(e.data ?? []); setReminders(r.data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!edit?.name) { show("Give the pergola a name", true); return; }
    const body = { ...edit, width_ft: edit.width_ft ? Number(edit.width_ft) : undefined, length_ft: edit.length_ft ? Number(edit.length_ft) : undefined, height_ft: edit.height_ft ? Number(edit.height_ft) : undefined, installed_at: edit.installed_at || undefined, brand: edit.brand || undefined, model: edit.model || undefined };
    const r = edit.id ? await api(`/pergolas/${edit.id}`, { method: "PATCH", body }) : await api("/pergolas", { method: "POST", body });
    show(r.success ? "Saved" : r.error ?? "Failed", !r.success); if (r.success) { setEdit(null); load(); }
  }
  async function remove(id: string) { if (!confirm("Remove this pergola?")) return; await api(`/pergolas/${id}`, { method: "DELETE" }); load(); }
  async function saveEq() {
    if (!eq) return;
    const r = await api("/equipment", { method: "POST", body: { ...eq, brand: eq.brand || undefined, model: eq.model || undefined } });
    show(r.success ? "Equipment registered" : r.error ?? "Failed", !r.success); if (r.success) { setEq(null); load(); }
  }
  async function reminder(id: string, action: string) { await api(`/reminders/${id}/${action}`, { method: "POST", body: { days: 30 } }); load(); }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold">My pergolas</h1><p className="text-sm text-gray-600">Installed by MrBuilder or added by you. Plans, reminders and equipment are per pergola.</p></div><Btn onClick={() => setEdit({ ...blank })}>+ Add pergola</Btn></div>
      {reminders.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Upcoming</p>
          {reminders.map((r) => <div key={r.id} className="mt-2 flex items-center justify-between text-sm text-amber-900"><span>{r.kind.replace(/_/g, " ")} · {items.find((p) => p.id === r.pergola_id)?.name} · due {r.due_at}</span><span className="flex gap-2"><Link href="/profile/requests/new" className="underline">Book</Link><button onClick={() => reminder(r.id, "snooze")} className="text-xs text-amber-700">snooze 30d</button><button onClick={() => reminder(r.id, "dismiss")} className="text-xs text-amber-700">dismiss</button></span></div>)}
        </div>
      )}
      {items.length === 0 && <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">No pergolas yet. A completed installation is added automatically — or add an existing one.</div>}
      {items.map((p) => (
        <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><h2 className="text-lg font-semibold">{p.name}</h2><p className="text-sm text-gray-600">{[p.address_line1, p.city, p.state].filter(Boolean).join(", ")}</p>
              <p className="mt-1 text-xs text-gray-500">{[p.structure_type?.replace("_", " "), p.mounting?.replace("_", " "), p.width_ft && p.length_ft ? `${p.width_ft}×${p.length_ft}×${p.height_ft ?? "?"} ft` : null, p.brand].filter(Boolean).join(" · ")}{p.installed_at ? ` · installed ${p.installed_at}` : ""}</p></div>
            <div className="flex gap-2"><Btn small kind="secondary" onClick={() => setEdit({ ...blank, ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? ""])), id: p.id } as typeof blank & { id: string })}>Edit</Btn><Btn small kind="ghost" onClick={() => remove(p.id)}>Remove</Btn></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-1 ${p.coverage?.maintenance ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>Maintenance: {p.coverage?.maintenance?.plan ?? "not covered"}</span>
            <span className={`rounded-full px-2.5 py-1 ${p.coverage?.electronics ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>Electronics: {p.coverage?.electronics?.plan ?? "not covered"}</span>
            {(!p.coverage?.maintenance || !p.coverage?.electronics) && <Link href="/profile/mrcare" className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">Get MrCare →</Link>}
          </div>
          <div className="mt-4 border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between"><p className="text-sm font-medium">Registered equipment</p><Btn small kind="secondary" onClick={() => setEq({ pergola_id: p.id, device_type: "motor", brand: "", model: "" })}>+ Register</Btn></div>
            <div className="mt-2 flex flex-wrap gap-2">{equipment.filter((e) => e.pergola_id === p.id).map((e) => <span key={e.id} className="rounded-full border border-gray-200 px-2.5 py-1 text-xs">{e.device_type.replace("_", " ")}{e.brand ? ` · ${e.brand} ${e.model ?? ""}` : ""}</span>)}{equipment.filter((e) => e.pergola_id === p.id).length === 0 && <span className="text-xs text-gray-400">None — register motors, lighting and controls for Electronics Protection.</span>}</div>
          </div>
        </div>
      ))}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit pergola" : "Add pergola"}>
        {edit && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Input label="Name" value={edit.name} onChange={(v) => setEdit({ ...edit, name: v })} placeholder="Backyard pergola" /></div>
            <div className="col-span-2"><Input label="Address" value={edit.address_line1} onChange={(v) => setEdit({ ...edit, address_line1: v })} /></div>
            <Input label="City" value={edit.city} onChange={(v) => setEdit({ ...edit, city: v })} /><Input label="State" value={edit.state} onChange={(v) => setEdit({ ...edit, state: v })} />
            <Select label="Structure" value={edit.structure_type} onChange={(v) => setEdit({ ...edit, structure_type: v })} options={[{ value: "louvered", label: "Louvered" }, { value: "fixed_roof", label: "Fixed roof" }, { value: "retractable", label: "Retractable" }]} />
            <Select label="Mounting" value={edit.mounting} onChange={(v) => setEdit({ ...edit, mounting: v })} options={[{ value: "attached", label: "Wall-attached" }, { value: "free_standing", label: "Free-standing" }]} />
            <Input label="Width ft" type="number" value={edit.width_ft} onChange={(v) => setEdit({ ...edit, width_ft: v })} /><Input label="Length ft" type="number" value={edit.length_ft} onChange={(v) => setEdit({ ...edit, length_ft: v })} />
            <Input label="Height ft" type="number" value={edit.height_ft} onChange={(v) => setEdit({ ...edit, height_ft: v })} /><Input label="Installed on" type="date" value={edit.installed_at} onChange={(v) => setEdit({ ...edit, installed_at: v })} />
            <Input label="Brand" value={edit.brand} onChange={(v) => setEdit({ ...edit, brand: v })} /><Input label="Model" value={edit.model} onChange={(v) => setEdit({ ...edit, model: v })} />
            <div className="col-span-2 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setEdit(null)}>Cancel</Btn><Btn onClick={save}>Save</Btn></div>
          </div>
        )}
      </Modal>
      <Modal open={!!eq} onClose={() => setEq(null)} title="Register equipment">
        {eq && (
          <div className="grid grid-cols-2 gap-4">
            <Select label="Type" value={eq.device_type} onChange={(v) => setEq({ ...eq, device_type: v })} options={["motor", "led_lighting", "fan", "electric_heater", "controller", "sensor", "speaker", "other"].map((t) => ({ value: t, label: t.replace("_", " ") }))} />
            <Input label="Brand" value={eq.brand} onChange={(v) => setEq({ ...eq, brand: v })} /><div className="col-span-2"><Input label="Model" value={eq.model} onChange={(v) => setEq({ ...eq, model: v })} /></div>
            <div className="col-span-2 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setEq(null)}>Cancel</Btn><Btn onClick={saveEq}>Register</Btn></div>
          </div>
        )}
      </Modal>
      {toast}
    </div>
  );
}
