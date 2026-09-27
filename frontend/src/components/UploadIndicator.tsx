// Small floating "Uploading photo…" pill shown while any uploadFile() is in flight.
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text as RNText, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { uploads } from "../api/client";
import { font } from "../theme/tokens";

export default function UploadIndicator() {
  const [n, setN] = useState(0);
  const insets = useSafeAreaInsets();
  useEffect(() => uploads.subscribe(setN), []);
  if (n === 0) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", alignSelf: "center", bottom: insets.bottom + 96, zIndex: 999, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: "#181D27", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
      <ActivityIndicator color="#F7A26B" />
      <RNText style={{ fontFamily: font.semibold, fontSize: 14, color: "#fff" }}>{n > 1 ? `Uploading ${n} photos…` : "Uploading photo…"}</RNText>
    </View>
  );
}
