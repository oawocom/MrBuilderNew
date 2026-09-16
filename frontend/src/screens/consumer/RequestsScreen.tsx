// Requests list (client: search · New · chats badge · filter chips · request cards)
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, Text as RNText, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api, Job } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font, statusLabel, statusTone, Tone } from "../../theme/tokens";
import { money } from "../../components";
import { RootParams } from "../../navigation";

const FILTERS = ["All", "Active", "Needs action", "Completed", "Cancelled"];
const doneS = ["completed_paid", "dispute_upheld"], cancelS = ["cancelled_by_client", "cancelled_by_contractor", "quote_declined"], actionS = ["quote_ready", "awaiting_confirmation", "dispute_rejected"];

export default function RequestsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { c } = useTheme();
  const [jobs, setJobs] = useState<Job[]>([]); const [q, setQ] = useState(""); const [filter, setFilter] = useState("All"); const [chatUnread, setChatUnread] = useState(0);
  const load = useCallback(async () => { const [j, cv] = await Promise.all([api<Job[]>("/jobs/me?limit=100"), api<{ unread?: number }[]>("/conversations")]); setJobs(j.data ?? []); setChatUnread((cv.data ?? []).reduce((a, x) => a + (x.unread ?? 0), 0)); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "500" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });
  const toneMap: Record<Tone, [string, string]> = { ok: [c.okBg, c.ok], warn: [c.warnBg, c.warn], err: [c.errBg, c.err], info: [c.infoBg, c.info], orange: [c.orangeBg, c.orange], neutral: [c.surface2, c.text3] };
  const shown = jobs.filter((j) => (filter === "Active" ? !doneS.includes(j.status) && !cancelS.includes(j.status) : filter === "Needs action" ? actionS.includes(j.status) : filter === "Completed" ? doneS.includes(j.status) : filter === "Cancelled" ? cancelS.includes(j.status) : true)).filter((j) => !q || `${j.title} ${j.request_code} ${j.service_category}`.toLowerCase().includes(q.toLowerCase()));
  const when = (j: Job) => j.scheduled_start ? new Date(j.scheduled_start).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : new Date(j.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border }}><RNText style={{ flex: 1, paddingLeft: 4, ...S(22, "700") }}>Requests</RNText></View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 12, gap: 12 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}><Ionicons name="search-outline" size={18} color={c.text4} style={{ position: "absolute", left: 12, top: 13, zIndex: 1 }} /><TextInput value={q} onChangeText={setQ} placeholder="Search requests" placeholderTextColor={c.text4} style={{ height: 44, borderRadius: 12, borderWidth: 1, borderColor: c.border2, backgroundColor: c.surface, paddingLeft: 38, paddingRight: 12, fontFamily: font.regular, fontSize: 14.5, color: c.text }} /></View>
          <Pressable onPress={() => nav.navigate("NewRequest")} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}><Ionicons name="add" size={22} color="#fff" /></Pressable>
          <Pressable onPress={() => nav.navigate("Chats")} style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: c.border2, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}><Ionicons name="chatbubble-ellipses-outline" size={20} color={c.text2} />{chatUnread > 0 && <View style={{ position: "absolute", top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}><RNText style={S(11, "700", "#fff")}>{chatUnread}</RNText></View>}</Pressable>
        </View>
        {jobs.length === 0 ? (
          <View style={{ alignItems: "center", gap: 8, paddingTop: 56, paddingHorizontal: 24 }}><View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name="reader-outline" size={30} color={c.text4} /></View><RNText style={S(17, "700")}>No requests yet</RNText><RNText style={{ ...S(14, "400", c.text4), textAlign: "center" }}>Installations, repairs and inspector visits you request will show up here.</RNText><Pressable onPress={() => nav.navigate("NewRequest")} style={{ marginTop: 8, height: 48, paddingHorizontal: 20, borderRadius: 12, backgroundColor: c.primary, flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name="add" size={18} color="#fff" /><RNText style={S(15, "600", "#fff")}>New Request</RNText></Pressable></View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>{FILTERS.map((f) => <Pressable key={f} onPress={() => setFilter(f)} style={{ height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: filter === f ? c.hero : c.border2, backgroundColor: filter === f ? c.hero : c.surface, justifyContent: "center" }}><RNText style={S(13, "600", filter === f ? "#fff" : c.text2)}>{f}</RNText></Pressable>)}</ScrollView>
            {shown.map((j) => { const t = statusTone[j.status] ?? "neutral"; const [bg, fg] = toneMap[t]; const pro = j.contractor; return (
              <Pressable key={j.id} onPress={() => nav.navigate("RequestDetail", { id: j.id })} style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14, gap: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}><View style={{ flex: 1, gap: 2 }}><RNText style={S(15, "600")} numberOfLines={1}>{j.title}</RNText><RNText style={S(12, "400", c.text5)}>{j.request_code} · <RNText style={S(12, "600", j.covered_by ? c.ok : c.text4)}>{j.covered_by ? "MrCare" : j.service_category}</RNText></RNText></View><View style={{ height: 24, paddingHorizontal: 8, borderRadius: 999, backgroundColor: bg, justifyContent: "center" }}><RNText style={S(11.5, "600", fg)}>{statusLabel[j.status]?.consumer ?? j.status}</RNText></View></View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name="calendar-outline" size={15} color={c.text3} /><RNText style={S(13, "400", c.text3)}>{when(j)}</RNText></View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: pro ? c.info : c.surface3, alignItems: "center", justifyContent: "center" }}>{pro ? <RNText style={S(12, "700", "#fff")}>{pro.first_name[0]}{pro.last_name[0]}</RNText> : <Ionicons name="person-outline" size={15} color={c.text4} />}</View>
                  <View style={{ flex: 1 }}><RNText style={S(12, "400", c.text4)}>{pro ? "Technician" : "Contractor"}</RNText><RNText style={S(13.5, "600")}>{pro ? `${pro.first_name} ${pro.last_name}` : "Not assigned yet"}</RNText></View>
                  <View style={{ alignItems: "flex-end" }}><RNText style={S(12, "400", c.text4)}>{doneS.includes(j.status) ? "Paid" : j.quote_total != null ? "Quote" : "Estimate"}</RNText><RNText style={S(15, "700")}>{j.quote_total != null ? money(doneS.includes(j.status) ? j.consumer_charged : j.quote_total) : "—"}</RNText></View>
                </View>
              </Pressable>); })}
            {shown.length === 0 && <RNText style={{ ...S(13, "400", c.text4), textAlign: "center", paddingTop: 24 }}>Nothing matches.</RNText>}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
