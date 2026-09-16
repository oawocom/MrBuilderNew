import React, { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Field, PrimaryButton, SecondaryButton, validPassword } from "../../components/form";
import { Header, PickerSheet, SelectField } from "../../components/sheet";
import { api, Category, uploadFile } from "../../api/client";
import { useSession } from "../../auth/session";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";

interface Profile { title?: string | null; years_experience?: string | null; service_area?: string | null; max_distance_miles?: number | null; skills?: string[]; pergola_systems?: string[]; documents?: { name: string; url?: string; expires_at?: string | null }[] }
const YEARS = ["Less than 1 year", "1–2 years", "3–5 years", "6–10 years", "10+ years"];
const SYSTEMS = ["Suntent", "StruXure", "Alumawood", "Renson", "Azenco", "Other"];

export default function PersonalInfoScreen() {
  const nav = useNavigation();
  const { user, refreshUser } = useSession();
  const { c } = useTheme();
  const [f, setF] = useState({ first: user?.first_name ?? "", last: user?.last_name ?? "", phone: user?.phone ?? "", title: "", years: "", area: "", dist: "50" }); const [skills, setSkills] = useState<string[]>([]); const [systems, setSystems] = useState<string[]>([]); const [cats, setCats] = useState<Category[]>([]); const [docs, setDocs] = useState<Profile["documents"]>([]);
  const [pwOpen, setPwOpen] = useState(false); const [pw, setPw] = useState({ n: "", n2: "" }); const [pick, setPick] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { api<{ contractor_profile?: Profile } & Profile>("/profile").then((r) => { const p = (r.data?.contractor_profile ?? r.data) as Profile | undefined; if (!p) return; setF((x) => ({ ...x, title: p.title ?? "", years: p.years_experience ?? "", area: p.service_area ?? "", dist: String(p.max_distance_miles ?? 50) })); setSkills(p.skills ?? []); setSystems(p.pergola_systems ?? []); setDocs(p.documents ?? []); }); api<Category[]>("/categories").then((r) => setCats((r.data ?? []).filter((k) => k.slug !== "installation"))); }, []);
  const S = (n: number, w: "400" | "500" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });
  async function save() { setBusy(true); await api("/profile", { method: "PUT", body: { first_name: f.first, last_name: f.last, phone: f.phone || undefined, title: f.title || undefined, years_experience: f.years || undefined, service_area: f.area || undefined, max_distance_miles: Number(f.dist) || undefined } }); await api("/profile/skills", { method: "PUT", body: { skills } }); await api("/profile/pergola-systems", { method: "PUT", body: { systems } }); setBusy(false); refreshUser(); Alert.alert("Saved"); }
  async function avatar() { const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsEditing: true, aspect: [1, 1] }); if (res.canceled || !res.assets[0]) return; const u = await uploadFile(res.assets[0].uri, "avatar"); if (!u) { Alert.alert("Upload not available yet"); return; } await api("/profile", { method: "PUT", body: { avatar_url: u } }); refreshUser(); }
  async function changePw() { const r = await api("/me/password", { method: "POST", body: { new_password: pw.n } }); Alert.alert(r.success ? "Password updated" : "Not available yet", r.success ? undefined : r.error); if (r.success) { setPw({ n: "", n2: "" }); setPwOpen(false); } }
  const Chip = ({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) => <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: on ? c.primarySoft : c.surface, borderWidth: 1, borderColor: on ? c.orangeBd : c.border }}><View style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: on ? c.primary : "transparent", borderWidth: on ? 0 : 1.5, borderColor: c.border2, alignItems: "center", justifyContent: "center" }}>{on && <Ionicons name="checkmark" size={12} color="#fff" />}</View><RNText style={S(13.5, "500")}>{label}</RNText></Pressable>;
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Personal information" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}><Pressable onPress={avatar}><View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.hero, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>{user?.avatar_url ? <Image source={{ uri: user.avatar_url }} style={{ width: 72, height: 72 }} /> : <RNText style={S(24, "700", "#fff")}>{user?.first_name?.[0]}{user?.last_name?.[0]}</RNText>}</View><View style={{ position: "absolute", right: -2, bottom: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.bg }}><Ionicons name="camera" size={13} color="#fff" /></View></Pressable><View><RNText style={S(15, "600")}>Profile photo</RNText><RNText style={S(13, "400", c.text4)}>Tap to upload a new photo</RNText></View></View>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 10 }}><View style={{ flex: 1 }}><Field label="First name" value={f.first} onChangeText={(v) => setF({ ...f, first: v })} /></View><View style={{ flex: 1 }}><Field label="Last name" value={f.last} onChangeText={(v) => setF({ ...f, last: v })} /></View></View>
          <View style={{ gap: 6 }}><RNText style={S(13, "500", c.text2)}>Email address</RNText><View style={{ height: 48, borderRadius: 12, backgroundColor: c.surface2, paddingHorizontal: 14, justifyContent: "center" }}><RNText style={S(15, "400", c.text3)}>{user?.email}</RNText></View></View>
          <Field label="Phone number" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" />
          <Field label="Professional title" value={f.title} onChangeText={(v) => setF({ ...f, title: v })} placeholder="Senior Installer" />
          <SelectField label="Years of experience" value={f.years} placeholder="Select" onPress={() => setPick(true)} />
          <Field label="Service area" value={f.area} onChangeText={(v) => setF({ ...f, area: v })} placeholder="Portland, OR" />
          <Field label="Max travel distance (miles)" value={f.dist} onChangeText={(v) => setF({ ...f, dist: v })} keyboardType="numeric" />
        </View>
        <View style={{ gap: 8 }}><Pressable onPress={() => setPwOpen(!pwOpen)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Ionicons name="lock-closed-outline" size={18} color={c.text} /><RNText style={{ flex: 1, ...S(15, "600") }}>Change password</RNText><Ionicons name={pwOpen ? "chevron-up" : "chevron-down"} size={18} color={c.text4} /></Pressable>{pwOpen && <View style={{ gap: 10 }}><Field label="New password" value={pw.n} onChangeText={(v) => setPw({ ...pw, n: v })} secure placeholder="Enter new password" ok={validPassword(pw.n) ? "Strong enough" : null} /><Field label="Confirm new password" value={pw.n2} onChangeText={(v) => setPw({ ...pw, n2: v })} secure placeholder="Re-enter new password" error={pw.n2 && pw.n2 !== pw.n ? "Passwords don't match" : null} /><SecondaryButton title="Update password" height={44} onPress={changePw} /></View>}</View>
        <View style={{ gap: 10 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Ionicons name="construct-outline" size={18} color={c.text} /><RNText style={S(15, "600")}>Services & specialties</RNText></View><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{cats.map((k) => <Chip key={k.slug} on={skills.includes(k.slug)} label={k.name} onPress={() => setSkills(skills.includes(k.slug) ? skills.filter((x) => x !== k.slug) : [...skills, k.slug])} />)}</View><RNText style={S(12.5, "400", c.text4)}>Training and a practical assessment are required before a category goes live.</RNText></View>
        <View style={{ gap: 10 }}><RNText style={S(15, "600")}>Pergola systems installed</RNText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{SYSTEMS.map((s) => <Chip key={s} on={systems.includes(s)} label={s} onPress={() => setSystems(systems.includes(s) ? systems.filter((x) => x !== s) : [...systems, s])} />)}</View></View>
        {!!docs?.length && <View style={{ gap: 10 }}><RNText style={S(15, "600")}>Documents</RNText><View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16 }}>{docs.map((d, i) => <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}><Ionicons name="document-text-outline" size={18} color={c.text2} /><View style={{ flex: 1 }}><RNText style={S(14, "600")}>{d.name}</RNText>{d.expires_at && <RNText style={S(12, "400", c.text4)}>Expires {new Date(d.expires_at).toLocaleDateString()}</RNText>}</View></View>)}</View></View>}
        <PrimaryButton title="Save changes" onPress={save} loading={busy} />
      </ScrollView>
      <PickerSheet open={pick} onClose={() => setPick(false)} title="Years of experience" options={YEARS} value={f.years} onSelect={(v) => setF({ ...f, years: v })} />
    </SafeAreaView>
  );
}
