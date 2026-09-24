"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/dashboard/table";
import { Btn, useToast } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Setting { key: string; value: unknown; description: string | null; updated_at: string | null }
type Kind = "lines" | "pairs" | "faq" | "json";
const GROUPS: { title: string; hint: string; keys: [string, string, Kind][] }[] = [
  { title: "Request form catalogue", hint: "One item per line. Changes appear in the apps on next launch — no release needed.", keys: [["catalog_pergola_types", "Pergola types", "lines"], ["catalog_brands", "Brands", "lines"], ["catalog_enclosure_types", "Side enclosures & subsystems", "pairs"], ["catalog_accessories", "Accessories", "pairs"]] },
  { title: "Contractor catalogue", hint: "", keys: [["catalog_pergola_systems", "Pergola systems (PRO signup)", "lines"], ["catalog_electronics_devices", "Electronics devices (claims)", "lines"]] },
  { title: "App copy", hint: "", keys: [["content_home_promo", "Home promo card (JSON: label, title, sub, cta, enabled)", "json"], ["content_care_tips", "Weather care tips (JSON: rain, thunder, snow, windy, sunny, partly)", "json"], ["content_support", "Support contact (JSON: phone, email, hours)", "json"], ["content_faq_pro", "PRO app FAQ", "faq"]] },
  { title: "Legal", hint: "Shown in both apps and on the web.", keys: [["legal_terms", "Terms of Service (JSON: updated, sections[[heading, text]])", "json"], ["legal_privacy", "Privacy Policy", "json"]] },
];

function toText(kind: Kind, v: unknown): string {
  if (kind === "lines") return (v as string[]).join("\n");
  if (kind === "pairs") return (v as { label: string; code: string }[]).map((x) => `${x.label} | ${x.code}`).join("\n");
  if (kind === "faq") return (v as [string, string][]).map(([q, a]) => `${q}\n${a}`).join("\n\n");
  return JSON.stringify(v, null, 2);
}
function fromText(kind: Kind, t: string): unknown {
  if (kind === "lines") return t.split("\n").map((s) => s.trim()).filter(Boolean);
  if (kind === "pairs") return t.split("\n").map((s) => s.trim()).filter(Boolean).map((s) => { const [label, code] = s.split("|").map((x) => x.trim()); return { label, code: code || label.toLowerCase().replace(/\W+/g, "_") }; });
  if (kind === "faq") return t.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).map((b) => { const [q, ...a] = b.split("\n"); return [q.trim(), a.join(" ").trim()]; });
  return JSON.parse(t);
}

export default function ContentPage() {
  const [settings, setSettings] = useState<Record<string, Setting>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const { toast, show } = useToast();
  const load = useCallback(async () => { const r = await api<Setting[]>("/admin/settings"); const m: Record<string, Setting> = {}; (r.data ?? []).forEach((s) => { m[s.key] = s; }); setSettings(m); const d: Record<string, string> = {}; GROUPS.forEach((g) => g.keys.forEach(([k, , kind]) => { if (m[k]) d[k] = toText(kind, m[k].value); })); setDraft(d); }, []);
  useEffect(() => { load(); }, [load]);
  async function save(key: string, kind: Kind) {
    let v: unknown; try { v = fromText(kind, draft[key] ?? ""); } catch { show("Invalid JSON", true); return; }
    const r = await api("/admin/settings", { method: "PUT", body: { [key]: v } });
    show(r.success ? "Saved — apps pick it up on next launch" : r.error ?? "Failed", !r.success); if (r.success) load();
  }
  return (
    <div className="space-y-8">
      <AdminPageHeader title="App content" subtitle="Catalogue lists, copy and legal text used by the mobile apps and web" />
      {GROUPS.map((g) => (
        <section key={g.title} className="space-y-4">
          <div><h2 className="text-lg font-semibold">{g.title}</h2>{g.hint && <p className="text-sm text-gray-500">{g.hint}</p>}</div>
          <div className="grid gap-4 lg:grid-cols-2">
            {g.keys.map(([key, label, kind]) => (
              <div key={key} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-center justify-between"><div><div className="text-sm font-medium">{label}</div><div className="text-xs text-gray-400">{kind === "pairs" ? "Label | pricing code" : kind === "faq" ? "Question on one line, answer on the next; blank line between" : settings[key]?.updated_at ? `Updated ${new Date(settings[key].updated_at!).toLocaleDateString()}` : ""}</div></div><Btn small onClick={() => save(key, kind)} disabled={!(key in draft) || draft[key] === toText(kind, settings[key]?.value)}>Save</Btn></div>
                <textarea value={draft[key] ?? ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} rows={kind === "json" || kind === "faq" ? 12 : 8} className="w-full rounded-lg border border-gray-300 p-2 font-mono text-xs" spellCheck={false} />
              </div>
            ))}
          </div>
        </section>
      ))}
      {toast}
    </div>
  );
}
