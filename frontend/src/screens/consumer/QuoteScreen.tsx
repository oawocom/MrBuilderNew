import React, { useEffect, useState } from "react";
import { Alert, Animated, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton, SecondaryButton } from "../../components/form";
import { Header, Sheet } from "../../components/sheet";
import { money, fmtDate } from "../../components";
import { api, Job } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

const PHASES = ["Reading request", "Pricing", "Preparing quote"];
const SUBS = ["Checking your pergola specs, address and photos.", "Comparing dimensions, materials and local labor rates.", "Almost there — assembling the line items."];

export default function QuoteScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { params } = useRoute<{ key: string; name: string; params: { id: string; others?: number; method: "ai" | "inspector" } }>();
  const { c } = useTheme();
  const [j, setJ] = useState<Job | null>(null);
  const [phase, setPhase] = useState(0);
  const [received, setReceived] = useState(false);
  const [busy, setBusy] = useState(false);
  const insp = params.method === "inspector";
  const spin = useState(new Animated.Value(0))[0];
  const S = (n: number, w: "400" | "500" | "600" | "700" | "800" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });

  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1200, useNativeDriver: true })).start();
    const t1 = setTimeout(() => setPhase(1), 900), t2 = setTimeout(() => setPhase(2), 1800), t3 = setTimeout(async () => { const r = await api<Job>(`/jobs/${params.id}`); setJ(r.data ?? null); setPhase(3); }, 2700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [params.id, spin]);

  async function approve() {
    if (insp) { setReceived(true); return; }
    setBusy(true);
    const r = await api(`/jobs/${params.id}/quote/approve`, { method: "POST", body: {} });
    setBusy(false);
    if (!r.success) { Alert.alert("Couldn't submit", r.error ?? "Try again"); return; }
    setReceived(true);
  }
  const quote = j?.quotes?.[0];
  const spec = j?.pergola_spec ?? {};
  const lines = insp ? [["On-site inspection · 1 visit", money(j?.inspection_fee ?? 99)], ["Credited toward the job if you proceed", `−${money(j?.inspection_fee ?? 99)}`]] : (quote?.line_items ?? []).map((l) => [l.label + (l.qty !== 1 ? ` × ${l.qty}` : ""), money(l.amount)]);
  const rows = j ? [["Service", "Installation"], ["Address", [j.location_address, j.location_city, j.location_state].filter(Boolean).join(", ")], ["Property", "Residential"], ["Mounting", j.mounting === "attached" ? "Attached" : "Free standing"], ["Notes", j.notes ?? "—"]] : [];

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={phase < 3 ? "Preparing your quote" : insp ? "Inspection scheduled" : "Your quote"} onBack={() => nav.navigate("Tabs", { screen: "Requests" })} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name={insp ? "person-outline" : "sparkles-outline"} size={22} color={c.primary} /></View><View style={{ flex: 1 }}><RNText style={S(20, "700")}>{phase < 3 ? "Preparing your quote" : insp ? "Inspection scheduled" : "Your quote is ready"}</RNText><RNText style={S(13.5, "400", c.text3)}>{phase < 3 ? "Our AI is analyzing your request and will generate an estimate shortly." : insp ? "An inspector will visit before work starts. Below is the inspection fee and your request." : "Review the estimate below. Nothing is charged until you approve."}</RNText></View></View>

        {phase < 3 ? (
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingVertical: 48, paddingHorizontal: 24, alignItems: "center", gap: 16 }}>
            <Animated.View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: c.primarySoft, borderTopColor: c.primary, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }} />
            <View style={{ alignItems: "center" }}><RNText style={S(16, "600")}>{PHASES[phase]}…</RNText><RNText style={{ ...S(13, "400", c.text4), textAlign: "center", marginTop: 4 }}>{SUBS[phase]}</RNText></View>
            <View style={{ flexDirection: "row", gap: 6 }}>{PHASES.map((p, i) => <View key={p} style={{ height: 26, paddingHorizontal: 9, borderRadius: 999, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: i < phase ? c.okBg : i === phase ? c.primarySoft : c.surface2, borderColor: i < phase ? c.okBd : i === phase ? c.orangeBd : c.border }}>{i < phase && <Ionicons name="checkmark" size={11} color={c.ok} />}<RNText style={S(11.5, "600", i < phase ? c.ok : i === phase ? c.orange : c.text4)}>{p}</RNText></View>)}</View>
            <View style={{ width: "100%", gap: 8 }}>{[1, 0.8, 0.6].map((w, i) => <View key={i} style={{ height: 12, borderRadius: 6, backgroundColor: c.surface3, width: `${w * 100}%` }} />)}</View>
          </View>
        ) : j && (
          <>
            <View style={{ borderRadius: 16, backgroundColor: c.okBg, borderWidth: 1, borderColor: c.okBd, padding: 16, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}><RNText style={S(12.5, "600", c.ok)}>{insp ? "Inspection fee" : "Estimated total"}</RNText><RNText style={S(28, "800")}>{money(insp ? j.inspection_fee : j.quote_total)}</RNText><RNText style={S(12.5, "400", c.text3)}>{insp ? "Final job price after the visit" : "Materials & labor · price set by MrBuilder"}</RNText></View>
              <View style={{ height: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: c.surface, justifyContent: "center" }}><RNText style={S(12, "600", c.ok)}>{insp ? "Inspector" : "AI estimate"}</RNText></View>
            </View>
            <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingVertical: 4, paddingHorizontal: 16 }}>
              {lines.map(([k, v], i) => <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}><RNText style={{ flex: 1, ...S(13.5, "400", c.text3) }}>{k}</RNText><RNText style={S(13.5, "600")}>{v}</RNText></View>)}
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={S(12.5, "400", c.text4)}>Valid until <RNText style={S(12.5, "600")}>{quote?.valid_until ? fmtDate(quote.valid_until) : "—"}</RNText></RNText><RNText style={S(12.5, "400", c.text4)}>{insp ? "Charged when you book" : "Charged after you confirm the work"}</RNText></View>
            </View>
            <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
              <RNText style={{ padding: 14, paddingHorizontal: 16, ...S(13, "700", c.text4) }}>REQUEST SUMMARY</RNText>
              {rows.map(([k, v]) => <View key={k} style={{ flexDirection: "row", gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={{ width: 90, ...S(13.5, "400", c.text4) }}>{k}</RNText><RNText style={{ flex: 1, textAlign: "right", ...S(14, "600") }}>{v}</RNText></View>)}
              <View style={{ paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: c.border, gap: 8 }}><RNText style={S(13.5, "400", c.text4)}>Pergola{params.others ? "s" : ""}</RNText>
                <View style={{ padding: 10, borderRadius: 10, backgroundColor: c.surface2, gap: 6 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: c.hero }} /><RNText style={S(14, "600")}>{j.title}</RNText><RNText style={S(12, "400", c.text4)}>{(spec as { type?: string }).type ?? spec.structure_type}</RNText></View>
                  {[["Size", `${j.width_ft} × ${j.length_ft} × ${j.height_ft} ft`], ["Enclosures", spec.enclosures?.length ? spec.enclosures.map((e) => (e as { label?: string }).label ?? e.type).join(", ") : "None"], ["Footings", spec.footings?.involved ? `${spec.footings.count} · ${spec.footings.ready ? "ready" : "not ready"}` : "None"], ["Accessories", spec.accessories?.length ? spec.accessories.map((a) => `${a.qty}× ${(a as { label?: string }).label ?? a.type}`).join(", ") : "None"]].map(([k, v]) => <View key={k} style={{ flexDirection: "row", gap: 10, paddingTop: 6 }}><RNText style={{ width: 80, ...S(12.5, "400", c.text4) }}>{k}</RNText><RNText style={{ flex: 1, ...S(12.5, "500") }}>{v}</RNText></View>)}
                </View>
                {!!params.others && <RNText style={S(12.5, "400", c.text4)}>+ {params.others} more pergola request{params.others > 1 ? "s" : ""} created — see Requests.</RNText>}
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <View style={{ padding: 12, paddingHorizontal: 16, paddingBottom: 30, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, gap: 8 }}>
        <PrimaryButton title={phase < 3 ? "Generating…" : insp ? "Book inspection" : "Submit request"} onPress={approve} disabled={phase < 3} loading={busy} />
        <RNText style={{ textAlign: "center", ...S(12, "400", c.text4) }}>{phase < 3 ? "You can leave this screen — we'll notify you when it's ready." : insp ? `${money(j?.inspection_fee ?? 99)} charged when the inspector is booked · credited to the job` : "Approving sends your request to qualified PROs. You pay only after confirming the work."}</RNText>
      </View>
      <Sheet open={received} onClose={() => {}}>
        <View style={{ alignItems: "center", gap: 16, paddingVertical: 8 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.okBg, alignItems: "center", justifyContent: "center" }}><Ionicons name="checkmark" size={36} color={c.ok} /></View>
          <View style={{ alignItems: "center", gap: 6 }}><RNText style={S(20, "700")}>Request received</RNText><RNText style={{ ...S(14, "400", c.text3), textAlign: "center", lineHeight: 20 }}>{insp ? "An inspector will be assigned shortly. We'll message you with the visit time." : "A MrBuilder PRO contractor will be assigned within the next few hours. We'll message you as soon as that happens."}</RNText></View>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center", padding: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.surface2 }}><RNText style={S(12.5, "600")}>Request ID</RNText><RNText style={S(12.5, "400", c.text3)}>{j?.request_code} · {money(insp ? j?.inspection_fee : j?.quote_total)}</RNText></View>
        </View>
        <View style={{ gap: 10 }}><PrimaryButton title="View request" onPress={() => nav.replace("RequestDetail", { id: params.id })} /><SecondaryButton title="Back to home" onPress={() => nav.navigate("Tabs", { screen: "Home" })} /></View>
      </Sheet>
    </SafeAreaView>
  );
}
