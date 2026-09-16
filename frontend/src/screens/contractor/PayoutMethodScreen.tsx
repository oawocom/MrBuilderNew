import React, { useCallback, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Header, Sheet } from "../../components/sheet";
import { SecondaryButton } from "../../components/form";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";

interface PM { id: string; method_type: string; card_brand: string | null; card_last_four: string | null; exp_month: number | null; exp_year: number | null; label: string | null; is_default: boolean; bank_name?: string | null }
interface Connect { stripe_enabled: boolean; has_account: boolean; payouts_enabled: boolean }

export default function PayoutMethodScreen() {
  const nav = useNavigation();
  const { c } = useTheme();
  const [pms, setPms] = useState<PM[]>([]); const [cx, setCx] = useState<Connect | null>(null); const [menu, setMenu] = useState<PM | null>(null);
  const load = useCallback(async () => { const [p, k] = await Promise.all([api<PM[]>("/payment-methods"), api<Connect>("/payouts/connect/status")]); setPms(p.data ?? []); setCx(k.data ?? null); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "500" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });
  const cards = pms.filter((p) => p.method_type !== "bank"), banks = pms.filter((p) => p.method_type === "bank");
  async function addBank() { const r = await api<{ url: string }>("/payouts/connect", { method: "POST", body: {} }); if (!r.success || !r.data) { Alert.alert("Not available yet", r.error ?? "Stripe payouts are being set up. Add a bank account here once enabled."); return; } Linking.openURL(r.data.url); }
  const Row = ({ p, bank }: { p: PM; bank?: boolean }) => <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12, paddingHorizontal: 14 }}><View style={{ width: 48, height: 30, borderRadius: 6, backgroundColor: bank ? c.surface2 : p.card_brand === "visa" ? "#1A1F71" : p.card_brand === "mastercard" ? "#EB001B" : c.hero, alignItems: "center", justifyContent: "center" }}>{bank ? <Ionicons name="business-outline" size={16} color={c.text2} /> : <RNText style={S(10, "700", "#fff")}>{(p.card_brand ?? "CARD").toUpperCase()}</RNText>}</View><View style={{ flex: 1 }}><RNText style={S(14.5, "600")}>{bank ? (p.bank_name ?? p.label ?? "Bank account") : `•••• •••• •••• ${p.card_last_four ?? ""}`}</RNText><RNText style={S(12.5, "400", c.text4)}>{bank ? `•••• ${p.card_last_four ?? "····"}` : p.exp_month ? `Expires ${String(p.exp_month).padStart(2, "0")}/${p.exp_year}` : ""}</RNText></View>{p.is_default && <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: c.primarySoft }}><RNText style={S(12, "600", c.orange)}>Default</RNText></View>}<Pressable onPress={() => setMenu(p)} style={{ width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" }}><Ionicons name="ellipsis-vertical" size={18} color={c.text4} /></Pressable></View>;
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Payout method" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        <View style={{ gap: 10 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(15, "600")}>Bank accounts</RNText><Pressable onPress={addBank} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="add" size={16} color={c.orange} /><RNText style={S(13.5, "600", c.orange)}>Add new</RNText></Pressable></View>
          {cx?.has_account ? <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12, paddingHorizontal: 14 }}><View style={{ width: 48, height: 30, borderRadius: 6, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name="business-outline" size={16} color={c.text2} /></View><View style={{ flex: 1 }}><RNText style={S(14.5, "600")}>Stripe payout account</RNText><RNText style={S(12.5, "400", c.text4)}>{cx.payouts_enabled ? "Verified · payouts enabled" : "Onboarding incomplete"}</RNText></View><View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: cx.payouts_enabled ? c.okBg : c.warnBg }}><RNText style={S(12, "600", cx.payouts_enabled ? c.ok : c.warn)}>{cx.payouts_enabled ? "Default" : "Finish setup"}</RNText></View></View> : banks.map((p) => <Row key={p.id} p={p} bank />)}
          {!cx?.has_account && banks.length === 0 && <Pressable onPress={addBank} style={{ borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: c.orangeBd, padding: 16, alignItems: "center", gap: 4 }}><Ionicons name="business-outline" size={22} color={c.orange} /><RNText style={S(14, "600", c.orange)}>Connect a bank account</RNText><RNText style={{ ...S(12.5, "400", c.text4), textAlign: "center" }}>Secure onboarding via Stripe. Payouts land in 1–2 business days.</RNText></Pressable>}
        </View>
        <View style={{ gap: 10 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(15, "600")}>My cards</RNText><Pressable onPress={() => Alert.alert("Cards", "Card entry opens once Stripe keys are live.")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="add" size={16} color={c.orange} /><RNText style={S(13.5, "600", c.orange)}>Add new</RNText></Pressable></View>{cards.map((p) => <Row key={p.id} p={p} />)}{cards.length === 0 && <RNText style={S(13, "400", c.text4)}>Cards are used for Mr Supply purchases.</RNText>}</View>
        <RNText style={S(12, "400", c.text4)}>Payment details are stored by Stripe; MrBuilder never sees full account or card numbers.</RNText>
      </ScrollView>
      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu?.label ?? "Payment method"}>
        {!menu?.is_default && <SecondaryButton title="Make default" onPress={async () => { await api(`/payment-methods/${menu!.id}/default`, { method: "PATCH" }); setMenu(null); load(); }} />}
        <SecondaryButton title="Remove" tone="danger" onPress={async () => { await api(`/payment-methods/${menu!.id}`, { method: "DELETE" }); setMenu(null); load(); }} />
      </Sheet>
    </SafeAreaView>
  );
}
