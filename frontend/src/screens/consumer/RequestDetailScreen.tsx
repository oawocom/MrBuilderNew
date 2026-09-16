import React, { useCallback, useState } from "react";
import { Alert, Image, Linking, Pressable, ScrollView, Text as RNText, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Field, PrimaryButton, SecondaryButton } from "../../components/form";
import { Header, Sheet } from "../../components/sheet";
import { money } from "../../components";
import { api, Job } from "../../api/client";
import { useSession } from "../../auth/session";
import { useTheme } from "../../theme/ThemeProvider";
import { font, statusLabel, statusTone, Tone } from "../../theme/tokens";
import { RootParams } from "../../navigation";

interface Ev { id: string; kind: string; url: string; note: string | null; captured_at: string | null; created_at: string }
interface Event { id: string; event_type: string; from_status: string | null; to_status: string | null; actor_role: string | null; payload: Record<string, unknown> | null; created_at: string }
interface Proposal { id: string; proposed_by: string; kind: string; proposed_start: string; message: string | null; status: string }
interface Parts { id: string; status: string; items: { name: string; qty: number; unit_price: number }[]; total: number; pay_mode: string; note: string | null; order_number: string | null }
interface Summary { name: string; rating_avg: number; ratings_count: number; jobs_completed: number }
interface Rating { id: string; rating: number; comment: string | null; rater_role: string }

const fmtD = (v?: string | null, t = true) => (v ? new Date(v).toLocaleString("en-US", t ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric", year: "numeric" }) : "");
const doneS = ["completed_paid", "dispute_upheld"], cancelS = ["cancelled_by_client", "cancelled_by_contractor", "quote_declined"];

export default function RequestDetailScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { params } = useRoute<{ key: string; name: string; params: { id: string } }>();
  const { user } = useSession();
  const { c } = useTheme();
  const [j, setJ] = useState<Job | null>(null); const [ev, setEv] = useState<Ev[]>([]); const [events, setEvents] = useState<Event[]>([]); const [props, setProps] = useState<Proposal[]>([]); const [parts, setParts] = useState<Parts[]>([]); const [sum, setSum] = useState<Summary | null>(null); const [ratings, setRatings] = useState<Rating[]>([]); const [docs, setDocs] = useState(0);
  const [qv, setQv] = useState<"old" | "new">("new");
  const [sheet, setSheet] = useState<null | "confirm" | "rate" | "reschedule" | "cancel" | "quoteDecline">(null);
  const [tip, setTip] = useState(0); const [stars, setStars] = useState(0); const [text, setText] = useState(""); const [when, setWhen] = useState(""); const [reason, setReason] = useState("changed_mind");
  const [cancelInfo, setCancelInfo] = useState<{ fee_amount: number; fee_pct: number; blocked: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const S = (n: number, w: "400" | "500" | "600" | "700" | "800" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });
  const toneMap: Record<Tone, [string, string]> = { ok: [c.okBg, c.ok], warn: [c.warnBg, c.warn], err: [c.errBg, c.err], info: [c.infoBg, c.info], orange: [c.orangeBg, c.orange], neutral: [c.surface2, c.text3] };

  const load = useCallback(async () => {
    const r = await api<Job>(`/jobs/${params.id}`);
    if (!r.data) return;
    setJ(r.data);
    const [e, ve, pr, pt, d, rt] = await Promise.all([api<Event[]>(`/jobs/${params.id}/events`), api<{ items: Ev[] }>(`/jobs/${params.id}/evidence`), api<Proposal[]>(`/jobs/${params.id}/reschedule`), api<Parts[]>(`/jobs/${params.id}/parts-requests`), api<unknown[]>(`/documents?job_id=${params.id}`), api<Rating[]>(`/jobs/${params.id}/ratings`)]);
    setEvents(e.data ?? []); setEv(ve.data?.items ?? []); setProps(pr.data ?? []); setParts(pt.data ?? []); setDocs(d.data?.length ?? 0); setRatings(rt.data ?? []);
    if (r.data.contractor) api<Summary>(`/contractors/${r.data.contractor.id}/summary`).then((s) => setSum(s.data ?? null));
  }, [params.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function act(path: string, body: unknown, method = "POST", ok?: string) {
    setBusy(true); const r = await api(`/jobs/${params.id}/${path}`, { method, body }); setBusy(false);
    if (!r.success) { Alert.alert("Couldn't do that", r.error ?? "Try again"); return false; }
    setSheet(null); setText(""); if (ok) Alert.alert(ok); load(); return true;
  }
  async function openChat() {
    const r = await api<{ id: string }>(`/jobs/${params.id}/conversation`, { method: "POST", body: {} });
    if (r.data) nav.navigate("Chat", { id: r.data.id, title: j?.contractor ? `${j.contractor.first_name} ${j.contractor.last_name}` : "Chat" });
  }
  async function openCancel() { const p = await api<{ fee_amount: number; fee_pct: number; blocked: boolean }>(`/jobs/${params.id}/cancel-preview`); setCancelInfo(p.data ?? null); setSheet("cancel"); }

  if (!j) return <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}><Header title="Request" onBack={() => nav.goBack()} /></SafeAreaView>;
  const st = j.status; const tone = statusTone[st] ?? "neutral"; const [chipBg, chipFg] = toneMap[tone];
  const pro = j.contractor; const proName = pro ? `${pro.first_name} ${pro.last_name}` : "Your PRO"; const first = pro?.first_name ?? "Your PRO";
  const quotes = j.quotes ?? []; const cur = quotes[0]; const prev = quotes[1]; const shownQ = qv === "old" && prev ? prev : cur;
  const before = ev.filter((e) => ["area", "product", "damage"].includes(e.kind)), completion = ev.filter((e) => e.kind === "completion"), damage = ev.find((e) => e.kind === "damage");
  const pendingProp = props.find((p) => p.status === "pending"); const pendingParts = parts.find((p) => p.status === "pending"); const paidParts = parts.find((p) => p.status !== "pending" && p.status !== "declined");
  const isOwner = j.consumer?.id === user?.id; const myRating = ratings.find((r) => r.rater_role === "consumer");
  const ack = events.find((e) => e.event_type === "household_acknowledged");
  const evAt = (t: string) => events.find((e) => e.event_type === t)?.created_at;

  // timeline
  type Step = { t: string; sub?: string; kind: "done" | "cur" | "todo" | "err" | "info"; n?: number };
  const steps: Step[] = [];
  const D = (t: string, sub?: string) => steps.push({ t, sub, kind: "done" }), C = (t: string, sub?: string) => steps.push({ t, sub, kind: "cur" }), T = (t: string) => steps.push({ t, kind: "todo", n: steps.length + 1 }), E = (t: string, sub?: string) => steps.push({ t, sub, kind: "err" });
  D("Request submitted", fmtD(j.created_at, false));
  if (cancelS.includes(st)) E(st === "quote_declined" ? "Quote declined" : "Request cancelled", fmtD(evAt("cancelled") ?? evAt("quote_declined") ?? j.updated_at, false));
  else {
    if (evAt("quote_approved")) D("Quote approved", `${fmtD(evAt("quote_approved"), false)} · ${money(j.quote_total)}`); else if (st === "quote_ready") C("Quote ready", "Waiting for your approval"); else if (["inspection_booked", "inspection_done"].includes(st)) C(st === "inspection_booked" ? "Inspector visit" : "Generating quote", st === "inspection_booked" ? "Finding an inspector" : "Report submitted · MrBuilder pricing the job"); else T("Quote approved");
    if (pro && evAt("accepted")) D(`${proName} assigned`, `Accepted ${fmtD(evAt("accepted"), false)}`); else if (["matching", "no_match_waitlist", "reassigning"].includes(st)) C("Finding a contractor", st === "no_match_waitlist" ? "On the waitlist" : "Usually within a few hours"); else if (steps[steps.length - 1].kind === "done") T("Contractor assigned"); else T("Contractor assigned");
    if (evAt("en_route")) D("On the way", `${fmtD(evAt("en_route"))} · ETA shared`); else if (st === "assigned") C("Scheduled", j.scheduled_start ? fmtD(j.scheduled_start) : "Awaiting a time"); else T("On the way");
    if (evAt("arrived")) D("Arrived on site", `${fmtD(evAt("arrived"))} · before-work photos taken`); else if (st === "en_route") C("On the way", j.en_route_eta_minutes ? `ETA ${j.en_route_eta_minutes} min` : undefined); else T("Arrived on site");
    if (evAt("started")) D("Work started", `${fmtD(evAt("started"))} · site check complete`); else if (st === "arrived") C("Site check", "Before-work photos & checklist"); else T("Work started");
    if (st === "paused_safety") E("Work paused — safety", j.pause_reason ?? undefined);
    if (evAt("completed")) D(`${first} marked the job complete`, `${fmtD(evAt("completed"), false)} · ${completion.length} photos`); else if (st === "in_progress") C("In progress"); else T("Job complete");
    if (st === "issue_reported" || st === "dispute_open" || st === "dispute_rejected" || st === "return_visit_scheduled") E("You reported an issue", `${fmtD(evAt("issue_reported"), false)} · payment on hold`);
    if (doneS.includes(st)) D("Confirmed & paid", `${fmtD(j.paid_at ?? j.updated_at, false)} · ${money(j.consumer_charged)}`); else if (st === "awaiting_confirmation") C("Your confirmation", "Review photos and release payment"); else T("Confirm & pay");
  }
  const alert = st === "awaiting_confirmation" ? ["Action needed.", "Review the finished work below and confirm to release payment."] : st === "quote_ready" ? ["Quote ready.", "Approve to send your request to qualified PROs."] : st === "paused_safety" ? ["Work paused for safety.", `${first} paused the job. No fee, resumes when safe.`] : st === "no_match_waitlist" ? ["On the waitlist.", "We'll notify you when a qualified PRO is available."] : st === "dispute_open" ? ["Under review.", "MrBuilder is reviewing the dispute and will notify both sides."] : null;
  const alertTone = st === "paused_safety" || st === "dispute_open" ? "err" : st === "no_match_waitlist" ? "warn" : "orange";

  const Card = ({ children, style }: { children: React.ReactNode; style?: object }) => <View style={[{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, gap: 12 }, style]}>{children}</View>;
  const Chip = ({ t, tone: tn }: { t: string; tone: Tone }) => <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 999, backgroundColor: toneMap[tn][0], justifyContent: "center" }}><RNText style={S(11, "600", toneMap[tn][1])}>{t}</RNText></View>;
  const Photos = ({ list, tall }: { list: Ev[]; tall?: boolean }) => <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{list.map((e) => <Pressable key={e.id} onPress={() => nav.navigate("Gallery", { photos: list.map((x) => ({ url: x.url, label: x.kind, at: x.captured_at ?? x.created_at })), index: list.indexOf(e) })}><Image source={{ uri: e.url }} style={{ width: tall ? 110 : 96, height: tall ? 110 : 96, borderRadius: 12, backgroundColor: c.surface2, borderWidth: e.kind === "damage" ? 2 : 0, borderColor: c.err }} /><View style={{ position: "absolute", left: 6, bottom: 6, backgroundColor: "rgba(0,0,0,.45)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><RNText style={S(10.5, "600", "#fff")}>{e.kind === "area" ? "Site" : e.kind === "product" ? "Product" : e.kind === "damage" ? "Damage" : "Done"}</RNText></View></Pressable>)}</ScrollView>;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={j.request_code} onBack={() => nav.goBack()} right={pro ? <Pressable onPress={openChat} style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}><Ionicons name="chatbubble-ellipses-outline" size={20} color={c.text2} /></Pressable> : undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}>
        {/* status card */}
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}><View style={{ flex: 1, gap: 2 }}><RNText style={S(18, "700")}>{j.title}</RNText><RNText style={S(12.5, "400", c.text5)}>Request ID {j.request_code} · {j.service_category}</RNText></View><View style={{ height: 24, paddingHorizontal: 8, borderRadius: 999, backgroundColor: chipBg, justifyContent: "center" }}><RNText style={S(11.5, "600", chipFg)}>{statusLabel[st]?.consumer ?? st}</RNText></View></View>
          {alert && <View style={{ flexDirection: "row", gap: 10, padding: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: toneMap[alertTone][0] }}><Ionicons name="alert-circle-outline" size={18} color={toneMap[alertTone][1]} /><RNText style={{ flex: 1, ...S(13, "400", toneMap[alertTone][1]) }}><RNText style={S(13, "600", toneMap[alertTone][1])}>{alert[0]}</RNText> {alert[1]}</RNText></View>}
          <View>{steps.map((s, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ alignItems: "center", width: 24 }}>
                {s.kind === "done" ? <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.ok, alignItems: "center", justifyContent: "center" }}><Ionicons name="checkmark" size={14} color="#fff" /></View>
                  : s.kind === "cur" ? <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} /></View>
                  : s.kind === "err" ? <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.errBg, alignItems: "center", justifyContent: "center" }}><Ionicons name="alert" size={14} color={c.err} /></View>
                  : <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: c.border2, alignItems: "center", justifyContent: "center" }}><RNText style={S(11, "600", c.text4)}>{s.n}</RNText></View>}
                {i < steps.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: s.kind === "done" ? c.ok : c.border, marginVertical: 3 }} />}
              </View>
              <View style={{ flex: 1, gap: 2, paddingBottom: i < steps.length - 1 ? 16 : 0 }}><RNText style={S(14, "600", s.kind === "todo" ? c.text4 : s.kind === "err" ? c.err : c.text)}>{s.t}</RNText>{s.sub && <RNText style={S(12.5, "400", c.text4)}>{s.sub}</RNText>}</View>
            </View>))}</View>
          {st === "en_route" && <View style={{ borderRadius: 12, backgroundColor: c.infoBg, borderWidth: 1, borderColor: c.infoBd, padding: 12, paddingHorizontal: 14, gap: 8 }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><RNText style={S(14, "700")}>● {first} is on the way</RNText><RNText style={S(12, "600", c.info)}>ETA {j.en_route_eta_minutes ?? "—"} min</RNText></View><View style={{ height: 6, borderRadius: 3, backgroundColor: c.surface }}><View style={{ width: "45%", height: 6, borderRadius: 3, backgroundColor: c.info }} /></View><RNText style={S(11, "400", c.text5)}>Fed by your contractor's "On my way" and "Arrived" updates.</RNText></View>}
          {(j.scheduled_start || j.return_visit_at) && !doneS.includes(st) && !cancelS.includes(st) && <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.surface2 }}><View><RNText style={S(12, "600", c.text4)}>{j.return_visit_at ? "Return visit" : "Scheduled"}</RNText><RNText style={S(14, "600")}>{fmtD(j.return_visit_at ?? j.scheduled_start)}</RNText></View>{["assigned", "return_visit_scheduled"].includes(st) && <Pressable onPress={() => setSheet("reschedule")} style={{ height: 34, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: c.border2, backgroundColor: c.surface, justifyContent: "center" }}><RNText style={S(13, "600")}>Reschedule</RNText></Pressable>}</View>}
        </Card>

        {/* people */}
        {pro && (
          <Card style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}>
            <Pressable onPress={() => nav.navigate("ContractorProfile", { id: pro.id })} style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}><View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.info, alignItems: "center", justifyContent: "center" }}><RNText style={S(15, "700", "#fff")}>{pro.first_name[0]}{pro.last_name[0]}</RNText></View><View style={{ flex: 1 }}><RNText style={S(12, "400", c.text4)}>{st === "inspection_booked" ? "Inspector" : "Technician"}</RNText><RNText style={S(15, "600")}>{proName}</RNText><RNText style={S(12, "400", c.text4)}>★ {sum?.rating_avg?.toFixed(1) ?? "—"} · MrBuilder PRO</RNText></View></Pressable>
            {doneS.includes(st) || cancelS.includes(st) ? <RNText style={S(12, "600", c.text5)}>Job closed</RNText> : <View style={{ flexDirection: "row", gap: 8 }}>{pro.phone && <Pressable onPress={() => Linking.openURL(`tel:${pro.phone}`)} style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}><Ionicons name="call-outline" size={18} color={c.text2} /></Pressable>}<Pressable onPress={openChat} style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}><Ionicons name="chatbubble-outline" size={18} color={c.text2} /></Pressable></View>}
          </Card>
        )}
        {["matching", "reassigning", "inspection_booked"].includes(st) && <Card><View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}><View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: c.infoBd, borderTopColor: c.info, alignItems: "center", justifyContent: "center" }}><Ionicons name="search-outline" size={22} color={c.info} /></View><View style={{ flex: 1, gap: 3 }}><RNText style={S(15, "600")}>{st === "inspection_booked" ? "Finding an inspector" : "Finding your contractor"}</RNText><RNText style={S(12.5, "400", c.text4)}>Qualified MrBuilder PROs near you have been notified.</RNText></View></View><View style={{ padding: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: c.infoBg }}><RNText style={S(12.5, "500", c.info)}>● ● ●  Usually assigned within a few hours</RNText></View></Card>}

        {/* quote approval */}
        {st === "quote_ready" && cur && (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(15, "700")}>{j.quote_method === "inspection" ? "Quote from inspection" : "Your quote"}</RNText><Chip t="Needs your approval" tone="orange" /></View>
            {j.quote_method === "inspection" && <RNText style={S(13, "400", c.text3)}>Priced by MrBuilder from {first}'s inspection report. The inspector reports facts; the system generates the quote.</RNText>}
            {prev && <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(12.5, "400", c.text3)}>Revised quote · v{cur.version} replaces v{prev.version} ({money(prev.total)})</RNText><View style={{ flexDirection: "row", backgroundColor: c.surface3, borderRadius: 8, padding: 2 }}>{(["old", "new"] as const).map((k) => <Pressable key={k} onPress={() => setQv(k)} style={{ height: 26, paddingHorizontal: 10, borderRadius: 6, backgroundColor: qv === k ? c.surface : "transparent", justifyContent: "center" }}><RNText style={S(12, "600", qv === k ? c.text : c.text4)}>v{k === "old" ? prev.version : cur.version}</RNText></Pressable>)}</View></View>}
            <View style={{ borderRadius: 12, backgroundColor: c.surface2, paddingVertical: 4, paddingHorizontal: 14 }}>{shownQ.line_items.map((l, i) => { const o = prev?.line_items.find((x) => x.label === l.label); const delta = qv === "new" && prev && o && o.amount !== l.amount ? l.amount - o.amount : 0; return <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.border, backgroundColor: delta ? c.orangeBg : "transparent", borderRadius: 6, paddingHorizontal: delta ? 8 : 0 }}><RNText style={{ flex: 1, ...S(13.5, "400", c.text3) }}>{l.label}{l.qty !== 1 ? ` × ${l.qty}` : ""} {!!delta && <RNText style={S(11, "700", delta > 0 ? c.err : c.ok)}>{delta > 0 ? "+" : "−"}{money(Math.abs(delta))}</RNText>}</RNText><RNText style={S(13.5, "600")}>{money(l.amount)}</RNText></View>; })}
              {shownQ.inspection_credit > 0 && <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={S(13.5, "400", c.ok)}>Inspection fee credited</RNText><RNText style={S(13.5, "600", c.ok)}>−{money(shownQ.inspection_credit)}</RNText></View>}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={S(14, "700")}>Total</RNText><RNText style={S(22, "800")}>{money(shownQ.total)}</RNText></View></View>
            <RNText style={S(12, "400", c.text4)}>Quote valid until <RNText style={S(12, "600")}>{cur.valid_until ? fmtD(cur.valid_until, false) : "—"}</RNText>. You're charged only after you confirm the finished work.</RNText>
            <View style={{ flexDirection: "row", gap: 8 }}><SecondaryButton title="Decline" style={{ flex: 1 }} onPress={() => setSheet("quoteDecline")} /><PrimaryButton title="Approve quote" style={{ flex: 1.4, height: 48 }} onPress={() => act("quote/approve", {}, "POST")} loading={busy} /></View>
          </Card>
        )}

        {/* before-work evidence */}
        {before.length > 0 && <Card><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(15, "700")}>Before work started</RNText><Chip t="Shared · you & MrBuilder" tone="ok" /></View><Photos list={before} />
          {damage && <View style={{ flexDirection: "row", gap: 10, padding: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.warnBg }}><Ionicons name="warning-outline" size={18} color={c.warn} /><View style={{ flex: 1, gap: 2 }}><RNText style={S(12, "700", c.warn)}>Pre-existing damage noted by {first} · {fmtD(damage.captured_at ?? damage.created_at)}</RNText><RNText style={S(13.5, "400")}>{damage.note}</RNText><RNText style={S(12, "400", c.text4)}>Recorded before work started so it isn't attributed to this job. Contact support if you disagree.</RNText></View></View>}
          <Pressable onPress={() => nav.navigate("Documents")}><RNText style={S(13, "600", c.primary)}>View in Documents →</RNText></Pressable></Card>}

        {/* inspection report */}
        {j.inspection_report && <Card style={{ padding: 0, gap: 0 }}><View style={{ padding: 14, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: c.border }}><RNText style={S(15, "700")}>Inspection report</RNText><RNText style={S(12, "400", c.text4)}>{proName} · {fmtD(j.inspection_report.submitted_at)}</RNText></View>
          {!!j.inspection_report.measurements && <View style={{ flexDirection: "row", padding: 12, paddingHorizontal: 16, gap: 12 }}>{Object.entries(j.inspection_report.measurements).map(([k, v]) => <View key={k} style={{ flex: 1 }}><RNText style={S(12, "600", c.text4)}>{k.replace(/_/g, " ")}</RNText><RNText style={S(16, "700")}>{String(v)}</RNText></View>)}</View>}
          <View style={{ padding: 12, paddingHorizontal: 16, gap: 8, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={S(13.5, "400", c.text4)}>Findings</RNText><RNText style={S(14, "400")}>{j.inspection_report.findings}</RNText>{!!j.inspection_report.photos?.length && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>{j.inspection_report.photos.map((p, i) => <Image key={i} source={{ uri: p.url }} style={{ width: 84, height: 84, borderRadius: 10, backgroundColor: c.surface2 }} />)}</ScrollView>}{j.inspection_report.pdf_url && <Pressable onPress={() => Linking.openURL(j.inspection_report!.pdf_url!)}><RNText style={S(13, "600", c.primary)}>Inspection-report.pdf →</RNText></Pressable>}</View></Card>}

        {/* return visit / proposed time */}
        {pendingProp && pendingProp.proposed_by === "contractor" && (
          <Card>
            {pendingProp.kind === "return" ? <><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(15, "700")}>Corrective return visit</RNText><Chip t="No charge" tone="ok" /></View><View style={{ padding: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.surface2, gap: 2 }}><RNText style={S(12, "400", c.text4)}>Proposed by {first}</RNText><RNText style={S(16, "700")}>{fmtD(pendingProp.proposed_start)}</RNText>{pendingProp.message && <RNText style={S(12.5, "400", c.text3)}>{pendingProp.message}</RNText>}</View><View style={{ flexDirection: "row", gap: 8 }}><SecondaryButton title="Suggest another time" style={{ flex: 1 }} onPress={() => setSheet("reschedule")} /><PrimaryButton title="Accept visit" style={{ flex: 1, height: 48 }} onPress={() => act(`reschedule/${pendingProp.id}`, { action: "accept" }, "PATCH")} loading={busy} /></View></>
              : <><RNText style={S(15, "700")}>{first} proposed a new start time</RNText><View style={{ flexDirection: "row", gap: 8 }}><View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: c.surface2, gap: 2 }}><RNText style={S(12, "400", c.text4)}>Original · kept</RNText><RNText style={S(14, "700")}>{fmtD(j.scheduled_start)}</RNText></View><View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: c.primarySoft, gap: 2 }}><RNText style={S(12, "400", c.orange)}>Proposed</RNText><RNText style={S(14, "700")}>{fmtD(pendingProp.proposed_start)}</RNText></View></View><RNText style={S(12.5, "400", c.text4)}>Your original appointment stays booked until a replacement is agreed.</RNText><PrimaryButton title={`Accept ${fmtD(pendingProp.proposed_start)}`} onPress={() => act(`reschedule/${pendingProp.id}`, { action: "accept" }, "PATCH")} loading={busy} /><View style={{ flexDirection: "row", gap: 8 }}><SecondaryButton title="Keep original" height={44} style={{ flex: 1 }} onPress={() => act(`reschedule/${pendingProp.id}`, { action: "decline" }, "PATCH")} /><SecondaryButton title="Suggest another" height={44} style={{ flex: 1 }} onPress={() => setSheet("reschedule")} /></View></>}
          </Card>
        )}
        {pendingProp && pendingProp.proposed_by !== "contractor" && <Card><RNText style={S(15, "700")}>You proposed {fmtD(pendingProp.proposed_start)}</RNText><RNText style={S(12.5, "400", c.text4)}>Waiting for {first} to accept. Your current appointment stays until then.</RNText></Card>}

        {/* parts request */}
        {(pendingParts || paidParts) && (() => { const p = pendingParts ?? paidParts!; return (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(15, "700")}>Additional parts from {first}</RNText><Chip t={p.status === "pending" ? "Needs your approval" : p.status} tone={p.status === "pending" ? "orange" : "ok"} /></View>
            <RNText style={S(13, "400", c.text3)}>Items not covered by your approved quote ({money(j.quote_total)} · materials & hardware already included). Ordered from Mr Supply and shipped to the job address.</RNText>
            <View style={{ borderRadius: 12, backgroundColor: c.surface2, paddingVertical: 4, paddingHorizontal: 14 }}>{p.items.map((it, i) => <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}><View><RNText style={S(13.5, "600")}>{it.name}</RNText><RNText style={S(12, "400", c.text4)}>× {it.qty} · {money(it.unit_price)} each</RNText></View><RNText style={S(13.5, "600")}>{money(it.qty * it.unit_price)}</RNText></View>)}<View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={S(13, "400", c.text3)}>Ship to</RNText><RNText style={S(13, "500")}>{j.location_address}</RNText></View><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={S(14, "700")}>Parts total</RNText><RNText style={S(20, "800")}>{money(p.total)}</RNText></View></View>
            {p.status === "pending" ? <View style={{ flexDirection: "row", gap: 8 }}><SecondaryButton title="Decline" style={{ flex: 1 }} onPress={async () => { await api(`/parts-requests/${p.id}/decline`, { method: "POST", body: {} }); load(); }} /><PrimaryButton title={`Review & pay ${money(p.total)}`} style={{ flex: 1.6, height: 48 }} onPress={async () => { const r = await api(`/parts-requests/${p.id}/approve`, { method: "POST", body: { pay_mode: "customer_account" } }); if (!r.success) Alert.alert("Couldn't pay", r.error); load(); }} /></View>
              : <View style={{ flexDirection: "row", justifyContent: "space-between" }}><RNText style={S(13, "400", c.text3)}>Order {p.order_number ?? "—"} · linked to {j.request_code}</RNText><Pressable onPress={() => nav.navigate("Tabs", { screen: "Invoices" })}><RNText style={S(13, "600", c.primary)}>View invoice</RNText></Pressable></View>}
          </Card>); })()}

        {/* finished work */}
        {(st === "awaiting_confirmation" || st === "issue_reported" || st === "dispute_open") && (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(15, "700")}>Finished work</RNText><RNText style={S(12, "400", c.text4)}>{fmtD(evAt("completed") ?? evAt("fix_done"))}</RNText></View>
            {completion.length > 0 && <Photos list={completion} tall />}
            {j.completion_note && <RNText style={S(14, "400", c.text2)}><RNText style={S(14, "600")}>{first}'s note:</RNText> {j.completion_note}</RNText>}
            {ack && <View style={{ flexDirection: "row", gap: 10, padding: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: c.infoBg }}><View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#7A5AF8", alignItems: "center", justifyContent: "center" }}><Ionicons name="person" size={14} color="#fff" /></View><View style={{ flex: 1, gap: 1 }}><RNText style={S(13.5, "600")}>{String((ack.payload as { name?: string })?.name ?? "Household member")} acknowledged · {fmtD(ack.created_at)}</RNText><RNText style={S(12.5, "400", c.text3)}>{(ack.payload as { note?: string })?.note ? `"${(ack.payload as { note: string }).note}" — ` : ""}household acknowledgment only; your approval releases payment.</RNText></View></View>}
            {st === "awaiting_confirmation" && isOwner && <><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.surface2 }}><RNText style={S(13.5, "400", c.text3)}>Due on confirmation</RNText><RNText style={S(20, "800")}>{money((j.quote_total ?? 0) - j.inspection_fee_credit)}</RNText></View><PrimaryButton title="Confirm & pay" onPress={() => setSheet("confirm")} /><SecondaryButton title="Report an issue" onPress={() => nav.navigate("ReportIssue", { id: j.id })} /><RNText style={S(12, "400", c.text4)}>Only your account (the one that placed the request) can approve and release payment.{j.auto_confirm_at ? ` Auto-confirms ${fmtD(j.auto_confirm_at)} if you take no action.` : ""}</RNText></>}
            {st === "awaiting_confirmation" && !isOwner && <><RNText style={S(12.5, "400", c.text4)}>Only the account holder can approve payment. You can acknowledge the work for them.</RNText><SecondaryButton title="Acknowledge work" onPress={() => act("acknowledge", { note: "Looks good" }, "POST", "Acknowledged")} /></>}
            {st === "issue_reported" && <View style={{ gap: 6, padding: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.warnBg }}><RNText style={S(12, "700", c.warn)}>Your report · {fmtD(evAt("issue_reported"))}</RNText><RNText style={S(13.5, "400")}>{j.issue_description}</RNText><RNText style={S(12, "400", c.text4)}>{first} can fix it or dispute. Payment stays on hold.</RNText></View>}
          </Card>
        )}

        {/* payment summary */}
        {doneS.includes(st) && (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(15, "700")}>Payment</RNText><Chip t="Paid" tone="ok" /></View>
            <View style={{ borderRadius: 12, backgroundColor: c.surface2, paddingVertical: 4, paddingHorizontal: 14 }}><View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 }}><RNText style={S(13.5, "400", c.text3)}>Job total</RNText><RNText style={S(13.5, "600")}>{money(j.quote_total)}</RNText></View>{j.inspection_fee_credit > 0 && <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={S(13.5, "400", c.text3)}>Inspection credit</RNText><RNText style={S(13.5, "600", c.ok)}>−{money(j.inspection_fee_credit)}</RNText></View>}<View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={S(13.5, "400", c.text3)}>Tip for {first}</RNText><RNText style={S(13.5, "600")}>{j.tip ? money(j.tip) : "No tip"}</RNText></View><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={S(14, "700")}>Charged</RNText><RNText style={S(20, "800")}>{money(j.consumer_charged)}</RNText></View></View>
            <View style={{ flexDirection: "row", gap: 8 }}><SecondaryButton title="Receipt" height={44} style={{ flex: 1 }} icon={<Ionicons name="receipt-outline" size={16} color={c.text} />} onPress={() => nav.navigate("Documents")} />{myRating ? <View style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><RNText style={S(13, "600", c.text3)}>You rated {myRating.rating}.0 ★</RNText></View> : pro && <Pressable onPress={() => setSheet("rate")} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: c.primarySoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}><Ionicons name="star-outline" size={16} color={c.orange} /><RNText style={S(13, "600", c.orange)}>Rate {first}</RNText></Pressable>}</View>
          </Card>
        )}

        {/* request info */}
        <Card style={{ padding: 0, gap: 0 }}>
          <RNText style={{ padding: 14, paddingHorizontal: 16, ...S(13, "700", c.text4) }}>REQUEST DETAILS</RNText>
          {[["Service", j.service_category], ["Address", [j.location_address, j.location_city, j.location_state].filter(Boolean).join(", ")], ["Requested", fmtD(j.created_at, false)], j.urgency ? ["Urgency", j.urgency] : null, ["Quote method", j.quote_method === "inspection" ? "Inspector visit" : "Instant AI quote"], j.notes ? ["Notes", j.notes] : null].filter(Boolean).map((r) => <View key={(r as string[])[0]} style={{ flexDirection: "row", gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={{ width: 100, ...S(13.5, "400", c.text4) }}>{(r as string[])[0]}</RNText><RNText style={{ flex: 1, textAlign: "right", ...S(14, "600") }}>{(r as string[])[1]}</RNText></View>)}
          <View style={{ paddingVertical: 12, paddingHorizontal: 16, gap: 8, borderTopWidth: 1, borderTopColor: c.border }}><RNText style={S(13.5, "400", c.text4)}>Pergola</RNText><View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: c.surface2 }}><View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: c.hero }} /><RNText style={S(14, "600")}>{j.title}</RNText><RNText style={S(12, "400", c.text4)}>{j.width_ft ? `${j.width_ft} × ${j.length_ft} × ${j.height_ft ?? "?"} ft` : ""}</RNText></View>
            {[["Type", (j.pergola_spec as { type?: string })?.type ?? j.pergola_spec?.structure_type], ["Mounting", j.mounting?.replace("_", " ")], ["Enclosures", j.pergola_spec?.enclosures?.length ? j.pergola_spec.enclosures.map((e) => (e as { label?: string }).label ?? e.type).join(", ") : "None"], ["Accessories", j.pergola_spec?.accessories?.length ? j.pergola_spec.accessories.map((a) => `${a.qty}× ${(a as { label?: string }).label ?? a.type}`).join(", ") : "None"]].map(([k, v]) => <View key={k} style={{ flexDirection: "row", gap: 10, paddingHorizontal: 10 }}><RNText style={{ width: 90, ...S(12.5, "400", c.text4) }}>{k}</RNText><RNText style={{ flex: 1, ...S(12.5, "500") }}>{v || "—"}</RNText></View>)}
            <RNText style={{ paddingHorizontal: 10, ...S(11.5, "400", c.text5) }}>Footings and accessory wiring/gas/plumbing are excluded from MrBuilder scope.</RNText></View>
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 14 }}><SecondaryButton title={`Documents · ${docs}`} height={40} style={{ flex: 1 }} icon={<Ionicons name="folder-outline" size={16} color={c.text} />} onPress={() => nav.navigate("Documents")} />{!doneS.includes(st) && !cancelS.includes(st) && !["awaiting_confirmation", "dispute_open"].includes(st) && <SecondaryButton title="Cancel request" height={40} tone="danger" style={{ flex: 1 }} onPress={openCancel} />}</View>
        </Card>
        {j.quote_method === "inspection" && j.inspection_fee > 0 && <Card style={{ gap: 10 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(15, "700")}>Inspection fee</RNText><Chip t="Paid" tone="ok" /></View><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(13.5, "400", c.text4)}>Charged when the visit was booked · {fmtD(j.created_at, false)}</RNText><RNText style={S(18, "700")}>{money(j.inspection_fee)}</RNText></View></Card>}
      </ScrollView>

      {/* sheets */}
      <Sheet open={sheet === "confirm"} onClose={() => setSheet(null)} title="Confirm & pay">
        <RNText style={{ ...S(14, "400", c.text3), marginTop: -8 }}>Everything look good? Add a tip for {first} — 100% goes to them.</RNText>
        <View style={{ flexDirection: "row", gap: 8 }}>{[0, 20, 50, 100].map((t) => <Pressable key={t} onPress={() => setTip(t)} style={{ flex: 1, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: tip === t ? c.primary : c.border2, backgroundColor: tip === t ? c.primarySoft : c.surface, alignItems: "center", justifyContent: "center" }}><RNText style={S(14, "600")}>{t ? `$${t}` : "No tip"}</RNText></Pressable>)}</View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.surface2 }}><RNText style={S(14, "600")}>Total charged</RNText><RNText style={S(18, "800")}>{money((j.quote_total ?? 0) - j.inspection_fee_credit + tip)}</RNText></View>
        <PrimaryButton title="Confirm & release payment" onPress={() => act("confirm", { tip }, "POST")} loading={busy} />
      </Sheet>
      <Sheet open={sheet === "rate"} onClose={() => setSheet(null)} title={`Rate ${proName}`}>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>{[1, 2, 3, 4, 5].map((n) => <Pressable key={n} onPress={() => setStars(n)}><Ionicons name={n <= stars ? "star" : "star-outline"} size={36} color={n <= stars ? c.primary : c.border2} /></Pressable>)}</View>
        <Field label="Comment (optional)" value={text} onChangeText={setText} placeholder="What went well? Anything to improve?" />
        <PrimaryButton title="Submit rating" disabled={!stars} onPress={() => act("ratings", { rating: stars, comment: text || undefined }, "POST", "Thanks for the feedback")} loading={busy} />
      </Sheet>
      <Sheet open={sheet === "reschedule"} onClose={() => setSheet(null)} title="Suggest another time">
        <Field label="Proposed start (YYYY-MM-DD HH:MM)" value={when} onChangeText={setWhen} placeholder="2026-05-14 13:00" />
        <Field label="Message (optional)" value={text} onChangeText={setText} placeholder="Mornings work best for me" />
        <RNText style={{ ...S(12.5, "400", c.text4), marginTop: -6 }}>Your current appointment stays until {first} accepts.</RNText>
        <PrimaryButton title="Send proposal" disabled={!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(when)} onPress={() => act("reschedule", { kind: j.return_visit_at || st === "dispute_rejected" ? "return" : "start", proposed_start: new Date(when.replace(" ", "T")).toISOString(), message: text || undefined }, "POST", "Proposal sent")} loading={busy} />
      </Sheet>
      <Sheet open={sheet === "quoteDecline"} onClose={() => setSheet(null)} title="Decline this quote?">
        <View style={{ gap: 6 }}>{[["too_expensive", "Too expensive"], ["changed_mind", "Changed my mind"], ["found_elsewhere", "Found another option"], ["other", "Other"]].map(([k, l]) => <Pressable key={k} onPress={() => setReason(k)} style={{ height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: reason === k ? c.primary : c.border2, backgroundColor: reason === k ? c.primarySoft : c.surface, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><RNText style={S(15, "500")}>{l}</RNText><View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: reason === k ? c.primary : c.border2, alignItems: "center", justifyContent: "center" }}>{reason === k && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} />}</View></Pressable>)}</View>
        <Pressable onPress={() => act("quote/decline", { reason }, "POST")} style={{ height: 52, borderRadius: 12, backgroundColor: c.errBg, alignItems: "center", justifyContent: "center" }}><RNText style={S(16, "600", c.err)}>Decline quote</RNText></Pressable><SecondaryButton title="Keep it" onPress={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === "cancel"} onClose={() => setSheet(null)} title="Cancel this request?">
        <RNText style={{ ...S(14, "400", c.text3), marginTop: -8 }}>{cancelInfo?.blocked ? "This request can't be cancelled at this stage." : cancelInfo && cancelInfo.fee_amount > 0 ? `A cancellation fee of ${money(cancelInfo.fee_amount)} (${cancelInfo.fee_pct}%) applies because a PRO is already committed.` : "No fee applies at this stage."}</RNText>
        <View style={{ gap: 6 }}>{[["changed_mind", "Changed my mind"], ["schedule", "Scheduling"], ["price", "Price"], ["other", "Other"]].map(([k, l]) => <Pressable key={k} onPress={() => setReason(k)} style={{ height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: reason === k ? c.primary : c.border2, backgroundColor: reason === k ? c.primarySoft : c.surface, paddingHorizontal: 14, justifyContent: "center" }}><RNText style={S(14, "500")}>{l}</RNText></Pressable>)}</View>
        {!cancelInfo?.blocked && <Pressable onPress={() => act("cancel", { reason }, "PATCH")} style={{ height: 52, borderRadius: 12, backgroundColor: c.errBg, alignItems: "center", justifyContent: "center" }}><RNText style={S(16, "600", c.err)}>Cancel request</RNText></Pressable>}<SecondaryButton title="Keep it" onPress={() => setSheet(null)} />
      </Sheet>
    </SafeAreaView>
  );
}
