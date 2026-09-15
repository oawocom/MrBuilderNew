"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    const r = await api("/auth/forgot", { method: "POST", body: { email } });
    if (r.success) setMsg("If that email exists, we sent a reset code. Check your inbox."); else setErr(r.error ?? "Failed");
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {msg && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{msg} <Link href={`/reset?email=${encodeURIComponent(email)}`} className="underline">Enter the code</Link></p>}
          {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          <button className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Send reset code</button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600"><Link href="/login" className="font-semibold text-brand-600">Back to sign in</Link></p>
      </div>
    </main>
  );
}
