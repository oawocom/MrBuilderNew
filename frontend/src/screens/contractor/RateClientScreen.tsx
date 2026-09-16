import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text as RNText, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton, SecondaryButton } from "../../components/form";
import { Header } from "../../components/sheet";
import { money } from "../../components";
import { api, Job } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";
import { RootParams } from "../../navigation";

export default function RateClientScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { params } = useRoute<{ key: string; name: string; params: { id: string; confirmed?: boolean } }>();
  const { c } = useTheme();
  const [j, setJ] = useState<Job | null>(null); const [stage, setStage] = useState<"confirmed" | "rate">(params.confirmed ? "confirmed" : "rate"); const [stars, setStars] = useState(0); const [text, setText] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { api<Job>(`/jobs/${params.id}`).then((r) => setJ(r.data ?? null)); }, [params.id]);
  const S = (n: number, w: "400" | "500" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });
  const HINT = ["Tap a star to rate", "Poor", "Fair", "Good", "Very good", "Excellent"];
  async function submit() { setBusy(true); const r = await api(`/jobs/${params.id}/ratings`, { method: "POST", body: { rating: stars, comment: text || undefined } }); setBusy(false); if (!r.success) { Alert.alert("Couldn't submit", r.error); return; } nav.navigate("JobDetail", { id: params.id }); }
  if (stage === "confirmed") return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Job confirmed" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 24, gap: 20 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.okBg, alignItems: "center", justifyContent: "center" }}><View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#079455", alignItems: "center", justifyContent: "center" }}><Ionicons name="checkmark" size={24} color="#fff" /></View></View>
        <View><RNText style={S(22, "700")}>Job confirmed</RNText><RNText style={S(14, "400", c.text3)}>The client has confirmed the completion of the job. Well done!</RNText></View>
        {j && <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, gap: 10 }}><RNText style={S(13, "600", c.text4)}>PAYMENT DETAILS</RNText>{[["Earnings", money(j.contractor_net), c.text], ["Tips", j.tip ? `+ ${money(j.tip)}` : "—", "#079455"], ["Payout date", j.paid_at ? new Date(j.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "On confirmation", c.text]].map(([k, v, col]) => <View key={k as string} style={{ flexDirection: "row", justifyContent: "space-between" }}><RNText style={S(14, "400", c.text4)}>{k as string}</RNText><RNText style={S(14, "600", col as string)}>{v as string}</RNText></View>)}<View style={{ height: 1, backgroundColor: c.border }} />{[["Project name", j.title], ["Client", j.consumer ? `${j.consumer.first_name} ${j.consumer.last_name}` : "—"], ["Location", [j.location_address, j.location_city, j.location_state].filter(Boolean).join(", ")]].map(([k, v]) => <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><RNText style={S(14, "400", c.text4)}>{k}</RNText><RNText style={{ flex: 1, textAlign: "right", ...S(14, "500") }}>{v}</RNText></View>)}</View>}
        <View style={{ flex: 1 }} />
        <PrimaryButton title="Leave a rating" onPress={() => setStage("rate")} /><SecondaryButton title="Download receipt" icon={<Ionicons name="download-outline" size={16} color={c.text} />} onPress={() => nav.navigate("Tabs", { screen: "Profile" })} />
      </ScrollView>
    </SafeAreaView>
  );
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Rate the client" onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20, gap: 20 }} keyboardShouldPersistTaps="handled">
        <View><RNText style={S(22, "700")}>Rate the client</RNText><RNText style={S(14, "400", c.text3)}>How was your experience working with {j?.consumer ? `${j.consumer.first_name} ${j.consumer.last_name[0]}.` : "the client"}?</RNText></View>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>{[1, 2, 3, 4, 5].map((n) => <Pressable key={n} onPress={() => setStars(n)} style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}><Ionicons name={n <= stars ? "star" : "star-outline"} size={34} color={n <= stars ? c.primary : c.border2} /></Pressable>)}</View>
        <RNText style={{ textAlign: "center", ...S(13, "400", stars ? c.text : c.text4) }}>{HINT[stars]}</RNText>
        <View style={{ gap: 6 }}><RNText style={S(14, "500", c.text2)}>Comment</RNText><TextInput value={text} onChangeText={setText} multiline placeholder="Write a comment …" placeholderTextColor={c.text5} style={{ minHeight: 120, borderRadius: 12, borderWidth: 1, borderColor: c.border2, backgroundColor: c.surface, padding: 12, paddingHorizontal: 14, fontFamily: font.regular, fontSize: 14, color: c.text, textAlignVertical: "top" }} /></View>
        <View style={{ flex: 1 }} />
        <PrimaryButton title="Submit rating" onPress={submit} disabled={!stars} loading={busy} /><Pressable onPress={() => nav.goBack()} style={{ height: 48, alignItems: "center", justifyContent: "center" }}><RNText style={S(15, "600", c.text3)}>Cancel</RNText></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
