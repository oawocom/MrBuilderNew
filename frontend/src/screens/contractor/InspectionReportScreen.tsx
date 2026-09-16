import React, { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text as RNText, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Field, PrimaryButton } from "../../components/form";
import { Header, Note, Section } from "../../components/sheet";
import { api, Job, uploadFile } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

export default function InspectionReportScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { params } = useRoute<{ key: string; name: string; params: { id: string } }>();
  const { c } = useTheme();
  const [j, setJ] = useState<Job | null>(null); const [f, setF] = useState({ w: "", l: "", h: "", mounting: "attached", findings: "", footings: "ready", access: "clear", structure: "sound", scope: "as_requested" }); const [photos, setPhotos] = useState<{ url: string; label: string }[]>([]); const [busy, setBusy] = useState(false);
  useEffect(() => { api<Job>(`/jobs/${params.id}`).then((r) => { setJ(r.data ?? null); if (r.data) setF((x) => ({ ...x, w: String(r.data!.width_ft ?? ""), l: String(r.data!.length_ft ?? ""), h: String(r.data!.height_ft ?? ""), mounting: r.data!.mounting ?? "attached" })); }); }, [params.id]);
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  async function shoot(label: string) { const perm = await ImagePicker.requestCameraPermissionsAsync(); const res = perm.granted ? await ImagePicker.launchCameraAsync({ quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 }); if (res.canceled || !res.assets[0]) return; setBusy(true); const u = await uploadFile(res.assets[0].uri, "evidence"); setBusy(false); if (!u) { Alert.alert("Upload failed"); return; } setPhotos((p) => [...p, { url: u, label }]); }
  async function submit() {
    setBusy(true);
    const r = await api(`/jobs/${params.id}/inspection-report`, { method: "POST", body: { measurements: { width_ft: Number(f.w), length_ft: Number(f.l), height_ft: Number(f.h) }, mounting: f.mounting, findings: f.findings, checks: { footings: f.footings, access: f.access, structure: f.structure, scope: f.scope }, photos } });
    setBusy(false);
    if (!r.success) { Alert.alert("Couldn't submit", r.error); return; }
    Alert.alert("Report sent", "MrBuilder prices the job from your report. The client is notified when the quote is ready — you're paid the inspection fee now.", [{ text: "OK", onPress: () => nav.navigate("JobDetail", { id: params.id }) }]);
  }
  const Seg = ({ k, opts }: { k: keyof typeof f; opts: [string, string][] }) => <View style={{ flexDirection: "row", gap: 8 }}>{opts.map(([v, l]) => <Pressable key={v} onPress={() => setF({ ...f, [k]: v })} style={{ flex: 1, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: f[k] === v ? c.primary : c.border2, backgroundColor: f[k] === v ? c.primarySoft : c.surface, alignItems: "center", justifyContent: "center" }}><RNText style={S(13, "600")}>{l}</RNText></Pressable>)}</View>;
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Inspection report" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 24 }} keyboardShouldPersistTaps="handled">
        <Note tone="info">You report facts and measurements. MrBuilder generates the quote from them — the client sees your findings and photos with the price.</Note>
        <Section title="Measurements (ft)"><View style={{ flexDirection: "row", gap: 8 }}>{(["w", "l", "h"] as const).map((k) => <View key={k} style={{ flex: 1 }}><Field label={k === "w" ? "Width" : k === "l" ? "Length" : "Height"} value={f[k]} onChangeText={(v) => setF({ ...f, [k]: v })} keyboardType="decimal-pad" /></View>)}</View><Seg k="mounting" opts={[["attached", "Wall-attached"], ["free_standing", "Free-standing"]]} /></Section>
        <Section title="Site checks"><View style={{ gap: 6 }}><RNText style={S(13, "600", c.text2)}>Footings</RNText><Seg k="footings" opts={[["ready", "Ready"], ["not_ready", "Not ready"], ["none", "N/A"]]} /></View><View style={{ gap: 6 }}><RNText style={S(13, "600", c.text2)}>Access</RNText><Seg k="access" opts={[["clear", "Clear"], ["restricted", "Restricted"]]} /></View><View style={{ gap: 6 }}><RNText style={S(13, "600", c.text2)}>Structure condition</RNText><Seg k="structure" opts={[["sound", "Sound"], ["wear", "Wear"], ["damage", "Damage"]]} /></View><View style={{ gap: 6 }}><RNText style={S(13, "600", c.text2)}>Scope vs request</RNText><Seg k="scope" opts={[["as_requested", "As requested"], ["larger", "Larger"], ["smaller", "Smaller"]]} /></View></Section>
        <Section title="Findings"><TextInput value={f.findings} onChangeText={(v) => setF({ ...f, findings: v })} multiline placeholder="What you found, what's needed, anything the client should know" placeholderTextColor={c.text5} style={{ minHeight: 110, borderRadius: 12, borderWidth: 1, borderColor: c.border2, backgroundColor: c.surface, padding: 12, paddingHorizontal: 14, fontFamily: font.regular, fontSize: 14, color: c.text, textAlignVertical: "top" }} /></Section>
        <Section title="Photos" right={<RNText style={S(12.5, "400", c.text4)}>{photos.length} · min 3</RNText>}><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{photos.map((p, i) => <View key={i}><Image source={{ uri: p.url }} style={{ width: 104, height: 104, borderRadius: 12, backgroundColor: c.surface2 }} /><View style={{ position: "absolute", left: 6, bottom: 6, backgroundColor: "rgba(0,0,0,.45)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><RNText style={S(10.5, "600", "#fff")}>{p.label}</RNText></View></View>)}{["Wide", "Footings", "Attachment", "Detail"].filter((l) => !photos.some((p) => p.label === l) || l === "Detail").map((l) => <Pressable key={l} onPress={() => shoot(l)} style={{ width: 104, height: 104, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.border2, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", gap: 4 }}><Ionicons name="camera-outline" size={22} color={c.text3} /><RNText style={S(12, "600", c.text3)}>{l}</RNText></Pressable>)}</View></Section>
      </ScrollView>
      <View style={{ padding: 12, paddingHorizontal: 16, paddingBottom: 30, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}><PrimaryButton title="Submit report" onPress={submit} disabled={!f.w || !f.l || !f.h || f.findings.trim().length < 10 || photos.length < 3} loading={busy} /></View>
    </SafeAreaView>
  );
}
