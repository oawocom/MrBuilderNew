// "New Request" chooser (client: What do you need? + From MrCare promos)
import React from "react";
import { Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

export default function NewRequestScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { c } = useTheme();
  const S = (n: number, w: "400" | "600" | "700" | "800" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  const Promo = ({ accent, label, title, text, cta, onPress }: { accent: string; label: string; title: string; text: string; cta: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={{ width: 300, borderRadius: 20, backgroundColor: c.hero, padding: 16, gap: 10, overflow: "hidden", minHeight: 210 }}>
      <View style={{ position: "absolute", right: -90, top: -90, width: 240, height: 240, borderRadius: 120, backgroundColor: accent, opacity: 0.9 }} />
      <View style={{ position: "absolute", right: 30, bottom: -60, width: 140, height: 140, borderRadius: 70, backgroundColor: accent, opacity: 0.6 }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,.12)", alignItems: "center", justifyContent: "center" }}><Ionicons name="shield-checkmark-outline" size={18} color="#fff" /></View><RNText style={S(11.5, "700", accent === "#079455" ? "#4ADE80" : "#F7A26B")}>{label}</RNText></View>
      <View style={{ gap: 4, maxWidth: 220 }}><RNText style={S(20, "800", "#fff")}>{title}</RNText><RNText style={S(13.5, "400", "#D5D7DA")}>{text}</RNText></View>
      <View style={{ marginTop: "auto", alignSelf: "flex-start", height: 44, paddingHorizontal: 18, borderRadius: 12, backgroundColor: "#fff", justifyContent: "center" }}><RNText style={S(14, "600", "#181D27")}>{cta}</RNText></View>
    </Pressable>
  );
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border }}><Pressable onPress={() => nav.goBack()} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}><Ionicons name="chevron-back" size={24} color={c.text} /></Pressable><RNText style={S(17, "700")}>New request</RNText></View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20, gap: 16 }}>
        <View><RNText style={S(24, "800")}>What do you need?</RNText><RNText style={{ ...S(14, "400", c.text3), marginTop: 4 }}>Choose one to start a request. You can add details on the next screen.</RNText></View>
        {[{ t: "Install a pergola", s: "Get an instant quote for a new installation.", icon: "construct-outline" as const, bg: c.primarySoft, fg: c.primary, go: () => nav.navigate("InstallForm", {}) }, { t: "Repair or maintain", s: "Tell us what you need and schedule an inspector visit.", icon: "build-outline" as const, bg: c.infoBg, fg: c.info, go: () => nav.navigate("RepairForm") }].map((a) => (
          <Pressable key={a.t} onPress={a.go} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: pressed ? c.orangeBd : c.border, borderRadius: 16, padding: 16 })}>
            <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: a.bg, alignItems: "center", justifyContent: "center" }}><Ionicons name={a.icon} size={26} color={a.fg} /></View>
            <View style={{ flex: 1, gap: 3 }}><RNText style={S(17, "700")}>{a.t}</RNText><RNText style={S(13.5, "400", c.text4)}>{a.s}</RNText></View>
            <Ionicons name="chevron-forward" size={20} color={c.text4} />
          </Pressable>
        ))}
        <View style={{ gap: 10, marginTop: 4 }}>
          <RNText style={S(12, "700", c.text4)}>FROM MRCARE</RNText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            <Promo accent="#EF6820" label="Service & Maintenance" title="Keep your pergola in great shape" text="Explore Essential, Plus, and Premium maintenance plans." cta="Explore Maintenance" onPress={() => nav.navigate("Tabs", { screen: "MrCare" } as never)} />
            <Promo accent="#079455" label="Electronics Protection" title="Protect your pergola's electronics" text="Explore coverage for eligible motors, controls, and lighting." cta="Explore Protection" onPress={() => nav.navigate("Tabs", { screen: "MrCare" } as never)} />
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
