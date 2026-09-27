// Shown whenever an API call fails because there is no network. Hides again when a call succeeds.
import React, { useEffect, useState } from "react";
import { Text as RNText, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { net } from "../api/client";
import { font } from "../theme/tokens";

export default function OfflineBanner() {
  const [off, setOff] = useState(false);
  const insets = useSafeAreaInsets();
  useEffect(() => net.subscribe(setOff), []);
  if (!off) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 12, right: 12, top: insets.top + 8, zIndex: 999, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "#181D27", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
      <Ionicons name="cloud-offline-outline" size={20} color="#F7A26B" />
      <View style={{ flex: 1 }}>
        <RNText style={{ fontFamily: font.semibold, fontSize: 14, color: "#fff" }}>No internet connection</RNText>
        <RNText style={{ fontFamily: font.regular, fontSize: 12.5, color: "#D5D7DA" }}>Check your network and try again.</RNText>
      </View>
    </View>
  );
}
