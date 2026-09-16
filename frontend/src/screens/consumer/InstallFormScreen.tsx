import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Field, PrimaryButton } from "../../components/form";
import { ChoiceRow, Header, Note, PickerSheet, Section, SelectField, Sheet } from "../../components/sheet";
import { STATES, specPayload, useRequestDraft } from "../../state/requestDraft";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { api } from "../../api/client";
import { RootParams } from "../../navigation";

interface Address { id: string; line1: string; city: string; state: string | null; zip_code: string | null; is_default: boolean }
interface Pergola { id: string; address_line1: string | null; city: string | null; state: string | null; zip_code: string | null }
const PROPS = ["Residential", "Commercial", "HOA / community", "Government"];

export default function InstallFormScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { pergolas, remove, reset } = useRequestDraft();
  const { c } = useTheme();
  const [f, setF] = useState({ street: "", city: "", state: "", zip: "", prop: "", start: "", end: "", notes: "" });
  const [pick, setPick] = useState<null | "state" | "prop">(null);
  const [method, setMethod] = useState<"ai" | "inspector">("ai");
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState<{ key: string; name: string } | null>(null);
  const S = (n: number, w: "400" | "500" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });

  useEffect(() => () => reset(), [reset]);
  async function useHome() {
    const [a, p] = await Promise.all([api<Address[]>("/addresses"), api<Pergola[]>("/pergolas")]);
    const d = (a.data ?? []).find((x) => x.is_default) ?? a.data?.[0];
    const g = p.data?.[0];
    if (d) setF({ ...f, street: d.line1, city: d.city, state: d.state ?? "", zip: d.zip_code ?? "" });
    else if (g?.address_line1) setF({ ...f, street: g.address_line1, city: g.city ?? "", state: g.state ?? "", zip: g.zip_code ?? "" });
    else Alert.alert("No saved address", "Add one in More → Settings, or type it here.");
  }
  const zipErr = f.zip && !/^\d{5}(-\d{4})?$/.test(f.zip) ? "Enter a 5-digit ZIP code" : null;
  const dateErr = f.start && f.end && f.end < f.start ? "Deadline must be after the start date" : null;
  const ready = f.street && f.city && f.state && !zipErr && pergolas.length > 0 && !dateErr;

  async function submit() {
    setBusy(true);
    const ids: string[] = [];
    for (const p of pergolas) {
      const r = await api<{ id: string }>("/jobs", { method: "POST", body: { service_category: "installation", quote_method: method === "ai" ? "instant" : "inspection", location_address: f.street, location_city: f.city, location_state: f.state, location_zip: f.zip || undefined, property_type: f.prop ? f.prop.split(" ")[0].toLowerCase() : "residential", preferred_start_date: f.start || undefined, preferred_end_date: f.end || undefined, notes: f.notes || undefined, ...specPayload(p) } });
      if (!r.success || !r.data) { setBusy(false); Alert.alert("Couldn't submit", r.error ?? "Try again"); return; }
      ids.push(r.data.id);
    }
    setBusy(false); setSheet(false); reset();
    nav.replace("Quote", { id: ids[0], others: ids.length - 1, method });
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="New installation request" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 24 }} keyboardShouldPersistTaps="handled">
        <Note>Fill in the details and our AI will generate an instant quote for your new pergola.</Note>
        <Section title="Address" right={<Pressable onPress={useHome} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Ionicons name="home-outline" size={16} color={c.primary} /><RNText style={S(13, "600", c.primary)}>Use my home address</RNText></Pressable>}>
          <Field label="Street address" value={f.street} onChangeText={(v) => setF({ ...f, street: v })} placeholder="1251 Middlefield Rd" />
          <View style={{ flexDirection: "row", gap: 10 }}><View style={{ flex: 2 }}><Field label="City" value={f.city} onChangeText={(v) => setF({ ...f, city: v })} placeholder="Palo Alto" /></View><View style={{ flex: 1 }}><SelectField label="State" value={f.state} placeholder="CA" onPress={() => setPick("state")} /></View></View>
          <View style={{ flexDirection: "row", gap: 10 }}><View style={{ flex: 1 }}><Field label="ZIP code" value={f.zip} onChangeText={(v) => setF({ ...f, zip: v })} keyboardType="numeric" placeholder="94301" error={zipErr} /></View><View style={{ flex: 1.4 }}><SelectField label="Property type" value={f.prop} placeholder="Select" onPress={() => setPick("prop")} /></View></View>
        </Section>
        <Section title="Pergolas to install" right={<View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>{removed && <Pressable onPress={() => setRemoved(null)}><RNText style={S(13, "600", c.primary)}>Undo remove</RNText></Pressable>}<RNText style={S(12.5, "400", c.text4)}>{pergolas.length} added</RNText></View>}>
          {pergolas.map((p) => (
            <View key={p.key} style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, paddingHorizontal: 14 }}><View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.hero }} /><View style={{ flex: 1 }}><RNText style={S(15, "600")}>{p.name || "Pergola"}</RNText><RNText style={S(12.5, "400", c.text4)}>{p.type}{p.brand ? ` · ${p.brand}` : ""}</RNText></View><Pressable onPress={() => nav.navigate("AddPergola", { key: p.key })} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name="pencil-outline" size={16} color={c.text2} /></Pressable><Pressable onPress={() => { remove(p.key); setRemoved({ key: p.key, name: p.name }); }} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name="trash-outline" size={16} color={c.text2} /></Pressable></View>
              <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingBottom: 12, gap: 8 }}>{[["Width", p.w], ["Length", p.l], ["Height", p.h], ["Mounting", p.attach === "attached" ? "Attached" : "Detached"]].map(([k, v]) => <View key={k} style={{ flex: 1, gap: 1 }}><RNText style={S(11.5, "600", c.text4)}>{k}</RNText><RNText style={S(14, "700")}>{k === "Mounting" ? v : `${v || "—"} ${p.units}`}</RNText></View>)}</View>
              <View style={{ borderTopWidth: 1, borderTopColor: c.border, padding: 10, paddingHorizontal: 14, gap: 8 }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><RNText style={S(12, "700", c.text4)}>Side enclosures & subsystems</RNText><RNText style={S(12, "400", c.text4)}>{p.encOn && p.enc.length ? p.enc.length : "None"}</RNText></View>{p.encOn && p.enc.map((e, i) => <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: c.surface2 }}><View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}><RNText style={S(11, "600", c.text2)}>{i + 1}</RNText></View><View><RNText style={S(13, "600")}>{e.type}</RNText><RNText style={S(12, "400", c.text4)}>{e.w} × {e.l} × {e.h} {p.units}{e.loc ? ` · ${e.loc}` : ""}</RNText></View></View>)}</View>
              <View style={{ borderTopWidth: 1, borderTopColor: c.border, padding: 10, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}><View><RNText style={S(12, "700", c.text4)}>Footings</RNText><RNText style={S(13, "600")}>{p.footOn ? `${p.footN || "?"} footings · ${p.footReady ? "in place" : "not ready"}` : "Not involved"}</RNText></View>{p.footOn && <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 999, backgroundColor: c.warnBg, justifyContent: "center" }}><RNText style={S(11, "600", c.warn)}>Client-provided · not in scope</RNText></View>}</View>
              <View style={{ borderTopWidth: 1, borderTopColor: c.border, padding: 10, paddingHorizontal: 14, gap: 8 }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><RNText style={S(12, "700", c.text4)}>Accessories</RNText><RNText style={S(12, "400", c.text4)}>mounting only</RNText></View>{Object.entries(p.acc).filter(([, n]) => n > 0).length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{Object.entries(p.acc).filter(([, n]) => n > 0).map(([k, n]) => <View key={k} style={{ height: 26, paddingHorizontal: 9, borderRadius: 999, backgroundColor: c.surface2, justifyContent: "center" }}><RNText style={S(12, "600")}>{n}× {k}</RNText></View>)}</View> : <RNText style={S(12.5, "400", c.text4)}>None</RNText>}</View>
              <View style={{ borderTopWidth: 1, borderTopColor: c.border, padding: 10, paddingHorizontal: 14, flexDirection: "row", gap: 12 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Ionicons name="image-outline" size={14} color={c.text3} /><RNText style={S(12.5, "400", c.text3)}>{p.photos.length} photos</RNText></View></View>
            </View>
          ))}
          {pergolas.length === 0 && <RNText style={S(13, "400", c.text4)}>Add at least one pergola — type, brand, size, enclosures, footings and accessories are captured per pergola.</RNText>}
          <Pressable onPress={() => nav.navigate("AddPergola", {})} style={{ height: 48, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: c.orangeBd, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}><Ionicons name="add" size={18} color={c.orange} /><RNText style={S(14, "600", c.orange)}>Add a pergola</RNText></Pressable>
        </Section>
        <Section title="Schedule">
          <View style={{ flexDirection: "row", gap: 10 }}><View style={{ flex: 1 }}><Field label="Start date" value={f.start} onChangeText={(v) => setF({ ...f, start: v })} placeholder="YYYY-MM-DD" /></View><View style={{ flex: 1 }}><Field label="Deadline" value={f.end} onChangeText={(v) => setF({ ...f, end: v })} placeholder="YYYY-MM-DD" error={dateErr} /></View></View>
          <Field label="Notes for the contractor" value={f.notes} onChangeText={(v) => setF({ ...f, notes: v })} placeholder="Gate code, pets, parking…" />
        </Section>
      </ScrollView>
      <View style={{ padding: 12, paddingHorizontal: 16, paddingBottom: 30, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}><PrimaryButton title="Get my quote" icon="sparkles-outline" onPress={() => setSheet(true)} disabled={!ready} /></View>

      <PickerSheet open={pick === "state"} onClose={() => setPick(null)} title="State" options={STATES} value={f.state} onSelect={(v) => setF({ ...f, state: v })} searchable />
      <PickerSheet open={pick === "prop"} onClose={() => setPick(null)} title="Property type" options={PROPS} value={f.prop} onSelect={(v) => setF({ ...f, prop: v })} />
      <Sheet open={sheet} onClose={() => setSheet(false)} title="How would you like your quote?">
        <RNText style={{ ...S(14, "400", c.text3), marginTop: -10 }}>Our AI can price the job now from your details, or an inspector can visit first.</RNText>
        <ChoiceRow title="Instant AI quote" sub="Ready in about a minute. Free." on={method === "ai"} onPress={() => setMethod("ai")} icon="sparkles-outline" />
        <ChoiceRow title="Send an inspector" sub="On-site visit, exact price. Approx. $99 inspection fee." on={method === "inspector"} onPress={() => setMethod("inspector")} icon="person-outline" iconTone="info" />
        <PrimaryButton title={method === "ai" ? "Get AI quote" : "Request inspector"} onPress={submit} loading={busy} />
      </Sheet>
    </SafeAreaView>
  );
}
