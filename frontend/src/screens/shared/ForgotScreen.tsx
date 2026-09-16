import React, { useState } from "react";
import { Alert, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../../components";
import { Field, IconTile, PrimaryButton, SecondaryButton, Title, validEmail, validPassword } from "../../components/form";
import { api } from "../../api/client";
import { RootParams } from "../../navigation";

export default function ForgotScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const [stage, setStage] = useState<"email" | "new">("email");
  const [email, setEmail] = useState(""); const [code, setCode] = useState(""); const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true); const r = await api("/auth/forgot", { method: "POST", body: { email: email.trim() } }); setBusy(false);
    if (!r.success) { Alert.alert("Couldn't send", r.error); return; }
    setStage("new");
  }
  async function save() {
    setBusy(true); const r = await api("/auth/reset", { method: "POST", body: { email: email.trim(), code, password: pw } }); setBusy(false);
    if (!r.success) { Alert.alert("Couldn't reset", r.error); return; }
    Alert.alert("Password updated", "Please log in with your new password."); nav.navigate("Login");
  }
  if (stage === "new") return (
    <Screen scroll style={{ padding: 20, paddingTop: 32, paddingBottom: 28, gap: 24, flexGrow: 1 }}>
      <Title sub="Use at least 8 characters with one number.">Create a new password</Title>
      <View style={{ gap: 14 }}>
        <Field label="Confirmation code" value={code} onChangeText={setCode} keyboardType="numeric" placeholder="6-digit code from your email" />
        <Field label="New password" value={pw} onChangeText={setPw} secure ok={validPassword(pw) ? "Looks good" : null} />
        <Field label="Repeat new password" value={pw2} onChangeText={setPw2} secure error={pw2 && pw2 !== pw ? "Passwords don't match" : null} />
      </View>
      <View style={{ marginTop: "auto", gap: 10 }}><PrimaryButton title="Save password" onPress={save} disabled={code.length < 6 || !validPassword(pw) || pw !== pw2} loading={busy} /><SecondaryButton title="Back to log in" onPress={() => nav.navigate("Login")} /></View>
    </Screen>
  );
  return (
    <Screen scroll style={{ padding: 20, paddingTop: 32, paddingBottom: 28, gap: 24, flexGrow: 1 }}>
      <IconTile name="lock-closed-outline" />
      <Title sub="Enter the email you signed up with. We'll send a confirmation code.">Reset your password</Title>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" />
      <View style={{ marginTop: "auto", gap: 10 }}><PrimaryButton title="Send code" onPress={send} disabled={!validEmail(email)} loading={busy} /><SecondaryButton title="Back to log in" onPress={() => nav.navigate("Login")} /></View>
    </Screen>
  );
}
