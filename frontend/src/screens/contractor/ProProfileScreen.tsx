import React, { useCallback, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { money } from "../../components";
import { api } from "../../api/client";
import { useSession } from "../../auth/session";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

interface Earn { balance: number; earned: number; jobs_paid: number }
interface Summary { rating_avg: number; ratings_count: number; jobs_completed: number; qualified_categories: string[]; title?: string | null }
interface Lock { locked: boolean; qualified: string[] }

export default function ProProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { user, logout } = useSession();
  const { c } = useTheme();
  const [e, setE] = useState<Earn | null>(null); const [s, setS] = useState<Summary | null>(null); const [lock, setLock] = useState<Lock | null>(null);
  const load = useCallback(async () => { if (!user) return; const [a, b, t] = await Promise.all([api<Earn>("/earnings?range=all"), api<Summary>(`/contractors/${user.id}/summary`), api<{ lock: Lock }>("/training")]); setE(a.data ?? null); setS(b.data ?? null); setLock(t.data?.lock ?? null); }, [user]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "500" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });
  const menu: [string, keyof typeof Ionicons.glyphMap, () => void][] = [["Personal information", "person-outline", () => nav.navigate("PersonalInfo")], ["Settings", "options-outline", () => nav.navigate("ProSettings")], ["Payments & Transactions", "wallet-outline", () => nav.navigate("Earnings")], ["Training & activation", "school-outline", () => nav.navigate("Training")], ["Mr Supply store", "cart-outline", () => nav.navigate("Store", {})], ["Live chat", "chatbubbles-outline", () => nav.navigate("Chats")]];
  const links: [string, () => void, boolean?][] = [["Help & Support", () => nav.navigate("Help")], ["Terms & Conditions", () => nav.navigate("Legal", { kind: "terms" })], ["Privacy Policy", () => nav.navigate("Legal", { kind: "privacy" })], ["Log out", () => Alert.alert("Log out?", undefined, [{ text: "Cancel", style: "cancel" }, { text: "Log out", style: "destructive", onPress: logout }]), true]];
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}><RNText style={S(20, "700")}>Profile</RNText></View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 14 }}>
        <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>{user?.avatar_url ? <Image source={{ uri: user.avatar_url }} style={{ width: 60, height: 60, borderRadius: 30 }} /> : <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: c.hero, alignItems: "center", justifyContent: "center" }}><RNText style={S(20, "700", "#fff")}>{user?.first_name?.[0]}{user?.last_name?.[0]}</RNText></View>}<View style={{ flex: 1 }}><RNText style={S(18, "700")}>{user?.first_name} {user?.last_name}</RNText><RNText style={S(13, "400", c.text4)}>{s?.title ?? (lock?.qualified?.length ? `${lock.qualified.map((q) => q[0].toUpperCase() + q.slice(1)).join(" · ")} PRO` : lock?.locked ? "In training" : "MrBuilder PRO")}</RNText></View><View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: c.warnBg }}><Ionicons name="star" size={13} color={c.primary} /><RNText style={S(14, "700")}>{s?.rating_avg ? s.rating_avg.toFixed(1) : "New"}</RNText></View></View>
          <View style={{ flexDirection: "row", gap: 10 }}><View style={{ flex: 1, backgroundColor: c.bg, borderRadius: 12, padding: 12 }}><RNText style={S(12, "400", c.text4)}>Earnings</RNText><RNText style={S(20, "700", c.primary)}>{money(e?.earned)}</RNText></View><View style={{ flex: 1, backgroundColor: c.bg, borderRadius: 12, padding: 12 }}><RNText style={S(12, "400", c.text4)}>Completed</RNText><RNText style={S(20, "700")}>{s?.jobs_completed ?? 0} jobs</RNText></View></View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}><View><RNText style={S(12, "400", c.text4)}>Activation</RNText><RNText style={S(14, "600")}>{lock?.locked ? "Training in progress" : `Active · ${lock?.qualified.length ?? 0} categor${(lock?.qualified.length ?? 0) === 1 ? "y" : "ies"}`}</RNText></View><Pressable onPress={() => nav.navigate("Training")} style={{ height: 40, paddingHorizontal: 14, borderRadius: 10, backgroundColor: c.primary, justifyContent: "center" }}><RNText style={S(13.5, "600", "#fff")}>{lock?.locked ? "Continue" : "Add category"}</RNText></Pressable></View>
        </View>
        <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16 }}>{menu.map(([n, ic, fn], i) => <Pressable key={n} onPress={fn} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}><View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name={ic} size={19} color={c.primary} /></View><RNText style={{ flex: 1, ...S(15, "500") }}>{n}</RNText><Ionicons name="chevron-forward" size={18} color={c.text5} /></Pressable>)}</View>
        <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16 }}>{links.map(([n, fn, danger], i) => <Pressable key={n} onPress={fn} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}>{danger && <Ionicons name="log-out-outline" size={18} color={c.err} />}<RNText style={{ flex: 1, ...S(15, "500", danger ? c.err : c.text) }}>{n}</RNText>{!danger && <Ionicons name="chevron-forward" size={18} color={c.text5} />}</Pressable>)}</View>
        <RNText style={{ textAlign: "center", ...S(12, "400", c.text5) }}>MrBuilder © 2026 · v{Constants.expoConfig?.version ?? "1.0.0"}</RNText>
      </ScrollView>
    </SafeAreaView>
  );
}
