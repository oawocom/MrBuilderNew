import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../components/sheet";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

interface Ev { id: string; job_id: string; title: string; kind: string; status: string; start_at: string; end_at?: string | null; address?: string | null; city?: string | null }

export default function ScheduleScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { c } = useTheme();
  const [events, setEvents] = useState<Ev[]>([]); const [week, setWeek] = useState(0); const [day, setDay] = useState(new Date().toDateString());
  const load = useCallback(async () => { const r = await api<Ev[]>("/schedule"); setEvents(r.data ?? []); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - start.getDay() + week * 7);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const on = (d: Date) => events.filter((e) => new Date(e.start_at).toDateString() === d.toDateString());
  const sel = days.find((d) => d.toDateString() === day) ?? days[0]; const todays = on(sel);
  const color = (e: Ev) => e.status === "in_progress" ? c.ok : e.kind === "inspection" ? c.info : e.status === "paused_safety" ? c.err : c.primary;
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Schedule" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(16, "700")}>{days[0].toLocaleDateString("en-US", { month: "long", year: "numeric" })}</RNText><View style={{ flexDirection: "row", gap: 6 }}>{[-1, 1].map((d) => <Pressable key={d} onPress={() => setWeek(week + d)} style={{ width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}><Ionicons name={d < 0 ? "chevron-back" : "chevron-forward"} size={18} color={c.text2} /></Pressable>)}</View></View>
        <View style={{ flexDirection: "row", gap: 6 }}>{days.map((d) => { const isSel = d.toDateString() === sel.toDateString(); const has = on(d).length > 0; return <Pressable key={d.toISOString()} onPress={() => setDay(d.toDateString())} style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 8, borderRadius: 12, backgroundColor: isSel ? c.hero : c.surface, borderWidth: 1, borderColor: isSel ? c.hero : c.border }}><RNText style={S(11, "600", isSel ? "#B7BAC1" : c.text4)}>{d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}</RNText><RNText style={S(16, "700", isSel ? "#fff" : c.text)}>{d.getDate()}</RNText><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: has ? (isSel ? c.primary : c.primary) : "transparent" }} /></Pressable>; })}</View>
        <RNText style={S(13, "600", c.text4)}>{sel.toDateString() === new Date().toDateString() ? "TODAY" : sel.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }).toUpperCase()}</RNText>
        {todays.length === 0 ? <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 20, alignItems: "center", gap: 6 }}><RNText style={S(14.5, "600")}>Nothing scheduled</RNText><RNText style={S(13, "400", c.text4)}>Accept a job from the marketplace to plan your day.</RNText><Pressable onPress={() => nav.navigate("Tabs", { screen: "Home" })} style={{ marginTop: 6, height: 40, paddingHorizontal: 14, borderRadius: 10, backgroundColor: c.primarySoft, justifyContent: "center" }}><RNText style={S(13.5, "600", c.orange)}>Browse jobs</RNText></Pressable></View>
          : todays.map((e) => <Pressable key={e.id} onPress={() => nav.navigate("JobDetail", { id: e.job_id })} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 12, paddingHorizontal: 14 }}><View style={{ width: 62 }}><RNText style={S(14, "700")}>{new Date(e.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</RNText><RNText style={S(11, "400", c.text4)}>{e.end_at ? `${Math.round((new Date(e.end_at).getTime() - new Date(e.start_at).getTime()) / 3600000)} h` : "—"}</RNText></View><View style={{ width: 3, height: 40, borderRadius: 2, backgroundColor: color(e) }} /><View style={{ flex: 1 }}><RNText style={S(15, "600")}>{e.title}</RNText><RNText style={S(12.5, "400", c.text4)}>{[e.address, e.city].filter(Boolean).join(", ")}</RNText></View><View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: c.surface2 }}><RNText style={{ ...S(11, "600", c.text2), textTransform: "capitalize" }}>{e.status.replace(/_/g, " ")}</RNText></View></Pressable>)}
        <View style={{ flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, backgroundColor: c.infoBg }}><Ionicons name="information-circle-outline" size={18} color={c.info} /><RNText style={{ flex: 1, ...S(13, "400", c.text2) }}>Preferred date ranges come from the client; the exact start time is agreed in chat. Update your ETA from the job with "On my way".</RNText></View>
      </ScrollView>
    </SafeAreaView>
  );
}
