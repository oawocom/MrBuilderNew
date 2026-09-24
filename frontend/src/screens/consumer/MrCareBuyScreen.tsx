import React, { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton, SecondaryButton } from "../../components/form";
import { Header, Note } from "../../components/sheet";
import { money } from "../../components";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";
import type { Plan, Sub } from "./MrCareScreen";

interface Addon { id: string; offering: string; slug: string; name: string; description?: string | null; annual_price: number }
interface Pergola { id: string; name: string; city: string | null; structure_type: string | null; photo_url: string | null }
interface Equipment { id: string; pergola_id: string; device_type: string }
interface PM { id: string; label: string | null; card_brand: string | null; card_last_four: string | null; is_default: boolean }
const STEPS = ["Plan", "Pergolas", "Coverage", "Price & terms", "Payment"];
const ELIGIBLE = ["Louvered-roof drive motors", "Retractable roof / screen motors", "Rain, wind and sun sensors", "Remotes and wall controllers", "LED drivers and dimmers", "Control boards and power supplies"];
const COVERED = ["Diagnosis and repair by a MrBuilder PRO", "Like-for-like replacement when unrepairable", "Parts and labor for covered components", "Priority scheduling for claims"];
const EXCL = ["Physical damage, water ingress from neglect, or storms", "Wiring, power supply to the pergola, and electrical work", "Unregistered or modified equipment", "Cosmetic wear"];

export default function MrCareBuyScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { params } = useRoute<{ key: string; name: string; params: { offering: "maintenance" | "electronics" } }>();
  const { c } = useTheme();
  const off = params.offering; const isM = off === "maintenance";
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]); const [addons, setAddons] = useState<Addon[]>([]); const [pergolas, setPergolas] = useState<Pergola[]>([]); const [equipment, setEquipment] = useState<Equipment[]>([]); const [subs, setSubs] = useState<Sub[]>([]); const [pms, setPms] = useState<PM[]>([]);
  const [plan, setPlan] = useState(""); const [annual, setAnnual] = useState(true); const [sel, setSel] = useState<string[]>([]); const [addSel, setAddSel] = useState<Record<string, string[]>>({}); const [agree, setAgree] = useState(false); const [pm, setPm] = useState("");
  const [quote, setQuote] = useState<{ total: number; lines: { label: string; amount: number }[] } | null>(null); const [busy, setBusy] = useState(false); const [done, setDone] = useState<{ id: string } | null>(null);
  const S = (n: number, w: "400" | "500" | "600" | "700" | "800" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });

  useEffect(() => { (async () => {
    const [p, g, e, h, m] = await Promise.all([api<{ plans: Plan[]; addons: Addon[] }>("/mrcare/plans"), api<Pergola[]>("/pergolas"), api<Equipment[]>("/equipment"), api<{ subscriptions: Sub[] }>("/mrcare"), api<PM[]>("/payment-methods")]);
    const pl = (p.data?.plans ?? []).filter((x) => x.offering === off); setPlans(pl); setAddons((p.data?.addons ?? []).filter((x) => x.offering === off)); setPergolas(g.data ?? []); setEquipment(e.data ?? []); setSubs((h.data?.subscriptions ?? []).filter((s) => s.status === "active" && s.offering === off)); setPms(m.data ?? []); setPm((m.data ?? []).find((x) => x.is_default)?.id ?? m.data?.[0]?.id ?? "");
    setPlan(pl.find((x) => x.popular)?.slug ?? pl[1]?.slug ?? pl[0]?.slug ?? "");
  })(); }, [off]);
  useEffect(() => { if (step >= 3 && plan && sel.length) api<{ total: number; lines: { label: string; amount: number }[] }>("/mrcare/quote", { method: "POST", body: { offering: off, plan, pergola_ids: sel, addons: addSel } }).then((r) => setQuote(r.data ?? null)); }, [step, plan, sel, addSel, off]);

  const P = plans.find((x) => x.slug === plan); const covered = new Set(subs.flatMap((s) => s.pergola_ids));
  const monthly = (a: number) => Math.round(a / 9.6); const price = (a: number) => (annual ? `$${Math.round(a)}` : `$${monthly(a)}`); const per = annual ? "per pergola · per year · billed annually" : "per pergola · per month · cancel anytime";
  const name = (id: string) => pergolas.find((p) => p.id === id)?.name ?? "Pergola";
  async function pay() {
    setBusy(true); const r = await api<{ id: string }>("/mrcare/subscriptions", { method: "POST", body: { offering: off, plan, pergola_ids: sel, addons: addSel, consent: true, billing: annual ? "annual" : "monthly", payment_method_id: pm || undefined } }); setBusy(false);
    if (!r.success || !r.data) { Alert.alert("Payment failed", r.error ?? "Try again"); return; }
    setDone(r.data);
  }
  const canNext = [!!plan, sel.length > 0, true, agree && !!quote, true][step];
  const Progress = () => <><View style={{ flexDirection: "row", gap: 6 }}>{STEPS.map((_, i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? c.primary : c.surface3 }} />)}</View><View style={{ flexDirection: "row", justifyContent: "space-between" }}><RNText style={S(12, "400", c.text4)}>Step {step + 1} of 5 · {STEPS[step]}</RNText><RNText style={S(12, "600", c.text2)}>{isM ? "Service & Maintenance" : "Electronics Protection"}</RNText></View></>;
  const Check = ({ ok = true }: { ok?: boolean }) => <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: ok ? c.okBg : c.errBg, alignItems: "center", justifyContent: "center" }}><Ionicons name={ok ? "checkmark" : "close"} size={12} color={ok ? c.ok : c.err} /></View>;

  if (done) return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 40, gap: 16, alignItems: "center" }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: c.okBg, alignItems: "center", justifyContent: "center" }}><Ionicons name="checkmark" size={40} color={c.ok} /></View>
        <View style={{ alignItems: "center", gap: 4 }}><RNText style={S(22, "800")}>{isM ? "Service & Maintenance" : "Electronics Protection"} is active</RNText><RNText style={{ ...S(14, "400", c.text3), textAlign: "center" }}>{isM ? "Your first visit can be booked now. Reminders will follow the plan schedule." : "A pre-inspection visit registers your equipment. Claims open right after."}</RNText></View>
        <View style={{ alignSelf: "stretch", borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingVertical: 4, paddingHorizontal: 16 }}>{[[P?.name ?? plan, price(P?.annual_price ?? 0) + (annual ? "/yr" : "/mo")], ["Pergolas", sel.map(name).join(", ")], ["Renews", new Date(Date.now() + 365 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })]].map(([k, v], i) => <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}><RNText style={S(13.5, "400")}>{k}</RNText><RNText style={{ flex: 1, textAlign: "right", ...S(13.5, "600") }}>{v}</RNText></View>)}<View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={S(13.5, "400", c.text3)}>Charged to {pms.find((x) => x.id === pm)?.label ?? "your default method"}</RNText><RNText style={S(13.5, "700")}>{money(quote?.total)}</RNText></View></View>
        <RNText style={S(12, "400", c.text5)}>Receipt and certificate saved to Documents</RNText>
        <View style={{ alignSelf: "stretch", gap: 10 }}><PrimaryButton title={isM ? "Book first maintenance visit" : "Schedule pre-inspection"} onPress={() => nav.replace(isM ? "MaintenanceBooking" : "ElectronicsClaim", { subscriptionId: done.id })} /><SecondaryButton title="Back to MrCare" onPress={() => nav.navigate("Tabs", { screen: "MrCare" })} /></View>
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={isM ? "Maintenance plan" : "Electronics Protection"} onBack={() => (step ? setStep(step - 1) : nav.goBack())} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 16 }}>
        <Progress />
        {step === 0 && isM && (
          <>
            <View><RNText style={S(24, "800")}>Choose your maintenance plan</RNText><RNText style={S(14, "400", c.text3)}>Scheduled care for your pergola. Electronics protection is a separate plan.</RNText></View>
            <View style={{ flexDirection: "row", backgroundColor: c.surface3, borderRadius: 12, padding: 4 }}>{[["m", "Monthly"], ["a", "Annual"]].map(([k, l]) => <Pressable key={k} onPress={() => setAnnual(k === "a")} style={{ flex: 1, height: 40, borderRadius: 9, backgroundColor: annual === (k === "a") ? c.surface : "transparent", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}><RNText style={S(14, "600", annual === (k === "a") ? c.text : c.text4)}>{l}</RNText>{k === "a" && <View style={{ height: 18, paddingHorizontal: 6, borderRadius: 999, backgroundColor: c.okBg, justifyContent: "center" }}><RNText style={S(11, "700", c.ok)}>−20%</RNText></View>}</Pressable>)}</View>
            <View style={{ flexDirection: "row", gap: 8 }}>{plans.map((p) => <Pressable key={p.slug} onPress={() => setPlan(p.slug)} style={{ flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: plan === p.slug ? c.hero : c.border2, backgroundColor: plan === p.slug ? c.hero : c.surface, alignItems: "center", justifyContent: "center" }}><RNText style={S(14, "600", plan === p.slug ? "#fff" : c.text2)}>{p.name}</RNText></Pressable>)}</View>
            {P && <View style={{ backgroundColor: c.surface, borderWidth: 1.5, borderColor: P.popular ? c.primary : c.border, borderRadius: 20, padding: 20, gap: 16 }}>
              {P.popular && <View style={{ alignSelf: "flex-start", height: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: c.primary, justifyContent: "center" }}><RNText style={S(11, "700", "#fff")}>MOST POPULAR</RNText></View>}
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 4 }}><RNText style={S(20, "800")}>{P.name}</RNText><RNText style={S(13.5, "400", c.text3)}>{P.description ?? `${P.visits_per_year} visits per year`}</RNText></View><View style={{ alignItems: "flex-end" }}><RNText style={S(28, "800")}>{price(P.annual_price)}</RNText><RNText style={{ ...S(12, "400", c.text4), textAlign: "right", maxWidth: 120 }}>{per}</RNText></View></View>
              <View style={{ gap: 10, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={S(12, "700", c.text4)}>INCLUDED VISITS & SERVICES</RNText>{(P.features ?? []).map((f) => <View key={f} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Check /><RNText style={{ flex: 1, ...S(14, "400") }}>{f}</RNText></View>)}<RNText style={{ ...S(12, "700", c.text4), marginTop: 6 }}>NOT INCLUDED</RNText><View style={{ gap: 6 }}>{["Electronics repair or replacement — see the Electronics Protection Plan", "Structural repairs, footings, parts and materials", "Non-pergola items (furniture, decking, landscaping)"].map((t) => <RNText key={t} style={S(13, "400", c.text3)}>· {t}</RNText>)}</View></View>
            </View>}
            <View style={{ gap: 4 }}><RNText style={S(13, "400", c.text4)}>Have a prepaid plan from a third-party company?</RNText><Pressable onPress={() => Alert.alert("Prepaid vouchers", "Voucher redemption will be available at launch.")}><RNText style={S(14, "600", c.primary)}>Enter prepaid voucher ID</RNText></Pressable></View>
          </>
        )}
        {step === 0 && !isM && (
          <>
            <View style={{ borderRadius: 20, backgroundColor: c.hero, padding: 22, paddingHorizontal: 20, gap: 10, overflow: "hidden" }}><View style={{ position: "absolute", right: -70, top: -70, width: 200, height: 200, borderRadius: 100, backgroundColor: "#079455" }} /><View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,.12)", alignItems: "center", justifyContent: "center" }}><Ionicons name="flash-outline" size={22} color="#fff" /></View><RNText style={S(24, "800", "#fff")}>Electronics Protection Plan</RNText><RNText style={S(13.5, "400", "#D5D7DA")}>Repair or replacement of your pergola's motors, sensors and controls. Sold per pergola; independent of any maintenance subscription.</RNText><RNText style={S(22, "800", "#fff")}>from ${Math.round(plans[0]?.annual_price ?? 149)}<RNText style={S(13, "500", "#B7BAC1")}>/year per pergola</RNText></RNText></View>
            {plans.length > 1 && <View style={{ flexDirection: "row", gap: 8 }}>{plans.map((p) => <Pressable key={p.slug} onPress={() => setPlan(p.slug)} style={{ flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: plan === p.slug ? c.hero : c.border2, backgroundColor: plan === p.slug ? c.hero : c.surface, alignItems: "center", justifyContent: "center" }}><RNText style={S(14, "600", plan === p.slug ? "#fff" : c.text2)}>{p.name} · ${Math.round(p.annual_price)}/yr</RNText></Pressable>)}</View>}
            {[["Eligible equipment", ELIGIBLE, true], ["Covered components", [...COVERED, ...(P?.features ?? [])], true], ["Exclusions", EXCL, false]].map(([t, list, ok]) => <View key={t as string} style={{ gap: 10 }}><RNText style={S(16, "700")}>{t as string}</RNText><View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14, paddingHorizontal: 16, gap: 8 }}>{(list as string[]).map((x) => <View key={x} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Check ok={ok as boolean} /><RNText style={{ flex: 1, ...S(14, "400", ok ? c.text : c.text2) }}>{x}</RNText></View>)}{t === "Eligible equipment" && <RNText style={{ ...S(12.5, "400", c.text4), paddingTop: 4 }}>Equipment must be registered at the pre-inspection visit.</RNText>}</View></View>)}
            <View style={{ gap: 10 }}><RNText style={S(16, "700")}>Fees & limits</RNText><View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, paddingVertical: 4, paddingHorizontal: 16 }}>{[["Pre-inspection visit", "$99 one-time"], ["Service-call fee per claim", "$49"], ["Claims per year", "Up to 2"], ["Waiting period", "14 days after activation"]].map(([k, v], i) => <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}><RNText style={S(13.5, "400", c.text3)}>{k}</RNText><RNText style={S(13.5, "600")}>{v}</RNText></View>)}</View></View>
          </>
        )}
        {step === 1 && (
          <>
            <View><RNText style={S(22, "800")}>Which pergolas?</RNText><RNText style={S(14, "400", c.text3)}>{isM ? "Select the pergolas this plan should cover. Priced per pergola." : "Protection is sold per pergola. Select the ones with electronics."}</RNText></View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{pergolas.map((p) => { const on = sel.includes(p.id); const already = covered.has(p.id); return (
              <Pressable key={p.id} disabled={already} onPress={() => setSel(on ? sel.filter((x) => x !== p.id) : [...sel, p.id])} style={{ width: "48%", backgroundColor: c.surface, borderWidth: 1.5, borderColor: on ? c.primary : c.border, borderRadius: 16, overflow: "hidden", opacity: already ? 0.6 : 1 }}>
                {p.photo_url ? <Image source={{ uri: p.photo_url }} style={{ height: 104 }} /> : <View style={{ height: 104, backgroundColor: c.hero }} />}
                <View style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: on ? c.primary : "rgba(0,0,0,.35)", alignItems: "center", justifyContent: "center" }}>{on && <Ionicons name="checkmark" size={14} color="#fff" />}</View>
                <View style={{ padding: 10, paddingHorizontal: 12, gap: 2 }}><RNText style={S(14, "600")} numberOfLines={1}>{p.name}</RNText><RNText style={S(12, "400", c.text4)}>{p.structure_type?.replace("_", " ") ?? ""}{p.city ? ` · ${p.city}` : ""}</RNText>{already && <RNText style={S(12, "600", c.ok)}>Already covered</RNText>}</View>
              </Pressable>); })}
              <Pressable onPress={() => nav.navigate("AddPergola", { persist: true })} style={{ width: "48%", minHeight: 160, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: c.orangeBd, alignItems: "center", justifyContent: "center", gap: 8 }}><View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="add" size={22} color={c.primary} /></View><RNText style={S(13.5, "600", c.orange)}>Add a pergola</RNText></Pressable>
            </View>
          </>
        )}
        {step === 2 && (
          <>
            <View><RNText style={S(22, "800")}>Coverage & add-ons</RNText><RNText style={S(14, "400", c.text3)}>Set per pergola. Add-ons are optional and priced per pergola.</RNText></View>
            {sel.map((id) => { const eq = equipment.filter((e) => e.pergola_id === id); const chosen = addSel[id] ?? []; return (
              <View key={id} style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, paddingHorizontal: 14 }}><View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: c.hero }} /><View style={{ flex: 1 }}><RNText style={S(14.5, "600")}>{name(id)}</RNText><RNText style={S(12.5, "400", c.text4)}>{P?.name}</RNText></View><RNText style={S(14, "700")}>{price(P?.annual_price ?? 0)}{annual ? "/yr" : "/mo"}</RNText></View>
                {!isM && <View style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 6 }}><RNText style={S(12, "700", c.text4)}>REGISTERED EQUIPMENT</RNText>{eq.length ? eq.map((e) => <RNText key={e.id} style={{ ...S(13.5, "400", c.text2), textTransform: "capitalize" }}>{e.device_type.replace(/_/g, " ")}</RNText>) : <RNText style={S(13.5, "400", c.text4)}>None yet — confirmed at the pre-inspection visit.</RNText>}</View>}
                <View style={{ padding: 10, paddingHorizontal: 14, gap: 8, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={S(12, "700", c.text4)}>ADD-ONS</RNText>{addons.length === 0 && <RNText style={S(13, "400", c.text4)}>No add-ons for this plan.</RNText>}{addons.map((a) => { const on = chosen.includes(a.slug); return <Pressable key={a.slug} onPress={() => setAddSel({ ...addSel, [id]: on ? chosen.filter((x) => x !== a.slug) : [...chosen, a.slug] })} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: on ? c.primary : c.surface3, alignItems: "center", justifyContent: "center" }}>{on && <Ionicons name="checkmark" size={16} color="#fff" />}</View><View style={{ flex: 1 }}><RNText style={S(14, "600")}>{a.name}</RNText>{a.description && <RNText style={S(12, "400", c.text4)}>{a.description}</RNText>}</View><RNText style={S(13.5, "600")}>+{price(a.annual_price)}</RNText></Pressable>; })}</View>
              </View>); })}
          </>
        )}
        {step === 3 && (
          <>
            <View><RNText style={S(22, "800")}>Price & terms</RNText><RNText style={S(14, "400", c.text3)}>Review before paying. You can edit any step.</RNText></View>
            {isM ? <View style={{ flexDirection: "row", backgroundColor: c.surface3, borderRadius: 12, padding: 4 }}>{[["m", "Monthly"], ["a", "Annual"]].map(([k, l]) => <Pressable key={k} onPress={() => setAnnual(k === "a")} style={{ flex: 1, height: 40, borderRadius: 9, backgroundColor: annual === (k === "a") ? c.surface : "transparent", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}><RNText style={S(14, "600", annual === (k === "a") ? c.text : c.text4)}>{l}</RNText>{k === "a" && <View style={{ height: 18, paddingHorizontal: 6, borderRadius: 999, backgroundColor: c.okBg, justifyContent: "center" }}><RNText style={S(11, "700", c.ok)}>−20%</RNText></View>}</Pressable>)}</View>
              : <View style={{ padding: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.surface2 }}><RNText style={S(13, "400", c.text3)}>Electronics Protection is billed <RNText style={S(13, "600")}>annually</RNText> per pergola.</RNText></View>}
            <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 12, paddingHorizontal: 16 }}><RNText style={S(13, "700", c.text4)}>PLAN</RNText><Pressable onPress={() => setStep(0)}><RNText style={S(13, "600", c.primary)}>Edit</RNText></Pressable></View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={S(14, "600")}>{P?.name} · {isM ? "Service & Maintenance" : "Electronics Protection"}</RNText><RNText style={S(14, "400", c.text3)}>{price(P?.annual_price ?? 0)}{annual ? "/yr" : "/mo"} × {sel.length}</RNText></View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={S(13, "700", c.text4)}>PERGOLAS & ADD-ONS</RNText><Pressable onPress={() => setStep(2)}><RNText style={S(13, "600", c.primary)}>Edit</RNText></Pressable></View>
              {(quote?.lines ?? []).map((l, i) => <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, padding: 10, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={{ flex: 1, ...S(13.5, "400") }}>{l.label}</RNText><RNText style={S(13.5, "600")}>{money(l.amount)}</RNText></View>)}
              {!isM && <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 10, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={S(13.5, "400", c.text3)}>Pre-inspection fee (one-time)</RNText><RNText style={S(13.5, "600")}>$99.00</RNText></View>}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: c.border }}><View><RNText style={S(15, "700")}>Total due today</RNText><RNText style={S(12, "400", c.text4)}>then {money(quote?.total)} {annual || !isM ? "per year" : "per month"}</RNText></View><RNText style={S(22, "800")}>{money((quote?.total ?? 0) + (isM ? 0 : 99))}</RNText></View>
            </View>
            <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14, paddingHorizontal: 16, gap: 8 }}><RNText style={S(13, "700", c.text4)}>TERMS</RNText>{["Renews automatically; cancel any time — coverage continues until the renewal date.", isM ? "Visits are scheduled through the app and performed by qualified MrBuilder PROs." : "A $49 service-call fee applies per claim; claims are reviewed by MrBuilder before dispatch.", "Coverage applies to the listed pergolas at the registered address."].map((t) => <RNText key={t} style={S(13, "400", c.text2)}>· {t}</RNText>)}
              <Pressable onPress={() => setAgree(!agree)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 6 }}><View style={{ width: 24, height: 24, borderRadius: 7, backgroundColor: agree ? c.primary : c.surface3, alignItems: "center", justifyContent: "center" }}>{agree && <Ionicons name="checkmark" size={16} color="#fff" />}</View><RNText style={{ flex: 1, ...S(13.5, "500") }}>I agree to the MrCare terms and the price above.</RNText></Pressable></View>
          </>
        )}
        {step === 4 && (
          <>
            <View><RNText style={S(22, "800")}>Payment</RNText><RNText style={S(14, "400", c.text3)}>Choose how to pay {money((quote?.total ?? 0) + (isM ? 0 : 99))} today.</RNText></View>
            {pms.map((m) => <Pressable key={m.id} onPress={() => setPm(m.id)} style={{ height: 64, borderRadius: 14, borderWidth: 1.5, borderColor: pm === m.id ? c.primary : c.border, backgroundColor: pm === m.id ? c.primarySoft : c.surface, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ width: 52, height: 40, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}><RNText style={S(11, "700", "#1A1F71")}>{(m.card_brand ?? "CARD").toUpperCase()}</RNText></View><View style={{ flex: 1 }}><RNText style={S(15, "600")}>{m.label ?? `•••• ${m.card_last_four}`}</RNText>{m.is_default && <RNText style={S(12.5, "400", c.text4)}>Default</RNText>}</View><View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: pm === m.id ? c.primary : c.border2, alignItems: "center", justifyContent: "center" }}>{pm === m.id && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} />}</View></Pressable>)}
            <SecondaryButton title="Add a payment method" icon={<Ionicons name="card-outline" size={18} color={c.text} />} onPress={() => nav.navigate("PaymentMethods")} />
            {pms.length === 0 && <Note tone="info">No saved payment method yet. While card payments are being set up, the plan activates in test mode.</Note>}
          </>
        )}
      </ScrollView>
      <View style={{ padding: 12, paddingHorizontal: 16, paddingBottom: 30, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border }}>{step < 4 ? <PrimaryButton title={step === 3 ? "Continue to payment" : "Continue"} onPress={() => setStep(step + 1)} disabled={!canNext} /> : <PrimaryButton title={`Pay ${money((quote?.total ?? 0) + (isM ? 0 : 99))} & activate`} onPress={pay} loading={busy} />}</View>
    </SafeAreaView>
  );
}
