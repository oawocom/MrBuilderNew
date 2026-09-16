import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Header, PickerSheet, Toggle } from "../../components/sheet";
import { api } from "../../api/client";
import { useSession } from "../../auth/session";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

interface Settings { notifications: { push: boolean; email: boolean; sms: boolean; n_jobs: boolean; n_msgs: boolean; n_updates: boolean; n_payouts?: boolean }; preferences: { language: string; units: string; auto_payout?: boolean; available?: boolean } }

export default function ProSettingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { logout } = useSession();
  const { c, mode, setMode } = useTheme();
  const [s, setS] = useState<Settings | null>(null); const [lang, setLang] = useState(false);
  const load = () => api<Settings>("/me/settings").then((r) => setS(r.data ?? null));
  useEffect(() => { load(); }, []);
  const S = (n: number, w: "400" | "500" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });
  const notif = async (k: string, v: boolean) => { await api("/me/notifications", { method: "PATCH", body: { [k]: v } }); load(); };
  const pref = async (k: string, v: unknown) => { await api("/me/preferences", { method: "PATCH", body: { [k]: v } }); load(); };
  type Row = { name: string; sub?: string; toggle?: boolean; on?: boolean; onToggle?: (v: boolean) => void; action?: string; onAction?: () => void; danger?: boolean; select?: string };
  const groups: { name: string; rows: Row[] }[] = s ? [
    { name: "Account", rows: [{ name: "Change password", sub: "Update your sign-in password", action: "Update", onAction: () => nav.navigate("PersonalInfo") }, { name: "Two-factor authentication", sub: "Add extra security to your account", toggle: true, on: false, onToggle: () => Alert.alert("Coming soon", "SMS two-factor arrives with the messaging integration.") }] },
    { name: "Availability", rows: [{ name: "Available for new jobs", sub: s.preferences.available === false ? "Paused · you won't be matched" : "You appear in matching for your categories", toggle: true, on: s.preferences.available !== false, onToggle: (v) => pref("available", v) }] },
    { name: "Notification preferences", rows: [{ name: "Email notifications", sub: "Receive important updates via email", toggle: true, on: s.notifications.email, onToggle: (v) => notif("email", v) }, { name: "SMS notifications", sub: "Get text alerts for urgent matters", toggle: true, on: s.notifications.sms, onToggle: (v) => notif("sms", v) }, { name: "Push notifications", sub: s.notifications.push ? "On · choose what you get below" : "All push alerts are off", toggle: true, on: s.notifications.push, onToggle: (v) => notif("push", v) }] },
    { name: "Push alerts", rows: [{ name: "New jobs near me", sub: "Within your max travel distance", toggle: true, on: s.notifications.n_jobs, onToggle: (v) => notif("n_jobs", v) }, { name: "Payouts & earnings", sub: "When money lands in your account", toggle: true, on: s.notifications.n_payouts ?? true, onToggle: (v) => notif("n_payouts", v) }, { name: "Client messages", sub: "New chat messages", toggle: true, on: s.notifications.n_msgs, onToggle: (v) => notif("n_msgs", v) }, { name: "Job status updates", sub: "Confirmations, rejections, disputes", toggle: true, on: s.notifications.n_updates, onToggle: (v) => notif("n_updates", v) }] },
    { name: "Payouts", rows: [{ name: "Automatic payouts", sub: "Send earnings to your default account when the minimum is reached", toggle: true, on: !!s.preferences.auto_payout, onToggle: (v) => pref("auto_payout", v) }, { name: "Payout method", sub: "Cards and bank accounts", action: "Manage", onAction: () => nav.navigate("PayoutMethod") }] },
    { name: "App preferences", rows: [{ name: "Dark mode", sub: "Switch to dark color scheme", toggle: true, on: mode === "dark", onToggle: (v) => setMode(v ? "dark" : "light") }, { name: "Language", sub: "App language", select: s.preferences.language === "es" ? "Español" : "English", onAction: () => setLang(true) }, { name: "Units", sub: "Dimensions in the app", select: s.preferences.units === "metric" ? "m / cm" : "ft / in", onAction: () => pref("units", s.preferences.units === "metric" ? "imperial" : "metric") }] },
    { name: "Danger zone", rows: [{ name: "Delete account", sub: "Deactivates now, deleted after 30 days", action: "Delete", danger: true, onAction: () => Alert.alert("Delete account?", "Active jobs must be finished first. Your account is deactivated now and permanently deleted after 30 days.", [{ text: "Keep", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { const r = await api("/me", { method: "DELETE" }); if (r.success) logout(); else Alert.alert("Couldn't delete", r.error); } }]) }] },
  ] : [];
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Settings" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 18 }}>
        {groups.map((g) => <View key={g.name} style={{ gap: 8 }}><RNText style={S(12, "600", c.text4)}>{g.name.toUpperCase()}</RNText><View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16 }}>{g.rows.map((r, i) => <View key={r.name} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}><View style={{ flex: 1 }}><RNText style={S(14.5, "500", r.danger ? c.err : c.text)}>{r.name}</RNText>{r.sub && <RNText style={S(12.5, "400", c.text4)}>{r.sub}</RNText>}</View>{r.toggle && <Toggle on={!!r.on} onChange={(v) => r.onToggle?.(v)} />}{r.action && <Pressable onPress={r.onAction} style={{ height: 36, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: r.danger ? c.errBd : c.border2, justifyContent: "center" }}><RNText style={S(13, "600", r.danger ? c.err : c.text2)}>{r.action}</RNText></Pressable>}{r.select && <Pressable onPress={r.onAction} style={{ height: 36, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border2, flexDirection: "row", alignItems: "center", gap: 4 }}><RNText style={S(13, "600")}>{r.select}</RNText><Ionicons name="chevron-down" size={14} color={c.text4} /></Pressable>}</View>)}</View></View>)}
      </ScrollView>
      <PickerSheet open={lang} onClose={() => setLang(false)} title="Language" options={["English", "Español"]} value={s?.preferences.language === "es" ? "Español" : "English"} onSelect={(v) => pref("language", v === "Español" ? "es" : "en")} />
    </SafeAreaView>
  );
}
