// Push notifications: register the device token after login; tap → open the job.
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { api, APP_VARIANT } from "../api/client";

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }) });

export async function registerPush(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null; // simulators can't receive push
    const { status: cur } = await Notifications.getPermissionsAsync();
    let status = cur; if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return null;
    if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("default", { name: "MrBuilder", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 250, 250] });
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    await api("/me/devices", { method: "POST", body: { token, platform: Platform.OS, app: APP_VARIANT, device_name: Device.modelName ?? undefined } });
    return token;
  } catch { return null; }
}

export async function unregisterPush() {
  try { const projectId = Constants.expoConfig?.extra?.eas?.projectId; const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data; await api(`/me/devices/${encodeURIComponent(token)}`, { method: "DELETE" }); } catch {}
}

// Returns { job_id, screen } from a tapped notification, or null
export function payloadOf(resp: Notifications.NotificationResponse | null): { job_id?: string; screen?: string; conversation_id?: string } | null {
  const d = resp?.notification.request.content.data as { job_id?: string; screen?: string; conversation_id?: string } | undefined;
  return d && (d.job_id || d.screen || d.conversation_id) ? d : null;
}
