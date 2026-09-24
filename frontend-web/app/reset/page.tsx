"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ResetPage() {
  const router = useRouter();
  const [f, setF] = useState({ email: "", code: "", password: "" });
  const [err, setErr] = useState("");
  useEffect(() => { const q = new URLSearchParams(window.location.search); setF((x) => ({ ...x, email: q.get("email") ?? "", code: q.get("code") ?? "" })); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const r = await api("/auth/reset", { method: "POST", body: f });
    if (r.success) router.replace("/login"); else setErr(r.error ?? "Failed");
  }
  const input = "w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm";
  return (
    <main>
      <div className="w-full rounded-[24px] bg-white p-8 shadow-[0_20px_50px_-30px_rgba(24,29,39,.25)] ring-1 ring-black/[.04]">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input className={input} type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
          <input className={input} placeholder="6-digit code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} required />
          <input className={input} type="password" placeholder="New password (8+ characters)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
          {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          <button className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Update password</button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600"><Link href="/login" className="font-semibold text-brand-600">Back to sign in</Link></p>
      </div>
    </main>
  );
}
