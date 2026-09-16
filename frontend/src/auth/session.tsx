import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api, tokens, User, APP_VARIANT } from "../api/client";

interface Session {
  user: User | null; ready: boolean; error: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (b: { first_name: string; last_name: string; email: string; phone?: string; password: string; role: "consumer" | "contractor" }) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
const Ctx = createContext<Session>(null as unknown as Session);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const r = await api<User>("/me");
    if (r.success && r.data) { setUser(r.data); await SecureStore.setItemAsync("mrb_user", JSON.stringify(r.data)); }
  }, []);

  useEffect(() => {
    (async () => {
      tokens.setUnauthorizedHandler(async () => { await tokens.clear(); setUser(null); });
      const t = await tokens.load();
      const cached = await SecureStore.getItemAsync("mrb_user");
      if (t && cached) { setUser(JSON.parse(cached)); refreshUser(); }
      setReady(true);
    })();
  }, [refreshUser]);

  async function finish(r: { success: boolean; error?: string; data?: { access_token: string; refresh_token: string; user: User } }) {
    if (!r.success || !r.data) { const e = r.error ?? "Something went wrong"; setError(e); return e; }
    if (APP_VARIANT === "contractor" && r.data.user.role !== "contractor") return "This is the PRO app — please use the MrBuilder customer app.";
    if (APP_VARIANT === "consumer" && r.data.user.role === "contractor") return "You're a PRO — please use the MrBuilder PRO app.";
    await tokens.set(r.data.access_token, r.data.refresh_token);
    await SecureStore.setItemAsync("mrb_user", JSON.stringify(r.data.user));
    setUser(r.data.user); setError(null);
    return null;
  }

  const login = async (email: string, password: string) => finish(await api("/login", { method: "POST", body: { email, password } }));
  const register = async (b: Parameters<Session["register"]>[0]) => {
    const r = await api<{ access_token: string; refresh_token: string; user: User }>("/register", { method: "POST", body: b });
    if (r.success && !r.data?.access_token) return login(b.email, b.password);
    return finish(r);
  };
  const logout = async () => {
    const rt = await SecureStore.getItemAsync("mrb_refresh");
    if (rt) api("/logout", { method: "POST", body: { refresh_token: rt } });
    await tokens.clear(); await SecureStore.deleteItemAsync("mrb_user"); setUser(null);
  };

  return <Ctx.Provider value={{ user, ready, error, login, register, logout, refreshUser }}>{children}</Ctx.Provider>;
}
export const useSession = () => useContext(Ctx);
