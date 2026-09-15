"use client";

import { useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";

export default function ContractorWeb() {
  const [state, setState] = useState<{ locked: boolean; reasons: string[]; qualified: string[] } | null>(null);
  const u = getUser();
  useEffect(() => { api<{ lock: { locked: boolean; reasons: string[]; qualified: string[] } }>("/training").then((r) => setState(r.data?.lock ?? null)); }, []);
  const status = u?.status;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-semibold">Welcome, {u?.first_name}</h1>
        <p className="mt-1 text-sm text-gray-600">Your contractor account is {status === "active" ? "approved" : "awaiting approval"}. Everything else — training, quizzes, jobs, evidence photos, earnings — lives in the MrBuilder PRO app.</p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-gray-50 p-3"><div className="text-xs text-gray-500">Account</div><div className="font-semibold capitalize">{status ?? "—"}</div></div>
          <div className="rounded-lg bg-gray-50 p-3"><div className="text-xs text-gray-500">Marketplace</div><div className="font-semibold">{state ? (state.locked ? "Locked" : "Unlocked") : "—"}</div></div>
          <div className="rounded-lg bg-gray-50 p-3"><div className="text-xs text-gray-500">Qualified</div><div className="font-semibold">{state?.qualified.length ? state.qualified.join(", ") : "none yet"}</div></div>
        </div>
        {state?.locked && <ul className="mt-3 list-disc pl-5 text-xs text-gray-500">{state.reasons.map((r) => <li key={r}>{r.replace(/_/g, " ")}</li>)}</ul>}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Get the PRO app</h2>
        <p className="mt-1 text-sm text-gray-600">Sign in with the same email and password.</p>
        <div className="mt-4 flex gap-3">
          <span className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white opacity-60">App Store · coming soon</span>
          <span className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white opacity-60">Google Play · coming soon</span>
        </div>
      </div>
    </div>
  );
}
