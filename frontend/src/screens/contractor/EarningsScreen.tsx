// Payments & Transactions (client: hero balance · payment method row · earnings chart · transactions)
import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Header, Sheet } from "../../components/sheet";
import { PrimaryButton } from "../../components/form";
import { money } from "../../components";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

interface Earn { balance: number; pending_jobs: number; pending_jobs_count: number; earned: number; tips: number; fees: number; net: number; jobs_paid: number; min_payout: number; pending_payouts: number; last_payout?: { amount: number; at: string } | null; total_earned?: number; series?: { label: string; amount: number }[] }
interface Tx { id: string; type: string; amount: number; status: string; description: string | null; request_code: string | null; job_id?: string | null; created_at: string }
interface PM { id: string; label: string | null; card_brand: string | null; card_last_four: string | null; is_default: boolean; method_type: string }

export default function EarningsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { c } = useTheme();
  const [range, setRange] = useState<"week" | "month">("month"); const [e, setE] = useState<Earn | null>(null); const [all, setAll] = useState<Earn | null>(null); const [tx, setTx] = useState<Tx[]>([]); const [pm, setPm] = useState<PM | null>(null); const [filter, setFilter] = useState("All"); const [showAll, setShowAll] = useState(false); const [payout, setPayout] = useState(false); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { const [a, b, t, p] = await Promise.all([api<Earn>(`/earnings?range=${range}`), api<Earn>("/earnings?range=all"), api<Tx[]>("/transactions?limit=50"), api<PM[]>("/payment-methods")]); setE(a.data ?? null); setAll(b.data ?? null); setTx(t.data ?? []); setPm((p.data ?? []).find((x) => x.is_default) ?? p.data?.[0] ?? null); setLoading(false); }, [range]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "500" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });
  const series = e?.series ?? []; const max = Math.max(1, ...series.map((s) => s.amount));
  const kinds = ["All", "Earnings", "Tips", "Payouts", "Fees"]; const kindOf = (t: Tx) => /tip/.test(t.type) ? "Tips" : /payout/.test(t.type) ? "Payouts" : /fee/.test(t.type) || t.amount < 0 ? "Fees" : "Earnings";
  const list = tx.filter((t) => filter === "All" || kindOf(t) === filter).slice(0, showAll ? 50 : 6);
  async function requestPayout() { if (!e) return; setBusy(true); const r = await api("/payouts", { method: "POST", body: { amount: e.balance } }); setBusy(false); setPayout(false); Alert.alert(r.success ? "Payout requested" : "Couldn't request", r.success ? "Processing — usually 1–2 business days." : r.error); load(); }
  const icon = (t: Tx): [keyof typeof Ionicons.glyphMap, string, string] => kindOf(t) === "Payouts" ? ["arrow-up-outline", c.infoBg, c.info] : kindOf(t) === "Fees" ? ["remove-circle-outline", c.errBg, c.err] : kindOf(t) === "Tips" ? ["gift-outline", c.primarySoft, c.primary] : ["arrow-down-outline", c.okBg, c.ok];
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Payments & Transactions" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {loading && [1, 2, 3].map((k) => <View key={k} style={{ height: 112, borderRadius: 16, backgroundColor: c.surface2 }} />)}
        {!loading && <>
          <View style={{ backgroundColor: c.hero, borderRadius: 16, padding: 18, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><View><RNText style={S(12, "600", "#B7BAC1")}>Available balance</RNText><RNText style={S(34, "700", "#fff")}>{money(e?.balance)}</RNText></View><Pressable disabled={!e || e.balance < e.min_payout} onPress={() => setPayout(true)} style={{ height: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: e && e.balance >= e.min_payout ? c.primary : "rgba(255,255,255,.12)", justifyContent: "center" }}><RNText style={S(14, "600", e && e.balance >= e.min_payout ? "#fff" : "#B7BAC1")}>Request payout</RNText></Pressable></View>
            <View style={{ flexDirection: "row" }}><View style={{ flex: 1 }}><RNText style={S(12, "400", "#B7BAC1")}>Last payout</RNText><RNText style={S(16, "600", "#fff")}>{e?.last_payout ? `${money(e.last_payout.amount)} · ${new Date(e.last_payout.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "—"}</RNText></View><View style={{ flex: 1 }}><RNText style={S(12, "400", "#B7BAC1")}>Total earnings</RNText><RNText style={S(16, "600", "#fff")}>{money(all?.total_earned ?? all?.earned)}</RNText></View></View>
            {!!e?.pending_jobs_count && <RNText style={S(12, "400", "#B7BAC1")}>{money(e.pending_jobs)} from {e.pending_jobs_count} job{e.pending_jobs_count > 1 ? "s" : ""} awaiting client confirmation</RNText>}
          </View>
          <Pressable onPress={() => nav.navigate("PayoutMethod")} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12, paddingHorizontal: 14 }}><View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="card-outline" size={20} color={c.primary} /></View><View style={{ flex: 1 }}><RNText style={S(15, "600")}>Payout method</RNText><RNText style={S(12.5, "400", c.text4)}>{pm ? `${pm.label ?? `${pm.card_brand} •••• ${pm.card_last_four}`} (default)` : "Set up Stripe payouts"} · min. payout {money(e?.min_payout ?? 50)}</RNText></View><Ionicons name="chevron-forward" size={18} color={c.text4} /></Pressable>
          <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><View><RNText style={S(15, "600")}>Earnings</RNText><RNText style={S(12.5, "400", c.text4)}>{range === "week" ? "This week" : "This month"}</RNText></View><View style={{ flexDirection: "row", backgroundColor: c.surface3, borderRadius: 9, padding: 3 }}>{(["week", "month"] as const).map((r) => <Pressable key={r} onPress={() => setRange(r)} style={{ height: 28, paddingHorizontal: 12, borderRadius: 7, backgroundColor: range === r ? c.surface : "transparent", justifyContent: "center" }}><RNText style={{ ...S(12.5, "600", range === r ? c.text : c.text4), textTransform: "capitalize" }}>{r}</RNText></Pressable>)}</View></View>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}><RNText style={S(26, "700")}>{money(e?.net)}</RNText><RNText style={S(12.5, "600", "#079455")}>{e?.jobs_paid ?? 0} jobs · tips {money(e?.tips)}</RNText></View>
            {series.length > 0 ? <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 84 }}>{series.map((s, i) => <View key={i} style={{ flex: 1, alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}><View style={{ width: "100%", height: `${Math.max(4, (s.amount / max) * 70)}%`, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: i === series.length - 1 ? c.primary : c.primarySoft }} /><RNText style={S(10.5, "400", c.text4)}>{s.label}</RNText></View>)}</View> : <RNText style={S(12.5, "400", c.text4)}>Chart appears after your first paid job.</RNText>}
          </View>
          <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(15, "600")}>Recent transactions</RNText><Pressable onPress={() => setShowAll(!showAll)}><RNText style={S(13, "600", c.orange)}>{showAll ? "Show less" : "See all"}</RNText></Pressable></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>{kinds.map((k) => <Pressable key={k} onPress={() => setFilter(k)} style={{ height: 30, paddingHorizontal: 12, borderRadius: 999, backgroundColor: filter === k ? c.hero : c.surface2, justifyContent: "center" }}><RNText style={S(12.5, "600", filter === k ? "#fff" : c.text2)}>{k}</RNText></Pressable>)}</ScrollView>
            {list.length === 0 && <RNText style={S(13, "400", c.text4)}>No transactions yet.</RNText>}
            {list.map((t) => { const [ic, bg, fg] = icon(t); return <Pressable key={t.id} onPress={() => nav.navigate("TransactionDetail", { id: t.id })} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}><View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}><Ionicons name={ic} size={18} color={fg} /></View><View style={{ flex: 1 }}><RNText style={S(14.5, "500")} numberOfLines={1}>{t.description ?? t.type.replace(/_/g, " ")}</RNText><RNText style={S(12.5, "400", c.text4)}>{new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{t.request_code ? ` · ${t.request_code}` : ""} · {t.status}</RNText></View><RNText style={S(15, "600", t.amount < 0 ? c.text : "#079455")}>{t.amount < 0 ? "– " : "+ "}{money(Math.abs(t.amount))}</RNText></Pressable>; })}
          </View>
        </>}
      </ScrollView>
      <Sheet open={payout} onClose={() => setPayout(false)} title="Request payout"><RNText style={{ ...S(14, "400", c.text3), marginTop: -8 }}>Withdraw {money(e?.balance)} to {pm ? (pm.label ?? `${pm.card_brand} •••• ${pm.card_last_four}`) : "your default account"}. Usually arrives in 1–2 business days.</RNText><PrimaryButton title={`Withdraw ${money(e?.balance)}`} onPress={requestPayout} loading={busy} /></Sheet>
    </SafeAreaView>
  );
}
