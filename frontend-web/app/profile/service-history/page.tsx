"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, getUser, User } from "@/lib/api";
import { Job } from "@/lib/types";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/dashboard/ui";

const SERVICE_TYPES = [
  { label: "Inspection", value: "inspection" },
  { label: "Maintenance", value: "maintenance" },
  { label: "Repair", value: "repair" },
  { label: "New Installation", value: "installation" },
];

function NewRequestForm({ onCreated }: { onCreated: () => void }) {
  const [f, setF] = useState({ title: "", job_type: "repair", description: "", location_city: "", location_state: "", preferred_start_date: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const input = "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-base shadow-sm focus:border-brand-500 focus:outline-none";

  async function onSubmit() {
    setError("");
    if (!f.title) { setError("Title is required"); return; }
    setLoading(true);
    const body: Record<string, unknown> = { title: f.title, job_type: f.job_type, description: f.description || undefined, location_city: f.location_city || undefined, location_state: f.location_state || undefined };
    if (f.preferred_start_date) body.preferred_start_date = f.preferred_start_date;
    const res = await api("/jobs", { method: "POST", body });
    setLoading(false);
    if (!res.success) { setError(res.error ?? "Failed to create request"); return; }
    onCreated();
  }

  return (
    <Card className="mb-6">
      <h3 className="mb-4 font-semibold">New service request</h3>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-medium text-gray-700">Title*</label><input className={input} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Louver motor not working" /></div>
        <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Service type*</label>
          <select className={input} value={f.job_type} onChange={(e) => set("job_type", e.target.value)}>
            {SERVICE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Preferred date</label><input type="date" className={input} value={f.preferred_start_date} onChange={(e) => set("preferred_start_date", e.target.value)} /></div>
        <div><label className="mb-1.5 block text-sm font-medium text-gray-700">City</label><input className={input} value={f.location_city} onChange={(e) => set("location_city", e.target.value)} /></div>
        <div><label className="mb-1.5 block text-sm font-medium text-gray-700">State</label><input className={input} value={f.location_state} onChange={(e) => set("location_state", e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-medium text-gray-700">Problem description</label><textarea rows={3} className={input} value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
      </div>
      <button onClick={onSubmit} disabled={loading} className="mt-4 rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-60">
        {loading ? "Submitting..." : "Submit request"}
      </button>
    </Card>
  );
}

function JobList({ jobs, hrefBase }: { jobs: Job[]; hrefBase: string }) {
  return (
    <div className="space-y-3">
      {jobs.map((j) => (
        <Link key={j.id} href={`${hrefBase}/${j.id}`} className="block">
          <Card className="flex items-center justify-between transition hover:border-brand-300">
            <div>
              <p className="font-semibold">{j.title}</p>
              <p className="mt-0.5 text-sm capitalize text-gray-500">
                {j.job_type} · {j.location_city ?? "—"}{j.location_state ? `, ${j.location_state}` : ""}
                {j.payment_amount ? ` · $${j.payment_amount}` : ""}
              </p>
            </div>
            <StatusBadge status={j.status} />
          </Card>
        </Link>
      ))}
    </div>
  );
}

function ServiceHistoryInner() {
  const params = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<"mine" | "open">("mine");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showForm, setShowForm] = useState(params.get("new") === "1");
  const [loading, setLoading] = useState(true);

  const load = useCallback((who: "mine" | "open") => {
    setLoading(true);
    api<Job[]>(who === "mine" ? "/jobs/me?limit=50" : "/jobs?limit=50").then((res) => {
      setJobs(res.success && res.data ? res.data : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    const initialTab = u?.role === "contractor" ? "open" : "mine";
    setTab(initialTab);
    load(initialTab);
  }, [load]);

  if (!user) return null;
  const isConsumer = user.role === "consumer";

  return (
    <div>
      <PageHeader
        title={isConsumer ? "Service history" : "Jobs"}
        subtitle={isConsumer ? "Your service requests and their status" : "Browse open jobs and manage your assigned work"}
        action={
          isConsumer && (
            <button onClick={() => setShowForm((s) => !s)} className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-brand-700">
              {showForm ? "Close form" : "+ Request a service"}
            </button>
          )
        }
      />

      {isConsumer && showForm && <NewRequestForm onCreated={() => { setShowForm(false); load("mine"); }} />}

      {!isConsumer && (
        <div className="mb-6 flex gap-2">
          <button onClick={() => { setTab("open"); load("open"); }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "open" ? "bg-brand-600 text-white" : "border border-gray-300 bg-white text-gray-700"}`}>Open jobs</button>
          <button onClick={() => { setTab("mine"); load("mine"); }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "mine" ? "bg-brand-600 text-white" : "border border-gray-300 bg-white text-gray-700"}`}>My jobs</button>
        </div>
      )}

      {loading ? null : jobs.length === 0 ? (
        <EmptyState text={tab === "open" ? "No open jobs right now." : isConsumer ? "No service requests yet." : "No assigned jobs yet."} />
      ) : (
        <JobList jobs={jobs} hrefBase="/profile/service-history" />
      )}
    </div>
  );
}

export default function ServiceHistoryPage() {
  return (
    <Suspense>
      <ServiceHistoryInner />
    </Suspense>
  );
}
