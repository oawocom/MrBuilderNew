import React, { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Field, PrimaryButton, SecondaryButton, validPassword } from "../../components/form";
import { Header, PickerSheet, Section, SelectField, Toggle } from "../../components/sheet";
import { STATES } from "../../state/requestDraft";
import { api, uploadFile } from "../../api/client";
import { useSession } from "../../auth/session";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

interface Settings { notifications: { push: boolean; email: boolean; sms: boolean; n_jobs: boolean; n_msgs: boolean; n_updates: boolean }; preferences: { language: string; units: string } }
interface Address { id: string; line1: string; city: string; state: string | null; zip_code: string | null; is_default: boolean }

export default function ProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { user, refreshUser, logout } = useSession();
  const { c, mode, setMode } = useTheme();
  const [name, setName] = useState(`${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim()); const [phone, setPhone] = useState(user?.phone ?? ""); const [busy, setBusy] = useState(false);
  const [s, setS] = useState<Settings | null>(null); const [addr, setAddr] = useState<Address | null>(null); const [a, setA] = useState({ line1: "", city: "", state: "", zip: "" }); const [pick, setPick] = useState(false);
  const [pw, setPw] = useState({ cur: "", n: "", n2: "" }); const [members, setMembers] = useState(0);
  const load = async () => { const [st, ad, hh] = await Promise.all([api<Settings>("/me/settings"), api<Address[]>("/addresses"), api<{ members: unknown[] }>("/household")]); setS(st.data ?? null); const d = (ad.data ?? []).find((x) => x.is_default) ?? ad.data?.[0] ?? null; setAddr(d); if (d) setA({ line1: d.line1, city: d.city, state: d.state ?? "", zip: d.zip_code ?? "" }); setMembers(hh.data?.members?.length ?? 0); };
  useEffect(() => { load(); }, []);
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  async function saveProfile() { const parts = name.trim().split(/\s+/); setBusy(true); const r = await api("/profile", { method: "PUT", body: { first_name: parts[0], last_name: parts.slice(1).join(" ") || ".", phone: phone || undefined } }); setBusy(false); if (r.success) { refreshUser(); Alert.alert("Saved"); } else Alert.alert("Couldn't save", r.error); }
  async function saveAddr() { const body = { label: "Home", line1: a.line1, city: a.city, state: a.state || undefined, zip_code: a.zip || undefined, is_default: true }; const r = addr ? await api(`/addresses/${addr.id}`, { method: "PATCH", body }) : await api("/addresses", { method: "POST", body }); Alert.alert(r.success ? "Address saved" : "Couldn't save", r.success ? undefined : r.error); load(); }
  async function avatar() { const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsEditing: true, aspect: [1, 1] }); if (res.canceled || !res.assets[0]) return; const u = await uploadFile(res.assets[0].uri, "avatar"); if (!u) { Alert.alert("Upload not available yet"); return; } await api("/profile", { method: "PUT", body: { avatar_url: u } }); refreshUser(); }
  async function changePw() { const r = await api("/me/password", { method: "POST", body: { current_password: pw.cur, new_password: pw.n } }); Alert.alert(r.success ? "Password updated" : "Couldn't update", r.success ? undefined : r.error ?? "Not available yet"); if (r.success) setPw({ cur: "", n: "", n2: "" }); }
  async function pref(k: string, v: string) { await api("/me/preferences", { method: "PATCH", body: { [k]: v } }); load(); }
  async function notif(k: string, v: boolean) { await api("/me/notifications", { method: "PATCH", body: { [k]: v } }); load(); }
  const Seg = ({ opts, value, onChange }: { opts: [string, string][]; value: string; onChange: (v: string) => void }) => <View style={{ flexDirection: "row", backgroundColor: c.surface3, borderRadius: 10, padding: 3 }}>{opts.map(([k, l]) => <Pressable key={k} onPress={() => onChange(k)} style={{ flex: 1, height: 36, borderRadius: 8, backgroundColor: value === k ? c.surface : "transparent", alignItems: "center", justifyContent: "center" }}><RNText style={S(13.5, "600", value === k ? c.text : c.text4)}>{l}</RNText></Pressable>)}</View>;
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Profile & settings" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 40, gap: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", gap: 10 }}><View><View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.hero, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>{user?.avatar_url ? <Image source={{ uri: user.avatar_url }} style={{ width: 96, height: 96 }} /> : <RNText style={S(32, "700", "#fff")}>{user?.first_name?.[0]}{user?.last_name?.[0]}</RNText>}</View><Pressable onPress={avatar} style={{ position: "absolute", right: -2, bottom: -2, width: 32, height: 32, borderRadius: 16, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.bg }}><Ionicons name="camera" size={15} color="#fff" /></Pressable></View><View style={{ alignItems: "center", gap: 2 }}><RNText style={S(20, "700")}>{user?.first_name} {user?.last_name}</RNText><RNText style={S(13, "400", c.text4)}>{user?.email}</RNText></View></View>
        <Section title="Personal details">
          <Field label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+1 555 000 0000" />
          <View style={{ gap: 6 }}><RNText style={S(13, "600", c.text2)}>Email</RNText><View style={{ height: 52, borderRadius: 12, backgroundColor: c.surface2, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><RNText style={S(15, "400", c.text3)}>{user?.email}</RNText><Ionicons name="lock-closed-outline" size={16} color={c.text4} /></View><RNText style={S(12, "400", c.text4)}>Email is used for sign-in and can't be changed here.</RNText></View>
          <PrimaryButton title="Save details" onPress={saveProfile} loading={busy} disabled={!name.trim()} />
        </Section>
        <Pressable onPress={() => nav.navigate("Household")} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12, paddingHorizontal: 14 }}><View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.infoBg, alignItems: "center", justifyContent: "center" }}><Ionicons name="people-outline" size={20} color={c.info} /></View><View style={{ flex: 1, gap: 2 }}><RNText style={S(14.5, "600")}>Household members</RNText><RNText style={S(12.5, "400", c.text4)}>{members ? `${members} member${members > 1 ? "s" : ""}` : "Add family who can let the technician in"}</RNText></View><Ionicons name="chevron-forward" size={18} color={c.text4} /></Pressable>
        {s && <Section title="Preferences">
          <View style={{ gap: 8 }}><RNText style={S(13, "600", c.text2)}>Measurement units</RNText><Seg opts={[["imperial", "Imperial (ft/in)"], ["metric", "Metric (m/cm)"]]} value={s.preferences.units} onChange={(v) => pref("units", v)} /><RNText style={S(12, "400", c.text4)}>Applies to every dimension in the app. Values are stored once and converted exactly (1 ft = 0.3048 m).</RNText></View>
          <View style={{ gap: 8 }}><RNText style={S(13, "600", c.text2)}>Language</RNText><Seg opts={[["en", "English"], ["es", "Español"]]} value={s.preferences.language} onChange={(v) => pref("language", v)} /></View>
          <View style={{ gap: 8 }}><RNText style={S(13, "600", c.text2)}>Appearance</RNText><Seg opts={[["system", "System"], ["light", "Light"], ["dark", "Dark"]]} value={mode} onChange={(v) => setMode(v as "system" | "light" | "dark")} /></View>
        </Section>}
        {s && <Section title="Notifications"><View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16 }}>{([["push", "Push notifications"], ["email", "Email"], ["sms", "SMS"], ["n_jobs", "Request & job updates"], ["n_msgs", "Messages"], ["n_updates", "Offers & news"]] as const).map(([k, l], i) => <View key={k} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 52, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}><RNText style={S(14.5, "600")}>{l}</RNText><Toggle on={s.notifications[k]} onChange={(v) => notif(k, v)} /></View>)}</View></Section>}
        <Section title="Home address">
          <Field label="Street address" value={a.line1} onChangeText={(v) => setA({ ...a, line1: v })} />
          <View style={{ flexDirection: "row", gap: 10 }}><View style={{ flex: 2 }}><Field label="City" value={a.city} onChangeText={(v) => setA({ ...a, city: v })} /></View><View style={{ flex: 1 }}><SelectField label="State" value={a.state} placeholder="CA" onPress={() => setPick(true)} /></View><View style={{ flex: 1 }}><Field label="ZIP" value={a.zip} onChangeText={(v) => setA({ ...a, zip: v })} keyboardType="numeric" /></View></View>
          <SecondaryButton title="Save address" onPress={saveAddr} />
        </Section>
        <Section title="Change password">
          <Field label="Current password" value={pw.cur} onChangeText={(v) => setPw({ ...pw, cur: v })} secure />
          <Field label="New password" value={pw.n} onChangeText={(v) => setPw({ ...pw, n: v })} secure ok={validPassword(pw.n) ? "At least 8 characters, one number" : null} />
          <Field label="Repeat new password" value={pw.n2} onChangeText={(v) => setPw({ ...pw, n2: v })} secure error={pw.n2 && pw.n2 !== pw.n ? "Passwords don't match" : null} />
          <SecondaryButton title="Update password" onPress={changePw} />
        </Section>
        <Pressable onPress={() => Alert.alert("Delete account?", "Your account is deactivated now and permanently deleted after 30 days. Log in before then to restore it.", [{ text: "Keep", style: "cancel" }, { text: "Delete", style: "destructive", onPress: async () => { const r = await api("/me", { method: "DELETE" }); if (r.success) logout(); else Alert.alert("Couldn't delete", r.error); } }])} style={{ height: 48, alignItems: "center", justifyContent: "center" }}><RNText style={S(14, "600", c.err)}>Delete my account</RNText></Pressable>
      </ScrollView>
      <PickerSheet open={pick} onClose={() => setPick(false)} title="State" options={STATES} value={a.state} onSelect={(v) => setA({ ...a, state: v })} searchable />
    </SafeAreaView>
  );
}
