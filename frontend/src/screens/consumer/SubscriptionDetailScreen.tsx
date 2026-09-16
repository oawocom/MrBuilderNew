import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { SecondaryButton } from "../../components/form";
import { Header, Sheet } from "../../components/sheet";
import { money } from "../../components";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";
import type { Plan, Sub } from "./MrCareScreen";

interface Pergola { id: string; name: string; structure_type: string | null; city: string | null }

export default function SubscriptionDetailScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { params } = useRoute<{ key: string; name: string; params: { id: string } }>();
  const { c } = useTheme();
  const [s, setS] = useState<Sub | null>(null); const [plan, setPlan] = useState<Plan | null>(null); const [pergolas, setPergolas] = useState<Pergola[]>([]); const [cancel, setCancel] = useState(false);
  const load = useCallback(async () => { const [r, p, g] = await Promise.all([api<Sub>(`/mrcare/subscriptions/${params.id}`), api<{ plans: Plan[] }>("/mrcare/plans"), api<Pergola[]>("/pergolas")]); setS(r.data ?? null); setPlan((p.data?.plans ?? []).find((x) => x.slug === r.data?.plan) ?? null); setPergolas(g.data ?? []); }, [params.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "500" | "600" | "700" | "800" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });
  if (!s) return <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}><Header title="Subscription" onBack={() => nav.goBack()} /></SafeAreaView>;
  const isM = s.offering === "maintenance"; const offerName = isM ? "Service & Maintenance" : "Electronics Protection"; const renew = s.renew_at ? new Date(s.renew_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
  const incl = isM ? [[`${s.visits_per_year} visits per year`, `${s.visits_per_year - s.visits_used} remaining this year`], ...(plan?.features ?? []).map((f) => [f, ""])] : [["Repair or replacement of covered electronics", "Motors, sensors, remotes, controllers"], ["Up to 2 claims per year", `${s.claims_used} used`], ["$49 service-call fee per claim", ""], ...(plan?.features ?? []).map((f) => [f, ""])];
  async function doCancel() { const r = await api(`/mrcare/subscriptions/${s!.id}`, { method: "DELETE", body: { reason: "customer" } }); setCancel(false); if (!r.success) Alert.alert("Couldn't cancel", r.error); else nav.goBack(); }
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Manage plan" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ borderRadius: 20, backgroundColor: c.hero, padding: 18, gap: 14, overflow: "hidden" }}><View style={{ position: "absolute", right: -50, top: -60, width: 160, height: 160, borderRadius: 80, backgroundColor: isM ? c.primary : "#079455" }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}><View style={{ gap: 2 }}><RNText style={S(12, "400", "#B7BAC1")}>{offerName}</RNText><RNText style={S(22, "800", "#fff")}>{plan?.name ?? s.plan}</RNText></View><View style={{ height: 24, paddingHorizontal: 9, borderRadius: 999, backgroundColor: "rgba(74,222,128,.18)", justifyContent: "center" }}><RNText style={S(11.5, "600", "#4ADE80")}>{s.status === "active" ? "Active" : s.status}</RNText></View></View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}><View style={{ gap: 2 }}><RNText style={S(11, "700", "#B7BAC1")}>RENEWS ON</RNText><RNText style={S(15, "600", "#fff")}>{renew}</RNText></View><RNText style={S(20, "800", "#fff")}>{money(s.price_total)}<RNText style={S(13, "500", "#B7BAC1")}>/yr</RNText></RNText></View>
        </View>
        <View style={{ gap: 10 }}><RNText style={S(16, "700")}>Covered pergolas</RNText>{s.pergola_ids.map((id) => { const p = pergolas.find((x) => x.id === id); return <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}><View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: c.hero }} /><View style={{ flex: 1 }}><RNText style={S(14.5, "600")}>{p?.name ?? "Pergola"}</RNText><RNText style={S(12.5, "400", c.text4)}>{[p?.structure_type?.replace("_", " "), p?.city].filter(Boolean).join(" · ")}</RNText></View><Pressable onPress={() => nav.navigate(isM ? "MaintenanceBooking" : "ElectronicsClaim", { subscriptionId: s.id, pergolaId: id })} style={{ height: 32, paddingHorizontal: 10, borderRadius: 9, backgroundColor: c.primarySoft, justifyContent: "center" }}><RNText style={S(13, "600", c.orange)}>{isM ? "Book" : "Claim"}</RNText></Pressable></View>; })}</View>
        <View style={{ flexDirection: "row", gap: 8 }}>{[[isM ? "Change plan" : "Add pergola", "swap-horizontal-outline", c.primarySoft, c.primary, () => nav.navigate("MrCareBuy", { offering: s.offering })], ["Terms & certificate", "document-text-outline", c.infoBg, c.info, () => nav.navigate("Documents")], ["Billing", "card-outline", c.okBg, c.ok, () => nav.navigate("Tabs", { screen: "Invoices" })]].map(([l, ic, bg, fg, fn]) => <Pressable key={l as string} onPress={fn as () => void} style={{ flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14, paddingHorizontal: 8, alignItems: "center", gap: 8 }}><View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bg as string, alignItems: "center", justifyContent: "center" }}><Ionicons name={ic as keyof typeof Ionicons.glyphMap} size={20} color={fg as string} /></View><RNText style={{ ...S(12.5, "600"), textAlign: "center" }}>{l as string}</RNText></Pressable>)}</View>
        <View style={{ gap: 10 }}><RNText style={S(16, "700")}>What's included</RNText><View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14, paddingHorizontal: 16, gap: 10 }}>{incl.map(([t, sub]) => <View key={t} style={{ flexDirection: "row", gap: 10 }}><View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.okBg, alignItems: "center", justifyContent: "center", marginTop: 1 }}><Ionicons name="checkmark" size={12} color={c.ok} /></View><View style={{ flex: 1 }}><RNText style={S(14, "400")}>{t}</RNText>{!!sub && <RNText style={S(12.5, "400", c.text4)}>{sub}</RNText>}</View></View>)}</View></View>
        <Pressable onPress={() => nav.navigate("MrCareBuy", { offering: isM ? "electronics" : "maintenance" })} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, paddingHorizontal: 16 }}><View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name={isM ? "flash-outline" : "construct-outline"} size={20} color={c.text2} /></View><View style={{ flex: 1, gap: 2 }}><RNText style={S(14.5, "600")}>{isM ? "Add Electronics Protection" : "Add Service & Maintenance"}</RNText><RNText style={S(12.5, "400", c.text4)}>{isM ? "Cover motors, sensors and controls too." : "Scheduled visits keep the structure in shape."}</RNText></View><Ionicons name="chevron-forward" size={18} color={c.text4} /></Pressable>
        <Pressable onPress={() => setCancel(true)} style={{ height: 44, alignItems: "center", justifyContent: "center" }}><RNText style={S(15, "600", c.err)}>Cancel subscription</RNText></Pressable>
      </ScrollView>
      <Sheet open={cancel} onClose={() => setCancel(false)} title={`Cancel ${offerName}?`}>
        <RNText style={{ ...S(14, "400", c.text3), marginTop: -8 }}>Coverage continues until {renew}. It won't renew after that.</RNText>
        <Pressable onPress={doCancel} style={{ height: 52, borderRadius: 12, backgroundColor: c.errBg, alignItems: "center", justifyContent: "center" }}><RNText style={S(16, "600", c.err)}>Cancel subscription</RNText></Pressable><SecondaryButton title="Keep it" onPress={() => setCancel(false)} />
      </Sheet>
    </SafeAreaView>
  );
}
