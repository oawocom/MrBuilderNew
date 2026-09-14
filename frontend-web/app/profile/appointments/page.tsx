"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, getUser, User } from "@/lib/api";
import { Card, EmptyState, PageHeader } from "@/components/dashboard/ui";

interface Conversation {
  id: string; job_id: string; job_title: string; other_name: string;
  last_message: string | null; unread_count: number;
}
interface Message {
  id: string; sender_id: string; message_type: string; content: string | null; created_at: string;
}

function MessagesInner() {
  const params = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(params.get("conversation"));
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(() => {
    api<Conversation[]>("/conversations").then((res) => setConvs(res.success && res.data ? res.data : []));
  }, []);

  const loadMessages = useCallback((cid: string) => {
    api<Message[]>(`/conversations/${cid}/messages?limit=100`).then((res) => {
      if (res.success && res.data) setMessages([...res.data].reverse());
    });
  }, []);

  useEffect(() => {
    setUser(getUser());
    loadConvs();
  }, [loadConvs]);

  useEffect(() => {
    if (active) loadMessages(active);
  }, [active, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!active || !text.trim()) return;
    const res = await api<Message>(`/conversations/${active}/messages`, { method: "POST", body: { content: text.trim() } });
    if (res.success) {
      setText("");
      loadMessages(active);
      loadConvs();
    }
  }

  if (!user) return null;

  return (
    <div>
      <PageHeader title="Messages" subtitle="Chat about your scheduled jobs" />
      {convs.length === 0 ? (
        <EmptyState text="No conversations yet. Chats open once a job has an assigned contractor." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-2">
            {convs.map((c) => (
              <button key={c.id} onClick={() => setActive(c.id)} className={`w-full rounded-xl border p-4 text-left transition ${active === c.id ? "border-brand-400 bg-brand-50" : "border-gray-200 bg-white hover:border-brand-300"}`}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{c.other_name}</p>
                  {c.unread_count > 0 && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">{c.unread_count}</span>}
                </div>
                <p className="mt-0.5 truncate text-sm text-gray-500">{c.job_title}</p>
                {c.last_message && <p className="mt-1 truncate text-sm text-gray-400">{c.last_message}</p>}
              </button>
            ))}
          </div>

          <Card className="flex h-[560px] flex-col p-0">
            {!active ? (
              <div className="flex flex-1 items-center justify-center text-gray-400">Select a conversation</div>
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_id === user.id ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${m.sender_id === user.id ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-900"}`}>
                        <p>{m.content}</p>
                        <p className={`mt-0.5 text-[10px] ${m.sender_id === user.id ? "text-white/70" : "text-gray-400"}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div className="flex gap-2 border-t border-gray-100 p-3">
                  <input
                    className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 focus:border-brand-500 focus:outline-none"
                    placeholder="Type a message..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                  />
                  <button onClick={send} className="rounded-lg bg-brand-600 px-5 font-semibold text-white">Send</button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesInner />
    </Suspense>
  );
}
