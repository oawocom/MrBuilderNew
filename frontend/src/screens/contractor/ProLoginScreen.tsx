import React, { useState } from "react";
import { Image, Pressable, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Field, PrimaryButton, validEmail } from "../../components/form";
import { useSession } from "../../auth/session";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

export function AuthFrame({ children, onBack }: { children: React.ReactNode; onBack?: () => void }) {
  const { c } = useTheme();
  return <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}><View style={{ height: 52, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 6 }}>{onBack ? <Pressable onPress={onBack} style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" }}><Ionicons name="chevron-back" size={24} color={c.text} /></Pressable> : <Image source={require("../../../assets/mrb-logo.png")} style={{ width: 48, height: 44 }} resizeMode="contain" />}</View>{children}</SafeAreaView>;
}

export default function ProLoginScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { login } = useSession();
  const { c } = useTheme();
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [tries, setTries] = useState(3);
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  async function go() { setBusy(true); const e = await login(email.trim(), pw); setBusy(false); if (e) { setErr(e); setTries((t) => Math.max(0, t - 1)); } }
  return (
    <AuthFrame>
      <View style={{ flex: 1, padding: 20, paddingTop: 24, gap: 24 }}>
        <View style={{ gap: 6 }}><RNText style={S(26, "700")}>Welcome back</RNText><RNText style={S(15, "400", c.text3)}>Log in to continue managing your jobs and tracking your earnings.</RNText></View>
        <View style={{ gap: 14 }}>
          <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="Enter your email" />
          <Field label="Password" value={pw} onChangeText={setPw} secure placeholder="Enter your password" onSubmitEditing={go} returnKeyType="go" />
          {err && <View style={{ flexDirection: "row", gap: 8, padding: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.errBg }}><Ionicons name="alert-circle-outline" size={18} color={c.err} /><RNText style={{ flex: 1, ...S(13, "400", c.err) }}><RNText style={S(13, "700", c.err)}>{/password|invalid/i.test(err) ? "Incorrect email or password." : err}</RNText>{/password|invalid/i.test(err) ? ` Check your details and try again, or reset your password.${tries > 0 ? ` ${tries} attempt${tries === 1 ? "" : "s"} left before a 15-minute lockout.` : ""}` : ""}</RNText></View>}
          <Pressable onPress={() => nav.navigate("Forgot")} style={{ alignSelf: "flex-start", paddingVertical: 4 }}><RNText style={S(14, "600", c.orange)}>Forgot password?</RNText></Pressable>
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ gap: 14, alignItems: "center" }}><PrimaryButton title="Log in" onPress={go} loading={busy} disabled={!validEmail(email) || !pw} style={{ alignSelf: "stretch" }} /><RNText style={S(14, "400", c.text3)}>New to MrBuilder? <RNText onPress={() => nav.navigate("Register")} style={S(14, "600", c.orange)}>Join us</RNText></RNText></View>
      </View>
    </AuthFrame>
  );
}
