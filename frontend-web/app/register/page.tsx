"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, storeSession, User } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"consumer" | "contractor">("consumer");
  const [f, setF] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "", confirm: "" });
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("role") === "contractor") setRole("contractor");
    if (q.get("invite")) setInvite(q.get("invite") ?? "");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (f.password !== f.confirm) { setErr("Passwords don't match"); return; }
    if (f.password.length < 8) { setErr("Password must be at least 8 characters"); return; }
    if (!agree) { setErr("Please accept the terms"); return; }
    setBusy(true);
    const r = await api<{ access_token: string; refresh_token: string; user: User }>("/register", { method: "POST", body: { first_name: f.first_name, last_name: f.last_name, email: f.email, phone: f.phone || undefined, password: f.password, role } });
    setBusy(false);
    if (!r.success) { setErr(r.error ?? "Registration failed"); return; }
    if (r.data?.access_token) storeSession(r.data.access_token, r.data.refresh_token, r.data.user);
    else {
      const l = await api<{ access_token: string; refresh_token: string; user: User }>("/login", { method: "POST", body: { email: f.email, password: f.password } });
      if (l.data) storeSession(l.data.access_token, l.data.refresh_token, l.data.user);
    }
    if (invite) await api("/household/accept", { method: "POST", body: { token: invite } });
    router.replace(role === "contractor" ? "/profile/contractor" : "/profile");
  }

  const input = "w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none";
  return (
    <main>
      <div className="w-full rounded-[24px] bg-white p-8 shadow-[0_20px_50px_-30px_rgba(24,29,39,.25)] ring-1 ring-black/[.04]">
        
        <h1 className="text-2xl font-semibold text-gray-900">Create your account</h1>
        <p className="mt-1 text-sm text-gray-600">America's pergola platform — installation, repair, maintenance.</p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
          {(["consumer", "contractor"] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)} className={`rounded-md py-2 text-sm font-semibold ${role === r ? "bg-white text-gray-900 shadow" : "text-gray-500"}`}>{r === "consumer" ? "I own a pergola" : "I'm a contractor"}</button>
          ))}
        </div>
        {invite && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">You were invited to a household — you'll join it automatically after signing up.</p>}
        {role === "contractor" && <p className="mt-3 rounded-lg bg-brand-50 p-3 text-xs text-brand-800">Contractor onboarding — training, quizzes and your first supervised job — happens in the MrBuilder PRO app. Register here, then install the app.</p>}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input className={input} placeholder="First name" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} required />
            <input className={input} placeholder="Last name" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} required />
          </div>
          <input className={input} type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
          <input className={input} type="tel" placeholder="Mobile phone (+1…)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <input className={input} type="password" placeholder="Password (8+ characters)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
          <input className={input} type="password" placeholder="Confirm password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required />
          <label className="flex items-start gap-2 text-xs text-gray-600"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" /> I agree to the <Link href="/legal/terms" target="_blank" className="underline">Terms of Service</Link> and <a href="/legal/privacy" target="_blank" className="underline">Privacy Policy</a>.</label>
          {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{busy ? "Creating…" : "Create account"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">Already have an account? <Link href="/login" className="font-semibold text-brand-600">Sign in</Link></p>
      </div>
    </main>
  );
}
