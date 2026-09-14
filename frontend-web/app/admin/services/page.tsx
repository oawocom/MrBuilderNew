"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdminJobRow, JobsSection, SectionCard, ExportButton } from "@/components/admin/shared";

export default function ServicesPage() {
  const [jobs, setJobs] = useState<AdminJobRow[]>([]);
  useEffect(() => {
    api<AdminJobRow[]>("/admin/jobs?limit=100").then((r) => r.success && r.data && setJobs(r.data));
  }, []);
  return (
    <SectionCard title="Service Requests" subtitle="Manage and monitor all service requests" actions={<ExportButton rows={jobs} filename="services" />}>
      <JobsSection jobs={jobs} />
    </SectionCard>
  );
}
