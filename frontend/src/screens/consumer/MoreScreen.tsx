import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Share, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { PrimaryButton, SecondaryButton } from "../../components/form";
import { Sheet } from "../../components/sheet";
import { api } from "../../api/client";
import { useSession } from "../../auth/session";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";
import type { Sub } from "./MrCareScreen";

export default function MoreScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { user, logout } = useSession();
  const { c } = useTheme();
  const [subs, setSubs] = useState<Sub[]>([]); const [pergolas, setPergolas] = useState(0); const [docs, setDocs] = useState(0); const [chatUnread, setChatUnread] = useState(0); const [pm, setPm] = useState<string>(""); const [ref, setRef] = useState<{ code: string; link?: string; reward?: string; referred?: number } | null>(null); const [refOpen, setRefOpen] = useState(false);
  const load = useCallback(async () => { const [h, g, d, cv, p, r] = await Promise.all([api<{ subscriptions: Sub[] }>("/mrcare"), api<unknown[]>("/pergolas"), api<unknown[]>("/documents?limit=100"), api<{ unread?: number }[]>("/conversations"), api<{ label: string | null; card_brand: string | null; card_last_four: string | null; is_default: boolean }[]>("/payment-methods"), api<{ code: string; link?: string; reward?: string; referred?: number }>("/referrals")]); setSubs((h.data?.subscriptions ?? []).filter((s) => s.status === "active")); setPergolas(g.data?.length ?? 0); setDocs(d.data?.length ?? 0); setChatUnread((cv.data ?? []).reduce((a, x) => a + (x.unread ?? 0), 0)); const def = (p.data ?? []).find((x) => x.is_default) ?? p.data?.[0]; setPm(def ? def.label ?? `${def.card_brand} •••• ${def.card_last_four}` : "None"); setRef(r.data ?? null); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  const items: { name: string; meta: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string; go: () => void }[] = [
    { name: "My pergolas", meta: String(pergolas), icon: "cube-outline", bg: c.surface2, fg: c.text2, go: () => nav.navigate("Pergolas") },
    { name: "Electronics Protection", meta: subs.some((s) => s.offering === "electronics") ? "Active" : "Not subscribed", icon: "flash-outline", bg: c.okBg, fg: c.ok, go: () => { const s = subs.find((x) => x.offering === "electronics"); s ? nav.navigate("SubscriptionDetail", { id: s.id }) : nav.navigate("MrCareBuy", { offering: "electronics" }); } },
    { name: "Service & Maintenance", meta: subs.some((s) => s.offering === "maintenance") ? "Active" : "Not subscribed", icon: "construct-outline", bg: c.infoBg, fg: c.info, go: () => { const s = subs.find((x) => x.offering === "maintenance"); s ? nav.navigate("SubscriptionDetail", { id: s.id }) : nav.navigate("MrCareBuy", { offering: "maintenance" }); } },
    { name: "Chats", meta: chatUnread ? `${chatUnread} new` : "", icon: "chatbubbles-outline", bg: c.surface2, fg: c.text2, go: () => nav.navigate("Chats") },
    { name: "Service history", meta: "", icon: "time-outline", bg: c.surface2, fg: c.text2, go: () => nav.navigate("Tabs", { screen: "Requests" }) },
    { name: "Household members", meta: "", icon: "people-outline", bg: c.surface2, fg: c.text2, go: () => nav.navigate("Household") },
    { name: "FAQ & help", meta: "", icon: "help-circle-outline", bg: c.surface2, fg: c.text2, go: () => nav.navigate("Chats") },
    { name: "Refer a neighbor", meta: "Get rewards", icon: "gift-outline", bg: c.primarySoft, fg: c.primary, go: () => setRefOpen(true) },
    { name: "Documents", meta: String(docs), icon: "folder-outline", bg: c.infoBg, fg: c.info, go: () => nav.navigate("Documents") },
    { name: "Payment methods", meta: pm, icon: "card-outline", bg: c.surface2, fg: c.text2, go: () => nav.navigate("PaymentMethods") },
    { name: "Settings", meta: "", icon: "options-outline", bg: c.surface2, fg: c.text2, go: () => nav.navigate("Profile") },
  ];
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border }}><RNText style={S(22, "700")}>More</RNText></View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Pressable onPress={() => nav.navigate("Profile")} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14 }}><View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.hero, alignItems: "center", justifyContent: "center" }}><RNText style={S(18, "700", "#fff")}>{user?.first_name?.[0]}{user?.last_name?.[0]}</RNText></View><View style={{ flex: 1, gap: 2 }}><RNText style={S(17, "700")}>{user?.first_name} {user?.last_name}</RNText><RNText style={S(13, "400", c.text4)}>{user?.email}</RNText></View><View style={{ height: 32, paddingHorizontal: 10, borderRadius: 9, backgroundColor: c.surface2, justifyContent: "center" }}><RNText style={S(13, "600", c.text2)}>Edit</RNText></View></Pressable>
        <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16 }}>{items.map((m, i) => <Pressable key={m.name} onPress={m.go} style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 56, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}><View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: m.bg, alignItems: "center", justifyContent: "center" }}><Ionicons name={m.icon} size={18} color={m.fg} /></View><RNText style={{ flex: 1, ...S(15, "600") }}>{m.name}</RNText>{!!m.meta && <RNText style={S(13, "400", c.text4)}>{m.meta}</RNText>}<Ionicons name="chevron-forward" size={18} color={c.text4} /></Pressable>)}</View>
        <Pressable onPress={() => Alert.alert("Log out?", undefined, [{ text: "Cancel", style: "cancel" }, { text: "Log out", style: "destructive", onPress: logout }])} style={{ height: 52, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}><Ionicons name="log-out-outline" size={18} color={c.err} /><RNText style={S(15, "600", c.err)}>Log out</RNText></Pressable>
        <RNText style={{ ...S(12, "400", c.text5), textAlign: "center" }}>MrBuilder Consumer · v{Constants.expoConfig?.version ?? "1.0.0"}</RNText>
      </ScrollView>
      <Sheet open={refOpen} onClose={() => setRefOpen(false)} title="Refer a neighbor">
        <RNText style={{ ...S(14, "400", c.text3), marginTop: -8 }}>{ref?.reward ?? "They get their first inspection free; you get a credit on your next job."}</RNText>
        <View style={{ padding: 14, borderRadius: 12, backgroundColor: c.surface2, alignItems: "center", gap: 4 }}><RNText style={S(12, "600", c.text4)}>YOUR CODE</RNText><RNText style={{ ...S(24, "700"), letterSpacing: 2 }}>{ref?.code ?? "—"}</RNText>{!!ref?.referred && <RNText style={S(12.5, "400", c.text4)}>{ref.referred} neighbor{ref.referred > 1 ? "s" : ""} joined so far</RNText>}</View>
        <PrimaryButton title="Share invite" icon="share-outline" onPress={() => Share.share({ message: `Get your pergola installed or repaired with MrBuilder — instant quotes, trained PROs. Use my code ${ref?.code} ${ref?.link ?? "https://new.mrbuilder.com/register?ref=" + ref?.code}` })} /><SecondaryButton title="Close" onPress={() => setRefOpen(false)} />
      </Sheet>
    </SafeAreaView>
  );
}
