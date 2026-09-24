// Server-side fetch of admin-managed website content (App content page in /manage)
const API = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "https://mrbuilder.com/api/v1";
export interface SiteContent { app_links: Record<string, string>; company: { legal_name: string; address: string; email: string; tagline: string }; support: { phone: string; email: string }; categories: { slug: string; name: string }[] }
const FALLBACK: SiteContent = { app_links: {}, company: { legal_name: "MrBuilder", address: "", email: "hello@mrbuilder.com", tagline: "Connecting outdoor living installation, repair and service needs with the professionals who carry out the work." }, support: { phone: "", email: "support@mrbuilder.com" }, categories: [] };
export async function getContent(): Promise<SiteContent> {
  try { const r = await fetch(`${API}/content`, { next: { revalidate: 300 } }); const j = await r.json(); return { ...FALLBACK, ...(j.data ?? {}), company: { ...FALLBACK.company, ...(j.data?.company ?? {}) }, app_links: j.data?.app_links ?? {} }; } catch { return FALLBACK; }
}
export async function getLegal(kind: string): Promise<{ updated: string; sections: [string, string][] } | null> {
  try { const r = await fetch(`${API}/legal/${kind}`, { next: { revalidate: 300 } }); const j = await r.json(); return j.data ?? null; } catch { return null; }
}
