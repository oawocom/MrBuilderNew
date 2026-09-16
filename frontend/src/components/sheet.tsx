import React from "react";
import { Modal, Pressable, ScrollView, Text as RNText, View, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/tokens";

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,.45)" }} />
      <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 34, gap: 16, maxHeight: "85%" }}>
        <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: c.border2 }} />
        {title && <RNText style={{ fontFamily: font.bold, fontSize: 19, letterSpacing: -0.3, color: c.text }}>{title}</RNText>}
        {children}
      </View>
    </Modal>
  );
}

export function PickerSheet({ open, onClose, title, options, value, onSelect, searchable }: { open: boolean; onClose: () => void; title: string; options: string[]; value: string; onSelect: (v: string) => void; searchable?: boolean }) {
  const { c } = useTheme();
  const [q, setQ] = React.useState("");
  const list = options.filter((o) => o.toLowerCase().includes(q.toLowerCase()));
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {searchable && <TextInput value={q} onChangeText={setQ} placeholder="Search…" placeholderTextColor={c.text4} style={{ height: 44, borderRadius: 10, borderWidth: 1, borderColor: c.border2, paddingHorizontal: 12, fontFamily: font.regular, fontSize: 14, color: c.text }} />}
      <ScrollView style={{ maxHeight: 420 }}>{list.map((o) => (
        <Pressable key={o} onPress={() => { onSelect(o); onClose(); }} style={{ height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, borderRadius: 12, backgroundColor: value === o ? c.primarySoft : "transparent", borderWidth: 1, borderColor: value === o ? c.primary : "transparent" }}>
          <RNText style={{ fontFamily: font.medium, fontSize: 15, color: c.text }}>{o}</RNText>
          <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: value === o ? c.primary : c.border2, alignItems: "center", justifyContent: "center" }}>{value === o && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} />}</View>
        </Pressable>))}</ScrollView>
    </Sheet>
  );
}

export function SelectField({ label, value, placeholder, onPress, hint }: { label?: string; value: string; placeholder: string; onPress: () => void; hint?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label && <RNText style={{ fontFamily: font.semibold, fontSize: 13, color: c.text2 }}>{label}</RNText>}
      <Pressable onPress={onPress} style={{ height: 52, borderRadius: 12, borderWidth: 1, borderColor: c.border2, backgroundColor: c.surface, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <RNText style={{ fontFamily: font.regular, fontSize: 15, color: value ? c.text : c.text4 }}>{value || placeholder}</RNText><Ionicons name="chevron-down" size={18} color={c.text4} />
      </Pressable>
      {hint && <RNText style={{ fontSize: 12, fontFamily: font.regular, color: c.text4 }}>{hint}</RNText>}
    </View>
  );
}

export function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  const { c } = useTheme();
  return <View style={{ gap: 12 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><RNText style={{ fontFamily: font.bold, fontSize: 16, color: c.text }}>{title}</RNText>{right}</View>{children}</View>;
}

export function Note({ tone = "orange", children }: { tone?: "orange" | "warn" | "info"; children: React.ReactNode }) {
  const { c } = useTheme();
  const [bg, fg] = tone === "warn" ? [c.warnBg, c.warn] : tone === "info" ? [c.infoBg, c.info] : [c.primarySoft, c.orange];
  return <View style={{ flexDirection: "row", gap: 10, padding: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: bg }}><Ionicons name="information-circle-outline" size={18} color={fg} /><RNText style={{ flex: 1, fontSize: 12.5, lineHeight: 18, fontFamily: font.regular, color: fg }}>{children}</RNText></View>;
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return <Pressable onPress={() => onChange(!on)} style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: on ? c.primary : c.border2, padding: 3 }}><View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", marginLeft: on ? 18 : 0 }} /></Pressable>;
}

export function ChoiceRow({ title, sub, on, onPress, icon, iconTone }: { title: string; sub?: string; on: boolean; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; iconTone?: "brand" | "info" }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ minHeight: 64, borderRadius: 14, borderWidth: 1.5, borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primarySoft : c.surface, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
      {icon && <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: iconTone === "info" ? c.infoBg : c.primarySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name={icon} size={20} color={iconTone === "info" ? c.info : c.primary} /></View>}
      <View style={{ flex: 1, gap: 2 }}><RNText style={{ fontFamily: font.semibold, fontSize: 15, color: c.text }}>{title}</RNText>{sub && <RNText style={{ fontSize: 13, fontFamily: font.regular, color: c.text4 }}>{sub}</RNText>}</View>
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: on ? c.primary : c.border2, alignItems: "center", justifyContent: "center" }}>{on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} />}</View>
    </Pressable>
  );
}

export function Header({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  const { c } = useTheme();
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border }}>{onBack && <Pressable onPress={onBack} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}><Ionicons name="chevron-back" size={24} color={c.text} /></Pressable>}<RNText style={{ flex: 1, fontFamily: font.bold, fontSize: 17, color: c.text }}>{title}</RNText>{right}</View>;
}
