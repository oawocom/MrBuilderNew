// Repair / maintenance request (client: Which pergola · What's the issue · When can we come · Photos of the issue)
import React, { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text as RNText, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Field, PrimaryButton } from "../../components/form";
import { ChoiceRow, Header, PickerSheet, Section, SelectField, Sheet } from "../../components/sheet";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { api, Category, uploadFile } from "../../api/client";
import { RootParams } from "../../navigation";

interface Pergola { id: string; name: string; address_line1: string | null; city: string | null; state: string | null; zip_code: string | null; structure_type: string | null; mounting: string | null; width_ft: number | null; length_ft: number | null; height_ft: number | null }
const SLOTS = [["wide", "Wide shot", "whole pergola"], ["close", "Close-up", "the issue"], ["mount", "Attachment point", "posts / wall"]];
const URG = [["low", "Low", "This month"], ["medium", "Medium", "This week"], ["high", "High", "Within 2 days"]];

export default function RepairFormScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { c } = useTheme();
  const [pergolas, setPergolas] = useState<Pergola[]>([]); const [cats, setCats] = useState<Category[]>([]);
  const [f, setF] = useState({ pergola: "", svc: "", desc: "", urg: "medium", start: "", end: "", from: "", until: "" });
  const [photos, setPhotos] = useState<Record<string, string>>({}); const [more, setMore] = useState<string[]>([]);
  const [pick, setPick] = useState<null | "pergola" | "svc">(null); const [sheet, setSheet] = useState(false); const [method, setMethod] = useState<"ai" | "inspector">("ai");
  const [busy, setBusy] = useState(false);
  const S = (n: number, w: "400" | "500" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });
  useEffect(() => { api<Pergola[]>("/pergolas").then((r) => { setPergolas(r.data ?? []); if (r.data?.[0]) setF((x) => ({ ...x, pergola: r.data![0].id })); }); api<Category[]>("/categories").then((r) => setCats((r.data ?? []).filter((k) => k.slug !== "installation"))); }, []);
  const perg = pergolas.find((p) => p.id === f.pergola);
  const svc = cats.find((k) => k.name === f.svc);
  const ready = f.svc && f.desc.trim().length > 5 && (perg || pergolas.length === 0);

  async function shoot(slot: string) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    const res = perm.granted ? await ImagePicker.launchCameraAsync({ quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (res.canceled || !res.assets[0]) return;
    setBusy(true); const u = (await uploadFile(res.assets[0].uri, "evidence")) ?? res.assets[0].uri; setBusy(false);
    if (slot === "more") setMore((m) => [...m, u]); else setPhotos((p) => ({ ...p, [slot]: u }));
  }
  async function submit() {
    setBusy(true);
    const body = { service_category: svc?.slug ?? "repair", quote_method: method === "ai" ? "instant" : "inspection", pergola_id: perg?.id, title: `${f.svc} · ${perg?.name ?? "Pergola"}`,
      location_address: perg?.address_line1 ?? undefined, location_city: perg?.city ?? undefined, location_state: perg?.state ?? undefined, location_zip: perg?.zip_code ?? undefined, property_type: "residential",
      mounting: perg?.mounting ?? undefined, width_ft: perg?.width_ft ?? undefined, length_ft: perg?.length_ft ?? undefined, height_ft: perg?.height_ft ?? undefined, pergola_spec: { structure_type: perg?.structure_type ?? "louvered" },
      issue_description: f.desc, urgency: f.urg, preferred_start_date: f.start || undefined, preferred_end_date: f.end || undefined, notes: f.from || f.until ? `Time window: ${f.from || "?"} – ${f.until || "?"}` : undefined,
      images: [...SLOTS.map(([k, t]) => photos[k] ? { url: photos[k], label: t } : null).filter(Boolean), ...more.map((u) => ({ url: u, label: "More" }))] };
    const r = await api<{ id: string }>("/jobs", { method: "POST", body });
    setBusy(false);
    if (!r.success || !r.data) { Alert.alert("Couldn't submit", r.error ?? "Try again"); return; }
    setSheet(false); nav.replace("Quote", { id: r.data.id, method });
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Repair or maintenance" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 24 }} keyboardShouldPersistTaps="handled">
        <Section title="Which pergola?">
          <SelectField label="Pergola" value={perg ? `${perg.name}${perg.city ? ` · ${perg.city}` : ""}` : ""} placeholder={pergolas.length ? "Select a pergola" : "No saved pergolas yet"} onPress={() => pergolas.length && setPick("pergola")} />
          <Pressable onPress={() => nav.navigate("AddPergola", {})} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -6 }}><Ionicons name="add" size={16} color={c.primary} /><RNText style={S(13, "600", c.primary)}>Add a different pergola</RNText></Pressable>
        </Section>
        <Section title="What's the issue?">
          <SelectField label="Service type" value={f.svc} placeholder="Select service type" onPress={() => setPick("svc")} />
          <View style={{ gap: 6 }}><RNText style={S(13, "600", c.text2)}>Describe the problem</RNText><TextInput value={f.desc} onChangeText={(v) => setF({ ...f, desc: v.slice(0, 500) })} multiline placeholder="What's happening, since when, anything you've tried…" placeholderTextColor={c.text4} style={{ minHeight: 110, borderRadius: 12, borderWidth: 1, borderColor: c.border2, backgroundColor: c.surface, padding: 12, paddingHorizontal: 14, fontFamily: font.regular, fontSize: 15, color: c.text, textAlignVertical: "top" }} /><RNText style={{ ...S(12, "400", c.text4), alignSelf: "flex-end" }}>{f.desc.length} / 500</RNText></View>
          <View style={{ gap: 6 }}><RNText style={S(13, "600", c.text2)}>Urgency</RNText><View style={{ flexDirection: "row", gap: 8 }}>{URG.map(([k, t, s]) => <Pressable key={k} onPress={() => setF({ ...f, urg: k })} style={{ flex: 1, height: 48, borderRadius: 10, borderWidth: 1.5, borderColor: f.urg === k ? c.primary : c.border2, backgroundColor: f.urg === k ? c.primarySoft : c.surface, alignItems: "center", justifyContent: "center", gap: 1 }}><RNText style={S(14, "600")}>{t}</RNText><RNText style={S(12, "500", f.urg === k ? c.orange : c.text4)}>{s}</RNText></Pressable>)}</View></View>
        </Section>
        <Section title="When can we come?">
          <View style={{ flexDirection: "row", gap: 10 }}><View style={{ flex: 1 }}><Field label="Start date" value={f.start} onChangeText={(v) => setF({ ...f, start: v })} placeholder="YYYY-MM-DD" /></View><View style={{ flex: 1 }}><Field label="Deadline" value={f.end} onChangeText={(v) => setF({ ...f, end: v })} placeholder="YYYY-MM-DD" error={f.start && f.end && f.end < f.start ? "After start date" : null} /></View></View>
          <View style={{ flexDirection: "row", gap: 10 }}><View style={{ flex: 1 }}><Field label="From" value={f.from} onChangeText={(v) => setF({ ...f, from: v })} placeholder="9:00 AM" /></View><View style={{ flex: 1 }}><Field label="Until" value={f.until} onChangeText={(v) => setF({ ...f, until: v })} placeholder="5:00 PM" /></View></View>
        </Section>
        <Section title="Photos of the issue" right={<RNText style={S(12.5, "400", c.text4)}>{Object.keys(photos).length + more.length} · up to 6</RNText>}>
          <View style={{ flexDirection: "row", gap: 8 }}>{SLOTS.map(([k, t, s]) => { const u = photos[k]; return (
            <Pressable key={k} onPress={() => shoot(k)} style={{ flex: 1, aspectRatio: 1, borderRadius: 12, borderWidth: 1.5, borderStyle: u ? "solid" : "dashed", borderColor: u ? c.ok : c.border2, backgroundColor: u ? c.okBg : c.surface, alignItems: "center", justifyContent: "center", padding: 6, overflow: "hidden" }}>
              {u ? <><Image source={{ uri: u }} style={{ position: "absolute", inset: 0 } as never} /><View style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: "#079455", alignItems: "center", justifyContent: "center" }}><Ionicons name="checkmark" size={12} color="#fff" /></View><RNText style={{ position: "absolute", left: 6, bottom: 6, ...S(12, "600", "#fff") }}>{t}</RNText></>
                : <><Ionicons name="camera-outline" size={22} color={c.text3} /><RNText style={{ ...S(12, "600", c.text3), textAlign: "center" }}>{t}</RNText><RNText style={S(11, "500", c.text4)}>{s}</RNText></>}
            </Pressable>); })}</View>
          <RNText style={S(12, "400", c.text4)}>Guided shots give the AI quote and technician what they need. Labels travel with the photos to the contractor.</RNText>
          {more.map((u, i) => <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}><Image source={{ uri: u }} style={{ width: 40, height: 40, borderRadius: 10 }} /><RNText style={{ flex: 1, ...S(14, "600") }}>Photo {i + 4}</RNText><Pressable onPress={() => setMore(more.filter((_, k) => k !== i))} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name="trash-outline" size={16} color={c.text2} /></Pressable></View>)}
          {Object.keys(photos).length + more.length < 6 && <Pressable onPress={() => shoot("more")} style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: c.border2, backgroundColor: c.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}><Ionicons name="images-outline" size={18} color={c.text} /><RNText style={S(14, "600")}>{busy ? "Uploading…" : "Add more photos"}</RNText></Pressable>}
        </Section>
      </ScrollView>
      <View style={{ padding: 12, paddingHorizontal: 16, paddingBottom: 30, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}><PrimaryButton title="Get my quote" icon="sparkles-outline" onPress={() => setSheet(true)} disabled={!ready} /></View>
      <PickerSheet open={pick === "pergola"} onClose={() => setPick(null)} title="Which pergola?" options={pergolas.map((p) => p.name)} value={perg?.name ?? ""} onSelect={(v) => setF({ ...f, pergola: pergolas.find((p) => p.name === v)?.id ?? "" })} />
      <PickerSheet open={pick === "svc"} onClose={() => setPick(null)} title="Service type" options={cats.map((k) => k.name)} value={f.svc} onSelect={(v) => setF({ ...f, svc: v })} />
      <Sheet open={sheet} onClose={() => setSheet(false)} title="How would you like your quote?">
        <RNText style={{ ...S(14, "400", c.text3), marginTop: -10 }}>Our AI can price the job now from your details, or an inspector can visit first.</RNText>
        <ChoiceRow title="Instant AI quote" sub="Ready in about a minute. Free." on={method === "ai"} onPress={() => setMethod("ai")} icon="sparkles-outline" />
        <ChoiceRow title="Send an inspector" sub="On-site visit, exact price. Approx. $99 inspection fee." on={method === "inspector"} onPress={() => setMethod("inspector")} icon="person-outline" iconTone="info" />
        <PrimaryButton title={method === "ai" ? "Get AI quote" : "Request inspector"} onPress={submit} loading={busy} />
      </Sheet>
    </SafeAreaView>
  );
}
