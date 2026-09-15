"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, Badge } from "@/components/dashboard/table";
import { Btn, Input, Select, Toggle, fmtDate, useToast } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Provider { provider: string; fields: string[]; config: Record<string, string>; is_enabled: boolean; configured: boolean; last_test_at: string | null; last_test_ok: boolean | null; last_test_message: string | null; updated_at: string | null }

const titles: Record<string, [string, string]> = {
  stripe: ["Stripe", "Card payments, contractor payouts (Connect), subscriptions, store"],
  smtp: ["Email (SMTP)", "OTP codes, receipts, household invites"],
  twilio: ["SMS (Twilio)", "OTP codes and urgent job alerts"],
  storage: ["File storage (S3-compatible)", "Photos, evidence, documents, product images — DigitalOcean Spaces, AWS S3, Cloudflare R2"],
  google_oauth: ["Google sign-in", "OAuth client IDs for iOS, Android and web"],
  apple_oauth: ["Apple sign-in", "Service ID, Team ID, Key ID and the .p8 private key"],
  push: ["Push notifications", "Expo push service (no key needed) — optional access token"],
  maps: ["Maps & geocoding", "Google Maps API key for addresses and distance"],
};
const hints: Record<string, string> = {
  port: "587 (STARTTLS) or 465 (implicit TLS)", tls: "starttls | implicit", use_ssl: "true | false", connect_enabled: "true | false",
  endpoint: "e.g. nyc3.digitaloceanspaces.com or s3.amazonaws.com", public_base_url: "optional CDN/base URL for stored files",
  client_ids: "comma-separated", provider: "expo | fcm", from_number: "+1…", private_key: "paste the .p8 contents",
};

export default function IntegrationsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [ready, setReady] = useState(true);
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  const [testTo, setTestTo] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const { toast, show } = useToast();

  const load = useCallback(async () => {
    const r = await api<{ encryption_ready: boolean; providers: Provider[] }>("/admin/integrations");
    setProviders(r.data?.providers ?? []); setReady(r.data?.encryption_ready ?? false); setEdits({});
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(p: Provider, enabled?: boolean) {
    setBusy(p.provider);
    const r = await api(`/admin/integrations/${p.provider}`, { method: "PUT", body: { config: edits[p.provider] ?? {}, is_enabled: enabled } });
    setBusy("");
    if (!r.success) { show(r.error ?? "Failed", true); return; }
    show(`${titles[p.provider][0]} saved`); load();
  }
  async function test(p: Provider) {
    setBusy(p.provider + ":test");
    const r = await api(`/admin/integrations/${p.provider}/test`, { method: "POST", body: { to: testTo[p.provider] ?? "" } });
    setBusy("");
    show(r.success ? `✓ ${r.message}` : `✗ ${r.error}`, !r.success); load();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Integrations" subtitle="Provider credentials are encrypted at rest. Secrets are never shown again after saving — a masked value means 'unchanged'." />
      {!ready && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">SETTINGS_ENC_KEY is missing on the server — credentials can't be saved until it is set.</div>}
      {providers.map((p) => {
        const e = edits[p.provider] ?? {};
        const needsTo = p.provider === "smtp" || p.provider === "twilio";
        return (
          <div key={p.provider} className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-3"><h2 className="text-lg font-semibold text-gray-900">{titles[p.provider]?.[0] ?? p.provider}</h2>
                  <Badge color={p.is_enabled ? "success" : "gray"}>{p.is_enabled ? "enabled" : "disabled"}</Badge>
                  {p.last_test_ok !== null && <Badge color={p.last_test_ok ? "success" : "error"}>{p.last_test_ok ? "test passed" : "test failed"}</Badge>}
                </div>
                <p className="mt-1 text-sm text-gray-600">{titles[p.provider]?.[1]}</p>
                {p.last_test_message && <p className="mt-1 text-xs text-gray-400">Last test {fmtDate(p.last_test_at)}: {p.last_test_message}</p>}
              </div>
              <Toggle label={p.is_enabled ? "On" : "Off"} checked={p.is_enabled} onChange={(v) => save(p, v)} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {p.fields.map((f) => {
                const val = e[f] ?? p.config[f] ?? "";
                const set = (v: string) => setEdits({ ...edits, [p.provider]: { ...e, [f]: v } });
                if (["connect_enabled", "use_ssl"].includes(f)) return <div key={f} className="flex items-end pb-2"><Toggle label={f.replace(/_/g, " ")} checked={val === "true"} onChange={(v) => set(v ? "true" : "false")} /></div>;
                if (f === "tls") return <Select key={f} label="TLS mode" value={val || "starttls"} onChange={set} options={[{ value: "starttls", label: "STARTTLS (port 587)" }, { value: "implicit", label: "Implicit TLS (port 465)" }]} />;
                if (f === "provider") return <Select key={f} label="Push provider" value={val || "expo"} onChange={set} options={[{ value: "expo", label: "Expo push (default)" }, { value: "fcm", label: "Firebase Cloud Messaging" }]} />;
                return <Input key={f} label={f.replace(/_/g, " ")} value={val} onChange={set} hint={hints[f]} />;
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Btn onClick={() => save(p)} disabled={busy === p.provider || !Object.keys(e).length}>Save</Btn>
              {needsTo && <input placeholder={p.provider === "smtp" ? "test email (default: yours)" : "test phone +1…"} value={testTo[p.provider] ?? ""} onChange={(ev) => setTestTo({ ...testTo, [p.provider]: ev.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />}
              <Btn kind="secondary" onClick={() => test(p)} disabled={busy === p.provider + ":test" || !p.is_enabled}>Test connection</Btn>
            </div>
          </div>
        );
      })}
      {toast}
    </div>
  );
}
