import React, { useState } from "react";
import { Dimensions, Image, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { font } from "../../theme/tokens";

export default function GalleryScreen() {
  const nav = useNavigation();
  const { params } = useRoute<{ key: string; name: string; params: { photos: { url: string; label?: string; at?: string }[]; index?: number } }>();
  const [i, setI] = useState(params.index ?? 0);
  const w = Dimensions.get("window").width;
  const p = params.photos[i];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 }}><Pressable onPress={() => nav.goBack()} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}><Ionicons name="close" size={26} color="#fff" /></Pressable><RNText style={{ fontFamily: font.semibold, fontSize: 14, color: "#fff" }}>{i + 1} of {params.photos.length}</RNText><View style={{ width: 40 }} /></View>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: (params.index ?? 0) * w, y: 0 }} onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / w))}>{params.photos.map((ph, k) => <Image key={k} source={{ uri: ph.url }} style={{ width: w, height: "100%" }} resizeMode="contain" />)}</ScrollView>
      <View style={{ padding: 16, gap: 4 }}><RNText style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff", textTransform: "capitalize" }}>{p?.label ?? ""}</RNText>{p?.at && <RNText style={{ fontFamily: font.regular, fontSize: 12.5, color: "rgba(255,255,255,.7)" }}>{new Date(p.at).toLocaleString()}</RNText>}</View>
    </SafeAreaView>
  );
}
