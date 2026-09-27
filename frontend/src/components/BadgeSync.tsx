// Keeps the app-icon badge equal to the number of unread notifications (updated on launch,
// whenever the app returns to the foreground, and every minute while open).
import { useEffect } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import { api } from "../api/client";
import { useSession } from "../auth/session";

export async function syncBadge() {
  const r = await api<unknown[]>("/notifications?limit=1");
  if (!r.success) return;
  const n = r.meta?.unread ?? 0;
  try { await Notifications.setBadgeCountAsync(n); } catch {}
}

export default function BadgeSync() {
  const { user } = useSession();
  useEffect(() => {
    if (!user) { Notifications.setBadgeCountAsync(0).catch(() => {}); return; }
    syncBadge();
    const t = setInterval(syncBadge, 60000);
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") syncBadge(); });
    return () => { clearInterval(t); sub.remove(); };
  }, [user?.id]);
  return null;
}
