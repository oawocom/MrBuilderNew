// MrCare hub (tab)
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

export interface Plan { id: string; offering: "maintenance" | "electronics"; slug: string; name: string; description?: string | null; annual_price: number; visits_per_year: number; features: string[]; popular?: boolean }
export interface Sub { id: string; offering: "maintenance" | "electronics"; plan: string; status: string; pergola_ids: string[]; price_total: number; visits_per_year: number; visits_used: number; claims_used: number; renew_at: string | null; addons?: Record<string, string[]> }
interface Pergola { id: string; name: string }

export default function MrCareScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { c } = useTheme();
  const [subs, setSubs] = useState<Sub[]>([]); const [plans, setPlans] = useState<Plan[]>([]); const [pergolas, setPergolas] = useState<Pergola[]>([]);
  const load = useCallback(async () => { const [h, p, g] = await Promise.all([api<{ subscriptions: Sub[] }>("/mrcare"), api<{ plans: Plan[] }>("/mrcare/plans"), api<Pergola[]>("/pergolas")]); setSubs((h.data?.subscriptions ?? []).filter((s) => s.status === "active")); setPlans(p.data?.plans ?? []); setPergolas(g.data ?? []); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "600" | "700" | "800" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  const maint = subs.find((s) => s.offering === "maintenance"), elec = subs.find((s) => s.offering === "electronics");
  const minM = Math.min(...plans.filter((p) => p.offering === "maintenance").map((p) => p.annual_price / 9.6), 99), minE = Math.min(...plans.filter((p) => p.offering === "electronics").map((p) => p.annual_price), 149);
  const names = (s: Sub) => s.pergola_ids.map((id) => pergolas.find((p) => p.id === id)?.name ?? "Pergola").join(", ");
  const renew = (s: Sub) => (s.renew_at ? new Date(s.renew_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
  const Offer = ({ icon, bg, fg, title, chip, chipOn, desc, sub, actions }: { icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string; title: string; chip: string; chipOn: boolean; desc: string; sub?: Sub; actions: React.ReactNode }) => (
    <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 12 }}><View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}><Ionicons name={icon} size={22} color={fg} /></View><View style={{ flex: 1, gap: 3 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}><RNText style={S(16, "700")}>{title}</RNText><View style={{ height: 22, paddingHorizontal: 8, borderRadius: 999, backgroundColor: chipOn ? c.okBg : c.surface2, justifyContent: "center" }}><RNText style={S(11, "600", chipOn ? c.ok : c.text3)}>{chip}</RNText></View></View><RNText style={S(13, "400", c.text4)}>{desc}</RNText></View></View>
      {sub && <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.surface2 }}><View><RNText style={S(12, "400", c.text4)}>{plans.find((p) => p.slug === sub.plan)?.name ?? sub.plan} · renews {renew(sub)}</RNText><RNText style={S(13.5, "600")}>{names(sub)}</RNText></View><Pressable onPress={() => nav.navigate("SubscriptionDetail", { id: sub.id })} style={{ height: 32, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: c.border2, justifyContent: "center" }}><RNText style={S(13, "600")}>Manage</RNText></Pressable></View>}
      {actions}
    </View>
  );
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border }}><RNText style={S(22, "700")}>MrCare</RNText></View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ borderRadius: 20, backgroundColor: c.hero, padding: 22, paddingHorizontal: 20, gap: 6, overflow: "hidden" }}><View style={{ position: "absolute", right: -70, top: -70, width: 200, height: 200, borderRadius: 100, backgroundColor: c.primary }} /><RNText style={S(12, "700", "#F7A26B")}>MrCare</RNText><RNText style={{ ...S(24, "800", "#fff"), maxWidth: 260 }}>Two ways to protect your pergola</RNText><RNText style={{ ...S(13.5, "400", "#D5D7DA"), maxWidth: 280 }}>Scheduled maintenance, or protection for motors and electronics. Buy either — or both.</RNText></View>
        <Offer icon="construct-outline" bg={c.infoBg} fg={c.info} title="Service & Maintenance" chip={maint ? "Active" : "Not subscribed"} chipOn={!!maint} desc={`Scheduled inspections, cleaning and priority scheduling. Essential · Plus · Premium, from $${Math.round(minM)}/month.`} sub={maint}
          actions={maint ? <Pressable onPress={() => nav.navigate("MaintenanceBooking", { subscriptionId: maint.id })} style={{ height: 48, borderRadius: 12, backgroundColor: c.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}><Ionicons name="calendar-outline" size={18} color="#fff" /><RNText style={S(15, "600", "#fff")}>Book Maintenance</RNText></Pressable> : <Pressable onPress={() => nav.navigate("MrCareBuy", { offering: "maintenance" })} style={{ height: 48, borderRadius: 12, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}><RNText style={S(15, "600", "#fff")}>Explore maintenance plans</RNText></Pressable>} />
        <Offer icon="flash-outline" bg={c.okBg} fg={c.ok} title="Electronics Protection" chip={elec ? "Active" : "Not subscribed"} chipOn={!!elec} desc={`Repair or replacement of motors, sensors, remotes and controllers. Separate from maintenance — sold per pergola, from $${Math.round(minE)}/year.`} sub={elec}
          actions={elec ? <Pressable onPress={() => nav.navigate("ElectronicsClaim", { subscriptionId: elec.id })} style={{ height: 48, borderRadius: 12, backgroundColor: c.okBg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}><Ionicons name="alert-circle-outline" size={18} color={c.ok} /><RNText style={S(15, "600", c.ok)}>Report an Electronics Issue</RNText></Pressable> : <Pressable onPress={() => nav.navigate("MrCareBuy", { offering: "electronics" })} style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: c.border2, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}><RNText style={S(15, "600")}>Explore Electronics Protection</RNText></Pressable>} />
        <Pressable onPress={() => nav.navigate("Chats")} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, paddingHorizontal: 16 }}><View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="sparkles-outline" size={20} color={c.primary} /></View><View style={{ flex: 1, gap: 2 }}><RNText style={S(14.5, "600")}>Ask the MrCare assistant</RNText><RNText style={S(12.5, "400", c.text4)}>Plans, bookings and claims — answered instantly.</RNText></View><Ionicons name="chevron-forward" size={18} color={c.text4} /></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
