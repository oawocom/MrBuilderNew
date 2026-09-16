import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Header, Toggle } from "../../components/sheet";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";

interface PM { id: string; method_type: string; card_brand: string | null; card_last_four: string | null; exp_month: number | null; exp_year: number | null; label: string | null; is_default: boolean }

export default function PaymentMethodsScreen() {
  const nav = useNavigation();
  const { c } = useTheme();
  const [pms, setPms] = useState<PM[]>([]); const [autopay, setAutopay] = useState(true);
  const load = useCallback(async () => { const [r, s] = await Promise.all([api<PM[]>("/payment-methods"), api<{ preferences: { autopay?: boolean } }>("/me/settings")]); setPms(r.data ?? []); setAutopay(s.data?.preferences?.autopay ?? true); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  async function addCard() {
    const r = await api<{ client_secret: string; publishable_key: string }>("/payments/setup-intent", { method: "POST", body: {} });
    if (!r.success) { Alert.alert("Cards not available yet", r.error ?? "Card payments are being set up. You'll be able to add a card here once enabled."); return; }
    Alert.alert("Stripe", "Card entry sheet will open here once Stripe keys are live.");
  }
  const logo = (p: PM) => p.method_type === "paypal" ? ["PayPal", "#003087"] : p.method_type === "apple_pay" ? ["Pay", "#000"] : [(p.card_brand ?? "CARD").toUpperCase(), p.card_brand === "visa" ? "#1A1F71" : p.card_brand === "mastercard" ? "#EB001B" : c.text];
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Payment methods" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ gap: 8 }}>
          {pms.map((p) => { const [lg, col] = logo(p); return (
            <Pressable key={p.id} onPress={async () => { if (!p.is_default) { await api(`/payment-methods/${p.id}/default`, { method: "PATCH" }); load(); } }} onLongPress={() => Alert.alert("Remove card?", undefined, [{ text: "Keep", style: "cancel" }, { text: "Remove", style: "destructive", onPress: async () => { await api(`/payment-methods/${p.id}`, { method: "DELETE" }); load(); } }])} style={{ height: 64, borderRadius: 14, borderWidth: 1.5, borderColor: p.is_default ? c.primary : c.border, backgroundColor: p.is_default ? c.primarySoft : c.surface, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 52, height: 40, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}><RNText style={{ ...S(11, "700", col), letterSpacing: 0.5 }}>{lg}</RNText></View>
              <View style={{ flex: 1 }}><RNText style={S(15, "600")}>{p.label ?? `${p.card_brand ?? "Card"} •••• ${p.card_last_four ?? ""}`}</RNText><RNText style={S(12.5, "400", c.text4)}>{p.exp_month ? `Expires ${String(p.exp_month).padStart(2, "0")}/${p.exp_year}` : "Saved securely"}</RNText></View>
              <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 999, backgroundColor: p.is_default ? c.okBg : c.surface2, justifyContent: "center" }}><RNText style={S(11, "600", p.is_default ? c.ok : c.text3)}>{p.is_default ? "Default" : "Set default"}</RNText></View>
            </Pressable>); })}
          {pms.length === 0 && <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: 24, alignItems: "center" }}><RNText style={S(13.5, "400", c.text4)}>No payment method yet. Add one before confirming a job.</RNText></View>}
          <Pressable onPress={addCard} style={{ height: 48, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: c.orangeBd, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}><Ionicons name="card-outline" size={18} color={c.orange} /><RNText style={S(14, "600", c.orange)}>Add a card</RNText></Pressable>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14, paddingHorizontal: 16 }}><View style={{ flex: 1, gap: 2 }}><RNText style={S(14.5, "600")}>Autopay</RNText><RNText style={S(12.5, "400", c.text4)}>Pay confirmed jobs and plan renewals automatically with your default method.</RNText></View><Toggle on={autopay} onChange={async (v) => { setAutopay(v); await api("/me/preferences", { method: "PATCH", body: { autopay: v } }); }} /></View>
        <RNText style={S(12, "400", c.text4)}>Cards are stored by the payment provider; MrBuilder never sees full card numbers.</RNText>
      </ScrollView>
    </SafeAreaView>
  );
}
