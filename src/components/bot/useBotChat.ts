"use client";
import { useCallback, useRef } from "react";
import { useBotStore, type Citation } from "./store";
import { getAuthHeaders } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

const FLUSH_MS = 33;

export function useBotChat() {
  const lang = useBotStore((s) => s.lang);
  const conversationId = useBotStore((s) => s.conversationId);
  const appendUser = useBotStore((s) => s.appendUser);
  const appendDraft = useBotStore((s) => s.appendDraft);
  const setDraftContent = useBotStore((s) => s.setDraftContent);
  const setDraftCitations = useBotStore((s) => s.setDraftCitations);
  const setDraftStatus = useBotStore((s) => s.setDraftStatus);
  const setConversationId = useBotStore((s) => s.setConversationId);
  const setStreaming = useBotStore((s) => s.setStreaming);
  const setError = useBotStore((s) => s.setError);

  const abortRef = useRef<AbortController | null>(null);
  const inflightRef = useRef<boolean>(false);

  const send = useCallback(async (
    raw: string,
    sourceLang: "auto" | "en" | "te" = "auto",
    onDone?: (fullText: string) => void,
  ) => {
    const text = raw.trim();
    if (!text || inflightRef.current) return;

    const token = useAuthStore.getState().token;
    if (!token) { setError("unauthenticated"); return; }

    inflightRef.current = true;
    setError(null);
    setStreaming(true);

    appendUser(text);
    const draftId = appendDraft();

    const ac = new AbortController();
    abortRef.current = ac;

    let acc = "";
    let lastFlush = 0;
    let pending: ReturnType<typeof setTimeout> | null = null;

    const flush = (force = false) => {
      const now = performance.now();
      if (!force && now - lastFlush < FLUSH_MS) {
        if (!pending) {
          pending = setTimeout(() => { pending = null; flush(true); }, FLUSH_MS);
        }
        return;
      }
      lastFlush = now;
      setDraftContent(draftId, acc);
    };

    try {
      const res = await fetch("/api/bot/chat", {
        method: "POST",
        headers: { "content-type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          message: text,
          conversationId,
          lang,
          sourceLang,
        }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const bodyText = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${bodyText ? `: ${bodyText.slice(0, 120)}` : ""}`);
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
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

          let data: any;
          try { data = JSON.parse(dataLine); } catch { continue; }

          if (ev === "meta") {
            if (data.conversationId) setConversationId(data.conversationId);
            cites = data.citations ?? [];
          } else if (ev === "token") {
            acc += data.delta ?? "";
            flush();
          } else if (ev === "error") {
            acc += `\n\n[error: ${data.message ?? "unknown"}]`;
            flush(true);
          }
        }
      }

      if (pending) { clearTimeout(pending); pending = null; }
      flush(true);
      setDraftCitations(draftId, cites);
      setDraftStatus(draftId, "done");

      onDone?.(acc);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setDraftStatus(draftId, "done");
      } else {
        const msg = err?.message ?? "unknown_error";
        setError(msg);
        setDraftContent(draftId, acc || "");
        setDraftStatus(draftId, "error");
      }
    } finally {
      if (pending) clearTimeout(pending);
      inflightRef.current = false;
      setStreaming(false);
      abortRef.current = null;
    }
  }, [
    conversationId, lang, appendUser, appendDraft, setDraftContent,
    setDraftCitations, setDraftStatus, setConversationId, setStreaming, setError,
  ]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const setFeedback = useCallback(async (msgId: string, feedback: -1 | 1) => {
    const store = useBotStore.getState();
    const msg = store.messages.find((m) => m.id === msgId);
    store.setFeedback(msgId, feedback);
    if (!msg?.dbId) return;
    try {
      await fetch("/api/bot/feedback", {
        method: "POST",
        headers: { "content-type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ messageId: msg.dbId, feedback }),
      });
    } catch {}
  }, []);

  return { send, cancel, setFeedback };
}
