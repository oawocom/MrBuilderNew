import React, { useEffect, useState } from "react";
import { Alert, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Field, PrimaryButton } from "../../components/form";
import { ChoiceRow, Header, Note, PickerSheet, Section, SelectField } from "../../components/sheet";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";
import type { Sub } from "./MrCareScreen";

interface Pergola { id: string; name: string }
const TYPES = [["seasonal", "Seasonal check", "Louvers, drainage, hardware, motors"], ["pre_winter", "Pre-winter prep", "Snow-load and drainage readiness"], ["post_winter", "Post-winter check", "Seals, sensors, motor test"], ["inspection", "Inspection", "Full structural & operational check"]];
const URG = [["low", "Low", "Within 2 weeks"], ["medium", "Medium", "Within 1 week"], ["high", "High", "Within 2 days"]];

export default function MaintenanceBookingScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { params } = useRoute<{ key: string; name: string; params: { subscriptionId: string; pergolaId?: string } }>();
  const { c } = useTheme();
  const [sub, setSub] = useState<Sub | null>(null); const [pergolas, setPergolas] = useState<Pergola[]>([]);
  const [f, setF] = useState({ pergola: params.pergolaId ?? "", type: "seasonal", urg: "low", start: "", end: "", notes: "" }); const [pick, setPick] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { (async () => { const [s, g] = await Promise.all([api<Sub>(`/mrcare/subscriptions/${params.subscriptionId}`), api<Pergola[]>("/pergolas")]); setSub(s.data ?? null); const ps = (g.data ?? []).filter((p) => s.data?.pergola_ids.includes(p.id)); setPergolas(ps); if (!f.pergola && ps[0]) setF((x) => ({ ...x, pergola: ps[0].id })); })(); }, [params.subscriptionId]); // eslint-disable-line react-hooks/exhaustive-deps
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  const left = sub ? sub.visits_per_year - sub.visits_used : 0;
  async function book() {
    setBusy(true); const r = await api<{ job_id: string }>("/mrcare/bookings", { method: "POST", body: { subscription_id: params.subscriptionId, pergola_id: f.pergola, visit_type: f.type, urgency: f.urg, preferred_start_date: f.start || undefined, preferred_end_date: f.end || undefined, notes: f.notes || undefined } }); setBusy(false);
    if (!r.success || !r.data) { Alert.alert("Couldn't book", r.error ?? "Try again"); return; }
    Alert.alert("Visit requested", "We're finding a technician. You'll see it under Requests.", [{ text: "OK", onPress: () => nav.replace("RequestDetail", { id: r.data!.job_id }) }]);
  }
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Book maintenance" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 24 }} keyboardShouldPersistTaps="handled">
        <Note tone={left > 0 ? "info" : "warn"}>{left > 0 ? `Covered by your plan — ${left} of ${sub?.visits_per_year ?? 0} visits left this year. No charge.` : "No visits left this year. Extra visits are priced as a standard maintenance request."}</Note>
        <Section title="Which pergola?"><SelectField label="Pergola" value={pergolas.find((p) => p.id === f.pergola)?.name ?? ""} placeholder="Select" onPress={() => setPick(true)} /></Section>
        <Section title="Visit type"><View style={{ gap: 8 }}>{TYPES.map(([k, t, s]) => <ChoiceRow key={k} title={t} sub={s} on={f.type === k} onPress={() => setF({ ...f, type: k })} />)}</View></Section>
        <Section title="When?">
          <View style={{ gap: 6 }}><RNText style={S(13, "600", c.text2)}>Urgency</RNText><View style={{ flexDirection: "row", gap: 8 }}>{URG.map(([k, t, s]) => <View key={k} style={{ flex: 1 }}><ChoiceRow title={t} sub={s} on={f.urg === k} onPress={() => setF({ ...f, urg: k })} /></View>)}</View></View>
          <View style={{ flexDirection: "row", gap: 10 }}><View style={{ flex: 1 }}><Field label="Earliest" value={f.start} onChangeText={(v) => setF({ ...f, start: v })} placeholder="YYYY-MM-DD" /></View><View style={{ flex: 1 }}><Field label="Latest" value={f.end} onChangeText={(v) => setF({ ...f, end: v })} placeholder="YYYY-MM-DD" /></View></View>
          <Field label="Anything the technician should know?" value={f.notes} onChangeText={(v) => setF({ ...f, notes: v })} placeholder="Gate code, pets, known issues…" />
        </Section>
      </ScrollView>
      <View style={{ padding: 12, paddingHorizontal: 16, paddingBottom: 30, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}><PrimaryButton title={left > 0 ? "Request visit · covered" : "Request visit"} onPress={book} disabled={!f.pergola} loading={busy} /></View>
      <PickerSheet open={pick} onClose={() => setPick(false)} title="Which pergola?" options={pergolas.map((p) => p.name)} value={pergolas.find((p) => p.id === f.pergola)?.name ?? ""} onSelect={(v) => setF({ ...f, pergola: pergolas.find((p) => p.name === v)?.id ?? "" })} />
    </SafeAreaView>
  );
}
