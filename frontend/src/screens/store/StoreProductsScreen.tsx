// Search · Categories · Products grid · Favorites · Product detail
import React, { useCallback, useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text as RNText, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../components/sheet";
import { PrimaryButton } from "../../components/form";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";
import { Category, Product, money } from "./store";
import { ProductCard } from "./StoreScreen";

const useS = () => { const { c } = useTheme(); return (n: number, w: "400" | "500" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col }); };

export function StoreSearchScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { params } = useRoute<{ key: string; name: string; params?: { jobId?: string } }>();
  const { c } = useTheme(); const S = useS();
  const [q, setQ] = useState(""); const [results, setResults] = useState<Product[] | null>(null); const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => { if (!q.trim()) { setResults(null); return; } const t = setTimeout(async () => { const r = await api<Product[]>(`/store/products?q=${encodeURIComponent(q)}`); setResults(r.data ?? []); }, 350); return () => clearTimeout(t); }, [q]);
  const go = (term: string) => { setQ(term); setRecent((r) => [term, ...r.filter((x) => x !== term)].slice(0, 6)); };
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border }}><Pressable onPress={() => nav.goBack()} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}><Ionicons name="chevron-back" size={24} color={c.text} /></Pressable><View style={{ flex: 1, height: 48, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14 }}><Ionicons name="search-outline" size={18} color={c.text5} /><TextInput value={q} onChangeText={setQ} autoFocus placeholder="Search for tools, materials…" placeholderTextColor={c.text5} onSubmitEditing={() => go(q)} style={{ flex: 1, fontFamily: font.regular, fontSize: 15, color: c.text }} />{!!q && <Pressable onPress={() => setQ("")} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.border, alignItems: "center", justifyContent: "center" }}><Ionicons name="close" size={14} color={c.text2} /></Pressable>}</View></View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {results === null ? <><View style={{ gap: 8 }}><RNText style={S(13, "600", c.text4)}>Popular searches</RNText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{["Louver motor", "Rain sensor", "LED strip", "Zip screen", "Anchor bolts", "Remote control"].map((p) => <Pressable key={p} onPress={() => go(p)} style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: c.border2, backgroundColor: c.surface, justifyContent: "center" }}><RNText style={S(13.5, "500", c.text2)}>{p}</RNText></Pressable>)}</View></View>{recent.length > 0 && <View style={{ gap: 4 }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><RNText style={S(13, "600", c.text4)}>Recent searches</RNText><Pressable onPress={() => setRecent([])}><RNText style={S(13, "600", c.orange)}>Clear</RNText></Pressable></View>{recent.map((r) => <Pressable key={r} onPress={() => go(r)} style={{ height: 44, flexDirection: "row", alignItems: "center", gap: 10 }}><Ionicons name="time-outline" size={18} color={c.text4} /><RNText style={{ flex: 1, ...S(15, "400") }}>{r}</RNText><Pressable onPress={() => setRecent(recent.filter((x) => x !== r))}><Ionicons name="close" size={16} color={c.text5} /></Pressable></Pressable>)}</View>}</>
          : results.length === 0 ? <View style={{ alignItems: "center", gap: 8, paddingTop: 40 }}><View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}><Ionicons name="search-outline" size={26} color={c.primary} /></View><RNText style={S(17, "600")}>No results found</RNText><RNText style={{ ...S(14, "400", c.text4), textAlign: "center" }}>We couldn't find any products matching your search. Try different keywords or check your spelling.</RNText><PrimaryButton title="Go to product catalog" onPress={() => nav.navigate("StoreProducts", {})} style={{ alignSelf: "stretch", marginTop: 8 }} /></View>
          : <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>{results.map((p) => <ProductCard key={p.id} p={p} onPress={() => nav.navigate("StoreProduct", { id: p.id, jobId: params?.jobId })} onFav={async () => { await api(`/store/favorites/${p.id}`, { method: p.is_favorite ? "DELETE" : "PUT" }); setQ(q + ""); }} onAdd={async () => { await api("/store/cart/items", { method: "POST", body: { product_id: p.id, qty: 1, job_id: params?.jobId } }); }} />)}</View>}
      </ScrollView>
    </SafeAreaView>
  );
}

export function StoreCategoriesScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { c } = useTheme(); const S = useS();
  const [cats, setCats] = useState<Category[]>([]);
  useEffect(() => { api<Category[]>("/store/categories").then((r) => setCats(r.data ?? [])); }, []);
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Categories" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16 }}><View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16 }}>{cats.map((k, i) => <Pressable key={k.slug} onPress={() => nav.navigate("StoreProducts", { category: k.slug, title: k.name })} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: c.border }}><View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="cube-outline" size={20} color={c.primary} /></View><View style={{ flex: 1 }}><RNText style={S(15, "600")}>{k.name}</RNText><RNText style={S(12.5, "400", c.text4)}>{k.product_count} products</RNText></View><Ionicons name="chevron-forward" size={18} color={c.text5} /></Pressable>)}</View></ScrollView>
    </SafeAreaView>
  );
}

export function StoreProductsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { params } = useRoute<{ key: string; name: string; params?: { category?: string; title?: string; favorites?: boolean; jobId?: string } }>();
  const { c } = useTheme(); const S = useS();
  const [list, setList] = useState<Product[]>([]); const [cats, setCats] = useState<Category[]>([]); const [cat, setCat] = useState(params?.category ?? ""); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { const [p, k] = await Promise.all([api<Product[]>(`/store/products?limit=100${cat ? `&category=${cat}` : ""}${params?.favorites ? "&favorites=1" : ""}${params?.jobId ? `&job_id=${params.jobId}` : ""}`), api<Category[]>("/store/categories")]); let items = p.data ?? []; if (params?.favorites) items = items.filter((x) => x.is_favorite); setList(items); setCats(k.data ?? []); setLoading(false); }, [cat, params?.favorites, params?.jobId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={params?.favorites ? "Favorites" : params?.title ?? "All products"} onBack={() => nav.goBack()} right={<Pressable onPress={() => nav.navigate("StoreCart", { jobId: params?.jobId })} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}><Ionicons name="cart-outline" size={22} color={c.text} /></Pressable>} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {!params?.favorites && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{[{ slug: "", name: "All" }, ...cats].map((k) => <Pressable key={k.slug} onPress={() => setCat(k.slug)} style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: cat === k.slug ? c.hero : c.surface, borderWidth: 1, borderColor: cat === k.slug ? c.hero : c.border2, justifyContent: "center" }}><RNText style={S(13, "600", cat === k.slug ? "#fff" : c.text2)}>{k.name}</RNText></Pressable>)}</ScrollView>}
        {params?.jobId && <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.primarySoft }}><RNText style={S(13, "400", c.orange)}>Parts for <RNText style={S(13, "700", c.orange)}>your job</RNText> · filtered by pergola type</RNText><Pressable onPress={() => nav.setParams({ jobId: undefined } as never)}><RNText style={S(13, "600", c.orange)}>Clear</RNText></Pressable></View>}
        {loading && [1, 2, 3].map((k) => <View key={k} style={{ height: 112, borderRadius: 16, backgroundColor: c.surface2 }} />)}
        {!loading && list.length === 0 && <View style={{ alignItems: "center", gap: 8, paddingTop: 40 }}><View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}><Ionicons name={params?.favorites ? "heart-outline" : "cube-outline"} size={26} color={c.primary} /></View><RNText style={S(17, "600")}>{params?.favorites ? "Your favorites list is empty" : "No products here yet"}</RNText><RNText style={{ ...S(14, "400", c.text4), textAlign: "center" }}>{params?.favorites ? "Save the products you like by tapping the heart icon." : "Check back soon or browse another category."}</RNText></View>}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>{list.map((p) => <ProductCard key={p.id} p={p} onPress={() => nav.navigate("StoreProduct", { id: p.id, jobId: params?.jobId })} onFav={async () => { await api(`/store/favorites/${p.id}`, { method: p.is_favorite ? "DELETE" : "PUT" }); load(); }} onAdd={async () => { await api("/store/cart/items", { method: "POST", body: { product_id: p.id, qty: 1, job_id: params?.jobId } }); }} />)}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function StoreProductScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { params } = useRoute<{ key: string; name: string; params: { id: string; jobId?: string } }>();
  const { c } = useTheme(); const S = useS();
  const [p, setP] = useState<Product | null>(null); const [qty, setQty] = useState(1); const [img, setImg] = useState(0); const [added, setAdded] = useState(false);
  const load = useCallback(async () => { const r = await api<Product>(`/store/products/${params.id}`); setP(r.data ?? null); }, [params.id]);
  useEffect(() => { load(); }, [load]);
  if (!p) return <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}><Header title="Product" onBack={() => nav.goBack()} /></SafeAreaView>;
  const imgs = p.images?.length ? p.images : p.image_url ? [p.image_url] : [];
  const cat = p.category.replace(/[-_]/g, " ");
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="" onBack={() => nav.goBack()} right={<Pressable onPress={() => nav.navigate("StoreCart", { jobId: params.jobId })} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}><Ionicons name="cart-outline" size={22} color={c.text} /></Pressable>} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ height: 280, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>{imgs[img] ? <Image source={{ uri: imgs[img] }} style={{ width: "80%", height: "78%" }} resizeMode="contain" /> : <Ionicons name="cube-outline" size={80} color={c.text4} />}<Pressable onPress={async () => { await api(`/store/favorites/${p.id}`, { method: p.is_favorite ? "DELETE" : "PUT" }); load(); }} style={{ position: "absolute", top: 12, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" }}><Ionicons name={p.is_favorite ? "heart" : "heart-outline"} size={20} color={c.primary} /></Pressable>{imgs.length > 1 && <View style={{ position: "absolute", bottom: 12, flexDirection: "row", gap: 6 }}>{imgs.map((_, i) => <Pressable key={i} onPress={() => setImg(i)} style={{ width: i === img ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === img ? c.primary : c.border2 }} />)}</View>}</View>
        <View style={{ padding: 16, gap: 16 }}>
          <View style={{ gap: 6 }}><View style={{ flexDirection: "row", gap: 6 }}><View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: c.surface2 }}><RNText style={{ ...S(12, "600", c.text2), textTransform: "capitalize" }}>{cat}</RNText></View><View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: p.in_stock ? c.okBg : c.errBg }}><RNText style={S(12, "600", p.in_stock ? c.ok : c.err)}>{p.in_stock ? "In stock" : "Out of stock"}</RNText></View></View><RNText style={S(22, "700")}>{p.name}</RNText>{!!p.rating_avg && <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="star" size={14} color={c.primary} /><RNText style={S(13, "400", c.text3)}><RNText style={S(13, "700")}>{p.rating_avg.toFixed(1)}</RNText> · {p.reviews_count ?? 0} reviews</RNText></View>}</View>
          {p.description && <View style={{ gap: 4 }}><RNText style={S(14, "600")}>Description</RNText><RNText style={{ ...S(14, "400", c.text3), lineHeight: 20 }}>{p.description}</RNText></View>}
          {!!p.compatible_types?.length && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{p.compatible_types.map((t) => <View key={t} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: c.primarySoft }}><RNText style={{ ...S(12.5, "600", c.orange), textTransform: "capitalize" }}>{t.replace(/_/g, " ")}</RNText></View>)}</View>}
          {!!p.specs && Object.keys(p.specs).length > 0 && <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, gap: 6 }}>{Object.entries(p.specs).map(([k, v]) => <View key={k} style={{ flexDirection: "row", justifyContent: "space-between" }}><RNText style={{ ...S(13, "400", c.text4), textTransform: "capitalize" }}>{k.replace(/_/g, " ")}</RNText><RNText style={S(13, "500")}>{String(v)}</RNText></View>)}</View>}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, backgroundColor: c.infoBg }}><Ionicons name="car-outline" size={18} color={c.info} /><RNText style={S(13.5, "500", c.info)}>Free shipping on orders over $150</RNText></View>
        </View>
      </ScrollView>
      <View style={{ padding: 12, paddingHorizontal: 16, paddingBottom: 30, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View><RNText style={S(12, "400", c.text4)}>Price</RNText><View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}><RNText style={S(22, "700")}>{money(p.price * qty)}</RNText>{!!p.compare_at_price && <RNText style={{ ...S(12, "400", c.text5), textDecorationLine: "line-through" }}>{money(p.compare_at_price * qty)}</RNText>}</View></View>
        <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: c.border2, borderRadius: 10 }}><Pressable onPress={() => setQty(Math.max(1, qty - 1))} style={{ width: 36, height: 40, alignItems: "center", justifyContent: "center" }}><RNText style={S(18, "400", c.text2)}>−</RNText></Pressable><RNText style={{ width: 28, textAlign: "center", ...S(15, "600") }}>{qty}</RNText><Pressable onPress={() => setQty(qty + 1)} style={{ width: 36, height: 40, alignItems: "center", justifyContent: "center" }}><RNText style={S(18, "400", c.text2)}>+</RNText></Pressable></View>
        <Pressable disabled={!p.in_stock} onPress={async () => { await api("/store/cart/items", { method: "POST", body: { product_id: p.id, qty, job_id: params.jobId } }); setAdded(true); setTimeout(() => setAdded(false), 1500); }} style={{ flex: 1, height: 48, borderRadius: 12, backgroundColor: added ? "#079455" : p.in_stock ? c.primary : c.surface3, alignItems: "center", justifyContent: "center" }}><RNText style={S(15, "600", p.in_stock ? "#fff" : c.text4)}>{added ? "Added ✓" : "Add to cart"}</RNText></Pressable>
      </View>
    </SafeAreaView>
  );
}
