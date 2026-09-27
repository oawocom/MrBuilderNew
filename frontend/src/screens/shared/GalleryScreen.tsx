import React, { useState } from "react";
import { Dimensions, Image, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { font } from "../../theme/tokens";

export default function GalleryScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<{ key: string; name: string; params: { photos: { url: string; label?: string; at?: string; note?: string }[]; index?: number } }>();
  const photos = params?.photos ?? [];
  const [i, setI] = useState(Math.min(params?.index ?? 0, Math.max(0, photos.length - 1)));
  const { width: w, height: hWin } = Dimensions.get("window");
  const top = Math.max(insets.top, 54), bottom = Math.max(insets.bottom, 16);
  const imgH = hWin - top - 56 - bottom - 64;
  const p = photos[i];
  const close = () => { if (nav.canGoBack()) nav.goBack(); else (nav as unknown as { navigate: (s: string) => void }).navigate("Tabs"); };
  return (
    <View style={{ flex: 1, backgroundColor: "#000", paddingTop: top, paddingBottom: bottom }}>
      <View style={{ height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 }}>
        <Pressable onPress={close} hitSlop={16} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,.15)", alignItems: "center", justifyContent: "center" }}><Ionicons name="close" size={26} color="#fff" /></Pressable>
        <RNText style={{ fontFamily: font.semibold, fontSize: 14, color: "#fff" }}>{photos.length ? `${i + 1} of ${photos.length}` : ""}</RNText>
        <View style={{ width: 44 }} />
      </View>
      {photos.length === 0 ? <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><RNText style={{ fontFamily: font.regular, color: "rgba(255,255,255,.7)" }}>No photos</RNText></View> : (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ height: imgH, flexGrow: 0 }} contentOffset={{ x: i * w, y: 0 }} onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / w))}>
          {photos.map((ph, k) => <Image key={k} source={{ uri: ph.url }} style={{ width: w, height: imgH }} resizeMode="contain" />)}
        </ScrollView>
      )}
      <View style={{ padding: 16, gap: 4, minHeight: 64 }}><RNText style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff", textTransform: "capitalize" }}>{p?.label ?? ""}</RNText>{p?.note ? <RNText style={{ fontFamily: font.regular, fontSize: 14, color: "#fff" }}>{p.note}</RNText> : null}{p?.at && <RNText style={{ fontFamily: font.regular, fontSize: 12.5, color: "rgba(255,255,255,.7)" }}>{new Date(p.at).toLocaleString()}</RNText>}</View>
    </View>
  );
}
