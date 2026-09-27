import React, { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton, SecondaryButton } from "../../components/form";
import { Header } from "../../components/sheet";
import { api, Job } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

const REASONS: Record<string, string> = { incomplete: "Work is incomplete", quality: "Quality problem", damage: "Damage to property", other: "Something else" };

export default function ClientCommentScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { params } = useRoute<{ key: string; name: string; params: { id: string } }>();
  const { c } = useTheme();
  const [j, setJ] = useState<Job | null>(null); const [photos, setPhotos] = useState<string[]>([]); const [at, setAt] = useState<string | null>(null);
  const load = useCallback(async () => { const r = await api<Job>(`/jobs/${params.id}`); setJ(r.data ?? null); const [e, x] = await Promise.all([api<{ event_type: string; created_at: string }[]>(`/jobs/${params.id}/events`), api<{ items: { kind: string; url: string }[] }>(`/jobs/${params.id}/evidence`)]); const ev = (e.data ?? []).find((x) => x.event_type === "issue_reported"); setAt(ev?.created_at ?? null); setPhotos((x.data?.items ?? []).filter((i) => i.kind === "issue").map((i) => i.url)); }, [params.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  const client = j?.consumer; const jx = j as (Job & { issue_reason?: string | null; issue_text?: string | null }) | null;
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Client's feedback" onBack={() => nav.goBack()} />
      <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, backgroundColor: c.warnBg, borderWidth: 1, borderColor: c.warnBd }}><Ionicons name="alert-circle-outline" size={20} color={c.warn} /><View style={{ flex: 1 }}><RNText style={S(14, "600", c.warn)}>The client reported that the job isn't fully completed</RNText><RNText style={S(13, "400", c.text2)}>Please review their feedback and complete the remaining tasks to finish the project and receive payment.</RNText></View></View>
        <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, overflow: "hidden" }}>
          {photos.length ? <ScrollView automaticallyAdjustKeyboardInsets horizontal pagingEnabled showsHorizontalScrollIndicator={false}>{photos.map((u, i) => <Pressable key={i} onPress={() => nav.navigate("Gallery", { photos: photos.map((x) => ({ url: x, label: "Client photo", at: at ?? undefined })), index: i })}><Image source={{ uri: u }} style={{ width: 358, height: 220, backgroundColor: c.surface2 }} /></Pressable>)}</ScrollView> : <View style={{ height: 120, backgroundColor: c.surface2, alignItems: "center", justifyContent: "center" }}><RNText style={S(13, "400", c.text4)}>No photos attached</RNText></View>}
          <View style={{ padding: 14, gap: 10 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.hero, alignItems: "center", justifyContent: "center" }}><RNText style={S(13, "700", "#fff")}>{client ? `${client.first_name[0]}${client.last_name[0]}` : "?"}</RNText></View><View style={{ flex: 1 }}><RNText style={S(14, "600")}>{client ? `${client.first_name} ${client.last_name}` : "Client"}</RNText><RNText style={S(12, "400", c.text4)}>{at ? new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</RNText></View></View><RNText style={{ ...S(14, "400", c.text2), lineHeight: 20 }}>{[jx?.issue_reason ? (REASONS[jx.issue_reason] ?? jx.issue_reason) : null, jx?.issue_text].filter(Boolean).join(" — ") || "—"}</RNText></View>
        </View>
        <View style={{ flex: 1 }} />
        <PrimaryButton title="Confirm & fix the issues" onPress={() => nav.replace("JobDetail", { id: params.id, fix: true })} />
        <SecondaryButton title="Dispute the feedback" tone="danger" onPress={() => nav.navigate("DisputeForm", { id: params.id })} />
      </ScrollView>
    </SafeAreaView>
  );
}
