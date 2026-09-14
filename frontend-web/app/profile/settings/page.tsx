"use client";

import { useEffect, useState } from "react";
import { api, getUser, User } from "@/lib/api";
import { Card, PageHeader } from "@/components/dashboard/ui";

type AnyProfile = Record<string, unknown>;

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [p, setP] = useState<AnyProfile>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUser(getUser());
    api<AnyProfile>("/profile").then((res) => {
      if (res.success && res.data) setP(res.data);
    });
  }, []);

  const set = (k: string, v: string) => setP((prev) => ({ ...prev, [k]: v }));

  async function onSave() {
    if (!user) return;
    setLoading(true);
    setSaved(false);
    const isContractor = user.role === "contractor";
    const body: AnyProfile = isContractor
      ? {
          business_name: p.business_name ?? "", professional_title: p.professional_title ?? "",
          bio: p.bio ?? "", address_line1: p.address_line1 ?? "", city: p.city ?? "",
          state: p.state ?? "", zip_code: p.zip_code ?? "",
        }
      : { address_line1: p.address_line1 ?? "", address_line2: p.address_line2 ?? "", city: p.city ?? "", state: p.state ?? "", zip_code: p.zip_code ?? "" };
    const res = await api<AnyProfile>("/profile", { method: "PUT", body });
    if (res.success && res.data) {
      setP(res.data);
      setSaved(true);
    }
    setLoading(false);
  }

  if (!user) return null;
  const input = "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-base shadow-sm focus:border-brand-500 focus:outline-none";
  const v = (k: string) => (p[k] as string) ?? "";

  return (
    <div>
      <PageHeader title="My profile" subtitle="Your personal information and address" />
      <div className="grid max-w-3xl gap-6">
        <Card>
          <h3 className="mb-4 font-semibold">Personal information</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">First name</label><input className={input} value={user.first_name} disabled /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Last name</label><input className={input} value={user.last_name} disabled /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label><input className={input} value={user.email} disabled /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Role</label><input className={input + " capitalize"} value={user.role} disabled /></div>
          </div>
        </Card>

        {user.role === "contractor" && (
          <Card>
            <h3 className="mb-4 font-semibold">Business details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Business name</label><input className={input} value={v("business_name")} onChange={(e) => set("business_name", e.target.value)} /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Professional title</label><input className={input} value={v("professional_title")} onChange={(e) => set("professional_title", e.target.value)} /></div>
              <div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-medium text-gray-700">Bio</label><textarea rows={3} className={input} value={v("bio")} onChange={(e) => set("bio", e.target.value)} /></div>
            </div>
          </Card>
        )}

        <Card>
          <h3 className="mb-4 font-semibold">Address</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-medium text-gray-700">Street address</label><input className={input} value={v("address_line1")} onChange={(e) => set("address_line1", e.target.value)} /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">City</label><input className={input} value={v("city")} onChange={(e) => set("city", e.target.value)} /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">State</label><input className={input} value={v("state")} onChange={(e) => set("state", e.target.value)} /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">ZIP Code</label><input className={input} value={v("zip_code")} onChange={(e) => set("zip_code", e.target.value)} /></div>
          </div>
        </Card>

        <div className="flex items-center gap-4">
          <button onClick={onSave} disabled={loading} className="rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-60">
            {loading ? "Saving..." : "Save changes"}
          </button>
          {saved && <span className="text-sm font-medium text-emerald-600">Saved ✓</span>}
        </div>
      </div>
    </div>
  );
}
