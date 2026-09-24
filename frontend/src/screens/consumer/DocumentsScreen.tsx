import React, { useCallback, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../components/sheet";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

interface Doc { id: string; type: string; title: string; job_id: string | null; request_code: string | null; url: string | null; payload: Record<string, unknown>; created_at: string }
const TABS = [["", "All"], ["invoice", "Invoices"], ["receipt", "Receipts"], ["certificate", "Certificates"], ["inspection_report", "Reports"], ["completion_photos", "Photos"], ["warranty", "Warranties"]];
const EXT: Record<string, [string, "info" | "err" | "ok" | "orange"]> = { invoice: ["INV", "info"], receipt: ["RCT", "ok"], certificate: ["CERT", "orange"], inspection_report: ["PDF", "err"], completion_photos: ["IMG", "info"], warranty: ["WTY", "ok"], order_receipt: ["ORD", "info"] };

export default function DocumentsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { c } = useTheme();
  const [docs, setDocs] = useState<Doc[]>([]); const [tab, setTab] = useState("");
  const load = useCallback(async () => { const r = await api<Doc[]>(`/documents?limit=100${tab ? `&type=${tab}` : ""}`); setDocs(r.data ?? []); }, [tab]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  const tone = (t: "info" | "err" | "ok" | "orange") => ({ info: [c.infoBg, c.info], err: [c.errBg, c.err], ok: [c.okBg, c.ok], orange: [c.orangeBg, c.orange] }[t]);
  async function open(d: Doc) {
    if (d.type === "completion_photos" && Array.isArray(d.payload.photos)) { nav.navigate("Gallery", { photos: (d.payload.photos as string[]).map((u) => ({ url: u, label: "Completion" })) }); return; }
    if (d.url) { Linking.openURL(d.url); return; }
    const r = await api<{ path: string }>(`/documents/${d.id}/share`, { method: "POST", body: {} });
    if (r.data) Linking.openURL(`https://mrbuilder.com${r.data.path}`); else Alert.alert("Not available", "This document has no file yet.");
  }
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Documents" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 12, gap: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>{TABS.map(([k, l]) => <Pressable key={k} onPress={() => setTab(k)} style={{ height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: tab === k ? c.hero : c.border2, backgroundColor: tab === k ? c.hero : c.surface, justifyContent: "center" }}><RNText style={S(13, "600", tab === k ? "#fff" : c.text2)}>{l}</RNText></Pressable>)}</ScrollView>
        {docs.length === 0 && <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: 24, alignItems: "center" }}><RNText style={S(13.5, "400", c.text4)}>Nothing here yet.</RNText></View>}
        {docs.map((d) => { const [ext, tn] = EXT[d.type] ?? ["DOC", "info"]; const [bg, fg] = tone(tn); return (
          <Pressable key={d.id} onPress={() => open(d)} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12, paddingHorizontal: 14 }}>
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}><RNText style={S(11, "700", fg)}>{ext}</RNText></View>
            <View style={{ flex: 1, gap: 2 }}><RNText style={S(14, "600")} numberOfLines={1}>{d.title}</RNText><RNText style={S(12, "400", c.text4)}>{new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{d.request_code ? ` · ${d.request_code}` : ""}{d.type === "invoice" && d.payload.amount != null ? ` · $${Number(d.payload.amount).toFixed(2)}` : ""}</RNText></View>
            <Ionicons name="chevron-forward" size={18} color={c.text4} />
          </Pressable>); })}
        <RNText style={S(12, "400", c.text4)}>Plans, receipts, warranty certificates and inspection reports are kept per pergola and shared with your technician when relevant.</RNText>
      </ScrollView>
    </SafeAreaView>
  );
}
