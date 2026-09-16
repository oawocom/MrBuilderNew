import React, { useEffect, useRef, useState } from "react";
import { Alert, Text as RNText, TextInput, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Screen } from "../../components";
import { IconTile, PrimaryButton, Title } from "../../components/form";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { api } from "../../api/client";
import { useSession } from "../../auth/session";

export default function OtpScreen() {
  const nav = useNavigation();
  const { params } = useRoute<{ key: string; name: string; params: { email: string } }>();
  const { c } = useTheme();
  const { refreshUser } = useSession();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [left, setLeft] = useState(120); const [busy, setBusy] = useState(false);
  const refs = useRef<(TextInput | null)[]>([]);
  useEffect(() => { const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000); return () => clearInterval(t); }, []);
  const code = digits.join(""); const full = code.length === 6;
  const masked = params.email.replace(/^(.)(.*)(@.*)$/, (_, a, b, d) => a + "*".repeat(Math.min(b.length, 7)) + d);
  function set(i: number, v: string) { const d = [...digits]; d[i] = v.replace(/\D/g, "").slice(-1); setDigits(d); if (d[i] && i < 5) refs.current[i + 1]?.focus(); }
  async function verify() {
    setBusy(true);
    const r = await api("/me/verify/confirm", { method: "POST", body: { channel: "email", code } });
    setBusy(false);
    if (!r.success) { Alert.alert("Wrong code", r.error ?? "Try again"); return; }
    await refreshUser(); nav.goBack();
  }
  async function resend() { const r = await api("/me/verify/send", { method: "POST", body: { channel: "email" } }); setLeft(120); Alert.alert(r.success ? "Code sent" : "Couldn't send", r.error); }
  return (
    <Screen scroll={false} style={{ padding: 20, paddingTop: 32, paddingBottom: 28, gap: 24 }}>
      <IconTile name="mail-outline" />
      <Title>Check your email</Title>
      <RNText style={{ marginTop: -16, fontSize: 14, lineHeight: 20, color: c.text3, fontFamily: font.regular }}>Enter the 6-digit code we sent to <RNText style={{ color: c.text, fontFamily: font.semibold }}>{masked}</RNText></RNText>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {digits.map((d, i) => <TextInput key={i} ref={(r) => { refs.current[i] = r; }} value={d} onChangeText={(v) => set(i, v)} keyboardType="number-pad" maxLength={1} autoFocus={i === 0} onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus(); }}
          style={{ flex: 1, height: 56, borderRadius: 12, borderWidth: 1, borderColor: full ? c.ok : d ? c.primary : c.border2, backgroundColor: full ? c.okBg : c.surface, textAlign: "center", fontFamily: font.semibold, fontSize: 22, color: c.text }} />)}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <RNText style={{ fontSize: 14, color: c.text3, fontFamily: font.regular }}>Code expires in <RNText style={{ color: c.text, fontFamily: font.semibold }}>{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</RNText></RNText>
        <RNText onPress={left === 0 ? resend : undefined} style={{ fontFamily: font.semibold, fontSize: 14, color: left === 0 ? c.primary : c.text4 }}>Resend code</RNText>
      </View>
      <View style={{ flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, backgroundColor: c.infoBg }}><RNText style={{ color: c.info }}>ⓘ</RNText><RNText style={{ flex: 1, fontSize: 13, lineHeight: 18, color: c.info, fontFamily: font.regular }}>Didn't get it? Check your spam folder — codes come from no-reply@mrbuilder.com.</RNText></View>
      <View style={{ marginTop: "auto", gap: 10 }}><PrimaryButton title={full ? "Verify" : "Enter the 6-digit code"} onPress={verify} disabled={!full} loading={busy} /><RNText onPress={() => nav.goBack()} style={{ textAlign: "center", fontFamily: font.semibold, fontSize: 14, color: c.text4 }}>Skip for now</RNText></View>
    </Screen>
  );
}
