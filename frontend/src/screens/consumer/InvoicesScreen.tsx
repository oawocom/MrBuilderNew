import React, { useCallback, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { money } from "../../components";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

interface Invoice { id: string; job_id: string | null; request_code?: string | null; description: string | null; amount: number; status: string; due_date?: string | null; paid_at: string | null; created_at: string; pdf_url?: string | null; kind?: string }
const FILTERS = ["All", "Open", "Paid", "Plans"];

export default function InvoicesScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { c } = useTheme();
  const [list, setList] = useState<Invoice[]>([]); const [filter, setFilter] = useState("All");
  const load = useCallback(async () => { const r = await api<Invoice[]>("/invoices/me?limit=100"); setList(r.data ?? []); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "600" | "700" | "800" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  const open = list.filter((i) => i.status === "pending" || i.status === "overdue"); const due = open.reduce((a, i) => a + Number(i.amount), 0);
  const shown = list.filter((i) => filter === "All" ? true : filter === "Open" ? open.includes(i) : filter === "Paid" ? i.status === "paid" : /plan|mrcare|subscription/i.test(`${i.description} ${i.kind}`));
  const fmt = (v?: string | null) => v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border }}><RNText style={S(22, "700")}>Invoices</RNText></View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ borderRadius: 20, backgroundColor: c.hero, padding: 18, gap: 14, overflow: "hidden" }}><View style={{ position: "absolute", right: -50, top: -60, width: 160, height: 160, borderRadius: 80, backgroundColor: c.primary }} />
          <View style={{ gap: 2 }}><RNText style={S(12, "400", "#B7BAC1")}>Balance due</RNText><RNText style={S(32, "800", "#fff")}>{money(due)}</RNText><RNText style={S(12.5, "400", "#D5D7DA")}>{open.length ? `${open.length} open invoice${open.length > 1 ? "s" : ""}${open[0]?.due_date ? ` · due ${fmt(open[0].due_date)}` : ""}` : "Nothing outstanding"}</RNText></View>
          <View style={{ flexDirection: "row", gap: 8 }}><Pressable disabled={!open.length} onPress={() => Alert.alert("Pay now", "Open invoices are charged to your default card when payments go live.")} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", opacity: open.length ? 1 : 0.5 }}><RNText style={S(14, "600", "#181D27")}>Pay now</RNText></Pressable><Pressable onPress={() => nav.navigate("PaymentMethods")} style={{ height: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,.3)", alignItems: "center", justifyContent: "center" }}><RNText style={S(14, "600", "#fff")}>Payment methods</RNText></Pressable></View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Ionicons name="lock-closed-outline" size={12} color="#B7BAC1" /><RNText style={S(12, "400", "#B7BAC1")}>Payments are encrypted · processed in 1–2 business days</RNText></View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{FILTERS.map((f) => <Pressable key={f} onPress={() => setFilter(f)} style={{ height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: filter === f ? c.hero : c.border2, backgroundColor: filter === f ? c.hero : c.surface, justifyContent: "center" }}><RNText style={S(13, "600", filter === f ? "#fff" : c.text2)}>{f}</RNText></Pressable>)}</ScrollView>
        {shown.length === 0 && <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: 24, alignItems: "center" }}><RNText style={S(13.5, "400", c.text4)}>No invoices yet.</RNText></View>}
        {shown.map((i) => { const paid = i.status === "paid"; return (
          <Pressable key={i.id} onPress={() => i.job_id && nav.navigate("RequestDetail", { id: i.job_id })} style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14, gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}><View style={{ flex: 1, gap: 2 }}><RNText style={S(15, "600")}>{i.description ?? "Invoice"}</RNText><RNText style={S(12.5, "400", c.text4)}>{i.request_code ? `${i.request_code} · ` : ""}{paid ? `Paid ${fmt(i.paid_at)}` : i.due_date ? `Due ${fmt(i.due_date)}` : fmt(i.created_at)}</RNText></View><View style={{ height: 24, paddingHorizontal: 8, borderRadius: 999, backgroundColor: paid ? c.okBg : i.status === "overdue" ? c.errBg : c.warnBg, justifyContent: "center" }}><RNText style={S(11.5, "600", paid ? c.ok : i.status === "overdue" ? c.err : c.warn)}>{paid ? "Paid" : i.status === "overdue" ? "Overdue" : "Open"}</RNText></View></View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={S(20, "800")}>{money(i.amount)}</RNText>{paid ? <Pressable onPress={() => (i.pdf_url ? Linking.openURL(i.pdf_url) : nav.navigate("Documents"))} style={{ height: 36, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border2, flexDirection: "row", alignItems: "center", gap: 6 }}><Ionicons name="document-outline" size={16} color={c.text} /><RNText style={S(13, "600")}>PDF</RNText></Pressable> : <Pressable onPress={() => Alert.alert("Pay", "Charged to your default card when payments go live.")} style={{ height: 36, paddingHorizontal: 14, borderRadius: 10, backgroundColor: c.primary, justifyContent: "center" }}><RNText style={S(13, "600", "#fff")}>Pay</RNText></Pressable>}</View>
          </Pressable>); })}
      </ScrollView>
    </SafeAreaView>
  );
}
