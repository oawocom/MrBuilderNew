"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, Badge } from "@/components/dashboard/table";
import { Btn, Input, Modal, Select, Textarea, Toggle, useToast } from "@/components/admin/ui";
import { api } from "@/lib/api";

interface Lesson { id: string; slug: string; title: string; summary: string | null; duration_minutes: number | null; is_placeholder: boolean | null; manufacturer: string | null; model: string | null; sort_order: number | null; is_active: boolean | null; has_video: boolean; questions: number }
interface Module { id: string; kind: string; category: string | null; slug: string; title: string; description: string | null; lessons: Lesson[] }
interface Question { question: string; options: { id: string; text: string }[]; correct_option: string; is_critical: boolean; explanation: string | null }
interface Full { slug: string; module: string; title: string; summary: string | null; video_url: string | null; transcript: string | null; examples: unknown; checklist: { id: string; text: string }[]; duration_minutes: number; is_placeholder: boolean; manufacturer: string | null; model: string | null; sort_order: number; is_active: boolean; questions: Question[] }

const blankQ = (): Question => ({ question: "", options: [{ id: "a", text: "" }, { id: "b", text: "" }, { id: "c", text: "" }, { id: "d", text: "" }], correct_option: "a", is_critical: false, explanation: "" });

export default function TrainingPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [open, setOpen] = useState<Full | null>(null);
  const [isNew, setIsNew] = useState(false);
  const { toast, show } = useToast();

  const load = useCallback(async () => { const r = await api<Module[]>("/admin/training"); setModules(r.data ?? []); }, []);
  useEffect(() => { load(); }, [load]);

  async function edit(slug: string) {
    const r = await api<Full>(`/admin/training/lessons/${slug}`);
    if (r.data) { setOpen({ ...r.data, checklist: r.data.checklist ?? [], questions: r.data.questions ?? [] }); setIsNew(false); }
  }
  function create(moduleSlug: string) {
    setOpen({ slug: "", module: moduleSlug, title: "", summary: "", video_url: "", transcript: "", examples: [], checklist: [], duration_minutes: 5, is_placeholder: true, manufacturer: null, model: null, sort_order: 99, is_active: true, questions: [] });
    setIsNew(true);
  }
  async function save() {
    if (!open?.slug || !open.title) { show("Slug and title are required", true); return; }
    const l = await api(`/admin/training/lessons/${open.slug}`, { method: "PUT", body: { module: open.module, slug: open.slug, title: open.title, summary: open.summary, video_url: open.video_url, transcript: open.transcript, checklist: open.checklist, duration_minutes: open.duration_minutes, manufacturer: open.manufacturer, model: open.model, is_placeholder: open.is_placeholder, sort_order: open.sort_order, is_active: open.is_active } });
    if (!l.success) { show(l.error ?? "Failed", true); return; }
    const valid = open.questions.filter((q) => q.question.trim() && q.options.every((o) => o.text.trim()));
    const qr = await api(`/admin/training/lessons/${open.slug}/quiz`, { method: "PUT", body: { questions: valid.map((q) => ({ question: q.question, options: q.options, correct_option: q.correct_option, is_critical: q.is_critical, explanation: q.explanation || null })) } });
    show(qr.success ? `Saved · ${valid.length} question(s)` : qr.error ?? "Quiz failed", !qr.success);
    setOpen(null); load();
  }
  const setQ = (i: number, patch: Partial<Question>) => setOpen((o) => o && { ...o, questions: o.questions.map((q, k) => (k === i ? { ...q, ...patch } : q)) });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Training content" subtitle="Core → Safety → category modules. A lesson with a quiz completes only by passing (≥ quiz_pass_pct, all critical questions right). Lessons without a quiz complete by acknowledgement." />
      {modules.map((m) => (
        <div key={m.id} className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <div><h2 className="text-lg font-semibold">{m.title} <Badge color={m.kind === "core" ? "blue" : m.kind === "safety" ? "error" : "gray"}>{m.kind}</Badge></h2><p className="text-sm text-gray-500">{m.description}</p></div>
            <Btn small kind="secondary" onClick={() => create(m.slug)}>+ Lesson</Btn>
          </div>
          <div className="divide-y divide-gray-100">
            {m.lessons.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2">
                <div className="text-sm"><span className="font-mono text-xs text-gray-400">{l.slug}</span> <span className="font-medium">{l.title}</span>{l.manufacturer && <span className="text-gray-400"> · {l.manufacturer} {l.model}</span>}<div className="text-xs text-gray-500">{l.summary}</div></div>
                <div className="flex items-center gap-2">
                  {l.is_placeholder && <Badge color="warning">placeholder · pending SME</Badge>}
                  <Badge color={l.has_video ? "success" : "gray"}>{l.has_video ? "video" : "no video"}</Badge>
                  <Badge color={l.questions ? "success" : "gray"}>{l.questions ? `${l.questions} Q` : "no quiz"}</Badge>
                  {l.is_active === false && <Badge color="gray">inactive</Badge>}
                  <Btn small kind="secondary" onClick={() => edit(l.slug)}>Edit</Btn>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <Modal open={!!open} onClose={() => setOpen(null)} title={isNew ? "New lesson" : `Edit · ${open?.slug}`} wide>
        {open && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <Select label="Module" value={open.module} onChange={(v) => setOpen({ ...open, module: v })} options={modules.map((m) => ({ value: m.slug, label: m.title }))} />
              <Input label="Slug" value={open.slug} onChange={(v) => setOpen({ ...open, slug: v })} disabled={!isNew} />
              <Input label="Title" value={open.title} onChange={(v) => setOpen({ ...open, title: v })} />
              <div className="col-span-2 md:col-span-3"><Input label="Summary" value={open.summary ?? ""} onChange={(v) => setOpen({ ...open, summary: v })} /></div>
              <div className="col-span-2 md:col-span-3"><Input label="Video URL" value={open.video_url ?? ""} onChange={(v) => setOpen({ ...open, video_url: v })} hint="Upload to storage (Integrations) and paste the URL" /></div>
              <Input label="Duration (min)" type="number" value={open.duration_minutes} onChange={(v) => setOpen({ ...open, duration_minutes: Number(v) })} />
              <Input label="Manufacturer (reference lessons)" value={open.manufacturer ?? ""} onChange={(v) => setOpen({ ...open, manufacturer: v || null })} />
              <Input label="Model" value={open.model ?? ""} onChange={(v) => setOpen({ ...open, model: v || null })} />
              <Input label="Sort order" type="number" value={open.sort_order} onChange={(v) => setOpen({ ...open, sort_order: Number(v) })} />
              <Toggle label="Placeholder (pending SME review)" checked={open.is_placeholder} onChange={(v) => setOpen({ ...open, is_placeholder: v })} />
              <Toggle label="Active" checked={open.is_active} onChange={(v) => setOpen({ ...open, is_active: v })} />
            </div>
            <Textarea label="Transcript / lesson text" rows={5} value={open.transcript ?? ""} onChange={(v) => setOpen({ ...open, transcript: v })} />
            <div>
              <div className="mb-1 text-xs font-medium text-gray-600">Checklist (acknowledged by the contractor)</div>
              {open.checklist.map((c, i) => (
                <div key={i} className="mb-1 flex gap-2"><Input value={c.text} onChange={(v) => setOpen({ ...open, checklist: open.checklist.map((x, k) => (k === i ? { ...x, text: v } : x)) })} /><Btn small kind="ghost" onClick={() => setOpen({ ...open, checklist: open.checklist.filter((_, k) => k !== i) })}>✕</Btn></div>
              ))}
              <Btn small kind="secondary" onClick={() => setOpen({ ...open, checklist: [...open.checklist, { id: `c${open.checklist.length + 1}`, text: "" }] })}>+ item</Btn>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between"><div className="text-sm font-semibold">Quiz ({open.questions.length})</div><Btn small kind="secondary" onClick={() => setOpen({ ...open, questions: [...open.questions, blankQ()] })}>+ question</Btn></div>
              <div className="space-y-4">
                {open.questions.map((q, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex gap-2"><div className="flex-1"><Input label={`Question ${i + 1}`} value={q.question} onChange={(v) => setQ(i, { question: v })} /></div><Btn small kind="ghost" onClick={() => setOpen({ ...open, questions: open.questions.filter((_, k) => k !== i) })}>✕</Btn></div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {q.options.map((o, oi) => (
                        <label key={o.id} className="flex items-center gap-2 text-sm"><input type="radio" name={`c${i}`} checked={q.correct_option === o.id} onChange={() => setQ(i, { correct_option: o.id })} title="correct" /><span className="w-4 font-mono text-xs">{o.id}</span><input value={o.text} onChange={(e) => setQ(i, { options: q.options.map((x, k) => (k === oi ? { ...x, text: e.target.value } : x)) })} className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm" /></label>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-3 items-end"><div className="col-span-2"><Input label="Explanation (shown after answering)" value={q.explanation ?? ""} onChange={(v) => setQ(i, { explanation: v })} /></div><Toggle label="Critical (must be right)" checked={q.is_critical} onChange={(v) => setQ(i, { is_critical: v })} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2"><Btn kind="secondary" onClick={() => setOpen(null)}>Cancel</Btn><Btn onClick={save}>Save lesson & quiz</Btn></div>
          </div>
        )}
      </Modal>
      {toast}
    </div>
  );
}
