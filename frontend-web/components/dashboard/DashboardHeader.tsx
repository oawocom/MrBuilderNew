"use client";

import { useEffect, useState } from "react";
import { getUser, User } from "@/lib/api";

export default function DashboardHeader() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => { setUser(getUser()); }, []);
  if (!user) return null;
  return (
    <div className="border-b border-gray-200 bg-white px-4 py-5 lg:px-8">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-400">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="7" r="4" /></svg>
        </span>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Welcome back, {user.first_name}</h2>
          <p className="text-sm text-gray-500">
            {user.role === "admin" ? "Your personalized admin dashboard" : "Your personalized customer dashboard"}
          </p>
        </div>
      </div>
    </div>
  );
}
