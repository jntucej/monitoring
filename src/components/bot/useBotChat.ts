"use client";
import { useCallback, useRef, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import type { BotLang } from "@/lib/rag/config";

export interface Citation { n: number; title: string; source: string | null; score: number; }
export interface Msg {
  id: string;
  dbId?: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  feedback?: -1 | 1;
}

export function useBotChat(lang: BotLang) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (
    text: string,
    sourceLang: BotLang | "auto" = "auto",
    onDone?: (fullText: string) => void,
  ) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const draftId = crypto.randomUUID();
    const draft: Msg = { id: draftId, role: "assistant", content: "" };
    setMessages((m) => [...m, userMsg, draft]);
    setStreaming(true);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch("/api/bot/chat", {
        method: "POST",
        headers: { "content-type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ message: trimmed, conversationId, lang, sourceLang }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      let cites: Citation[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";
        for (const frame of frames) {
          const ev = /^event:\s*(.+)$/m.exec(frame)?.[1];
          const dataLine = /^data:\s*(.+)$/m.exec(frame)?.[1];
          if (!ev || !dataLine) continue;
          const data = JSON.parse(dataLine);
          if (ev === "meta") { setConversationId(data.conversationId); cites = data.citations ?? []; }
          else if (ev === "token") {
            acc += data.delta;
            setMessages((m) => m.map((x) => (x.id === draftId ? { ...x, content: acc } : x)));
          } else if (ev === "error") {
            acc += `\n\n[error: ${data.message}]`;
            setMessages((m) => m.map((x) => (x.id === draftId ? { ...x, content: acc } : x)));
          }
        }
      }
      setMessages((m) => m.map((x) => (x.id === draftId ? { ...x, citations: cites } : x)));
      onDone?.(acc);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((m) => m.map((x) =>
          x.id === draftId ? { ...x, content: "Something went wrong. Try again." } : x));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [conversationId, streaming, lang]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => { setMessages([]); setConversationId(null); }, []);

  const setFeedback = useCallback(async (msgId: string, feedback: -1 | 1) => {
    setMessages((m) => m.map((x) => (x.id === msgId ? { ...x, feedback } : x)));
    const msg = messages.find((x) => x.id === msgId);
    if (!msg?.dbId) return;
    try {
      await fetch("/api/bot/feedback", {
        method: "POST",
        headers: { "content-type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ messageId: msg.dbId, feedback }),
      });
    } catch {}
  }, [messages]);

  return { messages, streaming, send, cancel, reset, setFeedback };
}
