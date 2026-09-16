import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { money } from "../../components";
import { api, Job } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

export default function HistoryScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { c } = useTheme();
  const [jobs, setJobs] = useState<(Job & { my_rating?: number | null })[]>([]); const [seg, setSeg] = useState<"done" | "cancel">("done"); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { const r = await api<Job[]>("/jobs/me?limit=100"); setJobs(r.data ?? []); setLoading(false); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  const done = jobs.filter((j) => ["completed_paid", "dispute_upheld"].includes(j.status)), canc = jobs.filter((j) => ["cancelled_by_client", "cancelled_by_contractor"].includes(j.status));
  const list = seg === "done" ? done : canc;
  const dates = (j: Job) => `${new Date(j.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(j.paid_at ?? j.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}><RNText style={S(20, "700")}>History</RNText></View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12 }}>
        <View style={{ flexDirection: "row", backgroundColor: c.surface3, borderRadius: 12, padding: 4 }}>{(["done", "cancel"] as const).map((k) => <Pressable key={k} onPress={() => setSeg(k)} style={{ flex: 1, height: 40, borderRadius: 9, backgroundColor: seg === k ? c.surface : "transparent", alignItems: "center", justifyContent: "center" }}><RNText style={S(14, "600", seg === k ? c.text : c.text4)}>{k === "done" ? `Completed (${done.length})` : `Canceled (${canc.length})`}</RNText></Pressable>)}</View>
        {loading && [1, 2, 3].map((k) => <View key={k} style={{ height: 112, borderRadius: 16, backgroundColor: c.surface2 }} />)}
        {!loading && list.length === 0 && <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 24, alignItems: "center", gap: 6 }}><RNText style={S(15, "600")}>{seg === "done" ? "No completed jobs yet" : "No canceled jobs"}</RNText><RNText style={S(13, "400", c.text4)}>{seg === "done" ? "Finished jobs and payouts show up here." : "Good — keep it that way."}</RNText></View>}
        {list.map((j) => { const cancelled = seg === "cancel"; return (
          <Pressable key={j.id} onPress={() => nav.navigate("JobDetail", { id: j.id })} style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14, gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}><View style={{ flex: 1, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}><RNText style={S(16, "600")}>{j.title}</RNText><View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: c.surface2 }}><RNText style={{ ...S(11, "600", c.text2), textTransform: "capitalize" }}>{j.service_category}</RNText></View></View><View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: cancelled ? c.errBg : c.okBg, flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name={cancelled ? "close" : "checkmark"} size={12} color={cancelled ? c.err : c.ok} /><RNText style={S(12, "600", cancelled ? c.err : c.ok)}>{cancelled ? (j.status === "cancelled_by_client" ? "Canceled by client" : "Canceled") : "Completed"}</RNText></View></View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="location-outline" size={14} color={c.text3} /><RNText style={S(13, "400", c.text3)}>{j.location_city}, {j.location_state}</RNText></View>{!cancelled && j.my_rating != null && <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><Ionicons name="star" size={13} color={c.primary} /><RNText style={S(13, "600")}>{j.my_rating}.0</RNText></View>}</View>
            {cancelled && <View style={{ padding: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: c.bg }}><RNText style={S(13, "400", c.text3)}><RNText style={S(13, "600", c.text2)}>{j.status === "cancelled_by_client" ? `Canceled by ${j.consumer?.first_name ?? "client"}` : "Canceled by you"}</RNText> · {new Date(j.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</RNText></View>}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(12.5, "400", c.text4)}>{dates(j)}</RNText><RNText style={S(17, "700", cancelled ? c.text5 : c.text)}>{money(cancelled ? j.contractor_net : (j.contractor_net ?? 0) + j.tip)}</RNText></View>
          </Pressable>); })}
      </ScrollView>
    </SafeAreaView>
  );
}
