import React, { useState } from "react";
import { Alert, Pressable, ScrollView, Text as RNText, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { PrimaryButton, SecondaryButton } from "../../components/form";
import { Header } from "../../components/sheet";
import { api, uploadFile } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

export default function DisputeFormScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { params } = useRoute<{ key: string; name: string; params: { id: string } }>();
  const { c } = useTheme();
  const [text, setText] = useState(""); const [files, setFiles] = useState<{ name: string; url: string }[]>([]); const [busy, setBusy] = useState(false);
  const S = (n: number, w: "400" | "500" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });
  async function add() { if (files.length >= 3) return; const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 }); if (res.canceled || !res.assets[0]) return; setBusy(true); const u = (await uploadFile(res.assets[0].uri, "evidence")) ?? res.assets[0].uri; setBusy(false); setFiles((f) => [...f, { name: res.assets[0].fileName ?? `proof-${f.length + 1}.jpg`, url: u }]); }
  async function submit() { setBusy(true); const r = await api(`/jobs/${params.id}/dispute`, { method: "POST", body: { text, photos: files.map((f) => f.url) } }); setBusy(false); if (!r.success) { Alert.alert("Couldn't submit", r.error); return; } Alert.alert("Dispute submitted", "Our team will review and notify both sides.", [{ text: "OK", onPress: () => nav.navigate("JobDetail", { id: params.id }) }]); }
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Dispute" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }} keyboardShouldPersistTaps="handled">
        <View><RNText style={S(20, "700")}>Why do you disagree with the client's feedback?</RNText><RNText style={S(14, "400", c.text3)}>This information will help us review the situation fairly.</RNText></View>
        <View style={{ gap: 6 }}><RNText style={S(14, "500", c.text2)}>Your explanation</RNText><TextInput value={text} onChangeText={setText} multiline placeholder="Explain why you believe the job was fully completed …" placeholderTextColor={c.text5} style={{ minHeight: 130, borderRadius: 12, borderWidth: 1, borderColor: c.border2, backgroundColor: c.surface, padding: 12, paddingHorizontal: 14, fontFamily: font.regular, fontSize: 14, color: c.text, textAlignVertical: "top" }} /></View>
        <View style={{ gap: 8 }}><Pressable onPress={add} style={{ borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: c.border2, backgroundColor: c.surface, padding: 16, alignItems: "center", gap: 6 }}><View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name="cloud-upload-outline" size={20} color={c.text2} /></View><RNText style={S(14, "400", c.text3)}><RNText style={S(14, "600", c.orange)}>Click to upload</RNText> proof</RNText><RNText style={S(12, "400", c.text4)}>Up to 3 photos or documents as proof</RNText></Pressable>{files.map((f, i) => <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: 10, paddingHorizontal: 12 }}><View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="image-outline" size={18} color={c.primary} /></View><View style={{ flex: 1 }}><RNText style={S(13.5, "500")}>{f.name}</RNText><View style={{ height: 6, borderRadius: 3, backgroundColor: c.border, marginTop: 4 }}><View style={{ width: "100%", height: 6, borderRadius: 3, backgroundColor: c.primary }} /></View></View><Pressable onPress={() => setFiles(files.filter((_, k) => k !== i))}><Ionicons name="close" size={18} color={c.text4} /></Pressable></View>)}</View>
        <View style={{ flex: 1 }} />
        <PrimaryButton title="Submit dispute" onPress={submit} disabled={text.trim().length < 10} loading={busy} /><SecondaryButton title="Cancel" onPress={() => nav.goBack()} />
      </ScrollView>
    </SafeAreaView>
  );
}
