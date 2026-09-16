// Form controls matching the client's spec: inputs 52px / radius 12 / 1px --b2, label 13/600 above; primary 52px orange; secondary 48px outlined.
import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text as RNText, TextInput, View, ViewProps, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/tokens";

export function Field({ label, value, onChangeText, placeholder, secure, keyboardType, error, ok, autoCapitalize, autoFocus, onSubmitEditing, returnKeyType, hint }: { label?: string; hint?: string; value: string; onChangeText: (v: string) => void; placeholder?: string; secure?: boolean; keyboardType?: "default" | "email-address" | "phone-pad" | "numeric" | "decimal-pad"; error?: string | null; ok?: string | null; autoCapitalize?: "none" | "sentences" | "words"; autoFocus?: boolean; onSubmitEditing?: () => void; returnKeyType?: "next" | "done" | "go" }) {
  const { c } = useTheme();
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label && <RNText style={{ fontFamily: font.semibold, fontSize: 13, color: c.text2 }}>{label}</RNText>}
      <View>
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.text4} secureTextEntry={secure && !show} keyboardType={keyboardType} autoFocus={autoFocus} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          autoCapitalize={autoCapitalize ?? (keyboardType === "email-address" || secure ? "none" : "sentences")} onSubmitEditing={onSubmitEditing} returnKeyType={returnKeyType}
          style={{ height: 52, borderRadius: 12, borderWidth: 1, borderColor: error ? c.err : focus ? c.primary : c.border2, backgroundColor: c.surface, paddingHorizontal: 14, paddingRight: secure ? 44 : 14, fontSize: 15, fontFamily: font.regular, color: c.text }} />
        {secure && <Pressable onPress={() => setShow(!show)} style={{ position: "absolute", right: 6, top: 6, width: 40, height: 40, alignItems: "center", justifyContent: "center" }}><Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color={c.text4} /></Pressable>}
      </View>
      {error ? <RNText style={{ fontSize: 12.5, fontFamily: font.regular, color: c.err }}>⚠ {error}</RNText> : ok ? <RNText style={{ fontSize: 12.5, fontFamily: font.regular, color: c.ok }}>✓ {ok}</RNText> : hint ? <RNText style={{ fontSize: 12, fontFamily: font.regular, color: c.text4 }}>{hint}</RNText> : null}
    </View>
  );
}

export function PrimaryButton({ title, onPress, disabled, loading, icon, style }: { title: string; onPress?: () => void; disabled?: boolean; loading?: boolean; icon?: keyof typeof Ionicons.glyphMap; style?: ViewProps["style"] }) {
  const { c } = useTheme();
  const off = disabled || loading;
  return (
    <Pressable onPress={onPress} disabled={off} style={({ pressed }) => [{ height: 52, borderRadius: 12, backgroundColor: off && !loading ? c.surface3 : pressed ? c.primaryPressed : c.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, style]}>
      {loading ? <ActivityIndicator color="#fff" /> : <>{icon && <Ionicons name={icon} size={18} color={off ? c.text4 : "#fff"} />}<RNText style={{ fontFamily: font.semibold, fontSize: 16, color: off ? c.text4 : "#fff" }}>{title}</RNText></>}
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress, icon, style, tone = "default", height = 48 }: { title: string; onPress?: () => void; icon?: React.ReactNode; style?: ViewProps["style"]; tone?: "default" | "danger" | "brand"; height?: number }) {
  const { c } = useTheme();
  const fg = tone === "danger" ? c.err : tone === "brand" ? c.orange : c.text;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ height, borderRadius: 12, borderWidth: 1, borderColor: c.border2, backgroundColor: pressed ? c.surface2 : c.surface, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 }, style]}>
      {icon}<RNText style={{ fontFamily: font.semibold, fontSize: 15, color: fg }}>{title}</RNText>
    </Pressable>
  );
}

export function TextLink({ title, onPress, style }: { title: string; onPress?: () => void; style?: ViewProps["style"] }) {
  const { c } = useTheme();
  return <Pressable onPress={onPress} style={style}><RNText style={{ fontFamily: font.semibold, fontSize: 14, color: c.primary }}>{title}</RNText></Pressable>;
}

export function LogoLockup({ size = "sm" }: { size?: "sm" | "lg" }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      <Image source={require("../../assets/mrb-logo.png")} style={size === "lg" ? { width: 64, height: 52 } : { width: 56, height: 46 }} resizeMode="contain" />
      <RNText style={{ fontFamily: font.bold, fontSize: 15, color: c.primary, letterSpacing: -0.15 }}>MrBuilder</RNText>
    </View>
  );
}

export function IconTile({ name, tone = "brand", size = 56 }: { name: keyof typeof Ionicons.glyphMap; tone?: "brand" | "info" | "ok"; size?: number }) {
  const { c } = useTheme();
  const [bg, fg] = tone === "info" ? [c.infoBg, c.info] : tone === "ok" ? [c.okBg, c.ok] : [c.primarySoft, c.primary];
  return <View style={{ width: size, height: size, borderRadius: size * 0.29, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}><Ionicons name={name} size={size * 0.46} color={fg} /></View>;
}

export function Title({ children, sub, center }: { children: string; sub?: string; center?: boolean }) {
  const { c } = useTheme();
  return <View style={center ? { alignItems: "center" } : undefined}><RNText style={{ fontFamily: font.bold, fontSize: 24, letterSpacing: -0.5, color: c.text, textAlign: center ? "center" : "left" }}>{children}</RNText>{sub && <RNText style={{ marginTop: 4, fontSize: 14, lineHeight: 20, fontFamily: font.regular, color: c.text3, textAlign: center ? "center" : "left" }}>{sub}</RNText>}</View>;
}

export const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
export const validPassword = (v: string) => v.length >= 8 && /\d/.test(v);
