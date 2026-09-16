import React, { useEffect, useState } from "react";
import { ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SecondaryButton } from "../../components/form";
import { Header } from "../../components/sheet";
import { money } from "../../components";
import { api, Job } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";

interface Tx { id: string; type: string; amount: number; status: string; description: string | null; request_code: string | null; job_id: string | null; created_at: string }

export default function TransactionDetailScreen() {
  const nav = useNavigation();
  const { params } = useRoute<{ key: string; name: string; params: { id: string } }>();
  const { c } = useTheme();
  const [t, setT] = useState<Tx | null>(null); const [j, setJ] = useState<Job | null>(null);
  useEffect(() => { api<Tx[]>("/transactions?limit=200").then(async (r) => { const x = (r.data ?? []).find((z) => z.id === params.id) ?? null; setT(x); if (x?.job_id) { const jr = await api<Job>(`/jobs/${x.job_id}`); setJ(jr.data ?? null); } }); }, [params.id]);
  const S = (n: number, w: "400" | "500" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "500" ? font.medium : w === "600" ? font.semibold : font.bold, color: col });
  const Card = ({ title, rows }: { title: string; rows: [string, string, string?][] }) => <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, gap: 10 }}><RNText style={S(13, "600", c.text4)}>{title.toUpperCase()}</RNText>{rows.map(([k, v, col]) => <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><RNText style={S(14, "400", c.text4)}>{k}</RNText><RNText style={{ flex: 1, textAlign: "right", ...S(14, "500", col ?? c.text) }}>{v}</RNText></View>)}</View>;
  const fmt = (v?: string | null) => v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Transaction" onBack={() => nav.goBack()} />
      {t && <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 20, alignItems: "center", gap: 8 }}><View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.hero, alignItems: "center", justifyContent: "center" }}><RNText style={S(18, "700", "#fff")}>{j?.consumer ? `${j.consumer.first_name[0]}${j.consumer.last_name[0]}` : "MB"}</RNText></View><RNText style={S(16, "600")}>{j?.title ?? t.description ?? t.type.replace(/_/g, " ")}</RNText>{j?.consumer && <RNText style={S(13, "400", c.text4)}>{j.consumer.first_name} {j.consumer.last_name} · {j.service_category}</RNText>}<RNText style={S(34, "700", t.amount < 0 ? c.text : "#079455")}>{t.amount < 0 ? "– " : "+ "}{money(Math.abs(t.amount))}</RNText><View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: t.status === "completed" ? c.okBg : c.warnBg }}><RNText style={{ ...S(12, "600", t.status === "completed" ? c.ok : c.warn), textTransform: "capitalize" }}>{t.status === "completed" ? (/payout/.test(t.type) ? "Paid out" : "Completed") : t.status}</RNText></View></View>
        {j && <Card title="Job details" rows={[["Job ID", `#${j.request_code}`], ["Date of completion", fmt(j.paid_at ?? j.updated_at)], ["Payment date", fmt(t.created_at)]]} />}
        {j && <Card title="Payment details" rows={[["Base pay", money(j.contractor_net)], ["Tip", j.tip ? `+ ${money(j.tip)}` : "—", "#079455"], ["Platform fee (MrBuilder)", `– ${money(j.platform_fee)}`], ["Total payout", money((j.contractor_net ?? 0) + j.tip)]]} />}
        {!j && <Card title="Details" rows={[["Type", t.type.replace(/_/g, " ")], ["Date", fmt(t.created_at)], ["Reference", t.id.slice(0, 8)]]} />}
        <SecondaryButton title="Download receipt" onPress={() => {}} />
      </ScrollView>}
    </SafeAreaView>
  );
}
