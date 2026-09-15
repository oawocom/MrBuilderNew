"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, storeSession, User } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const r = await api<{ access_token: string; refresh_token: string; user: User }>("/login", { method: "POST", body: { email, password } });
    setBusy(false);
    if (!r.success || !r.data) { setErr(r.error ?? "Sign in failed"); return; }
    storeSession(r.data.access_token, r.data.refresh_token, r.data.user);
    const role = r.data.user.role;
    router.replace(role === "admin" ? "/manage" : role === "contractor" ? "/profile/contractor" : "/profile");
  }

  const input = "w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-500 focus:outline-none";
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <Link href="/" className="mb-6 block text-center text-xl font-bold text-brand-600">MrBuilder</Link>
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="mt-3 text-center text-sm"><Link href="/forgot" className="text-gray-500 hover:underline">Forgot your password?</Link></p>
        <p className="mt-3 text-center text-sm text-gray-600">New here? <Link href="/register" className="font-semibold text-brand-600">Create an account</Link></p>
      </div>
    </main>
  );
}
