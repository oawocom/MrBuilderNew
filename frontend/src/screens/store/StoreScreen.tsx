// Mr Supply — home (search · featured · categories · products · bundle) + "Others" menu, cart badge
import React, { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";
import { Category, Product, loadCart, money } from "./store";

export function ProductCard({ p, onPress, onFav, onAdd }: { p: Product; onPress: () => void; onFav: () => void; onAdd: () => void }) {
  const { c } = useTheme();
  const S = (n: number, w: "400" | "500" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });
  return (
    <View style={{ width: "48%", backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 10, gap: 8 }}>
      <Pressable onPress={onPress} style={{ height: 120, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>{p.image_url ? <Image source={{ uri: p.image_url }} style={{ width: "100%", height: "100%" }} resizeMode="contain" /> : <Ionicons name="cube-outline" size={30} color={c.text4} />}</Pressable>
      <Pressable onPress={onFav} style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: c.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.border }}><Ionicons name={p.is_favorite ? "heart" : "heart-outline"} size={16} color={p.is_favorite ? c.primary : c.text3} /></Pressable>
      <View style={{ gap: 2 }}><RNText style={S(13.5, "500")} numberOfLines={2}>{p.name}</RNText><View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}><RNText style={S(16, "700")}>{money(p.price)}</RNText>{!!p.compare_at_price && <RNText style={{ ...S(12, "400", c.text5), textDecorationLine: "line-through" }}>{money(p.compare_at_price)}</RNText>}</View></View>
      <Pressable onPress={onAdd} disabled={!p.in_stock} style={{ height: 36, borderRadius: 10, borderWidth: 1, borderColor: c.border2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, opacity: p.in_stock ? 1 : 0.5 }}><Ionicons name="cart-outline" size={15} color={c.orange} /><RNText style={S(13, "600", c.orange)}>{p.in_stock ? "Add" : "Out of stock"}</RNText></Pressable>
    </View>
  );
}

export default function StoreScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { params } = useRoute<{ key: string; name: string; params?: { jobId?: string } }>();
  const { c } = useTheme();
  const jobId = params?.jobId;
  const [cats, setCats] = useState<Category[]>([]); const [featured, setFeatured] = useState<Product[]>([]); const [cartCount, setCartCount] = useState(0); const [menu, setMenu] = useState(false);
  const load = useCallback(async () => { const [k, p, ct] = await Promise.all([api<Category[]>("/store/categories"), api<Product[]>("/store/products?top=1&limit=6"), loadCart(jobId)]); setCats(k.data ?? []); setFeatured((p.data ?? []).slice(0, 6)); setCartCount((ct.data?.items ?? []).reduce((a, i) => a + i.qty, 0)); }, [jobId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "500" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });
  const add = async (p: Product) => { await api("/store/cart/items", { method: "POST", body: { product_id: p.id, qty: 1, job_id: jobId } }); load(); };
  const fav = async (p: Product) => { await api(`/store/favorites/${p.id}`, { method: p.is_favorite ? "DELETE" : "PUT" }); load(); };
  const catIcon = (slug: string): keyof typeof Ionicons.glyphMap => /motor|drive/.test(slug) ? "cog-outline" : /light|led/.test(slug) ? "bulb-outline" : /sensor|control|remote/.test(slug) ? "radio-outline" : /screen|shade/.test(slug) ? "layers-outline" : /tool/.test(slug) ? "hammer-outline" : /hardware|bracket|fastener/.test(slug) ? "construct-outline" : /louver|panel/.test(slug) ? "grid-outline" : "cube-outline";
  const menuItems: [string, keyof typeof Ionicons.glyphMap, () => void][] = [["My orders", "receipt-outline", () => nav.navigate("StoreOrders")], ["Favorites", "heart-outline", () => nav.navigate("StoreProducts", { favorites: true })], ["Saved addresses", "location-outline", () => nav.navigate("StoreAddresses")], ["Payment methods", "card-outline", () => nav.navigate("PayoutMethod")]];
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border }}><Pressable onPress={() => nav.goBack()} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}><Ionicons name="chevron-back" size={24} color={c.text} /></Pressable><RNText style={{ flex: 1, ...S(17, "700") }}>Mr Supply</RNText><Pressable onPress={() => nav.navigate("StoreCart", { jobId })} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}><Ionicons name="cart-outline" size={22} color={c.text} />{cartCount > 0 && <View style={{ position: "absolute", top: 4, right: 2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}><RNText style={S(11, "700", "#fff")}>{cartCount}</RNText></View>}</Pressable><Pressable onPress={() => setMenu(!menu)} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}><Ionicons name={menu ? "close" : "ellipsis-horizontal"} size={22} color={c.text} /></Pressable></View>
      {menu ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}><View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16 }}>{menuItems.map(([n, ic, fn], i) => <Pressable key={n} onPress={() => { setMenu(false); fn(); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}><View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name={ic} size={18} color={c.primary} /></View><RNText style={{ flex: 1, ...S(15, "500") }}>{n}</RNText><Ionicons name="chevron-forward" size={18} color={c.text5} /></Pressable>)}</View><Pressable onPress={() => nav.navigate("Tabs", { screen: "Home" })} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14, paddingHorizontal: 16 }}><Image source={require("../../../assets/mrb-logo.png")} style={{ width: 34, height: 30 }} resizeMode="contain" /><RNText style={{ flex: 1, ...S(15, "500") }}>Back to MrBuilder jobs</RNText><Ionicons name="chevron-forward" size={18} color={c.text5} /></Pressable></ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 18 }}>
          <Pressable onPress={() => nav.navigate("StoreSearch", { jobId })} style={{ height: 48, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 }}><Ionicons name="search-outline" size={18} color={c.text5} /><RNText style={S(15, "400", c.text5)}>Search for tools, materials…</RNText></Pressable>
          {jobId && <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.primarySoft }}><RNText style={S(13, "400", c.orange)}>Ordering parts for <RNText style={S(13, "700", c.orange)}>your job</RNText> · shipped to the job address</RNText></View>}
          <View style={{ backgroundColor: c.hero, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ flex: 1, gap: 4 }}><RNText style={S(11, "600", "#F9DBAF")}>Featured</RNText><RNText style={S(18, "700", "#fff")}>Builder starter kit</RNText><RNText style={S(13, "400", "#B7BAC1")}>Everything you need to start your next project</RNText><Pressable onPress={() => nav.navigate("StoreProducts", {})} style={{ alignSelf: "flex-start", marginTop: 6, height: 36, paddingHorizontal: 14, borderRadius: 10, backgroundColor: c.primary, justifyContent: "center" }}><RNText style={S(13, "600", "#fff")}>Shop now</RNText></Pressable></View><View style={{ width: 96, height: 110, borderRadius: 12, backgroundColor: "rgba(255,255,255,.08)", alignItems: "center", justifyContent: "center" }}><Ionicons name="hammer-outline" size={40} color="#F9DBAF" /></View></View>
          <View style={{ gap: 10 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(16, "700")}>Categories</RNText><Pressable onPress={() => nav.navigate("StoreCategories")}><RNText style={S(13, "600", c.orange)}>See all</RNText></Pressable></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>{cats.map((k) => <Pressable key={k.slug} onPress={() => nav.navigate("StoreProducts", { category: k.slug, title: k.name })} style={{ alignItems: "center", gap: 6, width: 72 }}><View style={{ width: 60, height: 60, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}><Ionicons name={catIcon(k.slug)} size={24} color={c.primary} /></View><RNText style={{ ...S(12, "500", c.text2), textAlign: "center" }} numberOfLines={2}>{k.name}</RNText></Pressable>)}</ScrollView></View>
          <View style={{ gap: 10 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><RNText style={S(16, "700")}>Featured products</RNText><Pressable onPress={() => nav.navigate("StoreProducts", {})}><RNText style={S(13, "600", c.orange)}>See all</RNText></Pressable></View><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>{featured.map((p) => <ProductCard key={p.id} p={p} onPress={() => nav.navigate("StoreProduct", { id: p.id, jobId })} onFav={() => fav(p)} onAdd={() => add(p)} />)}</View></View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
