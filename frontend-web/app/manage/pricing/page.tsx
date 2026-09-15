"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminTable, Badge } from "@/components/dashboard/table";
import { Btn, Input, Modal, Select, Toggle, money, useToast } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Rule { id: string; service_category: string; component: string; code: string | null; structure_type: string | null; amount: number; unit: string; label: string | null; is_active: boolean }
interface Plan { id: string; offering: string; slug: string; name: string; annual_price: number; visits_per_year: number; features: string[]; sort_order: number; is_active: boolean }
interface Addon { id: string; offering: string; slug: string; name: string; annual_price: number; sort_order: number; is_active: boolean }
interface Cat { slug: string; name: string }

const components = ["base", "per_sqft", "mounting", "enclosure", "accessory", "footing_not_ready", "height_over_10ft", "urgency", "per_hour", "relocation"];
const units = ["flat", "per_sqft", "per_unit", "per_side", "per_hour"];
const empty: Partial<Rule> = { service_category: "installation", component: "base", code: "", structure_type: "", amount: 0, unit: "flat", label: "", is_active: true };
const offerings = [{ value: "maintenance", label: "Service & Maintenance" }, { value: "electronics", label: "Electronics Protection" }];

export default function PricingPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [cat, setCat] = useState("installation");
  const [edit, setEdit] = useState<Partial<Rule> | null>(null);
  const [planEdit, setPlanEdit] = useState<Partial<Plan> | null>(null);
  const [addonEdit, setAddonEdit] = useState<Partial<Addon> | null>(null);
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    const [r, c, p] = await Promise.all([api<Rule[]>("/admin/pricing-rules?all=1"), api<Cat[]>("/categories?all=1"), api<{ plans: Plan[]; addons: Addon[] }>("/mrcare/plans")]);
    setRules(r.data ?? []); setCats(c.data ?? []); setPlans(p.data?.plans ?? []); setAddons(p.data?.addons ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function saveRule() {
    if (!edit) return;
    const body = { ...edit, code: edit.code || null, structure_type: edit.structure_type || null, label: edit.label || null, amount: Number(edit.amount) };
    const r = edit.id ? await api(`/admin/pricing-rules/${edit.id}`, { method: "PUT", body }) : await api("/admin/pricing-rules", { method: "POST", body });
    if (!r.success) { show(r.error ?? "Failed", true); return; }
    show("Rule saved"); setEdit(null); load();
  }
  async function deactivate(id: string) { await api(`/admin/pricing-rules/${id}`, { method: "DELETE" }); load(); }
  async function savePlan() {
    if (!planEdit?.slug) return;
    const body = { ...planEdit, annual_price: Number(planEdit.annual_price), visits_per_year: Number(planEdit.visits_per_year ?? 0), sort_order: Number(planEdit.sort_order ?? 0), features: planEdit.features ?? [] };
    const r = await api(`/admin/mrcare/plans/${planEdit.slug}`, { method: "PUT", body });
    if (!r.success) { show(r.error ?? "Failed", true); return; }
    show("Plan saved"); setPlanEdit(null); load();
  }
  async function saveAddon() {
    if (!addonEdit?.slug) return;
    const r = await api(`/admin/mrcare/addons/${addonEdit.slug}`, { method: "PUT", body: { ...addonEdit, annual_price: Number(addonEdit.annual_price), sort_order: Number(addonEdit.sort_order ?? 0) } });
    if (!r.success) { show(r.error ?? "Failed", true); return; }
    show("Add-on saved"); setAddonEdit(null); load();
  }

  const shown = rules.filter((r) => r.service_category === cat);
  return (
    <div className="space-y-8">
      <AdminPageHeader title="Pricing" subtitle="Rate table the quote engine sums for every request. Quote = matching active rules + admin adjustments." actions={<Btn onClick={() => setEdit({ ...empty, service_category: cat })}>+ Add rule</Btn>} />
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => <button key={c.slug} onClick={() => setCat(c.slug)} className={`rounded-full px-3 py-1 text-sm ${cat === c.slug ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{c.name}</button>)}
      </div>
      <AdminTable headers={["Component", "Code", "Structure", "Amount", "Unit", "Label", "Status", ""]}>
        {shown.map((r) => (
          <tr key={r.id} className={`hover:bg-gray-50 ${!r.is_active ? "opacity-50" : ""}`}>
            <td className="px-6 py-3 font-mono text-xs">{r.component}</td>
            <td className="px-6 py-3 text-sm">{r.code ?? "—"}</td>
            <td className="px-6 py-3 text-sm">{r.structure_type ?? "any"}</td>
            <td className="px-6 py-3 text-sm font-medium">{money(r.amount)}</td>
            <td className="px-6 py-3 text-sm">{r.unit}</td>
            <td className="px-6 py-3 text-sm text-gray-600">{r.label}</td>
            <td className="px-6 py-3"><Badge color={r.is_active ? "success" : "gray"}>{r.is_active ? "active" : "inactive"}</Badge></td>
            <td className="px-6 py-3 text-right"><div className="flex justify-end gap-2"><Btn small kind="secondary" onClick={() => setEdit(r)}>Edit</Btn>{r.is_active && <Btn small kind="danger" onClick={() => deactivate(r.id)}>Deactivate</Btn>}</div></td>
          </tr>
        ))}
      </AdminTable>

      <div>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">MrCare plans</h2><Btn kind="secondary" onClick={() => setPlanEdit({ offering: "maintenance", slug: "", name: "", annual_price: 0, visits_per_year: 1, features: [], sort_order: 0, is_active: true })}>+ Plan</Btn></div>
        <AdminTable headers={["Offering", "Plan", "Price / yr", "Visits", "Features", ""]}>
          {plans.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-6 py-3 text-sm capitalize">{p.offering}</td>
              <td className="px-6 py-3 text-sm font-medium">{p.name} <span className="font-mono text-xs text-gray-400">{p.slug}</span></td>
              <td className="px-6 py-3 text-sm">{money(p.annual_price)}</td>
              <td className="px-6 py-3 text-sm">{p.visits_per_year}</td>
              <td className="px-6 py-3 text-xs text-gray-600">{(p.features ?? []).join(" · ")}</td>
              <td className="px-6 py-3 text-right"><Btn small kind="secondary" onClick={() => setPlanEdit(p)}>Edit</Btn></td>
            </tr>
          ))}
        </AdminTable>
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">MrCare add-ons</h2><Btn kind="secondary" onClick={() => setAddonEdit({ offering: "maintenance", slug: "", name: "", annual_price: 0, sort_order: 0, is_active: true })}>+ Add-on</Btn></div>
        <AdminTable headers={["Offering", "Add-on", "Price / yr", ""]}>
          {addons.map((a) => (
            <tr key={a.id} className="hover:bg-gray-50">
              <td className="px-6 py-3 text-sm capitalize">{a.offering}</td>
              <td className="px-6 py-3 text-sm font-medium">{a.name} <span className="font-mono text-xs text-gray-400">{a.slug}</span></td>
              <td className="px-6 py-3 text-sm">{money(a.annual_price)}</td>
              <td className="px-6 py-3 text-right"><Btn small kind="secondary" onClick={() => setAddonEdit(a)}>Edit</Btn></td>
            </tr>
          ))}
        </AdminTable>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit pricing rule" : "New pricing rule"}>
        {edit && (
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={edit.service_category ?? ""} onChange={(v) => setEdit({ ...edit, service_category: v })} options={cats.map((c) => ({ value: c.slug, label: c.name }))} />
            <Select label="Component" value={edit.component ?? "base"} onChange={(v) => setEdit({ ...edit, component: v })} options={components.map((c) => ({ value: c, label: c }))} />
            <Input label="Code (enclosure / accessory / mounting type)" value={edit.code ?? ""} onChange={(v) => setEdit({ ...edit, code: v })} placeholder="e.g. screen, led_lighting, attached" />
            <Input label="Structure type filter (blank = any)" value={edit.structure_type ?? ""} onChange={(v) => setEdit({ ...edit, structure_type: v })} placeholder="louvered / fixed_roof / retractable" />
            <Input label="Amount (USD)" type="number" value={edit.amount ?? 0} onChange={(v) => setEdit({ ...edit, amount: Number(v) })} />
            <Select label="Unit" value={edit.unit ?? "flat"} onChange={(v) => setEdit({ ...edit, unit: v })} options={units.map((u) => ({ value: u, label: u }))} />
            <div className="col-span-2"><Input label="Label (shown on the quote)" value={edit.label ?? ""} onChange={(v) => setEdit({ ...edit, label: v })} /></div>
            <Toggle label="Active" checked={edit.is_active ?? true} onChange={(v) => setEdit({ ...edit, is_active: v })} />
            <div className="col-span-2 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setEdit(null)}>Cancel</Btn><Btn onClick={saveRule}>Save</Btn></div>
          </div>
        )}
      </Modal>
      <Modal open={!!planEdit} onClose={() => setPlanEdit(null)} title="MrCare plan">
        {planEdit && (
          <div className="grid grid-cols-2 gap-4">
            <Select label="Offering" value={planEdit.offering ?? "maintenance"} onChange={(v) => setPlanEdit({ ...planEdit, offering: v })} options={offerings} />
            <Input label="Slug (id)" value={planEdit.slug ?? ""} onChange={(v) => setPlanEdit({ ...planEdit, slug: v })} disabled={!!planEdit.id} />
            <Input label="Name" value={planEdit.name ?? ""} onChange={(v) => setPlanEdit({ ...planEdit, name: v })} />
            <Input label="Annual price" type="number" value={planEdit.annual_price ?? 0} onChange={(v) => setPlanEdit({ ...planEdit, annual_price: Number(v) })} />
            <Input label="Visits per year" type="number" value={planEdit.visits_per_year ?? 0} onChange={(v) => setPlanEdit({ ...planEdit, visits_per_year: Number(v) })} />
            <Input label="Sort order" type="number" value={planEdit.sort_order ?? 0} onChange={(v) => setPlanEdit({ ...planEdit, sort_order: Number(v) })} />
            <div className="col-span-2"><Input label="Features (separate with | )" value={(planEdit.features ?? []).join(" | ")} onChange={(v) => setPlanEdit({ ...planEdit, features: v.split("|").map((s) => s.trim()).filter(Boolean) })} /></div>
            <Toggle label="Active" checked={planEdit.is_active ?? true} onChange={(v) => setPlanEdit({ ...planEdit, is_active: v })} />
            <div className="col-span-2 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setPlanEdit(null)}>Cancel</Btn><Btn onClick={savePlan}>Save</Btn></div>
          </div>
        )}
      </Modal>
      <Modal open={!!addonEdit} onClose={() => setAddonEdit(null)} title="MrCare add-on">
        {addonEdit && (
          <div className="grid grid-cols-2 gap-4">
            <Select label="Offering" value={addonEdit.offering ?? "maintenance"} onChange={(v) => setAddonEdit({ ...addonEdit, offering: v })} options={offerings} />
            <Input label="Slug (id)" value={addonEdit.slug ?? ""} onChange={(v) => setAddonEdit({ ...addonEdit, slug: v })} disabled={!!addonEdit.id} />
            <Input label="Name" value={addonEdit.name ?? ""} onChange={(v) => setAddonEdit({ ...addonEdit, name: v })} />
            <Input label="Annual price" type="number" value={addonEdit.annual_price ?? 0} onChange={(v) => setAddonEdit({ ...addonEdit, annual_price: Number(v) })} />
            <Toggle label="Active" checked={addonEdit.is_active ?? true} onChange={(v) => setAddonEdit({ ...addonEdit, is_active: v })} />
            <div className="col-span-2 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setAddonEdit(null)}>Cancel</Btn><Btn onClick={saveAddon}>Save</Btn></div>
          </div>
        )}
      </Modal>
      {toast}
    </div>
  );
}
