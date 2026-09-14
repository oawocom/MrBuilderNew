"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, storeSession, User } from "@/lib/api";
import Header from "@/components/Header";
import HeroGrid from "@/components/HeroGrid";
import FeaturedIcon from "@/components/FeaturedIcon";

const ACCOUNT_TYPES = [
  "Homeowner",
  "Restaurant Or Hotel Manager",
  "Architect Or Designer",
  "Builder Or Contractor",
  "Outdoor Products Retailer",
  "Manufacturer Or Fabricator",
];

const STEPS = [
  { title: "Your details" },
  { title: "Address details" },
  { title: "Account Type" },
];

function StepIcon({ step }: { step: number }) {
  if (step === 1)
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  if (step === 2)
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    );
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [f, setF] = useState({
    firstName: "", lastName: "", email: "", phoneNumber: "", password: "",
    streetAddress: "", city: "", state: "", zip: "",
    accountType: "",
  });

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const stepValid =
    step === 1
      ? !!(f.firstName && f.lastName && f.email && f.phoneNumber && f.password.length >= 8)
      : step === 2
      ? !!(f.streetAddress && f.city && f.state && f.zip)
      : !!f.accountType;

  function goTo(n: number) {
    if (n >= 1 && n <= 3 && n <= maxReached) setStep(n);
  }

  async function onNext() {
    setError("");
    if (!stepValid) return;
    if (step < 3) {
      const n = step + 1;
      setStep(n);
      setMaxReached((m) => Math.max(m, n));
      return;
    }
    // Final submit
    setLoading(true);
    const role = f.accountType === "Builder Or Contractor" ? "contractor" : "consumer";
    const res = await api<{ access_token: string; refresh_token: string; user: User }>("/register", {
      method: "POST",
      body: {
        first_name: f.firstName,
        last_name: f.lastName,
        email: f.email,
        phone: f.phoneNumber,
        password: f.password,
        role,
      },
    });
    if (!res.success || !res.data) {
      setLoading(false);
      setError(res.error ?? "Failed to register");
      return;
    }
    storeSession(res.data.access_token, res.data.refresh_token, res.data.user);
    // Save address to profile
    await api("/profile", {
      method: "PUT",
      body: { address_line1: f.streetAddress, city: f.city, state: f.state, zip_code: f.zip, country: "US" },
    });
    setLoading(false);
    router.push("/dashboard");
  }

  const input =
    "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-base shadow-sm placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10";

  return (
    <>
    <Header />
    <div className="relative flex min-h-[calc(100vh-120px)] flex-col items-center justify-center overflow-hidden px-4 lg:px-0">
      <HeroGrid />
      <div className="mx-auto w-full max-w-[500px] py-12">
        <div className="flex w-full flex-col items-center gap-8">
          <FeaturedIcon>
            <StepIcon step={step} />
          </FeaturedIcon>
          <div className="flex w-full flex-col items-center gap-3">
            <h3 className="text-3xl font-bold text-gray-900">Sign up</h3>
            <p className="rounded-lg bg-gray-100 px-3 py-1.5 text-center text-base font-medium text-gray-700">
              {STEPS[step - 1].title}
            </p>
          </div>

          <div className="flex w-full flex-col gap-6">
            {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="flex flex-col gap-5">
              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">First name</label>
                      <input className={input} value={f.firstName} onChange={(e) => set("firstName", e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Last name</label>
                      <input className={input} value={f.lastName} onChange={(e) => set("lastName", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" className={input} value={f.email} onChange={(e) => set("email", e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone number</label>
                    <div className="flex">
                      <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-white px-3 text-gray-600">
                        +1 US
                      </span>
                      <input
                        className={input + " rounded-l-none"}
                        value={f.phoneNumber}
                        onChange={(e) => set("phoneNumber", e.target.value)}
                        placeholder="(555) 000-0000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
                    <input type="password" className={input} value={f.password} onChange={(e) => set("password", e.target.value)} />
                    <p className="mt-1.5 text-sm text-gray-500">Password must be at least 8 characters long</p>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Street address</label>
                    <input className={input} value={f.streetAddress} onChange={(e) => set("streetAddress", e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">City</label>
                    <input className={input} value={f.city} onChange={(e) => set("city", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">State</label>
                      <input className={input} value={f.state} onChange={(e) => set("state", e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">ZIP Code</label>
                      <input className={input} value={f.zip} onChange={(e) => set("zip", e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Account Type</label>
                  <select className={input} value={f.accountType} onChange={(e) => set("accountType", e.target.value)}>
                    <option value="">Select account type</option>
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={onNext}
              disabled={!stepValid || loading}
              className="w-full rounded-lg bg-brand-600 py-3 text-base font-semibold text-white shadow hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Next"}
            </button>
          </div>
        </div>

        {/* Pagination dots */}
        <div className="mt-20 flex items-center justify-center gap-3">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => goTo(n)}
              aria-label={`Step ${n}`}
              className={`h-2.5 rounded-full transition-all ${
                step === n ? "w-8 bg-brand-600" : n <= maxReached ? "w-2.5 bg-brand-300" : "w-2.5 bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      <p className="pb-10 font-medium text-gray-700">
        Already have an account?{" "}
        <Link className="text-brand-700 underline" href="/login">
          Login
        </Link>
      </p>
    </div>
  </>
  );
}
