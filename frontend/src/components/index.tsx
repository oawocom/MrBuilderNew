import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text as RNText, TextInput, TextProps, View, ViewProps, KeyboardAvoidingView, Platform, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { statusLabel, statusTone, Tone, type } from "../theme/tokens";
import { APP_VARIANT } from "../api/client";

export function Text({ v = "body", color, style, ...p }: TextProps & { v?: keyof typeof type; color?: string }) {
  const { c } = useTheme();
  return <RNText {...p} style={[type[v], { color: color ?? c.text }, style]} />;
}

export function Screen({ children, scroll = true, padded = true, refreshing, onRefresh, style }: { children: React.ReactNode; scroll?: boolean; padded?: boolean; refreshing?: boolean; onRefresh?: () => void; style?: ViewProps["style"] }) {
  const { c, space } = useTheme();
  const inner = padded ? { padding: space.lg, paddingBottom: 40 } : {};
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        {scroll ? <ScrollView contentContainerStyle={[inner, style]} keyboardShouldPersistTaps="handled" refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.primary} /> : undefined}>{children}</ScrollView> : <View style={[{ flex: 1 }, inner, style]}>{children}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewProps["style"]; onPress?: () => void }) {
  const { c, radius, space } = useTheme();
  const s = [{ backgroundColor: c.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: c.border, padding: space.lg }, style];
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.85 }]}>{children}</Pressable>;
  return <View style={s}>{children}</View>;
}

export function Button({ title, onPress, kind = "primary", loading, disabled, small, style }: { title: string; onPress?: () => void; kind?: "primary" | "secondary" | "ghost" | "danger" | "dark"; loading?: boolean; disabled?: boolean; small?: boolean; style?: ViewProps["style"] }) {
  const { c, radius } = useTheme();
  const bg = { primary: c.primary, secondary: c.surface, ghost: "transparent", danger: c.errBg, dark: c.hero }[kind];
  const fg = { primary: "#fff", secondary: c.text, ghost: c.primaryText, danger: c.err, dark: c.textOnHero }[kind];
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [{ backgroundColor: bg, borderRadius: radius.lg, paddingVertical: small ? 8 : 14, paddingHorizontal: small ? 12 : 18, alignItems: "center", justifyContent: "center", flexDirection: "row", borderWidth: kind === "secondary" ? 1 : 0, borderColor: c.border2, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <RNText style={[small ? type.smallMd : type.bodyMd, { color: fg, fontFamily: type.bodyMd.fontFamily }]}>{title}</RNText>}
    </Pressable>
  );
}

export function Input({ label, value, onChangeText, placeholder, secure, keyboardType, multiline, hint, autoCapitalize }: { label?: string; value: string; onChangeText: (v: string) => void; placeholder?: string; secure?: boolean; keyboardType?: "default" | "email-address" | "phone-pad" | "numeric" | "decimal-pad"; multiline?: boolean; hint?: string; autoCapitalize?: "none" | "sentences" | "words" }) {
  const { c, radius, space } = useTheme();
  return (
    <View style={{ marginBottom: space.md }}>
      {label && <Text v="smallMd" color={c.text3} style={{ marginBottom: 6 }}>{label}</Text>}
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.text4} secureTextEntry={secure} keyboardType={keyboardType} multiline={multiline} autoCapitalize={autoCapitalize ?? (keyboardType === "email-address" ? "none" : "sentences")}
        style={[type.body, { color: c.text, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border2, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: multiline ? 12 : 12, minHeight: multiline ? 88 : 46, textAlignVertical: multiline ? "top" : "center" }]} />
      {hint && <Text v="caption" color={c.text4} style={{ marginTop: 4 }}>{hint}</Text>}
    </View>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  const { c, radius } = useTheme();
  const map: Record<Tone, [string, string, string]> = { ok: [c.okBg, c.okBd, c.ok], warn: [c.warnBg, c.warnBd, c.warn], err: [c.errBg, c.errBd, c.err], info: [c.infoBg, c.infoBd, c.info], orange: [c.orangeBg, c.orangeBd, c.orange], neutral: [c.surface2, c.border, c.text3] };
  const [bg, bd, fg] = map[tone];
  return <View style={{ backgroundColor: bg, borderColor: bd, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" }}><RNText style={[type.caption, { color: fg }]}>{children}</RNText></View>;
}

export function StatusPill({ status }: { status: string }) {
  const label = statusLabel[status]?.[APP_VARIANT] ?? status.replace(/_/g, " ");
  return <Pill tone={statusTone[status] ?? "neutral"}>{label}</Pill>;
}

export function Row({ children, between, gap = 8, style }: { children: React.ReactNode; between?: boolean; gap?: number; style?: ViewProps["style"] }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap, justifyContent: between ? "space-between" : "flex-start" }, style]}>{children}</View>;
}

export function KV({ k, v }: { k: string; v: React.ReactNode }) {
  const { c } = useTheme();
  return <Row between style={{ paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }}><Text v="small" color={c.text4}>{k}</Text><Text v="smallMd" style={{ maxWidth: "60%", textAlign: "right" }}>{v}</Text></Row>;
}

export function Empty({ title, text }: { title: string; text?: string }) {
  const { c, radius, space } = useTheme();
  return <View style={{ borderWidth: 1, borderStyle: "dashed", borderColor: c.border2, borderRadius: radius.xl, padding: space.xxl, alignItems: "center" }}><Text v="h3" style={{ textAlign: "center" }}>{title}</Text>{text && <Text v="small" color={c.text4} style={{ textAlign: "center", marginTop: 6 }}>{text}</Text>}</View>;
}

export function Banner({ tone = "info", title, text }: { tone?: Tone; title: string; text?: string }) {
  const { c, radius, space } = useTheme();
  const map: Record<Tone, [string, string, string]> = { ok: [c.okBg, c.okBd, c.ok], warn: [c.warnBg, c.warnBd, c.warn], err: [c.errBg, c.errBd, c.err], info: [c.infoBg, c.infoBd, c.info], orange: [c.orangeBg, c.orangeBd, c.orange], neutral: [c.surface2, c.border, c.text3] };
  const [bg, bd, fg] = map[tone];
  return <View style={{ backgroundColor: bg, borderColor: bd, borderWidth: 1, borderRadius: radius.lg, padding: space.md, marginBottom: space.md }}><Text v="smallMd" color={fg}>{title}</Text>{text && <Text v="small" color={fg} style={{ marginTop: 2 }}>{text}</Text>}</View>;
}

export const money = (v: number | null | undefined) => v === null || v === undefined ? "—" : `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
