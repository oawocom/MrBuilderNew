import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Field, PrimaryButton, SecondaryButton } from "../../components/form";
import { ChoiceRow, Header, Note, Sheet } from "../../components/sheet";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";

interface Member { id: string; name: string | null; email: string | null; phone: string | null; role: string; status: string; member?: { first_name: string; last_name: string } | null; invite_token?: string }

export default function HouseholdScreen() {
  const nav = useNavigation();
  const { c } = useTheme();
  const [members, setMembers] = useState<Member[]>([]); const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "", role: "member" }); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const r = await api<{ members: Member[] }>("/household"); setMembers(r.data?.members ?? []); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  async function invite() {
    setBusy(true); const r = await api("/household/invites", { method: "POST", body: { name: f.name || undefined, email: f.email || undefined, phone: f.phone || undefined, role: f.role } }); setBusy(false);
    if (!r.success) { Alert.alert("Couldn't invite", r.error ?? "Try again"); return; }
    setOpen(false); setF({ name: "", email: "", phone: "", role: "member" }); load();
  }
  function remove(m: Member) { Alert.alert("Remove member?", `${m.member ? `${m.member.first_name} ${m.member.last_name}` : m.name ?? m.email} will lose access to your requests.`, [{ text: "Keep", style: "cancel" }, { text: "Remove", style: "destructive", onPress: async () => { await api(`/household/members/${m.id}`, { method: "DELETE" }); load(); } }]); }
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Household" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Note tone="info">Members you add can let the contractor in and, if allowed, acknowledge finished work. Only you approve quotes and release payment. Contractors see their name and phone on the job.</Note>
        {members.map((m) => { const n = m.member ? `${m.member.first_name} ${m.member.last_name}` : m.name ?? m.email ?? "Invited"; return (
          <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12, paddingHorizontal: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#7A5AF8", alignItems: "center", justifyContent: "center" }}><RNText style={S(15, "700", "#fff")}>{n.split(" ").map((x) => x[0]).join("").slice(0, 2)}</RNText></View>
            <View style={{ flex: 1, gap: 2 }}><RNText style={S(15, "600")}>{n}</RNText><RNText style={S(12.5, "400", c.text4)}>{m.role === "viewer" ? "View only" : "Member"}{m.status !== "active" ? ` · ${m.status}` : ""}{m.phone ? ` · ${m.phone}` : m.email ? ` · ${m.email}` : ""}</RNText></View>
            <Pressable onPress={() => remove(m)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name="trash-outline" size={16} color={c.text2} /></Pressable>
          </View>); })}
        {members.length === 0 && <View style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: 24, alignItems: "center" }}><RNText style={S(13.5, "400", c.text4)}>No household members yet.</RNText></View>}
        <Pressable onPress={() => setOpen(true)} style={{ height: 48, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: c.orangeBd, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}><Ionicons name="person-add-outline" size={18} color={c.orange} /><RNText style={S(14, "600", c.orange)}>Add a member</RNText></Pressable>
      </ScrollView>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add a household member">
        <Field label="Name" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} autoCapitalize="words" />
        <Field label="Email" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} keyboardType="email-address" />
        <Field label="Phone (optional)" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" />
        <View style={{ gap: 8 }}><ChoiceRow title="Member" sub="Can create requests and acknowledge finished work" on={f.role === "member"} onPress={() => setF({ ...f, role: "member" })} /><ChoiceRow title="Viewer" sub="Can see requests only" on={f.role === "viewer"} onPress={() => setF({ ...f, role: "viewer" })} /></View>
        <PrimaryButton title="Send invitation" onPress={invite} disabled={!f.email && !f.phone} loading={busy} />
      </Sheet>
    </SafeAreaView>
  );
}
