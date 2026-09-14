"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, getUser, User } from "@/lib/api";
import { Job } from "@/lib/types";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/dashboard/ui";

export default function DashboardHome() {
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    api<Job[]>("/jobs/me?limit=5").then((res) => {
      if (res.success && res.data) {
        setJobs(res.data);
        setTotal(res.meta?.total ?? res.data.length);
      }
      setLoading(false);
    });
  }, []);

  if (!user) return null;
  const isConsumer = user.role === "consumer";

  const active = jobs.filter((j) => ["accepted", "in_progress"].includes(j.status)).length;
  const done = jobs.filter((j) => ["completed", "confirmed"].includes(j.status)).length;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.first_name}`}
        subtitle={isConsumer ? "Manage your pergola service requests" : "Find jobs and manage your work"}
        action={
          isConsumer ? (
            <Link href="/profile/service-history?new=1" className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-brand-700">
              + Request a service
            </Link>
          ) : (
            <Link href="/profile/service-history" className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-brand-700">
              Browse open jobs
            </Link>
          )
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><p className="text-sm text-gray-500">Total requests</p><p className="mt-1 text-3xl font-bold">{total}</p></Card>
        <Card><p className="text-sm text-gray-500">Active</p><p className="mt-1 text-3xl font-bold">{active}</p></Card>
        <Card><p className="text-sm text-gray-500">Completed</p><p className="mt-1 text-3xl font-bold">{done}</p></Card>
      </div>

      <h2 className="mb-4 text-lg font-semibold">Recent activity</h2>
      {loading ? null : jobs.length === 0 ? (
        <EmptyState
          text={isConsumer ? "No service requests yet." : "No assigned jobs yet."}
          action={
            isConsumer && (
              <Link href="/profile/service-history?new=1" className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white">
                Create your first request
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <Link key={j.id} href={`/profile/service-history/${j.id}`} className="block">
              <Card className="flex items-center justify-between transition hover:border-brand-300">
                <div>
                  <p className="font-semibold">{j.title}</p>
                  <p className="mt-0.5 text-sm capitalize text-gray-500">
                    {j.job_type} · {j.location_city ?? "—"}{j.location_state ? `, ${j.location_state}` : ""}
                  </p>
                </div>
                <StatusBadge status={j.status} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
