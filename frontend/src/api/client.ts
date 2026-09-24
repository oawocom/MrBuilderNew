import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

export const API_URL: string = Constants.expoConfig?.extra?.apiUrl ?? "https://mrbuilder.com/api/v1";
export const APP_VARIANT: "consumer" | "contractor" = Constants.expoConfig?.extra?.variant ?? "consumer";

export interface ApiResponse<T> { success: boolean; message?: string; error?: string; data?: T; meta?: { total?: number; page?: number; limit?: number; locked?: boolean; unread?: number }; missing?: string[] }

const K = { access: "mrb_access", refresh: "mrb_refresh" };
let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
let onUnauthorized: (() => void) | null = null;

export const tokens = {
  async load() { accessToken = await SecureStore.getItemAsync(K.access); return accessToken; },
  async set(access: string, refresh: string) { accessToken = access; await SecureStore.setItemAsync(K.access, access); await SecureStore.setItemAsync(K.refresh, refresh); },
  async clear() { accessToken = null; await SecureStore.deleteItemAsync(K.access); await SecureStore.deleteItemAsync(K.refresh); },
  get() { return accessToken; },
  setUnauthorizedHandler(fn: () => void) { onUnauthorized = fn; },
};

async function refresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const rt = await SecureStore.getItemAsync(K.refresh);
    if (!rt) return false;
    try {
      const res = await fetch(`${API_URL}/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: rt }) });
      const body = (await res.json()) as ApiResponse<{ access_token: string; refresh_token: string }>;
      if (!res.ok || !body.data) { await tokens.clear(); return false; }
      await tokens.set(body.data.access_token, body.data.refresh_token);
      return true;
    } catch { return false; }
  })();
  const ok = await refreshing;
  refreshing = null;
  return ok;
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; retry?: boolean } = {}): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  try {
    const res = await fetch(`${API_URL}${path}`, { method: opts.method ?? "GET", headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
    if (res.status === 401 && opts.retry !== false) {
      if (await refresh()) return api<T>(path, { ...opts, retry: false });
      onUnauthorized?.();
      return { success: false, error: "Session expired" };
    }
    const text = await res.text();
    try { return JSON.parse(text) as ApiResponse<T>; } catch { return { success: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` }; }
  } catch (e) {
    return { success: false, error: "No connection. Check your internet and try again." };
  }
}

// Upload a local file (uri) via a presigned URL. Returns the public URL.
export async function uploadFile(uri: string, purpose: string, contentType = "image/jpeg"): Promise<string | null> {
  const name = uri.split("/").pop() ?? `photo-${Date.now()}.jpg`;
  const r = await api<{ upload_url: string; public_url: string; headers: Record<string, string> }>("/uploads", { method: "POST", body: { filename: name, content_type: contentType, purpose } });
  if (!r.success || !r.data) return null;
  const blob = await (await fetch(uri)).blob();
  const put = await fetch(r.data.upload_url, { method: "PUT", headers: r.data.headers, body: blob });
  return put.ok ? r.data.public_url : null;
}

// ---- shared types ----
export interface User { id: string; email: string; first_name: string; last_name: string; role: "consumer" | "contractor" | "admin"; status: string; phone?: string | null; avatar_url?: string | null }
export interface Party { id: string; first_name: string; last_name: string; phone?: string | null; avatar_url?: string | null }
export interface QuoteLine { label: string; qty: number; unit_amount: number; amount: number }
export interface Quote { id: string; version: number; status: string; total: number; platform_fee: number; contractor_net: number; inspection_credit: number; valid_until: string | null; line_items: QuoteLine[] }
export interface Job {
  id: string; request_code: string; title: string; service_category: string; kind: string; status: string; quote_method: string;
  quote_total: number | null; platform_fee: number | null; contractor_net: number | null; tip: number; consumer_charged: number | null; inspection_fee: number; inspection_fee_credit: number;
  location_address: string | null; location_city: string | null; location_state: string | null; location_lat: number | null; location_lng: number | null;
  notes: string | null; issue_description: string | null; urgency: string | null; mounting: string | null; width_ft: number | null; length_ft: number | null; height_ft: number | null;
  pergola_spec: { structure_type?: string; enclosures?: { type: string }[]; accessories?: { type: string; qty: number }[]; footings?: { involved?: boolean; ready?: boolean; count?: number } };
  preferred_start_date?: string | null; preferred_end_date?: string | null; scheduled_start: string | null; return_visit_at: string | null; auto_confirm_at: string | null; en_route_eta_minutes: number | null; pause_reason: string | null; completion_note: string | null;
  checklist_done: string[]; damage_flagged: boolean; covered_by: string | null; is_assessment: boolean; reschedule_pending_by: string | null; distance_miles?: number | null;
  consumer?: Party | null; contractor?: Party | null; quotes?: Quote[]; images: string[]; created_at: string; updated_at: string; paid_at?: string | null;
  inspection_report?: { findings: string | null; measurements?: Record<string, unknown>; photos: { url: string; label?: string }[]; pdf_url: string | null; submitted_at?: string } | null;
}
export interface Category { slug: string; name: string; requires_practical: boolean; pre_job_checklist: { id: string; text: string; critical: boolean }[] }
