"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/dashboard/table";
import { fmtDate, jobStatusColor, money } from "@/components/admin/ui";
import { api, getUser } from "@/lib/api";

interface Job { id: string; request_code: string; title: string; service_category: string; kind: string; status: string; quote_total: number | null; updated_at: string; contractor?: { first_name: string; last_name: string } | null; covered_by: string | null; scheduled_start: string | null; auto_confirm_at: string | null }

const nextAction: Record<string, string> = {
  quote_ready: "Review your quote", quote_declined: "Quote declined — start a new request", inspection_booked: "Finding an inspector", inspection_done: "Preparing your quote",
  matching: "Finding a contractor", no_match_waitlist: "On the waitlist — we'll notify you", assigned: "Contractor assigned", en_route: "Contractor on the way", arrived: "Contractor on site",
  in_progress: "Work in progress", paused_safety: "Work paused for safety", awaiting_confirmation: "Confirm the work to release payment", issue_reported: "Issue reported — contractor reviewing",
  dispute_open: "Under review by MrBuilder", dispute_rejected: "Contractor will return", return_visit_scheduled: "Return visit scheduled", completed_paid: "Completed & paid", dispute_upheld: "Completed",
  reassigning: "Finding a new contractor", cancelled_by_client: "Cancelled", cancelled_by_contractor: "Cancelled", submitted: "Submitted",
};
const terminal = ["completed_paid", "dispute_upheld", "cancelled_by_client", "cancelled_by_contractor", "quote_declined"];

export default function ProfileDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tab, setTab] = useState<"active" | "past">("active");
  const u = getUser();
  useEffect(() => { api<Job[]>("/jobs/me?limit=100").then((r) => setJobs(r.data ?? [])); }, []);
  const shown = jobs.filter((j) => (tab === "active" ? !terminal.includes(j.status) : terminal.includes(j.status)));
  const needs = jobs.filter((j) => ["quote_ready", "awaiting_confirmation"].includes(j.status));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-semibold text-gray-900">Hi {u?.first_name}</h1><p className="text-sm text-gray-600">Your pergola requests, quotes and jobs</p></div>
        <Link href="/profile/requests/new" className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">+ New request</Link>
      </div>
      {needs.length > 0 && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
          <p className="text-sm font-semibold text-brand-800">Waiting on you</p>
          <ul className="mt-2 space-y-1">{needs.map((j) => <li key={j.id}><Link href={`/profile/requests/${j.id}`} className="text-sm text-brand-700 underline">{j.request_code} · {j.title} — {nextAction[j.status]}</Link></li>)}</ul>
        </div>
      )}
      <div className="flex gap-2 border-b border-gray-200">{(["active", "past"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize ${tab === t ? "border-b-2 border-brand-600 text-gray-900" : "text-gray-500"}`}>{t}</button>)}</div>
      {shown.length === 0 && <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">{tab === "active" ? "No active requests. Start one and get an instant quote." : "No past requests yet."}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        {shown.map((j) => (
          <Link key={j.id} href={`/profile/requests/${j.id}`} className="rounded-xl border border-gray-200 bg-white p-5 hover:border-brand-300">
            <div className="flex items-start justify-between gap-3">
              <div><div className="text-xs text-gray-500">{j.request_code} · <span className="capitalize">{j.service_category}</span>{j.covered_by && <span className="ml-2 rounded bg-emerald-50 px-1.5 text-emerald-700">MrCare</span>}</div><div className="mt-0.5 font-semibold text-gray-900">{j.title}</div></div>
              <Badge color={jobStatusColor[j.status] ?? "gray"}>{j.status.replace(/_/g, " ")}</Badge>
            </div>
            <div className="mt-3 text-sm text-gray-700">{nextAction[j.status] ?? j.status}</div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>{j.contractor ? `${j.contractor.first_name} ${j.contractor.last_name[0]}.` : "No contractor yet"}{j.scheduled_start ? ` · ${fmtDate(j.scheduled_start)}` : ""}</span>
              <span className="font-medium text-gray-900">{j.quote_total !== null ? money(j.quote_total) : ""}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
