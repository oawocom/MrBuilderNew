"use client";

import { useEffect, useState } from "react";

export function Btn({ children, onClick, kind = "primary", disabled, small, type = "button" }: { children: React.ReactNode; onClick?: () => void; kind?: "primary" | "secondary" | "danger" | "ghost"; disabled?: boolean; small?: boolean; type?: "button" | "submit" }) {
  const base = small ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm";
  const styles: Record<string, string> = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
    ghost: "text-gray-600 hover:bg-gray-100",
  };
  return <button type={type} disabled={disabled} onClick={onClick} className={`rounded-lg font-semibold shadow-sm disabled:opacity-50 ${base} ${styles[kind]}`}>{children}</button>;
}

export function Input({ label, value, onChange, type = "text", placeholder, hint, disabled }: { label?: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string; hint?: string; disabled?: boolean }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>}
      <input type={type} value={value} disabled={disabled} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none disabled:bg-gray-50" />
      {hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>}
    </label>
  );
}

export function Textarea({ label, value, onChange, rows = 3 }: { label?: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>}
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none" />
    </label>
  );
}

export function Select({ label, value, onChange, options }: { label?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <span onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-brand-600" : "bg-gray-300"}`}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </span>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-12">
      <div className={`w-full ${wide ? "max-w-5xl" : "max-w-2xl"} rounded-xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">✕</button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Toast({ msg, error }: { msg: string; error?: boolean }) {
  if (!msg) return null;
  return <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${error ? "bg-red-600 text-white" : "bg-gray-900 text-white"}`}>{msg}</div>;
}

export function useToast() {
  const [state, set] = useState<{ msg: string; error?: boolean }>({ msg: "" });
  useEffect(() => {
    if (!state.msg) return;
    const t = setTimeout(() => set({ msg: "" }), 3500);
    return () => clearTimeout(t);
  }, [state]);
  return { toast: <Toast msg={state.msg} error={state.error} />, show: (msg: string, error = false) => set({ msg, error }) };
}

export function money(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtDate(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-1.5 text-sm">
      <span className="text-gray-500">{k}</span>
      <span className="text-right font-medium text-gray-900">{v ?? "—"}</span>
    </div>
  );
}

export const jobStatusColor: Record<string, string> = {
  submitted: "gray", inspection_booked: "blue", inspection_done: "blue", quote_generating: "gray", quote_ready: "purple", quote_declined: "gray",
  matching: "blue", no_match_waitlist: "warning", assigned: "purple", en_route: "blue", arrived: "blue", in_progress: "warning", paused_safety: "error",
  awaiting_confirmation: "orange", completed_paid: "success", issue_reported: "error", dispute_open: "error", dispute_rejected: "warning",
  return_visit_scheduled: "warning", dispute_upheld: "success", reassigning: "warning", cancelled_by_client: "gray", cancelled_by_contractor: "gray",
  pending: "warning", approved: "blue", completed: "success", rejected: "error", paid: "success", packing: "blue", shipped: "purple", delivered: "success", cancelled: "gray",
  qualified: "success", training: "gray", practical_pending: "warning", revoked: "error", active: "success", suspended: "error", deactivated: "gray",
  under_review: "blue", denied: "error",
};
