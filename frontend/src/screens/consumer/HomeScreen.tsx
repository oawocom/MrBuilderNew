import React, { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { api, Job } from "../../api/client";
import { useSession } from "../../auth/session";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

interface Draft { id: string; service_category: string | null; step: string | null; updated_at: string }
interface Pergola { id: string; name: string; city: string | null; structure_type: string | null; width_ft: number | null; length_ft: number | null; lat: number | null; lng: number | null; photo_url: string | null; spec: { enclosures?: { type: string }[]; accessories?: { type: string; qty: number }[] } }
interface Wx { temp: number; code: number; hi: number; lo: number; wind: number; forecast: { d: string; code: number; t: number }[]; city: string; pergola: string; tip: string; warn: string | null }

// home request card: stage → chip, progress (of 6), next line
function stageOf(j: Job): { chip: string; tone: "ok" | "warn" | "info" | "err"; n: number; next: string } {
  const c = j.contractor ? `${j.contractor.first_name}` : "Your PRO";
  const t = (v?: string | null) => (v ? new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
  switch (j.status) {
    case "quote_ready": return { chip: "Quote ready", tone: "warn", n: 1, next: "Review and approve your quote" };
    case "inspection_booked": return { chip: "Inspection booked", tone: "info", n: 1, next: "Finding an inspector near you" };
    case "inspection_done": case "quote_generating": return { chip: "Generating quote", tone: "info", n: 2, next: "Report submitted · MrBuilder pricing the job" };
    case "matching": case "reassigning": return { chip: "Finding a contractor", tone: "info", n: 2, next: "Usually within a few hours" };
    case "no_match_waitlist": return { chip: "Waitlisted", tone: "warn", n: 2, next: "We'll notify you when a PRO is available" };
    case "assigned": return { chip: "Contractor assigned", tone: "ok", n: 3, next: j.scheduled_start ? `${c} arrives ${t(j.scheduled_start)}` : `${c} will confirm a time` };
    case "en_route": return { chip: "Contractor on the way", tone: "info", n: 4, next: j.en_route_eta_minutes ? `${c} · ETA ${j.en_route_eta_minutes} min` : `${c} is on the way` };
    case "arrived": return { chip: "Contractor on site", tone: "info", n: 4, next: "Site check in progress" };
    case "in_progress": return { chip: "In progress", tone: "info", n: 4, next: "Work started" };
    case "paused_safety": return { chip: "Work paused — safety", tone: "err", n: 4, next: "No fee · resumes when safe" };
    case "awaiting_confirmation": return { chip: "Awaiting your confirmation", tone: "warn", n: 5, next: `Review ${c}'s photos and confirm` };
    case "issue_reported": return { chip: "Issue reported", tone: "err", n: 5, next: `${c} is reviewing your report` };
    case "dispute_open": return { chip: "Under review", tone: "err", n: 5, next: "MrBuilder is reviewing the dispute" };
    case "dispute_rejected": return { chip: "Return visit proposed", tone: "warn", n: 5, next: "Accept a time or suggest another" };
    case "return_visit_scheduled": return { chip: "Return visit scheduled", tone: "ok", n: 5, next: `${t(j.return_visit_at)} · no charge` };
    case "completed_paid": case "dispute_upheld": return { chip: "Completed · paid", tone: "ok", n: 6, next: `Rate ${c}` };
    default: return { chip: "Submitted", tone: "info", n: 1, next: "Preparing your quote" };
  }
}
const wmo = (code: number): { name: string; icon: keyof typeof Ionicons.glyphMap; key: string } =>
  code === 0 ? { name: "Sunny", icon: "sunny-outline", key: "sunny" } : code <= 2 ? { name: "Partly cloudy", icon: "partly-sunny-outline", key: "partly" } : code === 3 ? { name: "Cloudy", icon: "cloud-outline", key: "partly" }
  : code >= 95 ? { name: "Thunderstorm", icon: "thunderstorm-outline", key: "thunder" } : code >= 71 && code <= 77 ? { name: "Snow", icon: "snow-outline", key: "snow" } : code >= 51 ? { name: "Rain", icon: "rainy-outline", key: "rain" } : { name: "Fog", icon: "cloud-outline", key: "partly" };
const TIP: Record<string, string> = { rain: "Rain is expected. Check that your gutters and drainage outlets are clear of leaves and debris.", thunder: "Thunderstorms in the area. Keep clear of the structure during lightning and consider switching off mounted electrical accessories at the source.", snow: "Snow is expected. Follow your manufacturer's snow-load and roof-operation guidance; clear accumulation only as they advise.", windy: "Strong winds are forecast. Retract zip screens before gusts arrive and follow your manufacturer's guidance.", sunny: "Sunny days ahead. Check that your screens are clean and operating smoothly.", partly: "Mild conditions. A good time for a quick visual check of louvers, gutters and fixings." };

export default function HomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { user } = useSession();
  const { c, dark, mode, setMode } = useTheme();
  const [jobs, setJobs] = useState<Job[]>([]); const [pergolas, setPergolas] = useState<Pergola[]>([]); const [draft, setDraft] = useState<Draft | null>(null); const [unread, setUnread] = useState(0);
  const [wx, setWx] = useState<Wx | null>(null); const [wxIdx, setWxIdx] = useState(0);

  const loadWeather = useCallback(async (list: Pergola[], idx: number) => {
    let lat = list[idx]?.lat, lng = list[idx]?.lng, city = list[idx]?.city ?? "";
    if (lat == null || lng == null) { try { const { status } = await Location.requestForegroundPermissionsAsync(); if (status !== "granted") return; const p = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({})); lat = p.coords.latitude; lng = p.coords.longitude; if (!city) { const g = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }); city = g[0]?.city ?? ""; } } catch { return; } }
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=5`);
      const d = await r.json();
      const today = wmo(d.current.weather_code).key, tomorrow = wmo(d.daily.weather_code[1]).key;
      const warn = tomorrow !== today && ["rain", "thunder", "snow"].includes(tomorrow) ? `${wmo(d.daily.weather_code[1]).name} expected tomorrow` : d.current.wind_speed_10m > 25 ? "Strong winds today" : null;
      setWx({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code, hi: Math.round(d.daily.temperature_2m_max[0]), lo: Math.round(d.daily.temperature_2m_min[0]), wind: Math.round(d.current.wind_speed_10m), city, pergola: list[idx]?.name ?? "Your area",
        forecast: d.daily.time.slice(0, 5).map((t: string, i: number) => ({ d: i === 0 ? "Today" : new Date(t + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }), code: d.daily.weather_code[i], t: Math.round(d.daily.temperature_2m_max[i]) })),
        tip: TIP[d.current.wind_speed_10m > 25 ? "windy" : today] ?? TIP.partly, warn });
    } catch {}
  }, []);

  const load = useCallback(async () => {
    const [j, p, d, n] = await Promise.all([api<Job[]>("/jobs/me?active=1&limit=20"), api<Pergola[]>("/pergolas"), api<Draft[]>("/drafts"), api("/notifications?limit=1")]);
    setJobs(j.data ?? []); setPergolas(p.data ?? []); setDraft(d.data?.[0] ?? null); setUnread(n.meta?.unread ?? 0);
    loadWeather(p.data ?? [], 0);
  }, [loadWeather]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const hour = new Date().getHours(); const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const primary = jobs[0]; const st = primary ? stageOf(primary) : null;
  const toneBg = { ok: [c.okBg, c.ok], warn: [c.warnBg, c.warn], info: [c.infoBg, c.info], err: [c.errBg, c.err] } as const;
  const S = (n: number, w: "400" | "500" | "600" | "700" | "800" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });
  const IconBtn = ({ name, onPress, dot }: { name: keyof typeof Ionicons.glyphMap; onPress?: () => void; dot?: boolean }) => <Pressable onPress={onPress} style={{ width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}><Ionicons name={name} size={20} color={c.text2} />{dot && <View style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary }} />}</Pressable>;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      {/* header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Pressable onPress={() => nav.navigate("Tabs", { screen: "More" } as never)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.hero, alignItems: "center", justifyContent: "center" }}><RNText style={S(14, "700", "#fff")}>{user?.first_name?.[0]}{user?.last_name?.[0]}</RNText></View>
          <View><RNText style={S(12, "400", c.text4)}>{greet}</RNText><RNText style={S(16, "700")}>{user?.first_name}</RNText></View>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <IconBtn name={dark ? "sunny-outline" : "moon-outline"} onPress={() => setMode(dark ? "light" : "dark")} />
          <IconBtn name="chatbubble-ellipses-outline" onPress={() => nav.navigate("Tabs", { screen: "Requests" } as never)} />
          <IconBtn name="notifications-outline" onPress={() => nav.navigate("Notifications")} dot={unread > 0} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 20 }}>
        {draft && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.orangeBd, borderRadius: 16, padding: 14 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}><Ionicons name="document-text-outline" size={20} color={c.primary} /></View>
            <View style={{ flex: 1, gap: 2 }}><RNText style={S(14.5, "600")}>Continue where you left off</RNText><RNText style={S(12.5, "400", c.text3)}>{draft.service_category ?? "Request"} · {new Date(draft.updated_at).toLocaleDateString()}</RNText></View>
            <Pressable onPress={() => nav.navigate("InstallForm", { draftId: draft.id })} style={{ height: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}><RNText style={S(13, "600", "#fff")}>Resume</RNText></Pressable>
            <Pressable onPress={async () => { await api(`/drafts/${draft.id}`, { method: "DELETE" }); setDraft(null); }} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}><Ionicons name="close" size={18} color={c.text4} /></Pressable>
          </View>
        )}

        <View style={{ gap: 10 }}>
          <RNText style={S(16, "700")}>What do you need?</RNText>
          {[{ t: "Install a pergola", s: "Get an instant quote for a new installation", icon: "construct-outline" as const, bg: c.primarySoft, fg: c.primary, go: () => nav.navigate("InstallForm", {}) }, { t: "Repair or maintain", s: "Tell us what you need and schedule an inspector visit", icon: "build-outline" as const, bg: c.infoBg, fg: c.info, go: () => nav.navigate("RepairForm") }].map((a) => (
            <Pressable key={a.t} onPress={a.go} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: pressed ? c.orangeBd : c.border, borderRadius: 16, padding: 14 })}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: a.bg, alignItems: "center", justifyContent: "center" }}><Ionicons name={a.icon} size={22} color={a.fg} /></View>
              <View style={{ flex: 1, gap: 3 }}><RNText style={S(15, "600")}>{a.t}</RNText><RNText style={S(12.5, "400", c.text4)}>{a.s}</RNText></View>
              <Ionicons name="chevron-forward" size={18} color={c.text4} />
            </Pressable>
          ))}
        </View>

        {wx && (
          <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, gap: 14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <View style={{ gap: 6, flex: 1 }}>
                {pergolas.length > 1 && <View style={{ flexDirection: "row", gap: 4 }}>{pergolas.map((p, i) => <Pressable key={p.id} onPress={() => { setWxIdx(i); loadWeather(pergolas, i); }} style={{ height: 26, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: i === wxIdx ? c.hero : c.border2, backgroundColor: i === wxIdx ? c.hero : "transparent", justifyContent: "center" }}><RNText style={S(12, "600", i === wxIdx ? "#fff" : c.text2)}>{(p.city ?? p.name).split(",")[0]}</RNText></Pressable>)}</View>}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><RNText style={{ fontSize: 44, fontFamily: font.bold, color: c.text, letterSpacing: -1 }}>{wx.temp}°</RNText><View><RNText style={S(14, "600")}>{wmo(wx.code).name}</RNText><RNText style={S(12, "400", c.text4)}>H {wx.hi}° · L {wx.lo}°</RNText></View></View>
                <RNText style={S(12.5, "400", c.text4)}>{wx.city} · Wind {wx.wind} mph</RNText>
              </View>
              <View style={{ width: 88, height: 88, borderRadius: 14, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name={wmo(wx.code).icon} size={44} color={c.primary} /></View>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>{wx.forecast.map((f, i) => <View key={f.d} style={{ alignItems: "center", gap: 4 }}><RNText style={S(11.5, "600", i === 0 ? c.text : c.text4)}>{f.d}</RNText><Ionicons name={wmo(f.code).icon} size={18} color={i === 0 ? c.text : c.text4} /><RNText style={S(12.5, "600")}>{f.t}°</RNText></View>)}</View>
            {wx.warn && <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.warn }} /><RNText style={S(12.5, "600", c.warn)}>{wx.warn}</RNText></View>}
            <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12, gap: 3 }}><RNText style={S(11.5, "700", c.text4)}>Pergola care · {wx.pergola}</RNText><RNText style={{ ...S(13.5, "400", c.text2), lineHeight: 19 }}>{wx.tip}</RNText></View>
            <RNText style={S(11.5, "400", c.text5)}>Open-Meteo · Updated {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</RNText>
          </View>
        )}

        <Pressable onPress={() => nav.navigate("Tabs", { screen: "MrCare" } as never)} style={{ borderRadius: 16, backgroundColor: c.hero, padding: 18, gap: 12, overflow: "hidden" }}>
          <View style={{ position: "absolute", right: -50, top: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: c.primary }} />
          <View style={{ gap: 4 }}><RNText style={S(12, "700", "#F7A26B")}>Limited offer</RNText><RNText style={S(22, "800", "#fff")}>50% off care plans</RNText><RNText style={S(12.5, "400", "#D5D7DA")}>Members offer · this season</RNText></View>
          <View style={{ alignSelf: "flex-start", height: 36, paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#fff", justifyContent: "center" }}><RNText style={S(13, "600", "#181D27")}>View MrCare plans</RNText></View>
        </Pressable>

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(16, "700")}>My requests</RNText>{jobs.length > 0 && <Pressable onPress={() => nav.navigate("Tabs", { screen: "Requests" } as never)}><RNText style={S(13, "600", c.primary)}>See all</RNText></Pressable>}</View>
          {!primary ? (
            <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 20, alignItems: "center", gap: 6 }}><View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name="reader-outline" size={20} color={c.text4} /></View><RNText style={S(14.5, "600")}>No requests yet</RNText><RNText style={{ ...S(13, "400", c.text4), textAlign: "center" }}>Choose a service above and your requests will show up here.</RNText></View>
          ) : (
            <Pressable onPress={() => nav.navigate("RequestDetail", { id: primary.id })} style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: st!.tone === "warn" ? c.orangeBd : c.border, borderRadius: 16, padding: 14, gap: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(15, "600")} numberOfLines={1}>{primary.title}</RNText><View style={{ height: 24, paddingHorizontal: 8, borderRadius: 999, backgroundColor: toneBg[st!.tone][0], justifyContent: "center" }}><RNText style={S(11.5, "600", toneBg[st!.tone][1])}>{st!.chip}</RNText></View></View>
              <View style={{ flexDirection: "row", gap: 4 }}>{[1, 2, 3, 4, 5, 6].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < st!.n ? c.ok : i === st!.n ? c.primary : c.surface3 }} />)}</View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Ionicons name="time-outline" size={16} color={c.text3} /><RNText style={S(13, "600")}>{st!.next}</RNText></View>
              {primary.contractor && <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}><View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.info, alignItems: "center", justifyContent: "center" }}><RNText style={S(12, "700", "#fff")}>{primary.contractor.first_name[0]}{primary.contractor.last_name[0]}</RNText></View><View style={{ flex: 1 }}><RNText style={S(12, "400", c.text4)}>Technician</RNText><RNText style={S(13.5, "600")}>{primary.contractor.first_name} {primary.contractor.last_name}</RNText></View><Ionicons name="chevron-forward" size={18} color={c.text4} /></View>}
            </Pressable>
          )}
        </View>

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(16, "700")}>My pergolas</RNText>{pergolas.length > 0 && <Pressable onPress={() => nav.navigate("Pergolas")}><RNText style={S(13, "600", c.primary)}>See all</RNText></Pressable>}</View>
          {pergolas.length === 0 ? (
            <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 20, alignItems: "center", gap: 6 }}><View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name="cube-outline" size={20} color={c.text4} /></View><RNText style={S(14.5, "600")}>No pergolas added</RNText><RNText style={{ ...S(13, "400", c.text4), textAlign: "center" }}>Save your pergola's specs to speed up quotes, warranties and support calls.</RNText><Pressable onPress={() => nav.navigate("AddPergola", {})} style={{ marginTop: 8, height: 40, paddingHorizontal: 16, borderRadius: 10, backgroundColor: c.primarySoft, flexDirection: "row", alignItems: "center", gap: 6 }}><Ionicons name="add" size={18} color={c.orange} /><RNText style={S(13.5, "600", c.orange)}>Add a pergola</RNText></Pressable></View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>{pergolas.map((p) => (
              <Pressable key={p.id} onPress={() => nav.navigate("PergolaDetail", { id: p.id })} style={{ width: 200, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, overflow: "hidden" }}>
                {p.photo_url ? <Image source={{ uri: p.photo_url }} style={{ height: 118 }} /> : <View style={{ height: 118, backgroundColor: c.hero, alignItems: "center", justifyContent: "center", gap: 6 }}><Ionicons name="image-outline" size={22} color="rgba(255,255,255,.7)" /><RNText style={S(12, "400", "rgba(255,255,255,.7)")}>Pergola photo</RNText></View>}
                <View style={{ paddingHorizontal: 12, paddingVertical: 10, gap: 2 }}><RNText style={S(14, "600")} numberOfLines={1}>{p.name}</RNText><RNText style={S(12, "400", c.text4)}>{[p.structure_type?.replace("_", " "), p.width_ft && p.length_ft ? `${p.width_ft}×${p.length_ft} ft` : null].filter(Boolean).join(" · ")}</RNText></View>
              </Pressable>))}</ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
