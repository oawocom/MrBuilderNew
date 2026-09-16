import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, Text as RNText, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../components/sheet";
import { api, APP_VARIANT } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

interface Conv { id: string; job_id: string | null; request_code?: string | null; other?: { id: string; first_name: string; last_name: string } | null; last_message?: { body: string; created_at: string; sender_id: string } | null; unread?: number; is_active?: boolean; updated_at: string }

export default function ChatsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { c } = useTheme();
  const [list, setList] = useState<Conv[]>([]); const [q, setQ] = useState("");
  const load = useCallback(async () => { const r = await api<Conv[]>("/conversations"); setList(r.data ?? []); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  const name = (cv: Conv) => cv.other ? `${cv.other.first_name} ${cv.other.last_name}` : "MrBuilder";
  const ago = (v: string) => { const m = (Date.now() - new Date(v).getTime()) / 60000; return m < 60 ? `${Math.max(1, Math.round(m))}m` : m < 1440 ? `${Math.round(m / 60)}h` : new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
  const shown = list.filter((cv) => !q || `${name(cv)} ${cv.request_code ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Chats" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 12, gap: 12 }}>
        <View><Ionicons name="search-outline" size={18} color={c.text4} style={{ position: "absolute", left: 12, top: 13, zIndex: 1 }} /><TextInput value={q} onChangeText={setQ} placeholder="Search conversations" placeholderTextColor={c.text4} style={{ height: 44, borderRadius: 12, borderWidth: 1, borderColor: c.border2, backgroundColor: c.surface, paddingLeft: 38, paddingRight: 12, fontFamily: font.regular, fontSize: 14.5, color: c.text }} /></View>
        {shown.length === 0 && <View style={{ alignItems: "center", gap: 8, paddingTop: 56, paddingHorizontal: 24 }}><View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name="chatbubbles-outline" size={30} color={c.text4} /></View><RNText style={S(17, "700")}>No conversations yet</RNText><RNText style={{ ...S(14, "400", c.text4), textAlign: "center" }}>{APP_VARIANT === "contractor" ? "A chat opens with the client as soon as you accept a job." : "A chat opens with your technician as soon as a request becomes active."}</RNText></View>}
        {shown.map((cv) => { const n = name(cv); const ini = n.split(" ").map((x) => x[0]).join("").slice(0, 2); const unread = (cv.unread ?? 0) > 0; return (
          <Pressable key={cv.id} onPress={() => nav.navigate("Chat", { id: cv.id, title: n })} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.info, alignItems: "center", justifyContent: "center" }}><RNText style={S(15, "700", "#fff")}>{ini}</RNText>{cv.is_active !== false && <View style={{ position: "absolute", right: 0, bottom: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: c.ok, borderWidth: 2, borderColor: c.surface }} />}</View>
            <View style={{ flex: 1, gap: 2 }}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}><RNText style={S(14.5, "600")}>{n}{cv.request_code ? <RNText style={S(12, "400", c.text5)}>  {cv.request_code}</RNText> : null}</RNText><RNText style={S(12, "400", c.text5)}>{cv.last_message ? ago(cv.last_message.created_at) : ago(cv.updated_at)}</RNText></View><RNText numberOfLines={1} style={S(13, unread ? "600" : "400", unread ? c.text : c.text4)}>{cv.last_message?.body ?? "No messages yet"}</RNText></View>
            {unread && <View style={{ minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}><RNText style={S(11, "700", "#fff")}>{cv.unread}</RNText></View>}
          </Pressable>); })}
      </ScrollView>
    </SafeAreaView>
  );
}
