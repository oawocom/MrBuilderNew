import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../components/sheet";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

interface Reminder { id: string; pergola_id: string; kind: string; title?: string; due_at: string; status: string; enabled?: boolean }
interface Pergola { id: string; name: string; structure_type: string | null; brand: string | null; installed_at: string | null }
const KIND: Record<string, { t: string; s: string; icon: keyof typeof Ionicons.glyphMap }> = { seasonal_check: { t: "Seasonal check", s: "Louvers, drainage, hardware", icon: "leaf-outline" }, pre_winter: { t: "Pre-winter prep", s: "Snow-load & drainage", icon: "snow-outline" }, post_winter: { t: "Post-winter check", s: "Motors, sensors, seals", icon: "sunny-outline" }, cleaning: { t: "Cleaning", s: "Roof, gutters, screens", icon: "water-outline" }, motor_service: { t: "Motor service", s: "Lubrication & calibration", icon: "settings-outline" }, warranty_expiry: { t: "Warranty expiry", s: "Manufacturer warranty", icon: "shield-outline" } };

export default function RemindersScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { params } = useRoute<{ key: string; name: string; params: { pergolaId?: string } }>();
  const { c } = useTheme();
  const [list, setList] = useState<Reminder[]>([]); const [perg, setPerg] = useState<Pergola | null>(null);
  const load = useCallback(async () => { const [r, p] = await Promise.all([api<Reminder[]>("/reminders?all=1"), api<Pergola[]>("/pergolas")]); const ps = p.data ?? []; const pg = params?.pergolaId ? ps.find((x) => x.id === params.pergolaId) ?? ps[0] : ps[0]; setPerg(pg ?? null); setList((r.data ?? []).filter((x) => !pg || x.pergola_id === pg.id)); }, [params?.pergolaId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  const due = (v: string) => { const d = Math.ceil((new Date(v).getTime() - Date.now()) / 86400000); return d < 0 ? [`Overdue · ${new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, c.err] : d <= 14 ? [`In ${d} days · ${new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, c.warn] : [new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), c.text]; };
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Maintenance reminders" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {perg && <View><RNText style={S(20, "700")}>{perg.name}</RNText><RNText style={S(13.5, "400", c.text3)}>{[perg.structure_type?.replace("_", " "), perg.brand, perg.installed_at ? `installed ${new Date(perg.installed_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : null].filter(Boolean).join(" · ")}. Reminders are based on the manufacturer's care schedule.</RNText></View>}
        {list.length === 0 && <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: 24, alignItems: "center" }}><RNText style={S(13.5, "400", c.text4)}>No reminders yet — they're created after an installation or MrCare plan.</RNText></View>}
        {list.map((r) => { const k = KIND[r.kind] ?? { t: r.title ?? r.kind.replace(/_/g, " "), s: "", icon: "notifications-outline" as const }; const on = r.status !== "dismissed"; const [dt, col] = due(r.due_at); return (
          <View key={r.id} style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: on ? c.primarySoft : c.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name={k.icon} size={20} color={on ? c.primary : c.text4} /></View><View style={{ flex: 1, gap: 2 }}><RNText style={S(14.5, "600")}>{k.t}</RNText><RNText style={S(12.5, "400", c.text4)}>{k.s}</RNText></View><Pressable onPress={async () => { await api(`/reminders/${r.id}/${on ? "dismiss" : "snooze"}`, { method: "POST", body: { days: 0 } }); load(); }} style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: on ? c.primary : c.border2, padding: 3 }}><View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", marginLeft: on ? 18 : 0 }} /></Pressable></View>
            {on && <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}><View><RNText style={S(12, "400", c.text4)}>Next due</RNText><RNText style={S(14, "600", col)}>{dt}</RNText></View><Pressable onPress={() => nav.navigate("RepairForm")} style={{ height: 36, paddingHorizontal: 14, borderRadius: 10, backgroundColor: c.primary, justifyContent: "center" }}><RNText style={S(13, "600", "#fff")}>Book it</RNText></Pressable></View>}
          </View>); })}
        <RNText style={S(12, "400", c.text4)}>Reminders arrive as notifications 2 weeks before the due date.</RNText>
      </ScrollView>
    </SafeAreaView>
  );
}
