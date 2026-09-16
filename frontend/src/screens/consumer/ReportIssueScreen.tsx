import React, { useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text as RNText, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { PrimaryButton } from "../../components/form";
import { Header, Note, Section } from "../../components/sheet";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { api, uploadFile } from "../../api/client";

const REASONS = [["incomplete", "Work is incomplete"], ["quality", "Quality problem"], ["damage", "Damage to property"], ["other", "Something else"]];

export default function ReportIssueScreen() {
  const nav = useNavigation();
  const { params } = useRoute<{ key: string; name: string; params: { id: string } }>();
  const { c } = useTheme();
  const [reason, setReason] = useState(""); const [text, setText] = useState(""); const [photos, setPhotos] = useState<string[]>([]); const [busy, setBusy] = useState(false);
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  async function add() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const res = perm.granted ? await ImagePicker.launchCameraAsync({ quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (res.canceled || !res.assets[0]) return;
    setBusy(true); const u = (await uploadFile(res.assets[0].uri, "evidence")) ?? res.assets[0].uri; setBusy(false); setPhotos((p) => [...p, u]);
  }
  async function submit() {
    setBusy(true); const r = await api(`/jobs/${params.id}/issue`, { method: "POST", body: { reason, text, photos } }); setBusy(false);
    if (!r.success) { Alert.alert("Couldn't send", r.error ?? "Try again"); return; }
    nav.goBack();
  }
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Report an issue" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 20 }} keyboardShouldPersistTaps="handled">
        <Note tone="warn">Payment stays on hold. Your PRO will see your report and photos and can come back to fix the remaining work, or dispute it for MrBuilder to review.</Note>
        <Section title="What isn't right?">
          <View style={{ gap: 8 }}>{REASONS.map(([k, l]) => <Pressable key={k} onPress={() => setReason(k)} style={{ height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: reason === k ? c.primary : c.border2, backgroundColor: reason === k ? c.primarySoft : c.surface, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><RNText style={S(14.5, "600")}>{l}</RNText><View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: reason === k ? c.primary : c.border2, alignItems: "center", justifyContent: "center" }}>{reason === k && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} />}</View></Pressable>)}</View>
          <View style={{ gap: 6 }}><RNText style={S(13, "600", c.text2)}>Describe the problem</RNText><TextInput value={text} onChangeText={(v) => setText(v.slice(0, 500))} multiline placeholder="What's wrong and where — be specific so it can be fixed quickly" placeholderTextColor={c.text4} style={{ minHeight: 110, borderRadius: 12, borderWidth: 1, borderColor: c.border2, backgroundColor: c.surface, padding: 12, paddingHorizontal: 14, fontFamily: font.regular, fontSize: 15, color: c.text, textAlignVertical: "top" }} /><RNText style={{ ...S(12, "400", c.text4), alignSelf: "flex-end" }}>{text.length} / 500</RNText></View>
        </Section>
        <Section title="Photos" right={<RNText style={S(12.5, "400", c.text4)}>{photos.length} · up to 6</RNText>}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{photos.map((u, i) => <Image key={i} source={{ uri: u }} style={{ width: 104, height: 104, borderRadius: 12, backgroundColor: c.surface2 }} />)}{photos.length < 6 && <Pressable onPress={add} style={{ width: 104, height: 104, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.border2, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", gap: 4 }}><Ionicons name="camera-outline" size={22} color={c.text4} /><RNText style={S(12, "600", c.text4)}>{busy ? "…" : "Add"}</RNText></Pressable>}</View>
        </Section>
      </ScrollView>
      <View style={{ padding: 12, paddingHorizontal: 16, paddingBottom: 30, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}><PrimaryButton title="Send report" onPress={submit} disabled={!reason || text.trim().length < 5} loading={busy} /></View>
    </SafeAreaView>
  );
}
