"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdminUserRow, SectionCard, UsersSection, ExportButton } from "@/components/admin/shared";

export default function TeamPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const load = useCallback(() => {
    api<AdminUserRow[]>("/admin/users?role=contractor&limit=100").then((r) => r.success && r.data && setUsers(r.data));
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <SectionCard title="Team Management" subtitle="Manage contractors and service teams" actions={<ExportButton rows={users} filename="team" />}>
      <UsersSection users={users} typeBadge="CONTRACTOR" reload={load} />
    </SectionCard>
  );
}
