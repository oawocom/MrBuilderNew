"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, clearSession, getUser, User } from "@/lib/api";

const adminItems = [
  { label: "Dashboard", href: "/manage", icon: "shield" },
  { label: "Jobs", href: "/manage/jobs", icon: "clock" },
  { label: "Contractors", href: "/manage/contractors", icon: "user" },
  { label: "Customers", href: "/manage/customers", icon: "user" },
  { label: "Payouts", href: "/manage/payouts", icon: "dollar" },
  { label: "MrCare claims", href: "/manage/mrcare", icon: "check" },
  { label: "Mr Supply", href: "/manage/store", icon: "pie" },
  { label: "Training", href: "/manage/training", icon: "file" },
  { label: "Pricing", href: "/manage/pricing", icon: "trend" },
  { label: "Platform settings", href: "/manage/settings", icon: "settings" },
  { label: "Integrations", href: "/manage/integrations", icon: "settings" },
  { label: "Transactions", href: "/manage/transactions", icon: "dollar" },
  { label: "Warranties", href: "/manage/warranties", icon: "check" },
  { label: "Waitlist", href: "/manage/waitlist", icon: "clock" },
  { label: "Partners", href: "/manage/partners", icon: "user" },
  { label: "App content", href: "/manage/content", icon: "file" },
  { label: "Website leads", href: "/manage/leads", icon: "mail" },
  { label: "Email templates", href: "/manage/emails", icon: "mail" },
  { label: "Team", href: "/manage/team", icon: "user" },
];

const items = [
  { label: "My requests", href: "/profile", icon: "clock" },
  { label: "New request", href: "/profile/requests/new", icon: "chart" },
  { label: "My pergolas", href: "/profile/pergolas", icon: "pie" },
  { label: "MrCare", href: "/profile/mrcare", icon: "check" },
  { label: "Documents", href: "/profile/documents", icon: "file" },
  { label: "Settings", href: "/profile/settings", icon: "settings" },
];

const contractorItems = [
  { label: "Overview", href: "/profile/contractor", icon: "shield" },
  { label: "Settings", href: "/profile/settings", icon: "settings" },
];

function Icon({ name }: { name: string }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "chart": return <svg {...common}><path d="M3 3v18h18" /><path d="M7 14v4M12 10v8M17 6v12" /></svg>;
    case "user": return <svg {...common}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
    case "clock": return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
    case "file": return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></svg>;
    case "check": return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M9 15l2 2 4-4" /></svg>;
    case "pie": return <svg {...common}><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10Z" /></svg>;
    case "chat": return <svg {...common}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /></svg>;
    case "shield": return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>;
    case "trend": return <svg {...common}><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></svg>;
    case "settings": return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>;
    case "dollar": return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M12 6v12M15 9.5c0-1-1.3-1.5-3-1.5s-3 .7-3 1.8c0 2.6 6 1.5 6 4.2 0 1.1-1.3 1.8-3 1.8s-3-.5-3-1.5" /></svg>;
    default: return null;
  }
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setUser(getUser());
  }, []);

  async function onLogout() {
    const refresh = localStorage.getItem("mrb_refresh");
    if (refresh) await api("/logout", { method: "POST", body: { refresh_token: refresh } });
    clearSession();
    router.replace("/login");
  }

  const nav = (
    <aside className="flex h-full w-full max-w-full flex-col justify-between overflow-auto border-gray-200 bg-white pt-4 md:border-r lg:w-[296px] lg:pt-6">
      <div className="flex flex-col gap-5 px-4 pb-6 lg:px-5">
        <Link href="/">
          <Image src="/logo.png" alt="Logo" width={140} height={84} className="h-9 w-auto" />
        </Link>
      </div>

      <nav className="flex-1 px-2 lg:px-4">
        <ul className="flex flex-col gap-0.5">
          {(user?.role === "admin" ? adminItems : user?.role === "contractor" ? contractorItems : items).map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-base font-semibold transition ${
                    active ? "bg-gray-50 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className="text-gray-400"><Icon name={item.icon} /></span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto flex flex-col gap-4 px-2 py-4 lg:px-4 lg:py-6">
        {user && (
          <div className="relative flex items-center gap-3 rounded-xl p-3 ring-1 ring-gray-200 ring-inset">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">
              {user.first_name?.[0]}{user.last_name?.[0]}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-gray-700">{user.first_name} {user.last_name}</div>
              <div className="truncate text-xs text-gray-500">{user.email}</div>
            </div>
            <button onClick={onLogout} title="Sign out" className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <Image src="/logo.png" alt="Logo" width={120} height={72} className="h-8 w-auto" />
        <button onClick={() => setMobileOpen(true)} className="rounded-md p-1.5 hover:bg-gray-50" aria-label="Open menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" /></svg>
        </button>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[296px] bg-white shadow-2xl">{nav}</div>
        </div>
      )}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex">{nav}</div>
      <div className="invisible hidden lg:block" style={{ paddingLeft: 296 }} />
    </>
  );
}
