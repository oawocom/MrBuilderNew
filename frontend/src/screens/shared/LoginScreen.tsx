import React, { useState } from "react";
import { Alert, Text as RNText, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Banner, Screen } from "../../components";
import { Field, LogoLockup, PrimaryButton, SecondaryButton, TextLink, Title, validEmail } from "../../components/form";
import { useSession } from "../../auth/session";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { api } from "../../api/client";
import { RootParams } from "../../navigation";

export default function LoginScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { login } = useSession();
  const { c } = useTheme();
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const ready = validEmail(email) && pw.length > 0;
  async function go() { setBusy(true); setErr(await login(email.trim(), pw)); setBusy(false); }
  async function social(p: "google" | "apple") {
    const r = await api(`/auth/oauth`, { method: "POST", body: { provider: p, id_token: "" } });
    Alert.alert(p === "google" ? "Google sign-in" : "Apple sign-in", r.error ?? "Not available yet");
  }
  return (
    <Screen scroll style={{ padding: 20, paddingTop: 24, paddingBottom: 28, gap: 24, flexGrow: 1 }}>
      <View style={{ paddingTop: 24 }}><LogoLockup /></View>
      <Title sub="Log in to manage your pergola, requests and care plans.">Welcome back</Title>
      {err && <Banner tone="err" title={err} />}
      <View style={{ gap: 14 }}>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" returnKeyType="next" />
        <Field label="Password" value={pw} onChangeText={setPw} secure placeholder="Your password" returnKeyType="go" onSubmitEditing={ready ? go : undefined} />
        <View style={{ alignItems: "flex-end" }}><TextLink title="Forgot password?" onPress={() => nav.navigate("Forgot")} /></View>
      </View>
      <View style={{ gap: 12 }}>
        <PrimaryButton title="Log in" onPress={go} disabled={!ready} loading={busy} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ flex: 1, height: 1, backgroundColor: c.border }} /><RNText style={{ fontSize: 12.5, color: c.text5, fontFamily: font.regular }}>or</RNText><View style={{ flex: 1, height: 1, backgroundColor: c.border }} /></View>
        <SecondaryButton title="Continue with Google" icon={<Ionicons name="logo-google" size={18} color={c.text} />} onPress={() => social("google")} />
        <SecondaryButton title="Continue with Apple" icon={<Ionicons name="logo-apple" size={18} color={c.text} />} onPress={() => social("apple")} />
      </View>
      <View style={{ marginTop: "auto", alignItems: "center" }}><RNText style={{ fontSize: 14, color: c.text3, fontFamily: font.regular }}>Don't have an account? <RNText onPress={() => nav.navigate("Register")} style={{ fontFamily: font.semibold, color: c.text }}>Sign up</RNText></RNText></View>
    </Screen>
  );
}
