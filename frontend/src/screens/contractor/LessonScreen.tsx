import React, { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Banner, Button, Card, Row, Screen, Text } from "../../components";
import { api } from "../../api/client";
import { useTheme } from "../../theme/ThemeProvider";

interface Q { id: string; question: string; options: { id: string; text: string }[]; is_critical: boolean }
interface Lesson { id: string; slug: string; title: string; summary: string | null; video_url: string | null; transcript: string | null; checklist: { id: string; text: string }[]; quiz: Q[]; is_placeholder: boolean; progress: { completed_at: string | null; attempts: number | null } }

export default function LessonScreen() {
  const nav = useNavigation();
  const { params } = useRoute<{ key: string; name: string; params: { slug: string } }>();
  const { c, space } = useTheme();
  const [l, setL] = useState<Lesson | null>(null);
  const [ans, setAns] = useState<Record<string, string>>({});
  const [ack, setAck] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<{ result: string; score_pct: number; review: { question_id: string; correct: boolean; explanation: string | null }[] } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<Lesson>(`/training/lessons/${params.slug}`).then((r) => { setL(r.data ?? null); api(`/training/lessons/${params.slug}/watched`, { method: "POST" }); }); }, [params.slug]);
  if (!l) return <Screen><Text v="small" color={c.text4}>Loading…</Text></Screen>;
  const hasQuiz = l.quiz.length > 0;
  const allAcked = l.checklist.every((i) => ack[i.id]);

  async function submitQuiz() {
    setBusy(true);
    const r = await api<typeof result>(`/training/lessons/${params.slug}/quiz`, { method: "POST", body: { answers: ans } });
    setBusy(false);
    if (!r.success || !r.data) { Alert.alert("Error", r.error); return; }
    setResult(r.data);
  }
  async function complete() {
    setBusy(true);
    const r = await api(`/training/lessons/${params.slug}/complete`, { method: "POST" });
    setBusy(false);
    if (r.success) nav.goBack(); else Alert.alert("Error", r.error);
  }

  return (
    <Screen>
      <Pressable onPress={() => nav.goBack()}><Text v="small" color={c.text4}>‹ Training</Text></Pressable>
      <Text v="h1" style={{ marginTop: 6 }}>{l.title}</Text>
      {l.summary && <Text v="body" color={c.text3} style={{ marginBottom: space.md }}>{l.summary}</Text>}
      {l.is_placeholder && <Banner tone="warn" title="Placeholder content" text="Pending expert review — the flow is real, the material will be replaced." />}
      {l.video_url ? <Card style={{ marginBottom: space.md, alignItems: "center" }}><Text v="small" color={c.text4}>Video: {l.video_url}</Text><Text v="caption" color={c.text4}>Watching never counts as completion — pass the quiz below.</Text></Card> : <Banner tone="neutral" title="No video yet" text="Read the lesson text and complete the quiz or checklist." />}
      {l.transcript && <Card style={{ marginBottom: space.md }}><Text v="body">{l.transcript}</Text></Card>}
      {l.checklist.length > 0 && <Card style={{ marginBottom: space.md }}><Text v="h3" style={{ marginBottom: 6 }}>Checklist</Text>{l.checklist.map((i) => <Pressable key={i.id} onPress={() => setAck({ ...ack, [i.id]: !ack[i.id] })}><Row gap={10} style={{ paddingVertical: 6 }}><View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: ack[i.id] ? c.primary : c.border2, backgroundColor: ack[i.id] ? c.primary : "transparent", alignItems: "center", justifyContent: "center" }}>{ack[i.id] && <Text color="#fff">✓</Text>}</View><Text v="small" style={{ flex: 1 }}>{i.text}</Text></Row></Pressable>)}</Card>}
      {hasQuiz && !result && (
        <Card style={{ marginBottom: space.md }}>
          <Text v="h3" style={{ marginBottom: 6 }}>Quiz · {l.quiz.length} questions</Text>
          {l.quiz.map((q, qi) => (
            <View key={q.id} style={{ marginTop: 12 }}>
              <Text v="bodyMd">{qi + 1}. {q.question}{q.is_critical ? " *" : ""}</Text>
              {q.options.map((o) => <Pressable key={o.id} onPress={() => setAns({ ...ans, [q.id]: o.id })} style={{ marginTop: 6, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: ans[q.id] === o.id ? c.primary : c.border, backgroundColor: ans[q.id] === o.id ? c.primarySoft : c.surface }}><Text v="small">{o.text}</Text></Pressable>)}
            </View>
          ))}
          <Text v="caption" color={c.text4} style={{ marginTop: 8 }}>* safety-critical — must be correct to pass</Text>
          <Button title="Submit answers" onPress={submitQuiz} loading={busy} disabled={Object.keys(ans).length < l.quiz.length} style={{ marginTop: 12 }} />
        </Card>
      )}
      {result && (
        <Card style={{ marginBottom: space.md, borderColor: result.result === "pass" ? c.okBd : c.errBd }}>
          <Text v="h2" color={result.result === "pass" ? c.ok : c.err}>{result.result === "pass" ? "Passed" : result.result === "critical_miss" ? "Not passed — a critical question was wrong" : "Not passed"} · {result.score_pct}%</Text>
          {result.review.filter((r) => !r.correct).map((r) => { const q = l.quiz.find((x) => x.id === r.question_id); return <View key={r.question_id} style={{ marginTop: 8 }}><Text v="smallMd">✗ {q?.question}</Text>{r.explanation && <Text v="caption" color={c.text4}>{r.explanation}</Text>}</View>; })}
          <Row gap={8} style={{ marginTop: 12 }}>{result.result !== "pass" && <Button title="Try again" kind="secondary" onPress={() => { setResult(null); setAns({}); }} style={{ flex: 1 }} />}<Button title={result.result === "pass" ? "Done" : "Back to training"} onPress={() => nav.goBack()} style={{ flex: 1 }} /></Row>
        </Card>
      )}
      {!hasQuiz && !l.progress.completed_at && <Button title="Mark as completed" onPress={complete} loading={busy} disabled={!allAcked} />}
      {!hasQuiz && !allAcked && l.checklist.length > 0 && <Text v="caption" color={c.text4} style={{ textAlign: "center", marginTop: 6 }}>Tick every checklist item to complete</Text>}
    </Screen>
  );
}
