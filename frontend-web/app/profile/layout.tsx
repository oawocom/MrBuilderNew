"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { getUser } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getUser()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <main className="flex min-h-screen w-full flex-col lg:flex-row">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        <div className="flex-1 p-4 lg:p-8">{children}</div>
      </div>
    </main>
  );
}
