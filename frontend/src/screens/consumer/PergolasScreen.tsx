import React, { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../components/sheet";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

export interface Pergola { id: string; name: string; city: string | null; state: string | null; address_line1: string | null; structure_type: string | null; brand: string | null; model: string | null; mounting: string | null; width_ft: number | null; length_ft: number | null; height_ft: number | null; installed_at: string | null; photo_url: string | null; photos?: string[]; spec?: Record<string, unknown>; coverage?: { maintenance: { plan: string } | null; electronics: { plan: string } | null }; last_service_at?: string | null; next_check_at?: string | null; source?: string }

export default function PergolasScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { c } = useTheme();
  const [list, setList] = useState<Pergola[]>([]); const [filter, setFilter] = useState("All");
  const load = useCallback(async () => { const r = await api<Pergola[]>("/pergolas"); setList(r.data ?? []); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  const shown = list.filter((p) => filter === "All" ? true : filter === "Covered" ? !!(p.coverage?.maintenance || p.coverage?.electronics) : !(p.coverage?.maintenance || p.coverage?.electronics));
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="My pergolas" onBack={() => nav.goBack()} right={<Pressable onPress={() => nav.navigate("AddPergola", { persist: true })} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}><Ionicons name="add" size={22} color="#fff" /></Pressable>} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 12, gap: 12 }}>
        {list.length === 0 ? (
          <View style={{ alignItems: "center", gap: 8, paddingTop: 64, paddingHorizontal: 24 }}><View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name="cube-outline" size={30} color={c.text4} /></View><RNText style={S(17, "700")}>No pergolas yet</RNText><RNText style={{ ...S(14, "400", c.text4), textAlign: "center" }}>Save your pergola's specs once — quotes, warranties and support get faster.</RNText><Pressable onPress={() => nav.navigate("AddPergola", { persist: true })} style={{ marginTop: 8, height: 48, paddingHorizontal: 20, borderRadius: 12, backgroundColor: c.primary, flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name="add" size={18} color="#fff" /><RNText style={S(15, "600", "#fff")}>Add a pergola</RNText></Pressable></View>
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: 8 }}>{["All", "Covered", "Not covered"].map((f) => <Pressable key={f} onPress={() => setFilter(f)} style={{ height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: filter === f ? c.hero : c.border2, backgroundColor: filter === f ? c.hero : c.surface, justifyContent: "center" }}><RNText style={S(13, "600", filter === f ? "#fff" : c.text2)}>{f}</RNText></Pressable>)}</View>
            {shown.map((p) => { const cov = p.coverage?.maintenance || p.coverage?.electronics; return (
              <Pressable key={p.id} onPress={() => nav.navigate("PergolaDetail", { id: p.id })} style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, overflow: "hidden" }}>
                {p.photo_url ? <Image source={{ uri: p.photo_url }} style={{ height: 160 }} /> : <View style={{ height: 160, backgroundColor: c.hero, alignItems: "center", justifyContent: "center" }}><Ionicons name="image-outline" size={26} color="rgba(255,255,255,.75)" /><RNText style={S(12, "400", "rgba(255,255,255,.75)")}>Photo</RNText></View>}
                <View style={{ position: "absolute", top: 12, left: 12, height: 24, paddingHorizontal: 8, borderRadius: 999, backgroundColor: "rgba(0,0,0,.4)", justifyContent: "center" }}><RNText style={S(11.5, "600", "#fff")}>{p.source === "installation" ? "Installed by MrBuilder" : "Added by you"}</RNText></View>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, paddingHorizontal: 14, gap: 8 }}><View style={{ flex: 1, gap: 2 }}><RNText style={S(15, "600")}>{p.name}</RNText><RNText style={S(12.5, "400", c.text4)}>{[p.structure_type?.replace("_", " "), p.brand, p.width_ft && p.length_ft ? `${p.width_ft}×${p.length_ft} ft` : null].filter(Boolean).join(" · ")}</RNText></View><View style={{ height: 24, paddingHorizontal: 8, borderRadius: 999, backgroundColor: cov ? c.okBg : c.surface2, justifyContent: "center" }}><RNText style={S(11.5, "600", cov ? c.ok : c.text3)}>{cov ? "MrCare active" : "No plan"}</RNText></View></View>
              </Pressable>); })}
            <Pressable onPress={() => nav.navigate("AddPergola", { persist: true })} style={{ height: 48, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: c.orangeBd, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}><Ionicons name="add" size={18} color={c.orange} /><RNText style={S(14, "600", c.orange)}>Add a pergola</RNText></Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
