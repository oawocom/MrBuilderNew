import React, { useEffect, useRef, useState } from "react";
import { Alert, Text as RNText, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Field, PrimaryButton, SecondaryButton, validEmail, validPassword } from "../../components/form";
import { AuthFrame } from "./ProLoginScreen";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

export default function ProForgotScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { c } = useTheme();
  const [stage, setStage] = useState<"email" | "code" | "new">("email"); const [email, setEmail] = useState(""); const [digits, setDigits] = useState(["", "", "", "", "", ""]); const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [busy, setBusy] = useState(false); const [left, setLeft] = useState(60);
  const refs = useRef<(TextInput | null)[]>([]);
  useEffect(() => { if (stage !== "code") return; const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000); return () => clearInterval(t); }, [stage]);
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  const code = digits.join(""); const masked = email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, d) => a + "*".repeat(Math.min(b.length, 6)) + d);
  async function send() { setBusy(true); const r = await api("/auth/forgot", { method: "POST", body: { email: email.trim() } }); setBusy(false); if (!r.success) { Alert.alert("Couldn't send", r.error); return; } setLeft(60); setStage("code"); }
  async function save() { setBusy(true); const r = await api("/auth/reset", { method: "POST", body: { email: email.trim(), code, password: pw } }); setBusy(false); if (!r.success) { Alert.alert("Couldn't reset", r.error); return; } Alert.alert("Password updated", "Log in with your new password."); nav.navigate("Login"); }
  return (
    <AuthFrame onBack={() => (stage === "email" ? nav.goBack() : setStage(stage === "code" ? "email" : "code"))}>
      <View style={{ flex: 1, padding: 20, paddingTop: 24, gap: stage === "code" ? 28 : 24 }}>
        {stage === "email" && <><View style={{ gap: 6 }}><RNText style={S(26, "700")}>Forgot password</RNText><RNText style={S(15, "400", c.text3)}>We will send a secure code to your email.</RNText></View><Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" /><View style={{ flex: 1 }} /><PrimaryButton title="Send code" onPress={send} loading={busy} disabled={!validEmail(email)} /></>}
        {stage === "code" && <><View style={{ gap: 6 }}><RNText style={S(26, "700")}>Secure code</RNText><RNText style={S(15, "400", c.text3)}>Code has been sent to {masked}</RNText></View>
          <View style={{ gap: 14 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>{digits.map((d, i) => <React.Fragment key={i}>{i === 3 && <View style={{ width: 10, height: 2, backgroundColor: c.border2 }} />}<TextInput ref={(r) => { refs.current[i] = r; }} value={d} onChangeText={(v) => { const n = [...digits]; n[i] = v.replace(/\D/g, "").slice(-1); setDigits(n); if (n[i] && i < 5) refs.current[i + 1]?.focus(); }} onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus(); }} keyboardType="number-pad" maxLength={1} autoFocus={i === 0} style={{ flex: 1, height: 56, borderRadius: 12, borderWidth: d ? 1 : 1, borderColor: d ? c.text : c.border2, backgroundColor: c.surface, textAlign: "center", fontFamily: font.semibold, fontSize: 24, color: c.text }} /></React.Fragment>)}</View><RNText onPress={left === 0 ? send : undefined} style={S(14, "600", left === 0 ? c.orange : c.text4)}>{left === 0 ? "Resend code" : `Resend code in ${left} s`}</RNText></View>
          <View style={{ flex: 1 }} /><View style={{ gap: 10 }}><PrimaryButton title="Verify" onPress={() => setStage("new")} disabled={code.length < 6} /><SecondaryButton title="Resend code" onPress={send} /></View></>}
        {stage === "new" && <><View style={{ gap: 6 }}><RNText style={S(26, "700")}>Create new password</RNText><RNText style={S(15, "400", c.text3)}>Enter your new password to re-access your account.</RNText></View>
          <View style={{ gap: 14 }}><Field label="Create password" value={pw} onChangeText={setPw} secure /><View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: -8 }}><Ionicons name={validPassword(pw) ? "checkmark-circle" : "information-circle-outline"} size={15} color={validPassword(pw) ? c.ok : c.text4} /><RNText style={S(13, "400", validPassword(pw) ? c.ok : c.text4)}>Minimum 8 characters with at least one number</RNText></View><Field label="Confirm password" value={pw2} onChangeText={setPw2} secure error={pw2 && pw2 !== pw ? "Passwords don't match" : null} /></View>
          <View style={{ flex: 1 }} /><PrimaryButton title="Save new password" onPress={save} loading={busy} disabled={!validPassword(pw) || pw !== pw2} /></>}
      </View>
    </AuthFrame>
  );
}
