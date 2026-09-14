"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdminJobRow, JobsSection, SectionCard, ExportButton } from "@/components/admin/shared";

export default function AppointmentsPage() {
  const [jobs, setJobs] = useState<AdminJobRow[]>([]);
  useEffect(() => {
    api<AdminJobRow[]>("/admin/jobs?limit=100").then((r) => {
      if (r.success && r.data) setJobs(r.data.filter((j) => ["accepted", "in_progress"].includes(j.status)));
    });
  }, []);
  return (
    <SectionCard title="Appointments" subtitle="Manage and monitor all scheduled appointments" actions={<ExportButton rows={jobs} filename="appointments" />}>
      {jobs.length ? <JobsSection jobs={jobs} /> : <p className="py-16 text-center text-gray-500">No scheduled or active appointments.</p>}
    </SectionCard>
  );
}
