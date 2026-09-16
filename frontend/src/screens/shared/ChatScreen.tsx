import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text as RNText, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../components/sheet";
import { api } from "../../api/client";
import { useSession } from "../../auth/session";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";

interface Msg { id: string; sender_id: string; body: string; attachments?: { url: string; kind?: string }[] | null; created_at: string; read_at?: string | null }
const QUICK = ["On my way?", "Thank you!", "What time works?", "Please call me"];

export default function ChatScreen() {
  const nav = useNavigation();
  const { params } = useRoute<{ key: string; name: string; params: { id: string; title: string; closed?: boolean } }>();
  const { user } = useSession();
  const { c } = useTheme();
  const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState(""); const [closed, setClosed] = useState(!!params.closed);
  const listRef = useRef<FlatList<Msg>>(null);
  const S = (n: number, w: "400" | "500" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });
  const load = useCallback(async () => { const r = await api<Msg[]>(`/conversations/${params.id}/messages?limit=200`); if (r.data) setMsgs(r.data); if (r.meta && (r.meta as { closed?: boolean }).closed) setClosed(true); }, [params.id]);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);
  async function send(body: string) {
    if (!body.trim()) return; setText("");
    const r = await api<Msg>(`/conversations/${params.id}/messages`, { method: "POST", body: { body } });
    if (r.success) load(); else if (r.error?.toLowerCase().includes("closed")) setClosed(true);
  }
  const ini = params.title.split(" ").map((x) => x[0]).join("").slice(0, 2);
  const day = (v: string) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const tm = (v: string) => new Date(v).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={params.title} onBack={() => nav.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={0}>
        <FlatList ref={listRef} data={msgs} keyExtractor={(m) => m.id} contentContainerStyle={{ padding: 16, gap: 12 }} onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item: m, index }) => { const mine = m.sender_id === user?.id; const showDay = index === 0 || day(m.created_at) !== day(msgs[index - 1].created_at); return (
            <View style={{ gap: 12 }}>
              {showDay && <View style={{ alignItems: "center" }}><RNText style={{ ...S(12, "500", c.text4), backgroundColor: c.surface3, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, overflow: "hidden" }}>{day(m.created_at)}</RNText></View>}
              <View style={{ flexDirection: "row", gap: 8, justifyContent: mine ? "flex-end" : "flex-start", alignItems: "flex-end" }}>
                {!mine && <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.info, alignItems: "center", justifyContent: "center" }}><RNText style={S(11, "700", "#fff")}>{ini}</RNText></View>}
                <View style={{ maxWidth: "78%", gap: 3, alignItems: mine ? "flex-end" : "flex-start" }}>
                  <View style={{ backgroundColor: mine ? c.primary : c.surface, borderWidth: mine ? 0 : 1, borderColor: c.border, borderRadius: 16, borderBottomRightRadius: mine ? 4 : 16, borderBottomLeftRadius: mine ? 16 : 4, paddingHorizontal: 14, paddingVertical: 10 }}><RNText style={S(14.5, "400", mine ? "#fff" : c.text)}>{m.body}</RNText></View>
                  <RNText style={S(11, "400", c.text5)}>{tm(m.created_at)}{mine ? (m.read_at ? " · Read" : " · Sent") : ""}</RNText>
                </View>
              </View>
            </View>); }}
          ListEmptyComponent={<RNText style={{ ...S(13, "400", c.text4), textAlign: "center", paddingTop: 40 }}>Say hello — messages are shared with MrBuilder for safety.</RNText>} />
        {closed ? <View style={{ margin: 16, flexDirection: "row", gap: 10, padding: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.warnBg }}><Ionicons name="lock-closed-outline" size={18} color={c.warn} /><RNText style={{ flex: 1, ...S(13, "400", c.warn) }}><RNText style={S(13, "600", c.warn)}>This chat is closed.</RNText> Messaging is available only while a service request is active.</RNText></View> : (
          <View style={{ borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface, paddingBottom: 24 }}>
            {msgs.length === 0 && <View style={{ flexDirection: "row", gap: 8, padding: 10, paddingHorizontal: 16 }}>{QUICK.map((q) => <Pressable key={q} onPress={() => send(q)} style={{ height: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: c.border2, justifyContent: "center" }}><RNText style={S(13, "500")}>{q}</RNText></Pressable>)}</View>}
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, paddingHorizontal: 16 }}><TextInput value={text} onChangeText={setText} placeholder="Message" placeholderTextColor={c.text4} multiline style={{ flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: 1, borderColor: c.border2, backgroundColor: c.bg, paddingHorizontal: 16, paddingVertical: 11, fontFamily: font.regular, fontSize: 15, color: c.text }} /><Pressable onPress={() => send(text)} disabled={!text.trim()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? c.primary : c.surface3, alignItems: "center", justifyContent: "center" }}><Ionicons name="arrow-up" size={20} color={text.trim() ? "#fff" : c.text4} /></Pressable></View>
          </View>)}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
