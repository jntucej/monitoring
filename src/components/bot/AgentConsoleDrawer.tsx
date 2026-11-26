"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, CheckCircle2, Clock, FileWarning, HelpCircle, Send, X } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import type { DraftActionCard } from "@/lib/agent/toolGateway";

interface AgentConsoleDrawerProps {
  role: string;
}

export function AgentConsoleDrawer({ role }: AgentConsoleDrawerProps) {
  const api = useApi();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<string>("");
  const [toolSummary, setToolSummary] = useState<string>("");
  const [draft, setDraft] = useState<DraftActionCard | null>(null);
  const [draftStatus, setDraftStatus] = useState<string>("");

  async function runAgent(
    message: string,
    tool?: "get_pending_items" | "get_unnoted_circulars" | "explain_workflow_status" | "draft_action",
  ) {
    if (!message.trim() || loading) return;
    setLoading(true);
    setReply("");
    setToolSummary("");
    setDraft(null);
    setDraftStatus("");

    try {
      const res = await fetch("/api/bot/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message,
          activeConsoleRole: role,
          entityContext: { pathname },
          tool,
        }),
      });

      if (!res.ok || !res.body) {
        const errJson = await res.json().catch(() => null);
        setReply(errJson?.error?.message ?? `Request failed (${res.status})`);
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let currentEvent = "message";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            const raw = line.slice(5).trim();
            if (!raw) continue;
            try {
              const parsed = JSON.parse(raw);
              if (currentEvent === "token" && typeof parsed.delta === "string") {
                setReply((prev) => prev + parsed.delta);
              } else if (currentEvent === "tool_result") {
                setToolSummary(JSON.stringify(parsed.data, null, 2));
              } else if (currentEvent === "draft_action") {
                setDraft(parsed as DraftActionCard);
              } else if (currentEvent === "error") {
                setReply((prev) => prev || parsed.message || "Agent error");
              }
            } catch {
              // ignore malformed SSE chunk
            }
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function confirmDraft() {
    if (!draft) return;
    setDraftStatus("Submitting...");
    try {
      await api.post(draft.endpoint, draft.payload);
      setDraftStatus("Confirmed and executed.");
      setDraft(null);
    } catch (e) {
      setDraftStatus(e instanceof Error ? e.message : "Failed to execute draft.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open Role Agent Drawer"
        className="fixed bottom-20 right-6 z-30 flex items-center gap-2 rounded-full bg-accent-primary px-4 py-2.5 text-xs font-semibold text-white shadow-lg hover:opacity-95"
      >
        <Bot className="size-4" />
        <span>Agent</span>
      </button>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Role Agent Console">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} aria-hidden />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-bg-surface shadow-2xl border-l border-border-subtle">
            <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="size-5 text-accent-primary" />
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">Role Agent</h2>
                  <p className="text-[11px] text-text-secondary">Scoped to {role} · {pathname}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close Agent Drawer"
                className="rounded-md p-1.5 text-text-secondary hover:bg-bg-elevated"
              >
                <X className="size-4" />
              </button>
            </header>

            {/* Top Quick-Action Strip */}
            <div className="flex flex-wrap gap-1.5 border-b border-border-subtle px-4 py-2.5 bg-bg-elevated/40">
              <button
                type="button"
                onClick={() => runAgent("What is pending for me?", "get_pending_items")}
                className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-bg-surface px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-bg-elevated"
              >
                <Clock className="size-3.5" />
                Pending for Me
              </button>
              <button
                type="button"
                onClick={() => runAgent("Which circulars haven't I noted?", "get_unnoted_circulars")}
                className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-bg-surface px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-bg-elevated"
              >
                <FileWarning className="size-3.5" />
                Unnoted Circulars
              </button>
              <button
                type="button"
                onClick={() => runAgent(`Why is ${pathname} blocked or what is the next stage?`, "explain_workflow_status")}
                className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-bg-surface px-2.5 py-1 text-xs font-medium text-text-primary hover:bg-bg-elevated"
              >
                <HelpCircle className="size-3.5" />
                Why Is This Blocked?
              </button>
            </div>

            {/* Output Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
              {loading && <p className="text-xs text-text-secondary animate-pulse">Checking scoped records...</p>}

              {reply && (
                <div className="rounded-lg border border-border-subtle bg-bg-elevated/50 p-3 whitespace-pre-wrap text-text-primary">
                  {reply}
                </div>
              )}

              {toolSummary && (
                <details className="rounded-lg border border-border-subtle bg-bg-base p-2.5 text-xs">
                  <summary className="cursor-pointer font-medium text-text-secondary">Scoped Tool Data</summary>
                  <pre className="mt-2 overflow-x-auto text-[11px] text-text-secondary">{toolSummary}</pre>
                </details>
              )}

              {draft && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <CheckCircle2 className="size-4" />
                    <span>Proposed Action Draft (Confirmation Required)</span>
                  </div>
                  <p className="text-xs font-medium text-text-primary">{draft.title}</p>
                  <p className="text-xs text-text-secondary">{draft.summary}</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={confirmDraft}
                      className="rounded-md bg-accent-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
                    >
                      Confirm &amp; Send
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft(null)}
                      className="rounded-md border border-border-subtle px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-elevated"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {draftStatus && <p className="text-xs text-text-secondary">{draftStatus}</p>}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAgent(prompt);
                setPrompt("");
              }}
              className="border-t border-border-subtle p-3 flex gap-2"
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask about pending items, circulars, or workflows..."
                className="flex-1 rounded-md border border-border-subtle bg-bg-base px-3 py-2 text-xs text-text-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="rounded-md bg-accent-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Send className="size-4" />
              </button>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
