// PRO splash + 3-slide onboarding (client: Splash · Onboarding 1/2/3)
import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Image, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../../components/form";
import { useTheme } from "../../theme/ThemeProvider";
import { font, brand } from "../../theme/tokens";
import { RootParams } from "../../navigation";

const W = Dimensions.get("window").width;

export default function OnboardingScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { c } = useTheme();
  const [splash, setSplash] = useState(true); const [i, setI] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => { const t = setTimeout(() => Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setSplash(false)), 1400); return () => clearTimeout(t); }, [fade]);
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  const slides = [
    { title: "Jobs come to you", sub: "Priced, scheduled pergola work near you. Accept what fits — no quoting, no chasing.", art: (
      <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14, gap: 10, width: 280 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(15, "600")}>Pergola Installation</RNText><View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: c.primarySoft }}><RNText style={S(11, "600", c.orange)}>New</RNText></View></View><View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="location-outline" size={14} color={c.text3} /><RNText style={S(12.5, "400", c.text3)}>Palo Alto, CA · 6.2 mi</RNText></View><View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: c.bg, borderRadius: 10, padding: 8, paddingHorizontal: 12 }}><View><RNText style={S(10.5, "400", c.text4)}>Preferred dates</RNText><RNText style={S(12.5, "600")}>May 12 – 22</RNText></View><View style={{ alignItems: "flex-end" }}><RNText style={S(10.5, "400", c.text4)}>Payment</RNText><RNText style={S(16, "700", c.primary)}>$4,500</RNText></View></View><View style={{ flexDirection: "row", gap: 8 }}><View style={{ flex: 1, height: 36, borderRadius: 9, borderWidth: 1, borderColor: c.border2, alignItems: "center", justifyContent: "center" }}><RNText style={S(12.5, "600", c.text2)}>Decline</RNText></View><View style={{ flex: 1, height: 36, borderRadius: 9, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}><RNText style={S(12.5, "600", "#fff")}>Accept job</RNText></View></View></View>) },
    { title: "Get paid when the client confirms", sub: "Earnings land in your balance the moment work is confirmed. Withdraw when you want.", art: (
      <View style={{ width: 280, gap: 12 }}><View style={{ backgroundColor: c.hero, borderRadius: 16, padding: 16, paddingHorizontal: 18 }}><RNText style={S(11, "600", "#B7BAC1")}>Available balance</RNText><RNText style={S(30, "700", "#fff")}>$1,245.50</RNText></View>{[["Payment received", "You received $120 for \"Pergola Installation\".", "checkmark-circle-outline", c.okBg, c.ok], ["New job available", "New installation job posted nearby. Tap to view.", "briefcase-outline", c.primarySoft, c.primary]].map(([t, s, ic, bg, fg]) => <View key={t} style={{ flexDirection: "row", gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12, paddingHorizontal: 14 }}><View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}><Ionicons name={ic as keyof typeof Ionicons.glyphMap} size={18} color={fg} /></View><View style={{ flex: 1 }}><RNText style={S(14, "600")}>{t}</RNText><RNText style={S(12.5, "400", c.text3)}>{s}</RNText></View></View>)}</View>) },
    { title: "Parts delivered to the job", sub: "Order from Mr Supply straight to the site — paid by you or added to the client's invoice.", art: (
      <View style={{ width: 280, flexDirection: "row", gap: 10 }}>{[["Louver drive motor", "$189"], ["Rain sensor kit", "$64"]].map(([n, p]) => <View key={n} style={{ flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 10, gap: 8 }}><View style={{ height: 90, borderRadius: 10, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><Ionicons name="cube-outline" size={26} color={c.text4} /></View><RNText style={S(13, "600")}>{n}</RNText><RNText style={S(14, "700", c.primary)}>{p}</RNText><View style={{ height: 32, borderRadius: 8, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}><RNText style={S(12, "600", "#fff")}>Add to cart</RNText></View></View>)}</View>) },
  ];
  if (splash) return (
    <Animated.View style={{ flex: 1, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", opacity: fade }}>
      {[560, 440, 320, 200].map((d, k) => <View key={d} style={{ position: "absolute", width: d, height: d, borderRadius: d / 2, backgroundColor: brand[500], opacity: 0.04 + k * 0.04 }} />)}
      <Image source={require("../../../assets/mrb-logo.png")} style={{ width: 130, height: 112 }} resizeMode="contain" />
      <RNText style={{ ...S(18, "700", c.primary), marginTop: 8 }}>MrBuilder PRO</RNText>
    </Animated.View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 6 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Image source={require("../../../assets/mrb-logo.png")} style={{ width: 44, height: 40 }} resizeMode="contain" /><RNText style={S(15, "700", c.primary)}>MrBuilder PRO</RNText></View><Pressable onPress={() => nav.navigate("Login")} style={{ height: 40, paddingHorizontal: 8, justifyContent: "center" }}><RNText style={S(15, "600", c.text3)}>Log in</RNText></Pressable></View>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / W))} style={{ flex: 1 }}>
        {slides.map((s, k) => <View key={k} style={{ width: W, padding: 24, paddingTop: 16, gap: 24 }}><View style={{ height: 380, alignItems: "center", justifyContent: "center", overflow: "hidden" }}><View style={{ position: "absolute", width: 420, height: 420, borderRadius: 210, backgroundColor: c.primarySoft }} />{s.art}</View><View style={{ gap: 8 }}><RNText style={S(26, "700")}>{s.title}</RNText><RNText style={{ ...S(15, "400", c.text3), lineHeight: 22 }}>{s.sub}</RNText></View></View>)}
      </ScrollView>
      <View style={{ padding: 24, paddingTop: 0, gap: 16 }}><View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>{slides.map((_, k) => <View key={k} style={{ width: k === i ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? c.primary : c.border2 }} />)}</View><PrimaryButton title="Join MrBuilder" onPress={() => nav.navigate("Register")} /><RNText style={{ textAlign: "center", ...S(13, "400", c.text4) }}>Already a PRO? <RNText onPress={() => nav.navigate("Login")} style={S(13, "600", c.orange)}>Log in</RNText></RNText></View>
    </SafeAreaView>
  );
}
