"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminTable } from "@/components/dashboard/table";
import { Btn, Input, useToast } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Setting { key: string; value: unknown; description: string | null; updated_at: string }

export default function SettingsPage() {
  const [rows, setRows] = useState<Setting[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    const r = await api<Setting[]>("/admin/settings");
    setRows(r.data ?? []);
    setEdits({});
  }, []);
  useEffect(() => { load(); }, [load]);

  function parse(raw: string): unknown {
    const t = raw.trim();
    if (t === "true" || t === "false") return t === "true";
    if (t !== "" && !isNaN(Number(t))) return Number(t);
    return t;
  }

  async function save() {
    if (!Object.keys(edits).length) return;
    setBusy(true);
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(edits)) body[k] = parse(v);
    const r = await api("/admin/settings", { method: "PUT", body });
    setBusy(false);
    if (!r.success) { show(r.error ?? "Failed", true); return; }
    show(`Saved ${Object.keys(edits).length} setting(s)`);
    load();
  }

  const groups: Record<string, Setting[]> = {};
  for (const s of rows) {
    const g = s.key.startsWith("cod_") || s.key.startsWith("store_") ? "Mr Supply" : s.key.startsWith("quiz_") || s.key.startsWith("training_") ? "Training"
      : s.key.startsWith("electronics_") || s.key.startsWith("maintenance_") || s.key.startsWith("reminder_") || s.key.startsWith("inspection_") ? "MrCare & inspections"
      : s.key.includes("cancel") || s.key.includes("fee") || s.key.includes("payout") || s.key.includes("tip") || s.key.includes("confirm") || s.key.includes("quote") ? "Money & job rules" : "Account";
    (groups[g] ||= []).push(s);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Platform settings" subtitle="Fees, timers, thresholds. Changes apply immediately — no deploy." actions={<Btn onClick={save} disabled={busy || !Object.keys(edits).length}>Save changes</Btn>} />
      {Object.entries(groups).map(([g, list]) => (
        <div key={g}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{g}</h2>
          <AdminTable headers={["Setting", "Value", "Description"]}>
            {list.map((s) => (
              <tr key={s.key} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-mono text-xs text-gray-700">{s.key}</td>
                <td className="w-56 px-6 py-3"><Input value={edits[s.key] ?? String(s.value)} onChange={(v) => setEdits({ ...edits, [s.key]: v })} /></td>
                <td className="px-6 py-3 text-sm text-gray-500">{s.description}</td>
              </tr>
            ))}
          </AdminTable>
        </div>
      ))}
      {toast}
    </div>
  );
}
