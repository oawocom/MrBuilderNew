"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdminUserRow, SectionCard, UsersSection, ExportButton } from "@/components/admin/shared";

export default function CustomersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const load = useCallback(() => {
    api<AdminUserRow[]>("/admin/users?role=consumer&limit=100").then((r) => r.success && r.data && setUsers(r.data));
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <SectionCard title="Users Management" subtitle="Manage platform users and their permissions" actions={<ExportButton rows={users} filename="customers" />}>
      <UsersSection users={users} typeBadge="HOMEOWNER" reload={load} />
    </SectionCard>
  );
}
