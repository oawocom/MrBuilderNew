"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminTable, Badge } from "@/components/dashboard/table";
import { Btn, Input, Modal, Select, Textarea, Toggle, fmtDate, jobStatusColor, money, useToast } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Order { id: string; order_number: string; status: string; payment_method: string; total: number; request_code: string | null; items: { name: string; qty: number; amount: number }[]; address: { label?: string; recipient?: string; line1?: string; city?: string }; tracking: { number: string | null; courier: { name: string; phone: string } | null; eta_at: string | null }; report_reason: string | null; created_at: string }
interface Product { id: string; sku: string | null; name: string; description: string | null; category: string | null; price: number; image_url: string | null; is_top_seller: boolean; stock_qty: number; compatible_types: string[]; is_active: boolean }
interface Cat { slug: string; name: string; product_count: number }

const orderStatuses = ["pending", "paid", "packing", "shipped", "delivered", "cancelled"];

export default function StorePage() {
  const [tab, setTab] = useState<"orders" | "products">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ostatus, setOstatus] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [ship, setShip] = useState<{ order: Order; status: string; tracking: string; courier: string; phone: string; eta: string } | null>(null);
  const [edit, setEdit] = useState<Partial<Product> | null>(null);
  const [catEdit, setCatEdit] = useState<{ slug: string; name: string } | null>(null);
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    const [o, p, c] = await Promise.all([api<Order[]>(`/admin/store/orders?limit=100${ostatus ? `&status=${ostatus}` : ""}`), api<Product[]>("/admin/store/products?all=1"), api<Cat[]>("/store/categories")]);
    setOrders(o.data ?? []); setProducts(p.data ?? []); setCats(c.data ?? []);
  }, [ostatus]);
  useEffect(() => { load(); }, [load]);

  async function saveShip() {
    if (!ship) return;
    const r = await api(`/admin/store/orders/${ship.order.id}`, { method: "PATCH", body: { status: ship.status, tracking_number: ship.tracking || undefined, courier_name: ship.courier || undefined, courier_phone: ship.phone || undefined, eta_at: ship.eta ? new Date(ship.eta).toISOString() : undefined } });
    show(r.success ? `Order → ${ship.status}` : r.error ?? "Failed", !r.success); setShip(null); load();
  }
  async function saveProduct() {
    if (!edit?.sku || !edit.name) { show("SKU and name are required", true); return; }
    const r = await api(`/admin/store/products/${edit.sku}`, { method: "PUT", body: { sku: edit.sku, name: edit.name, description: edit.description, category: edit.category || null, price: Number(edit.price ?? 0), image_url: edit.image_url || null, is_top_seller: !!edit.is_top_seller, stock_qty: Number(edit.stock_qty ?? 0), compatible_types: edit.compatible_types?.length ? edit.compatible_types : ["any"], is_active: edit.is_active ?? true } });
    show(r.success ? "Product saved" : r.error ?? "Failed", !r.success); setEdit(null); load();
  }
  async function saveCat() {
    if (!catEdit?.slug || !catEdit.name) return;
    const r = await api(`/admin/store/categories/${catEdit.slug}`, { method: "PUT", body: { name: catEdit.name } });
    show(r.success ? "Category saved" : r.error ?? "Failed", !r.success); setCatEdit(null); load();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Mr Supply" subtitle="Orders, fulfilment tracking, catalogue" actions={tab === "products" ? <><Btn kind="secondary" onClick={() => setCatEdit({ slug: "", name: "" })}>+ Category</Btn><Btn onClick={() => setEdit({ sku: "", name: "", price: 0, stock_qty: 0, category: cats[0]?.slug, compatible_types: ["any"], is_active: true })}>+ Product</Btn></> : undefined} />
      <div className="flex gap-2 border-b border-gray-200">{(["orders", "products"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? "border-b-2 border-brand-600 text-gray-900" : "text-gray-500"}`}>{t}</button>)}</div>

      {tab === "orders" && (
        <>
          <div className="flex gap-2">{["", ...orderStatuses].map((s) => <button key={s} onClick={() => setOstatus(s)} className={`rounded-full px-3 py-1 text-sm capitalize ${ostatus === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}>{s || "all"}</button>)}</div>
          <AdminTable headers={["Order", "Items", "Ship to", "Payment", "Total", "Status", "Tracking", ""]}>
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-6 py-3"><div className="text-sm font-medium">{o.order_number}</div><div className="text-xs text-gray-500">{fmtDate(o.created_at)}{o.request_code && ` · ${o.request_code}`}</div>{o.report_reason && <div className="text-xs text-red-600">⚠ {o.report_reason}</div>}</td>
                <td className="px-6 py-3 text-xs text-gray-700">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</td>
                <td className="px-6 py-3 text-xs text-gray-700">{o.address?.recipient}<br />{o.address?.line1}, {o.address?.city}</td>
                <td className="px-6 py-3 text-sm capitalize">{o.payment_method}</td>
                <td className="px-6 py-3 text-sm font-semibold">{money(o.total)}</td>
                <td className="px-6 py-3"><Badge color={jobStatusColor[o.status]}>{o.status}</Badge></td>
                <td className="px-6 py-3 text-xs">{o.tracking.number ?? "—"}{o.tracking.courier && <><br />{o.tracking.courier.name} {o.tracking.courier.phone}</>}</td>
                <td className="px-6 py-3"><Btn small kind="secondary" onClick={() => setShip({ order: o, status: o.status, tracking: o.tracking.number ?? "", courier: o.tracking.courier?.name ?? "", phone: o.tracking.courier?.phone ?? "", eta: "" })}>Update</Btn></td>
              </tr>
            ))}
          </AdminTable>
        </>
      )}

      {tab === "products" && (
        <>
          <div className="flex flex-wrap gap-2 text-sm">{cats.map((c) => <button key={c.slug} onClick={() => setCatEdit({ slug: c.slug, name: c.name })} className="rounded-full bg-gray-100 px-3 py-1 text-gray-700 hover:bg-gray-200">{c.name} <span className="text-gray-400">({c.product_count})</span></button>)}</div>
          <AdminTable headers={["SKU", "Product", "Category", "Price", "Stock", "Fits", "Flags", ""]}>
            {products.map((p) => (
              <tr key={p.id} className={`hover:bg-gray-50 ${!p.is_active ? "opacity-50" : ""}`}>
                <td className="px-6 py-3 font-mono text-xs">{p.sku}</td>
                <td className="px-6 py-3"><div className="text-sm font-medium">{p.name}</div><div className="text-xs text-gray-500">{p.description}</div></td>
                <td className="px-6 py-3 text-sm">{p.category}</td>
                <td className="px-6 py-3 text-sm">{money(p.price)}</td>
                <td className="px-6 py-3 text-sm">{p.stock_qty}</td>
                <td className="px-6 py-3 text-xs">{p.compatible_types.join(", ")}</td>
                <td className="px-6 py-3"><div className="flex gap-1">{p.is_top_seller && <Badge color="warning">top</Badge>}{!p.is_active && <Badge color="gray">inactive</Badge>}</div></td>
                <td className="px-6 py-3"><Btn small kind="secondary" onClick={() => setEdit(p)}>Edit</Btn></td>
              </tr>
            ))}
          </AdminTable>
        </>
      )}

      <Modal open={!!ship} onClose={() => setShip(null)} title={ship ? `Update ${ship.order.order_number}` : ""}>
        {ship && (
          <div className="grid grid-cols-2 gap-4">
            <Select label="Status" value={ship.status} onChange={(v) => setShip({ ...ship, status: v })} options={orderStatuses.map((s) => ({ value: s, label: s }))} />
            <Input label="Tracking number" value={ship.tracking} onChange={(v) => setShip({ ...ship, tracking: v })} />
            <Input label="Courier name" value={ship.courier} onChange={(v) => setShip({ ...ship, courier: v })} />
            <Input label="Courier phone" value={ship.phone} onChange={(v) => setShip({ ...ship, phone: v })} />
            <Input label="ETA" type="datetime-local" value={ship.eta} onChange={(v) => setShip({ ...ship, eta: v })} />
            <div className="col-span-2 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setShip(null)}>Cancel</Btn><Btn onClick={saveShip}>Save</Btn></div>
          </div>
        )}
      </Modal>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit product" : "New product"}>
        {edit && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="SKU" value={edit.sku ?? ""} onChange={(v) => setEdit({ ...edit, sku: v })} disabled={!!edit.id} />
            <Input label="Name" value={edit.name ?? ""} onChange={(v) => setEdit({ ...edit, name: v })} />
            <div className="col-span-2"><Textarea label="Description" value={edit.description ?? ""} onChange={(v) => setEdit({ ...edit, description: v })} /></div>
            <Select label="Category" value={edit.category ?? ""} onChange={(v) => setEdit({ ...edit, category: v })} options={[{ value: "", label: "—" }, ...cats.map((c) => ({ value: c.slug, label: c.name }))]} />
            <Input label="Price" type="number" value={edit.price ?? 0} onChange={(v) => setEdit({ ...edit, price: Number(v) })} />
            <Input label="Stock qty" type="number" value={edit.stock_qty ?? 0} onChange={(v) => setEdit({ ...edit, stock_qty: Number(v) })} />
            <Input label="Compatible types (comma: louvered, fixed_roof, retractable, any)" value={(edit.compatible_types ?? []).join(", ")} onChange={(v) => setEdit({ ...edit, compatible_types: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
            <div className="col-span-2"><Input label="Image URL (upload via storage once configured)" value={edit.image_url ?? ""} onChange={(v) => setEdit({ ...edit, image_url: v })} /></div>
            <Toggle label="Top seller" checked={!!edit.is_top_seller} onChange={(v) => setEdit({ ...edit, is_top_seller: v })} />
            <Toggle label="Active" checked={edit.is_active ?? true} onChange={(v) => setEdit({ ...edit, is_active: v })} />
            <div className="col-span-2 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setEdit(null)}>Cancel</Btn><Btn onClick={saveProduct}>Save</Btn></div>
          </div>
        )}
      </Modal>
      <Modal open={!!catEdit} onClose={() => setCatEdit(null)} title="Category">
        {catEdit && (
          <div className="grid grid-cols-2 gap-4">
            <Input label="Slug" value={catEdit.slug} onChange={(v) => setCatEdit({ ...catEdit, slug: v.toLowerCase().replace(/[^a-z0-9_-]/g, "") })} />
            <Input label="Name" value={catEdit.name} onChange={(v) => setCatEdit({ ...catEdit, name: v })} />
            <div className="col-span-2 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setCatEdit(null)}>Cancel</Btn><Btn onClick={saveCat}>Save</Btn></div>
          </div>
        )}
      </Modal>
      {toast}
    </div>
  );
}
