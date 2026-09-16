import React, { useEffect, useState } from "react";
import { ScrollView, Text as RNText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Header } from "../../components/sheet";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { font } from "../../theme/tokens";

const FALLBACK: Record<string, { updated: string; sections: [string, string][] }> = {
  terms: { updated: "September 1, 2026", sections: [["1. The platform", "MrBuilder connects pergola owners with independent, trained contractors. MrBuilder sets prices, holds payment until the customer confirms the work, and reviews disputes."], ["2. Contractors", "Contractors are independent businesses. Activation requires completing training and, for some categories, a supervised assessment. Before-work photos and a safety checklist are required before every job."], ["3. Payments", "Customers are charged only after confirming completed work (or after 72 hours without action). Contractor earnings are released on confirmation. Cancellation fees: 1% before start, 5% after start."], ["4. Scope", "Structural footings, electrical wiring, gas, plumbing and water-supply work are outside MrBuilder's scope. Accessories are mounted only."], ["5. Disputes", "Either party may raise an issue. MrBuilder reviews evidence and decides; decisions may include a return visit at no charge or release of payment."]] },
  privacy: { updated: "September 1, 2026", sections: [["What we collect", "Account details, job addresses, photos taken for jobs, device location while using the app (for matching and ETA), payment tokens from our payment provider."], ["How we use it", "To match jobs, price requests, share job details between customer and contractor, process payments, send notifications and resolve disputes."], ["Sharing", "Job details are shared between the customer and the assigned contractor only. Payment card data is stored by our payment provider; MrBuilder never sees full card numbers."], ["Your rights", "Export or delete your data from Settings. Deleted accounts are deactivated immediately and purged after 30 days."]] },
};

export default function LegalScreen() {
  const nav = useNavigation();
  const { params } = useRoute<{ key: string; name: string; params: { kind: "terms" | "privacy" } }>();
  const { c } = useTheme();
  const [doc, setDoc] = useState(FALLBACK[params.kind]);
  useEffect(() => { api<{ updated: string; sections: [string, string][] }>(`/legal/${params.kind}`).then((r) => { if (r.data?.sections?.length) setDoc(r.data); }); }, [params.kind]);
  const S = (n: number, w: "400" | "600" | "700" = "400", col = c.text) => ({ fontSize: n, fontFamily: w === "400" ? font.regular : w === "600" ? font.semibold : font.bold, color: col });
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title={params.kind === "terms" ? "Terms & Conditions" : "Privacy Policy"} onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 18 }}><RNText style={S(12.5, "400", c.text4)}>Last updated {doc.updated}</RNText>{doc.sections.map(([h, p]) => <View key={h} style={{ gap: 4 }}><RNText style={S(15, "600")}>{h}</RNText><RNText style={{ ...S(14, "400", c.text3), lineHeight: 20 }}>{p}</RNText></View>)}</ScrollView>
    </SafeAreaView>
  );
}
