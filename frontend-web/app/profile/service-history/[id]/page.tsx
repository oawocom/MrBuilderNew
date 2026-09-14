"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, getUser, User } from "@/lib/api";
import { Job, Quote } from "@/lib/types";
import { Card, PageHeader, StatusBadge } from "@/components/dashboard/ui";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteForm, setQuoteForm] = useState({ amount: "", title: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<Job>(`/jobs/${id}`).then((res) => res.success && res.data && setJob(res.data));
    api<Quote[]>(`/jobs/${id}/quotes`).then((res) => setQuotes(res.success && res.data ? res.data : []));
  }, [id]);

  useEffect(() => {
    setUser(getUser());
    load();
  }, [load]);

  async function act(fn: () => Promise<{ success: boolean; error?: string }>) {
    setBusy(true);
    setError("");
    const res = await fn();
    if (!res.success) setError(res.error ?? "Action failed");
    load();
    setBusy(false);
  }

  if (!user || !job) return null;
  const isConsumer = user.role === "consumer";
  const isOwner = job.consumer_id === user.id;
  const isAssigned = job.contractor_id === user.id;
  const myQuote = quotes.find((q) => q.contractor_id === user.id);
  const input = "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-base shadow-sm focus:border-brand-500 focus:outline-none";

  return (
    <div>
      <PageHeader
        title={job.title}
        subtitle={`${job.job_type} · ${job.location_city ?? "—"}${job.location_state ? `, ${job.location_state}` : ""}`}
        action={<StatusBadge status={job.status} />}
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid max-w-4xl gap-6">
        <Card>
          <h3 className="mb-2 font-semibold">Details</h3>
          <p className="text-gray-600">{job.description || "No description provided."}</p>
          {job.payment_amount ? <p className="mt-3 text-lg font-bold">${job.payment_amount}</p> : null}
        </Card>

        {/* Lifecycle actions */}
        <div className="flex flex-wrap gap-3">
          {isAssigned && job.status === "accepted" && (
            <button disabled={busy} onClick={() => act(() => api(`/jobs/${job.id}/start`, { method: "PATCH" }))} className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white">Start job</button>
          )}
          {isAssigned && job.status === "in_progress" && (
            <button disabled={busy} onClick={() => act(() => api(`/jobs/${job.id}/complete`, { method: "PATCH" }))} className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white">Mark completed</button>
          )}
          {isOwner && job.status === "completed" && (
            <button disabled={busy} onClick={() => act(() => api(`/jobs/${job.id}/confirm`, { method: "PATCH" }))} className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white">Confirm completion</button>
          )}
          {(isOwner || isAssigned) && ["posted", "accepted", "in_progress"].includes(job.status) && (
            <button
              disabled={busy}
              onClick={() => {
                const reason = prompt("Cancellation reason:");
                if (reason) act(() => api(`/jobs/${job.id}/cancel`, { method: "PATCH", body: { reason } }));
              }}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-semibold text-gray-700"
            >
              Cancel
            </button>
          )}
          {(isOwner || isAssigned) && job.contractor_id && (
            <button
              disabled={busy}
              onClick={async () => {
                const res = await api<{ id: string }>(`/jobs/${job.id}/conversation`, { method: "POST" });
                if (res.success && res.data) router.push(`/profile/appointments?conversation=${res.data.id}`);
              }}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 font-semibold text-gray-700"
            >
              Open chat
            </button>
          )}
        </div>

        {/* Quotes */}
        <Card>
          <h3 className="mb-4 font-semibold">Quotes {quotes.length > 0 && `(${quotes.length})`}</h3>

          {quotes.length === 0 && <p className="text-sm text-gray-500">No quotes yet.</p>}

          <div className="space-y-3">
            {quotes.map((q) => (
              <div key={q.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                <div>
                  <p className="font-semibold">${q.amount}{q.title ? ` — ${q.title}` : ""}</p>
                  {q.description && <p className="mt-0.5 text-sm text-gray-500">{q.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={q.status} />
                  {isOwner && q.status === "pending" && job.status === "posted" && (
                    <>
                      <button disabled={busy} onClick={() => act(() => api(`/quotes/${q.id}/accept`, { method: "PATCH" }))} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Accept</button>
                      <button disabled={busy} onClick={() => act(() => api(`/quotes/${q.id}/reject`, { method: "PATCH" }))} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700">Reject</button>
                    </>
                  )}
                  {!isConsumer && q.contractor_id === user.id && q.status === "pending" && (
                    <button disabled={busy} onClick={() => act(() => api(`/quotes/${q.id}/withdraw`, { method: "PATCH" }))} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700">Withdraw</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Contractor: send quote */}
          {!isConsumer && job.status === "posted" && !myQuote && (
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h4 className="mb-3 font-semibold">Send your quote</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Amount (USD)*</label><input type="number" className={input} value={quoteForm.amount} onChange={(e) => setQuoteForm((p) => ({ ...p, amount: e.target.value }))} /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-gray-700">Title</label><input className={input} value={quoteForm.title} onChange={(e) => setQuoteForm((p) => ({ ...p, title: e.target.value }))} /></div>
                <div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label><textarea rows={2} className={input} value={quoteForm.description} onChange={(e) => setQuoteForm((p) => ({ ...p, description: e.target.value }))} /></div>
              </div>
              <button
                disabled={busy || !quoteForm.amount}
                onClick={() => act(() => api(`/jobs/${job.id}/quotes`, { method: "POST", body: { amount: parseFloat(quoteForm.amount), title: quoteForm.title || undefined, description: quoteForm.description || undefined } }))}
                className="mt-4 rounded-lg bg-brand-600 px-6 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                Send quote
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
