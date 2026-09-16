import React, { useEffect, useState } from "react";
import { Image, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../components/sheet";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";

interface Summary { id: string; name: string; avatar_url: string | null; rating_avg: number; ratings_count: number; jobs_completed: number; qualified_categories: string[]; member_since: string; background_checked?: boolean; insured?: boolean; recent_photos?: string[] }
interface Review { id: string; rating: number; comment: string | null; created_at: string; rater_name?: string }

export default function ContractorProfileScreen() {
  const nav = useNavigation();
  const { params } = useRoute<{ key: string; name: string; params: { id: string } }>();
  const { c } = useTheme();
  const [s, setS] = useState<Summary | null>(null); const [reviews, setReviews] = useState<Review[]>([]);
  useEffect(() => { api<Summary>(`/contractors/${params.id}/summary`).then((r) => setS(r.data ?? null)); api<Review[]>(`/users/${params.id}/ratings`).then((r) => setReviews(r.data ?? [])); }, [params.id]);
  const S = (n: number, w: "400" | "600" | "700" | "800" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  const years = s ? Math.max(0, new Date().getFullYear() - new Date(s.member_since).getFullYear()) : 0;
  const Chip = ({ t, bg, fg }: { t: string; bg: string; fg: string }) => <View style={{ height: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: bg, justifyContent: "center" }}><RNText style={S(12, "600", fg)}>{t}</RNText></View>;
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Technician" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {s && <>
          <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 18, paddingHorizontal: 16, alignItems: "center", gap: 8 }}>
            {s.avatar_url ? <Image source={{ uri: s.avatar_url }} style={{ width: 84, height: 84, borderRadius: 42 }} /> : <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: c.info, alignItems: "center", justifyContent: "center" }}><RNText style={S(28, "700", "#fff")}>{s.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}</RNText></View>}
            <RNText style={S(20, "700")}>{s.name}</RNText>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" }}><Chip t="MrBuilder PRO" bg={c.infoBg} fg={c.info} />{s.background_checked !== false && <Chip t="Background checked" bg={c.okBg} fg={c.ok} />}{s.insured !== false && <Chip t="Insured" bg={c.surface2} fg={c.text2} />}</View>
            <View style={{ flexDirection: "row", gap: 24, paddingTop: 8 }}>{[[s.rating_avg ? s.rating_avg.toFixed(1) : "New", `${s.ratings_count} reviews`], [String(s.jobs_completed), "jobs done"], [`${years}+`, "years"]].map(([v, l]) => <View key={l} style={{ alignItems: "center" }}><RNText style={S(20, "800")}>{v}</RNText><RNText style={S(12, "400", c.text4)}>{l}</RNText></View>)}</View>
          </View>
          <View style={{ gap: 10 }}><RNText style={S(16, "700")}>Specialties</RNText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{(s.qualified_categories.length ? s.qualified_categories : ["Pergola services"]).map((k) => <View key={k} style={{ height: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: c.surface2, justifyContent: "center" }}><RNText style={{ ...S(13, "600", c.text2), textTransform: "capitalize" }}>{k}</RNText></View>)}</View></View>
          {!!s.recent_photos?.length && <View style={{ gap: 10 }}><RNText style={S(16, "700")}>Recent pergola work</RNText><View style={{ flexDirection: "row", gap: 8 }}>{s.recent_photos.slice(0, 3).map((u, i) => <Image key={i} source={{ uri: u }} style={{ flex: 1, aspectRatio: 1, borderRadius: 12, backgroundColor: c.surface2 }} />)}</View></View>}
          <View style={{ gap: 10 }}><RNText style={S(16, "700")}>Reviews</RNText>{reviews.length === 0 && <RNText style={S(13, "400", c.text4)}>No reviews yet.</RNText>}{reviews.map((r) => <View key={r.id} style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12, paddingHorizontal: 14, gap: 6 }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><RNText style={S(13.5, "600")}>{r.rater_name ?? "Customer"}</RNText><RNText style={S(12, "400", c.text4)}>{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</RNText></View><View style={{ flexDirection: "row", gap: 2 }}>{[1, 2, 3, 4, 5].map((n) => <Ionicons key={n} name="star" size={14} color={n <= r.rating ? c.primary : c.border2} />)}</View>{r.comment && <RNText style={S(13.5, "400", c.text2)}>{r.comment}</RNText>}</View>)}</View>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}
