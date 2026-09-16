import React, { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text as RNText, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { PrimaryButton } from "../../components/form";
import { ChoiceRow, Header, Note, PickerSheet, Section, SelectField } from "../../components/sheet";
import { api, uploadFile } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";
import type { Sub } from "./MrCareScreen";
import { useContent } from "../../state/content";

interface Pergola { id: string; name: string }
interface Equipment { id: string; pergola_id: string; device_type: string; brand: string | null; model: string | null }
const ISSUES = [["noPower", "No power / doesn't respond"], ["stops", "Stops midway or moves erratically"], ["noise", "Grinding or clicking noise"], ["sensor", "Sensor not triggering (rain / wind / sun)"], ["remote", "Remote or controller not pairing"], ["other", "Other"]];
const PRIO = [["low", "Low", "within 2 weeks"], ["normal", "Medium", "within 1 week"], ["high", "High", "within 2 days"]];

export default function ElectronicsClaimScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { params } = useRoute<{ key: string; name: string; params: { subscriptionId: string; pergolaId?: string } }>();
  const { c } = useTheme();
  const DEVICES = useContent().electronics_devices;
  const [sub, setSub] = useState<Sub | null>(null); const [pergolas, setPergolas] = useState<Pergola[]>([]); const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [f, setF] = useState({ pergola: params.pergolaId ?? "", device: "", equipmentId: "", issue: "", prio: "normal", text: "" }); const [photos, setPhotos] = useState<string[]>([]); const [pick, setPick] = useState<null | "pergola" | "device">(null); const [busy, setBusy] = useState(false);
  useEffect(() => { (async () => { const [s, g, e] = await Promise.all([api<Sub>(`/mrcare/subscriptions/${params.subscriptionId}`), api<Pergola[]>("/pergolas"), api<Equipment[]>("/equipment")]); setSub(s.data ?? null); const ps = (g.data ?? []).filter((p) => s.data?.pergola_ids.includes(p.id)); setPergolas(ps); setEquipment(e.data ?? []); if (!f.pergola && ps[0]) setF((x) => ({ ...x, pergola: ps[0].id })); })(); }, [params.subscriptionId]); // eslint-disable-line react-hooks/exhaustive-deps
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  const regs = equipment.filter((e) => e.pergola_id === f.pergola);
  async function add() { const perm = await ImagePicker.requestCameraPermissionsAsync(); const res = perm.granted ? await ImagePicker.launchCameraAsync({ quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 }); if (res.canceled || !res.assets[0]) return; setBusy(true); const u = (await uploadFile(res.assets[0].uri, "evidence")) ?? res.assets[0].uri; setBusy(false); setPhotos((p) => [...p, u]); }
  async function submit() {
    setBusy(true); const r = await api("/mrcare/claims", { method: "POST", body: { subscription_id: params.subscriptionId, pergola_id: f.pergola, equipment_id: f.equipmentId || undefined, device_type: f.device || undefined, issue_code: f.issue, priority: f.prio, notes: f.text || undefined, photos } }); setBusy(false);
    if (!r.success) { Alert.alert("Couldn't submit", r.error ?? "Try again"); return; }
    Alert.alert("Claim submitted", "MrBuilder will review it and dispatch a technician if it's covered. A $49 service-call fee applies on the visit.", [{ text: "OK", onPress: () => nav.navigate("Tabs", { screen: "MrCare" }) }]);
  }
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Electronics claim" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 24 }} keyboardShouldPersistTaps="handled">
        <Note tone="info">Covered by Electronics Protection · {sub ? `${Math.max(0, 2 - sub.claims_used)} of 2 claims left this year` : ""}. Submitting doesn't guarantee coverage — MrBuilder reviews each claim first.</Note>
        <Section title="Which pergola?"><SelectField label="Pergola" value={pergolas.find((p) => p.id === f.pergola)?.name ?? ""} placeholder="Select" onPress={() => setPick("pergola")} /></Section>
        <Section title="Which device?">
          {regs.length > 0 && <View style={{ gap: 8 }}>{regs.map((e) => <ChoiceRow key={e.id} title={e.device_type.replace(/_/g, " ")} sub={[e.brand, e.model].filter(Boolean).join(" ") || "Registered"} on={f.equipmentId === e.id} onPress={() => setF({ ...f, equipmentId: e.id, device: "" })} />)}</View>}
          <SelectField label={regs.length ? "Or another device" : "Device"} value={f.device} placeholder="Select device type" onPress={() => setPick("device")} hint="Unregistered devices may need a pre-inspection first." />
        </Section>
        <Section title="What's happening?"><View style={{ gap: 8 }}>{ISSUES.map(([k, t]) => <ChoiceRow key={k} title={t} on={f.issue === k} onPress={() => setF({ ...f, issue: k })} />)}</View>
          <View style={{ gap: 6 }}><RNText style={S(13, "600", c.text2)}>Details</RNText><TextInput value={f.text} onChangeText={(v) => setF({ ...f, text: v.slice(0, 500) })} multiline placeholder="When it started, what you tried, any error lights…" placeholderTextColor={c.text4} style={{ minHeight: 100, borderRadius: 12, borderWidth: 1, borderColor: c.border2, backgroundColor: c.surface, padding: 12, paddingHorizontal: 14, fontFamily: font.regular, fontSize: 15, color: c.text, textAlignVertical: "top" }} /></View></Section>
        <Section title="Priority"><View style={{ flexDirection: "row", gap: 8 }}>{PRIO.map(([k, t, s]) => <View key={k} style={{ flex: 1 }}><ChoiceRow title={t} sub={s} on={f.prio === k} onPress={() => setF({ ...f, prio: k })} /></View>)}</View></Section>
        <Section title="Photos" right={<RNText style={S(12.5, "400", c.text4)}>{photos.length} · up to 4</RNText>}><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{photos.map((u, i) => <Image key={i} source={{ uri: u }} style={{ width: 104, height: 104, borderRadius: 12, backgroundColor: c.surface2 }} />)}{photos.length < 4 && <Pressable onPress={add} style={{ width: 104, height: 104, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: c.border2, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", gap: 4 }}><Ionicons name="camera-outline" size={22} color={c.text4} /><RNText style={S(12, "600", c.text4)}>{busy ? "…" : "Add"}</RNText></Pressable>}</View></Section>
      </ScrollView>
      <View style={{ padding: 12, paddingHorizontal: 16, paddingBottom: 30, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}><PrimaryButton title="Submit claim" onPress={submit} disabled={!f.pergola || !f.issue || (!f.device && !f.equipmentId)} loading={busy} /></View>
      <PickerSheet open={pick === "pergola"} onClose={() => setPick(null)} title="Which pergola?" options={pergolas.map((p) => p.name)} value={pergolas.find((p) => p.id === f.pergola)?.name ?? ""} onSelect={(v) => setF({ ...f, pergola: pergolas.find((p) => p.name === v)?.id ?? "", equipmentId: "" })} />
      <PickerSheet open={pick === "device"} onClose={() => setPick(null)} title="Device" options={DEVICES} value={f.device} onSelect={(v) => setF({ ...f, device: v, equipmentId: "" })} />
    </SafeAreaView>
  );
}
