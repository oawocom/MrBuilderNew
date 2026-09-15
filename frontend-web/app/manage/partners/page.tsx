"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AdminTable, Badge, SearchInput } from "@/components/dashboard/table";
import { SectionCard, ExportButton } from "@/components/admin/shared";

interface P { id: string; company_name: string; contact_person: string; email: string; phone: string | null; website_url: string | null; type_of_business: string; message: string | null; country?: string | null; created_at: string; }

const TYPES = ["", "manufacturer", "retailer_or_reseller", "designer_or_builder", "architect_or_home_developer", "other"];

export default function PartnersPage() {
  const [partners, setPartners] = useState<P[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api<P[]>("/admin/partner-requests").then((r) => r.success && r.data && setPartners(r.data));
  }, []);

  const q = search.toLowerCase();
  const rows = partners.filter((p) =>
    (!q || p.company_name.toLowerCase().includes(q) || p.contact_person.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)) &&
    (!type || p.type_of_business === type)
  );

  return (
    <SectionCard title="Partner Requests" subtitle="Review and manage partnership applications" actions={<ExportButton rows={partners} filename="partners" />}>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Search partners..." />
          <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 capitalize shadow-sm focus:border-brand-500 focus:outline-none">
            {TYPES.map((t) => <option key={t} value={t}>{t ? t.replace(/_/g, " ") : "All Types"}</option>)}
          </select>
        </div>
        <AdminTable headers={["Company", "Contact", "Type", "Country", "Applied", ""]}>
          {rows.map((p) => (
            <>
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </span>
                    <p className="text-sm font-medium text-gray-900">{p.company_name}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-700">{p.contact_person}</p>
                  <p className="text-sm text-gray-500">{p.email}</p>
                  {p.phone && <p className="text-sm text-gray-500">{p.phone}</p>}
                </td>
                <td className="px-6 py-4"><Badge color="blue">{p.type_of_business.replace(/_/g, " ")}</Badge></td>
                <td className="px-6 py-4 text-sm text-gray-700">{p.country ?? "United States"}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => setOpen(open === p.id ? null : p.id)} className="text-sm font-semibold text-gray-700 hover:text-gray-900">View Details</button>
                </td>
              </tr>
              {open === p.id && (
                <tr key={p.id + "-d"}>
                  <td colSpan={6} className="bg-gray-50 px-6 py-4">
                    <p className="text-sm text-gray-700"><span className="font-medium">Message:</span> {p.message ?? "—"}</p>
                    {p.website_url && <p className="mt-1 text-sm"><span className="font-medium text-gray-700">Website:</span> <a href={p.website_url} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">{p.website_url}</a></p>}
                  </td>
                </tr>
              )}
            </>
          ))}
        </AdminTable>
      </div>
    </SectionCard>
  );
}
