import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Banner, Card, Pill, Row, Screen, Text } from "../../components";
import { Header } from "../../components/sheet";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";
import { RootParams } from "../../navigation";

interface Module { id: string; kind: string; category: string | null; slug: string; title: string; description: string | null; lessons_total: number; lessons_done: number; complete: boolean; relevant: boolean }
interface Lesson { id: string; slug: string; title: string; summary: string | null; duration_minutes: number; has_quiz: boolean; completed_at: string | null; is_placeholder: boolean; best_score: number | null }
interface Hub { lock: { locked: boolean; qualified: string[]; practical_pending: string[]; in_training: string[]; reasons: string[] }; modules: Module[] }

export default function TrainingScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootParams>>();
  const { c, space } = useTheme();
  const [hub, setHub] = useState<Hub | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { setRefreshing(true); const r = await api<Hub>("/training"); setHub(r.data ?? null); setRefreshing(false); if (open) openModule(open); }, [open]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  async function openModule(slug: string) { setOpen(slug); const r = await api<Lesson[]>(`/training/modules/${slug}`); setLessons((l) => ({ ...l, [slug]: r.data ?? [] })); }

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      <Text v="h1">Training</Text>
      <Text v="small" color={c.text4} style={{ marginBottom: space.lg }}>Core → Safety → your categories. Quizzes need {"≥"}80% and every safety-critical question right.</Text>
      {hub?.lock.locked ? <Banner tone="warn" title="Not yet activated" text={hub.lock.practical_pending.length ? `Training done for ${hub.lock.practical_pending.join(", ")} — a supervised first job will activate it.` : "Finish the modules below to unlock the marketplace."} /> : hub && <Banner tone="ok" title="Activated" text={`Qualified: ${hub.lock.qualified.join(", ")}`} />}
      {hub?.modules.filter((m) => m.relevant).map((m) => (
        <Card key={m.id} style={{ marginBottom: space.sm }} onPress={() => (open === m.slug ? setOpen(null) : openModule(m.slug))}>
          <Row between><View style={{ flex: 1 }}><Text v="h3">{m.title}</Text><Text v="caption" color={c.text4}>{m.description}</Text></View><Pill tone={m.complete ? "ok" : m.lessons_done ? "orange" : "neutral"}>{m.lessons_done}/{m.lessons_total}</Pill></Row>
          <View style={{ height: 4, backgroundColor: c.surface2, borderRadius: 2, marginTop: 8 }}><View style={{ height: 4, width: `${m.lessons_total ? (m.lessons_done / m.lessons_total) * 100 : 0}%`, backgroundColor: c.primary, borderRadius: 2 }} /></View>
          {open === m.slug && (lessons[m.slug] ?? []).map((l) => (
            <Row key={l.id} between style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border }}>
              <View style={{ flex: 1 }}><Text v="bodyMd" onPress={() => nav.navigate("Lesson", { slug: l.slug })}>{l.title}</Text><Text v="caption" color={c.text4}>{l.duration_minutes} min · {l.has_quiz ? "quiz" : "read & acknowledge"}{l.is_placeholder ? " · placeholder" : ""}</Text></View>
              {l.completed_at ? <Pill tone="ok">Done{l.best_score != null ? ` ${l.best_score}%` : ""}</Pill> : <Text v="smallMd" color={c.primaryText} onPress={() => nav.navigate("Lesson", { slug: l.slug })}>Open ›</Text>}
            </Row>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
