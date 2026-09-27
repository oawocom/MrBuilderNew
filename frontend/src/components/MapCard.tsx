import React from "react";
import { Linking, Platform, Pressable, Text as RNText, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/tokens";

/** Small static map with a pin; tapping opens the native maps app. Falls back to an address-only card when there are no coordinates. */
export function MapCard({ lat, lng, address, height = 150 }: { lat?: number | null; lng?: number | null; address: string; height?: number }) {
  const { c } = useTheme();
  const has = typeof lat === "number" && typeof lng === "number";
  const open = () => {
    const q = encodeURIComponent(address);
    const url = has ? (Platform.OS === "ios" ? `maps:?daddr=${lat},${lng}&q=${q}` : `geo:${lat},${lng}?q=${lat},${lng}(${q})`) : (Platform.OS === "ios" ? `maps:?q=${q}` : `geo:0,0?q=${q}`);
    Linking.openURL(url).catch(() => Linking.openURL(`https://maps.google.com/?q=${has ? `${lat},${lng}` : q}`));
  };
  if (!has) return (
    <Pressable onPress={open} style={{ height, borderRadius: 12, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center", gap: 4 }}>
      <Ionicons name="map-outline" size={28} color={c.text4} />
      <RNText style={{ fontFamily: font.regular, fontSize: 12.5, color: c.text4 }}>Tap to open in Maps</RNText>
    </Pressable>
  );
  return (
    <Pressable onPress={open} style={{ height, borderRadius: 12, overflow: "hidden" }}>
      <MapView style={{ flex: 1 }} pointerEvents="none" initialRegion={{ latitude: lat as number, longitude: lng as number, latitudeDelta: 0.01, longitudeDelta: 0.01 }} scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false} toolbarEnabled={false} liteMode>
        <Marker coordinate={{ latitude: lat as number, longitude: lng as number }} title={address} />
      </MapView>
      <View style={{ position: "absolute", right: 8, bottom: 8, height: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "rgba(0,0,0,.55)", flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="navigate-outline" size={13} color="#fff" /><RNText style={{ fontFamily: font.semibold, fontSize: 12, color: "#fff" }}>Open in Maps</RNText></View>
    </Pressable>
  );
}
