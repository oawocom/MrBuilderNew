"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, storeSession, User } from "@/lib/api";
import Header from "@/components/Header";
import HeroGrid from "@/components/HeroGrid";
import FeaturedIcon from "@/components/FeaturedIcon";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    setError("");
    setIsLoading(true);
    const res = await api<{ access_token: string; refresh_token: string; user: User }>(
      "/login",
      { method: "POST", body: { email, password } }
    );
    setIsLoading(false);
    if (!res.success || !res.data) {
      setError(res.error ?? "Login failed. Please try again.");
      return;
    }
    storeSession(res.data.access_token, res.data.refresh_token, res.data.user);
    router.push("/dashboard");
  }

  const input =
    "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-base shadow-sm placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10";

  return (
    <>
    <Header />
    <div className="relative flex min-h-[calc(100vh-120px)] items-center justify-center px-4">
      <HeroGrid />
      <div className="flex h-full w-full max-w-[400px] flex-col items-center justify-center gap-12">
        <div className="flex w-full flex-col items-center gap-3">
          <FeaturedIcon>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </FeaturedIcon>
          <h3 className="text-3xl font-bold text-gray-900">Login</h3>
        </div>

        <form className="flex w-full flex-col gap-4" onSubmit={onSubmit}>
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
            <input type="email" placeholder="Email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
            <input type="password" placeholder="Password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-brand-600 py-3.5 text-base font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-60"
          >
            {isLoading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="font-medium text-gray-700">
          Don&apos;t have an account?{" "}
          <Link className="text-brand-700 underline" href="/register">
            Register
          </Link>
        </p>
      </div>
    </div>
  </>
  );
}
