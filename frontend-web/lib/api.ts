"use client";

const API_BASE = "/api/v1";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "consumer" | "contractor" | "admin";
  status: string;
  phone?: string | null;
  avatar_url?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  meta?: { total: number; page: number; limit: number; unread?: number };
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mrb_access");
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("mrb_user");
  return raw ? (JSON.parse(raw) as User) : null;
}

export function storeSession(access: string, refresh: string, user: User) {
  localStorage.setItem("mrb_access", access);
  localStorage.setItem("mrb_refresh", refresh);
  localStorage.setItem("mrb_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("mrb_access");
  localStorage.removeItem("mrb_refresh");
  localStorage.removeItem("mrb_user");
}

async function refreshTokens(): Promise<boolean> {
  const refresh = localStorage.getItem("mrb_refresh");
  if (!refresh) return false;
  const res = await fetch(`${API_BASE}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  const body = (await res.json()) as ApiResponse<{ access_token: string; refresh_token: string }>;
  if (!res.ok || !body.success || !body.data) {
    clearSession();
    return false;
  }
  localStorage.setItem("mrb_access", body.data.access_token);
  localStorage.setItem("mrb_refresh", body.data.refresh_token);
  return true;
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
  retry = true
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 && retry && (await refreshTokens())) {
    return api<T>(path, options, false);
  }

  return (await res.json()) as ApiResponse<T>;
}
