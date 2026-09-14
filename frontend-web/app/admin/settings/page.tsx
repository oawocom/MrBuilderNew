"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SectionCard } from "@/components/admin/shared";

const DEFAULTS = {
  platformName: "MrBuilder", supportEmail: "support@mrbuilder.com",
  maintenanceMode: false, allowRegistrations: true, requireEmailVerification: true,
  twoFA: false, sessionTimeout: 30, minPasswordLength: 8, maxLoginAttempts: 5,
  emailNotifs: true, smsNotifs: false, pushNotifs: true, marketingEmails: false,
  backupFrequency: "Daily",
};

export default function SystemSettingsPage() {
  const [s, setS] = useState(DEFAULTS);
  const [dbSize, setDbSize] = useState("—");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("mrb_admin_settings");
    if (raw) setS({ ...DEFAULTS, ...JSON.parse(raw) });
    api<{ db_size: string }>("/admin/system").then((r) => r.success && r.data && setDbSize(r.data.db_size));
  }, []);

  function set<K extends keyof typeof DEFAULTS>(k: K, v: (typeof DEFAULTS)[K]) {
    setS((p) => ({ ...p, [k]: v }));
    setSaved(false);
  }

  function onSave() {
    localStorage.setItem("mrb_admin_settings", JSON.stringify(s));
    setSaved(true);
  }

  const input = "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 shadow-sm focus:border-brand-500 focus:outline-none";
  const Check = ({ k, label, desc }: { k: keyof typeof DEFAULTS; label: string; desc: string }) => (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={s[k] as boolean} onChange={(e) => set(k, e.target.checked as never)} className="mt-1 h-4 w-4 accent-brand-600" />
      <span>
        <span className="block text-sm font-medium text-gray-900">{label}</span>
        <span className="block text-sm text-gray-500">{desc}</span>
      </span>
    </label>
  );

  return (
    <SectionCard
      title="Platform Settings"
      subtitle="Configure your platform settings and preferences"
      actions={
        <button onClick={onSave} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2ZM17 21v-8H7v8M7 3v5h8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {saved ? "Saved ✓" : "Save Changes"}
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8 7 17M17 7l2.8-2.8" strokeLinecap="round" /></svg>
            General Settings
          </h3>
          <div className="space-y-4">
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Platform Name</label><input className={input} value={s.platformName} onChange={(e) => set("platformName", e.target.value)} /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Support Email</label><input className={input} value={s.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} /></div>
            <Check k="maintenanceMode" label="Maintenance Mode" desc="Enable this to put the platform in maintenance mode" />
            <Check k="allowRegistrations" label="Allow New Registrations" desc="Allow new users to register on the platform" />
            <Check k="requireEmailVerification" label="Require Email Verification" desc="Require users to verify their email before accessing the platform" />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
            Security Settings
          </h3>
          <div className="space-y-4">
            <Check k="twoFA" label="Require Two-Factor Authentication" desc="Require all users to enable 2FA" />
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Session Timeout (minutes)</label><input type="number" className={input} value={s.sessionTimeout} onChange={(e) => set("sessionTimeout", parseInt(e.target.value) || 0)} /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Minimum Password Length</label><input type="number" className={input} value={s.minPasswordLength} onChange={(e) => set("minPasswordLength", parseInt(e.target.value) || 0)} /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Max Login Attempts</label><input type="number" className={input} value={s.maxLoginAttempts} onChange={(e) => set("maxLoginAttempts", parseInt(e.target.value) || 0)} /></div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4zM4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Notification Settings
          </h3>
          <div className="space-y-4">
            <Check k="emailNotifs" label="Email Notifications" desc="Send notifications via email" />
            <Check k="smsNotifs" label="SMS Notifications" desc="Send notifications via SMS" />
            <Check k="pushNotifs" label="Push Notifications" desc="Send push notifications to mobile devices" />
            <Check k="marketingEmails" label="Marketing Emails" desc="Send marketing and promotional emails" />
            <button className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50" onClick={() => alert("Email service is not configured yet")}>Send Test Email</button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
            Database Settings
          </h3>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-gray-50 p-4"><p className="text-sm text-gray-600">Database Size</p><p className="mt-1 text-xl font-semibold text-gray-900">{dbSize}</p></div>
            <div className="rounded-lg bg-gray-50 p-4"><p className="text-sm text-gray-600">Backups</p><p className="mt-1 text-xl font-semibold text-gray-900">Manual</p></div>
          </div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Backup Frequency</label>
          <select className={input} value={s.backupFrequency} onChange={(e) => set("backupFrequency", e.target.value)}>
            <option>Daily</option><option>Weekly</option><option>Monthly</option>
          </select>
        </div>
      </div>
    </SectionCard>
  );
}
