"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/dashboard/table";
import { Btn, Input, Modal, Select, Toggle, useToast } from "@/components/admin/ui";
import { api, clearSession, getUser, storeSession, User } from "@/lib/api";

interface Settings { notifications: { email: boolean; sms: boolean; push: boolean; n_jobs: boolean; n_msgs: boolean; n_updates: boolean }; preferences: { language: string; units: string } }
interface Member { id: string; name: string | null; email: string | null; phone: string | null; role: string; status: string; permissions: { can_create_requests: boolean; can_message: boolean; can_acknowledge: boolean }; member?: { first_name: string; last_name: string } | null; invite_token?: string }
interface Address { id: string; label: string | null; line1: string; line2: string | null; city: string; state: string | null; zip_code: string | null; is_default: boolean }

export default function SettingsPage() {
  const router = useRouter();
  const u = getUser();
  const isContractor = u?.role === "contractor";
  const [profile, setProfile] = useState({ first_name: u?.first_name ?? "", last_name: u?.last_name ?? "", phone: u?.phone ?? "" });
  const [settings, setSettings] = useState<Settings | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberships, setMemberships] = useState<Member[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [invite, setInvite] = useState<{ email: string; name: string; role: string } | null>(null);
  const [addr, setAddr] = useState<Partial<Address> | null>(null);
  const [del, setDel] = useState(false);
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    const [s, h, a] = await Promise.all([api<Settings>("/me/settings"), isContractor ? Promise.resolve({ data: null }) : api<{ members: Member[]; memberships: Member[] }>("/household"), api<Address[]>("/addresses")]);
    setSettings(s.data ?? null); setMembers(h.data?.members ?? []); setMemberships(h.data?.memberships ?? []); setAddresses(a.data ?? []);
  }, [isContractor]);
  useEffect(() => { load(); }, [load]);

  async function saveProfile() {
    const r = await api<User>("/profile", { method: "PUT", body: profile });
    show(r.success ? "Profile saved" : r.error ?? "Failed", !r.success);
    if (r.success && u) storeSession(localStorage.getItem("mrb_access") ?? "", localStorage.getItem("mrb_refresh") ?? "", { ...u, ...profile });
  }
  async function toggle(key: string, v: boolean) {
    await api("/me/notifications", { method: "PATCH", body: { [key]: v } }); load();
  }
  async function pref(key: string, v: string) { await api("/me/preferences", { method: "PATCH", body: { [key]: v } }); load(); }
  async function sendInvite() {
    if (!invite?.email) return;
    const r = await api<Member>("/household/invites", { method: "POST", body: invite });
    show(r.success ? (r.data?.invite_token ? "Invitation created — share the link below" : "Invitation sent") : r.error ?? "Failed", !r.success); setInvite(null); load();
  }
  async function removeMember(id: string) { await api(`/household/members/${id}`, { method: "DELETE" }); load(); }
  async function saveAddr() {
    if (!addr?.line1 || !addr.city) { show("Street and city are required", true); return; }
    const r = addr.id ? await api(`/addresses/${addr.id}`, { method: "PATCH", body: addr }) : await api("/addresses", { method: "POST", body: addr });
    show(r.success ? "Address saved" : r.error ?? "Failed", !r.success); if (r.success) { setAddr(null); load(); }
  }
  async function deleteAccount() {
    const r = await api("/me", { method: "DELETE" });
    if (!r.success) { show(r.error ?? "Failed", true); return; }
    clearSession(); router.replace("/?deleted=1");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold">Profile</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Input label="First name" value={profile.first_name} onChange={(v) => setProfile({ ...profile, first_name: v })} />
          <Input label="Last name" value={profile.last_name} onChange={(v) => setProfile({ ...profile, last_name: v })} />
          <Input label="Phone" value={profile.phone} onChange={(v) => setProfile({ ...profile, phone: v })} />
          <Input label="Email" value={u?.email ?? ""} onChange={() => {}} disabled hint="Contact support to change your email" />
        </div>
        <div className="mt-3"><Btn small onClick={saveProfile}>Save</Btn></div>
      </section>

      {settings && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold">Notifications</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Toggle label="Email" checked={settings.notifications.email} onChange={(v) => toggle("email", v)} />
            <Toggle label="SMS" checked={settings.notifications.sms} onChange={(v) => toggle("sms", v)} />
            <Toggle label="Push (mobile app)" checked={settings.notifications.push} onChange={(v) => toggle("push", v)} />
            <Toggle label="Job updates" checked={settings.notifications.n_jobs} onChange={(v) => toggle("n_jobs", v)} />
            <Toggle label="Messages" checked={settings.notifications.n_msgs} onChange={(v) => toggle("n_msgs", v)} />
            <Toggle label="News & offers" checked={settings.notifications.n_updates} onChange={(v) => toggle("n_updates", v)} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Select label="Language" value={settings.preferences.language} onChange={(v) => pref("language", v)} options={[{ value: "en", label: "English" }, { value: "es", label: "Español" }]} />
            <Select label="Units" value={settings.preferences.units} onChange={(v) => pref("units", v)} options={[{ value: "imperial", label: "Feet / inches" }, { value: "metric", label: "Metres" }]} />
          </div>
        </section>
      )}

      {!isContractor && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold">Household</h2><p className="text-xs text-gray-500">Members can create requests and acknowledge completed work. Only you approve payments.</p></div><Btn small kind="secondary" onClick={() => setInvite({ email: "", name: "", role: "member" })}>+ Invite</Btn></div>
          <div className="mt-3 divide-y divide-gray-100">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 text-sm">
                <div><span className="font-medium">{m.member ? `${m.member.first_name} ${m.member.last_name}` : m.name || m.email}</span> <Badge color={m.status === "active" ? "success" : "warning"}>{m.status}</Badge><div className="text-xs text-gray-500">{m.email}{m.role === "viewer" ? " · view only" : ""}</div>{m.invite_token && <div className="mt-1 text-xs text-gray-500">Invite link: <code className="rounded bg-gray-100 px-1">{typeof window !== "undefined" ? `${window.location.origin}/register?invite=${m.invite_token}` : m.invite_token}</code></div>}</div>
                <Btn small kind="ghost" onClick={() => removeMember(m.id)}>Remove</Btn>
              </div>
            ))}
            {members.length === 0 && <p className="py-2 text-sm text-gray-400">No members yet.</p>}
          </div>
          {memberships.length > 0 && <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">You're a member of: {memberships.map((m) => (m as unknown as { owner?: { first_name: string; last_name: string } }).owner ? `${(m as unknown as { owner: { first_name: string; last_name: string } }).owner.first_name}'s household` : "a household").join(", ")}</div>}
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold">Addresses</h2><p className="text-xs text-gray-500">For Mr Supply deliveries.</p></div><Btn small kind="secondary" onClick={() => setAddr({ label: "Home", line1: "", city: "", state: "", zip_code: "" })}>+ Add</Btn></div>
        <div className="mt-3 divide-y divide-gray-100">
          {addresses.map((a) => <div key={a.id} className="flex items-center justify-between py-2 text-sm"><div><span className="font-medium">{a.label ?? "Address"}</span>{a.is_default && <Badge color="blue">default</Badge>}<div className="text-xs text-gray-500">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city} {a.state} {a.zip_code}</div></div><div className="flex gap-1"><Btn small kind="secondary" onClick={() => setAddr(a)}>Edit</Btn>{!a.is_default && <Btn small kind="ghost" onClick={async () => { await api(`/addresses/${a.id}`, { method: "PATCH", body: { is_default: true } }); load(); }}>Make default</Btn>}<Btn small kind="ghost" onClick={async () => { await api(`/addresses/${a.id}`, { method: "DELETE" }); load(); }}>Delete</Btn></div></div>)}
          {addresses.length === 0 && <p className="py-2 text-sm text-gray-400">No addresses yet.</p>}
        </div>
      </section>

      <section className="rounded-xl border border-red-200 bg-white p-5">
        <h2 className="font-semibold text-red-700">Delete account</h2>
        <p className="mt-1 text-sm text-gray-600">Your account is deactivated immediately and permanently deleted after 30 days. Active jobs must be finished or cancelled first.</p>
        <div className="mt-3"><Btn small kind="danger" onClick={() => setDel(true)}>Delete my account</Btn></div>
      </section>

      <Modal open={!!invite} onClose={() => setInvite(null)} title="Invite a household member">
        {invite && <div className="space-y-3"><Input label="Email" value={invite.email} onChange={(v) => setInvite({ ...invite, email: v })} /><Input label="Name" value={invite.name} onChange={(v) => setInvite({ ...invite, name: v })} /><Select label="Role" value={invite.role} onChange={(v) => setInvite({ ...invite, role: v })} options={[{ value: "member", label: "Member — can create requests & acknowledge" }, { value: "viewer", label: "Viewer — can see only" }]} /><div className="flex justify-end gap-2"><Btn kind="secondary" onClick={() => setInvite(null)}>Cancel</Btn><Btn onClick={sendInvite}>Invite</Btn></div></div>}
      </Modal>
      <Modal open={!!addr} onClose={() => setAddr(null)} title={addr?.id ? "Edit address" : "Add address"}>
        {addr && <div className="grid grid-cols-2 gap-3"><Input label="Label" value={addr.label ?? ""} onChange={(v) => setAddr({ ...addr, label: v })} /><div /><div className="col-span-2"><Input label="Street" value={addr.line1 ?? ""} onChange={(v) => setAddr({ ...addr, line1: v })} /></div><div className="col-span-2"><Input label="Apt / unit" value={addr.line2 ?? ""} onChange={(v) => setAddr({ ...addr, line2: v })} /></div><Input label="City" value={addr.city ?? ""} onChange={(v) => setAddr({ ...addr, city: v })} /><div className="grid grid-cols-2 gap-3"><Input label="State" value={addr.state ?? ""} onChange={(v) => setAddr({ ...addr, state: v })} /><Input label="ZIP" value={addr.zip_code ?? ""} onChange={(v) => setAddr({ ...addr, zip_code: v })} /></div><div className="col-span-2 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setAddr(null)}>Cancel</Btn><Btn onClick={saveAddr}>Save</Btn></div></div>}
      </Modal>
      <Modal open={del} onClose={() => setDel(false)} title="Delete account?">
        <p className="text-sm text-gray-700">This signs you out everywhere and schedules deletion in 30 days. Log in before then to restore.</p>
        <div className="mt-4 flex justify-end gap-2"><Btn kind="secondary" onClick={() => setDel(false)}>Keep my account</Btn><Btn kind="danger" onClick={deleteAccount}>Delete</Btn></div>
      </Modal>
      {toast}
    </div>
  );
}
