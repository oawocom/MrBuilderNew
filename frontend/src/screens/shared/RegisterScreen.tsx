// Sign up (email · password · confirm) → "What's your name?" → OTP (client's 3-step flow)
import React, { useEffect, useRef, useState } from "react";
import { Text as RNText, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Banner, Screen } from "../../components";
import { Field, IconTile, LogoLockup, PrimaryButton, Title, validEmail, validPassword } from "../../components/form";
import { useSession } from "../../auth/session";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { api, APP_VARIANT } from "../../api/client";
import { RootParams } from "../../navigation";

export default function RegisterScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { register } = useSession();
  const { c } = useTheme();
  const [step, setStep] = useState<"account" | "name">("account");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [name, setName] = useState("");
  const [touched, setTouched] = useState(false); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const emailErr = touched && email && !validEmail(email) ? "Enter a valid email address" : null;
  const pwErr = touched && pw && !validPassword(pw) ? "At least 8 characters with one number" : null;
  const pw2Err = touched && pw2 && pw2 !== pw ? "Passwords don't match" : null;
  const accountOk = validEmail(email) && validPassword(pw) && pw2 === pw;

  async function finish() {
    const parts = name.trim().split(/\s+/); const first = parts[0] ?? ""; const last = parts.slice(1).join(" ") || ".";
    setBusy(true);
    const e = await register({ first_name: first, last_name: last, email: email.trim(), password: pw, role: APP_VARIANT });
    setBusy(false);
    if (e) { setErr(e); setStep("account"); return; }
    // session is set → navigator switches to Tabs; OTP screen is pushed from there if email verification is possible
    const r = await api("/me/verify/send", { method: "POST", body: { channel: "email" } });
    if (r.success) nav.navigate("Otp", { email: email.trim() });
  }

  if (step === "name") return (
    <Screen scroll={false} style={{ padding: 20, paddingTop: 32, gap: 24 }}>
      <Title center sub="This is how technicians will greet you.">What's your name?</Title>
      <TextInput value={name} onChangeText={setName} autoFocus autoCapitalize="words" placeholder="Jane Doe" placeholderTextColor={c.text4} style={{ height: 64, textAlign: "center", fontFamily: font.bold, fontSize: 32, color: c.text }} />
      <PrimaryButton title="Continue" onPress={finish} disabled={name.trim().length < 2} loading={busy} />
    </Screen>
  );

  return (
    <Screen scroll style={{ padding: 20, paddingTop: 24, paddingBottom: 28, gap: 24, flexGrow: 1 }}>
      <View style={{ paddingTop: 12 }}><LogoLockup /></View>
      <Title sub="We'll send a 6-digit code to verify your email.">Create your account</Title>
      {err && <Banner tone="err" title={err} />}
      <View style={{ gap: 14 }}>
        <Field label="Email" value={email} onChangeText={(v) => { setEmail(v); setTouched(true); }} keyboardType="email-address" placeholder="you@example.com" error={emailErr} />
        <Field label="Password" value={pw} onChangeText={(v) => { setPw(v); setTouched(true); }} secure placeholder="Create a password" error={pwErr} ok={validPassword(pw) ? "At least 8 characters, one number" : null} />
        <Field label="Confirm password" value={pw2} onChangeText={(v) => { setPw2(v); setTouched(true); }} secure placeholder="Repeat your password" error={pw2Err} />
      </View>
      <View style={{ gap: 12, marginTop: "auto" }}>
        <RNText style={{ fontSize: 12.5, lineHeight: 18, color: c.text4, fontFamily: font.regular }}>By continuing you agree to MrBuilder's <RNText style={{ color: c.text2, fontFamily: font.semibold }}>Terms of Service</RNText> and <RNText style={{ color: c.text2, fontFamily: font.semibold }}>Privacy Policy</RNText>.</RNText>
        <PrimaryButton title="Sign up" onPress={() => setStep("name")} disabled={!accountOk} />
        <RNText style={{ textAlign: "center", fontSize: 14, color: c.text3, fontFamily: font.regular }}>Already have an account? <RNText onPress={() => nav.navigate("Login")} style={{ fontFamily: font.semibold, color: c.text }}>Log in</RNText></RNText>
      </View>
    </Screen>
  );
}
