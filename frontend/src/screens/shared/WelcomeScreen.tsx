// Splash — orange field, logo tile, wordmark, CTA (client: "Splash" / "– 2 (orange ellipse)")
import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { brand, font } from "../../theme/tokens";
import { APP_VARIANT } from "../../api/client";
import { RootParams } from "../../navigation";

export default function WelcomeScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const pro = APP_VARIANT === "contractor";
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: brand[500] }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 20 }}>
        <View style={{ position: "absolute", width: 420, height: 420, borderRadius: 210, backgroundColor: brand[400], opacity: 0.35, top: -40, right: -160 }} />
        <View style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><Image source={require("../../../assets/mrb-logo.png")} style={{ width: 64, height: 52 }} resizeMode="contain" /></View>
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 26, letterSpacing: -0.8, color: "#fff" }}>MrBuilder{pro ? " PRO" : ""}</Text>
          <Text style={{ fontFamily: font.medium, fontSize: 13, color: "rgba(255,255,255,.85)" }}>{pro ? "Pergola jobs, priced and scheduled" : "Pergola installation, care & repair"}</Text>
        </View>
        <Pressable onPress={() => nav.navigate("Register")} style={{ marginTop: 20, height: 52, minWidth: 220, paddingHorizontal: 24, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: font.semibold, fontSize: 16, color: brand[700] }}>Get started</Text></Pressable>
        <Pressable onPress={() => nav.navigate("Login")} style={{ height: 44, alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>I already have an account</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}
