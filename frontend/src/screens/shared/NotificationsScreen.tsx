import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../components/sheet";
import { api, APP_VARIANT } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

interface N { id: string; kind: string; title: string; body: string | null; job_id: string | null; is_read: boolean; created_at: string; data?: { screen?: string } | null }

export default function NotificationsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { c } = useTheme();
  const [items, setItems] = useState<N[]>([]); const [banner, setBanner] = useState(false);
  const load = useCallback(async () => { const r = await api<N[]>("/notifications?limit=50"); setItems(r.data ?? []); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  const tone = (k: string): [string, string, keyof typeof Ionicons.glyphMap] => /pause|issue|dispute|fail|cancel/.test(k) ? [c.errBg, c.err, "warning-outline"] : /paid|complete|confirm|approve|active/.test(k) ? [c.okBg, c.ok, "checkmark-circle-outline"] : /message|chat/.test(k) ? [c.surface2, c.text2, "chatbubble-outline"] : /quote|payment|invoice/.test(k) ? [c.primarySoft, c.primary, "receipt-outline"] : [c.infoBg, c.info, "notifications-outline"];
  const ago = (v: string) => { const d = new Date(v); const today = new Date().toDateString() === d.toDateString(); return `${today ? "Today" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`; };
  async function readAll() { await api("/notifications/read-all", { method: "PATCH" }); setBanner(true); load(); }
  async function open(n: N) { if (!n.is_read) api(`/notifications/${n.id}/read`, { method: "PATCH" }); if (n.job_id) nav.navigate(APP_VARIANT === "contractor" ? "JobDetail" : "RequestDetail", { id: n.job_id }); else if (n.data?.screen === "mrcare") nav.navigate("Tabs", { screen: "MrCare" }); }
  const unread = items.filter((n) => !n.is_read).length;
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Notifications" onBack={() => nav.goBack()} right={unread > 0 ? <Pressable onPress={readAll} style={{ height: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.primarySoft, justifyContent: "center" }}><RNText style={S(13, "600", c.orange)}>Mark all read</RNText></Pressable> : undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 12, gap: 10 }}>
        {banner && <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.okBg }}><Ionicons name="checkmark-circle-outline" size={18} color={c.ok} /><RNText style={S(13.5, "600", c.ok)}>All notifications marked as read.</RNText></View>}
        {items.length === 0 && <View style={{ alignItems: "center", gap: 8, paddingTop: 72, paddingHorizontal: 24 }}><View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name="notifications-off-outline" size={30} color={c.text4} /></View><RNText style={S(17, "700")}>You're all caught up</RNText><RNText style={{ ...S(14, "400", c.text4), textAlign: "center" }}>Updates on your requests, technicians and plans will appear here.</RNText></View>}
        {items.map((n) => { const [bg, fg, icon] = tone(n.kind ?? ""); return (
          <Pressable key={n.id} onPress={() => open(n)} onLongPress={() => Alert.alert("Delete notification?", undefined, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => setItems(items.filter((x) => x.id !== n.id)) }])} style={{ flexDirection: "row", gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}><Ionicons name={icon} size={20} color={fg} /></View>
            <View style={{ flex: 1, gap: 3 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><RNText style={{ flex: 1, ...S(14.5, n.is_read ? "600" : "700") }}>{n.title}</RNText>{!n.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary }} />}</View>{n.body && <RNText style={S(13, "400", c.text3)}>{n.body}</RNText>}<RNText style={S(12, "400", c.text5)}>{ago(n.created_at)}</RNText></View>
          </Pressable>); })}
      </ScrollView>
    </SafeAreaView>
  );
}
