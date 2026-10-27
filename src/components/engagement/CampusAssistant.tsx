"use client";

/**
 * Campus Assistant — read-only, permission-bound, deterministic chat panel.
 *
 * The user types a plain-language question; the server (POST
 * /api/campus/assistant) matches it against a small whitelist of intents
 * and answers using the SAME authorized endpoints the app already uses.
 * It never invents data, never calls an external AI service, and is
 * gated to the authenticated caller's own permissions.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Send,
  Loader2,
  MessageSquare,
  User,
  ArrowUpRight,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";

interface AssistantReply {
  intent: "pending_requests" | "upcoming_events" | "announcements" | "my_goals" | "unknown";
  text: string;
  result: Record<string, unknown> | null;
  page?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  result?: Record<string, unknown> | null;
  page?: string;
  intent?: string;
}

const SUGGESTED_QUESTIONS = [
  "What are my pending requests?",
  "What campus events are coming up?",
  "Any announcements for me?",
  "How are my goals doing?",
];

export function CampusAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(0);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending]);

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || pending) return;
      idRef.current += 1;
      const userMsgId = `u-${idRef.current}`;
      setMessages((prev) => [...prev, { id: userMsgId, role: "user", text: q }]);
      setInput("");
      setPending(true);
      setError(null);
      try {
        const res = await fetch("/api/campus/assistant", {
          method: "POST",
          headers: getAuthHeaders(),
          cache: "no-store",
          body: JSON.stringify({ question: q }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          throw new Error(json?.error?.message ?? "Assistant unavailable");
        }
        const data = json.data as AssistantReply;
        idRef.current += 1;
        const replyId = `a-${idRef.current}`;
        setMessages((prev) => [
          ...prev,
          {
            id: replyId,
            role: "assistant",
            text: data.text,
            result: data.result,
            page: data.page,
            intent: data.intent,
          },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Assistant unavailable");
      } finally {
        setPending(false);
      }
    },
    [pending]
  );

  // Deterministic result rendering: only render what the server returned.
  function renderResult(msg: ChatMessage) {
    if (!msg.result) return null;
    const r = msg.result as {
      count?: number;
      completed?: number;
      requests?: Array<{ ticket?: string; type?: string; stage?: string }>;
      events?: Array<{ title?: string; startsAt?: string; location?: string | null }>;
      announcements?: Array<{ title?: string; priority?: string }>;
      goals?: Array<{ title?: string; progress?: string; completed?: boolean }>;
    };
    const rows: string[] = [];
    if (r.requests?.length) {
      for (const req of r.requests) {
        rows.push(`${req.ticket ?? "ticket"} · ${req.type ?? "request"}${req.stage ? ` · at ${req.stage}` : ""}`);
      }
    } else if (r.events?.length) {
      for (const ev of r.events) {
        rows.push(`${ev.title}${ev.location ? ` · ${ev.location}` : ""}`);
      }
    } else if (r.announcements?.length) {
      for (const a of r.announcements) {
        rows.push(`${a.title}${a.priority ? ` (${a.priority})` : ""}`);
      }
    } else if (r.goals?.length) {
      for (const g of r.goals) {
        rows.push(`${g.title} · ${g.progress}${g.completed ? " ✓" : ""}`);
      }
    }

    return (
      <div className="mt-2 space-y-1.5">
        {rows.length > 0 && (
          <ul className="space-y-1 text-xs text-[var(--text-primary)]">
            {rows.map((line, i) => (
              <li key={i} className="rounded-lg bg-[var(--bg-raised)]/50 px-2.5 py-1.5">
                {line}
              </li>
            ))}
          </ul>
        )}
        {typeof r.count === "number" && rows.length === 0 && (
          <p className="text-xs text-[var(--text-muted)]">{r.count} item{r.count === 1 ? "" : "s"} total</p>
        )}
        {msg.page && (
          <a
            href={msg.page}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-indigo-200 motion-safe:transition-colors motion-reduce:transition-none"
          >
            Open {msg.page.replace(/^\//, "")}
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </a>
        )}
      </div>
    );
  }

  return (
    <WidgetBoundary title="Campus Assistant">
      <section aria-label="Campus assistant" className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
            <Bot className="h-4.5 w-4.5" aria-hidden />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Campus Assistant</h2>
            <p className="text-[10px] text-[var(--text-muted)]">
              Read-only · answers from your own authorized data · no AI guessing
            </p>
          </div>
        </div>

        <div
          ref={listRef}
          className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-raised)]/20 p-3"
          aria-label="Assistant conversation"
        >
          {messages.length === 0 && !pending ? (
            <div className="flex flex-col items-center gap-2.5 py-6 text-center text-[var(--text-muted)]">
              <MessageSquare className="h-5 w-5 opacity-50" aria-hidden />
              <p className="max-w-xs text-xs">
                Ask me about your pending requests, upcoming events, announcements, or
                your personal goals.
              </p>
              <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void ask(q)}
                    className="rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] motion-safe:transition-colors motion-reduce:transition-none"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={msg.role === "user" ? "justify-end" : "justify-start"}>
                <div
                  className={`flex max-w-[85%] items-start gap-2 rounded-xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "ml-auto bg-indigo-500/20 text-indigo-100"
                      : "bg-[var(--bg-raised)]/60 text-[var(--text-primary)]"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" aria-hidden />
                  ) : (
                    <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-300" aria-hidden />
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] leading-snug">{msg.text}</p>
                    {msg.role === "assistant" && renderResult(msg)}
                  </div>
                </div>
              </div>
            ))
          )}
          {pending && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]" role="status">
              <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
              Thinking…
            </div>
          )}
        </div>

        {error && (
          <p className="mt-2 text-xs text-rose-300" role="alert">
            {error}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(input);
              }
            }}
            placeholder="Ask about requests, events, announcements, goals…"
            aria-label="Campus assistant question"
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/40 motion-safe:transition-shadow motion-reduce:transition-none"
          />
          <button
            type="button"
            onClick={() => void ask(input)}
            disabled={pending || !input.trim()}
            aria-label="Send question"
            className="rounded-lg border border-violet-500/40 bg-violet-500/20 p-2 text-violet-200 hover:bg-violet-500/30 motion-safe:transition-colors motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </section>
    </WidgetBoundary>
  );
}
