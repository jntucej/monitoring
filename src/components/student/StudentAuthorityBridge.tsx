"use client";

/**
 * StudentAuthorityBridge — the 3-tab Authority Bridge screen.
 *
 * Tab 1 · Class Feed: pinned circulars (operational_announcements) +
 *           official answers (confirmed_knowledge). Constraint tags render
 *           as `[regulation · Official]`. Recalled circulars show SUPERSEDED.
 * Tab 2 · @agent:   deterministic fast-lookup when llm_circuit_open is true;
 *           otherwise the live @cej_server_bot RAG answer (bot/chat).
 * Tab 3 · Private Vault: sensitive doubt categories (condonation/medical/
 *           marks_dispute/disciplinary/fees) that CANNOT be posted to the
 *           class feed. Each has a live SLA countdown from deadline_watches.
 *
 * Zero-hardcoded: the private-only category list comes from routing_policies
 * (catalog), not from this component. The 5 statutory categories are a UI
 * hint for the vault filter, but the actual routing is DB-driven.
 */
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessagesSquare,
  Bot,
  Lock,
  Clock,
  AlertTriangle,
  Send,
  Loader2,
} from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { useStudentState } from "@/hooks/useStudentState";
import { getAuthHeaders } from "@/lib/utils";

type TabValue = "feed" | "agent" | "vault";

export function StudentAuthorityBridge() {
  const { state: studentState } = useStudentState();
  const { data: circuitData } = useApiResource<{ success: boolean; data: { circuitOpen: boolean } }>(
    "/api/agent/llm-circuit",
    { ttlMs: 30_000 },
  );
  const llmCircuitOpen = circuitData?.data?.circuitOpen ?? false;

  const feedItems = studentState?.authorityBridge?.classFeedItems ?? [];
  const privateTickets = studentState?.authorityBridge?.privateTickets ?? [];

  const [tab, setTab] = useState<TabValue>("feed");
  const [agentMsg, setAgentMsg] = useState("");
  const [agentReply, setAgentReply] = useState<string | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);

  const askAgent = async () => {
    if (!agentMsg.trim()) return;
    setAgentLoading(true);
    setAgentReply(null);
    try {
      const res = await fetch("/api/bot/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ message: agentMsg.trim() }),
      });
      const json = await res.json();
      setAgentReply(json.success ? (json.data?.reply ?? "No answer.") : (json.error?.message ?? "Error"));
    } catch {
      setAgentReply("Network error");
    }
    setAgentLoading(false);
  };

  const tabs: Array<{ val: TabValue; label: string; icon: React.ReactNode }> = [
    { val: "feed", label: "Class Feed", icon: <MessagesSquare className="h-3.5 w-3.5" /> },
    { val: "agent", label: "@agent", icon: <Bot className="h-3.5 w-3.5" /> },
    { val: "vault", label: "Private Vault", icon: <Lock className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold text-text-primary">Authority Bridge</h1>
        {llmCircuitOpen && (
          <Badge variant="leave" dot={false}>
            <AlertTriangle className="mr-1 h-3 w-3" />
            Fast-lookup mode (LLM circuit open)
          </Badge>
        )}
      </div>

      {/* Tab pills */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.val}
            onClick={() => setTab(t.val)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.val ? "bg-sky-600 text-white" : "bg-bg-elevated text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Class Feed ─────────────────────────────────────────── */}
      {tab === "feed" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Pinned circulars & official answers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feedItems.length === 0 ? (
              <p className="text-sm text-text-secondary">No pinned official answers in your cohort yet.</p>
            ) : (
              <ul className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
                {feedItems.map((item) => (
                  <li key={item.id} className="rounded-lg border border-border bg-bg-elevated p-3 text-sm">
                    {item.constraintTag && (
                      <Badge variant="entry" dot={false} className="mb-1.5">{item.constraintTag}</Badge>
                    )}
                    {item.superseded && (
                      <Badge variant="error" dot={false} className="mb-1.5 ml-2">SUPERSEDED</Badge>
                    )}
                    <p className="text-text-primary">{item.body}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {new Date(item.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── @agent ─────────────────────────────────────────────── */}
      {tab === "agent" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4 text-text-secondary" />
              @cej_server_bot
              {llmCircuitOpen && <Badge variant="leave" dot={false}>deterministic lookup</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Input
                  aria-label="Ask @agent"
                  placeholder="Ask a question…"
                  value={agentMsg}
                  onChange={(e) => setAgentMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askAgent()}
                />
                <Button variant="primary" size="sm" onClick={askAgent} disabled={agentLoading || !agentMsg.trim()}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
              {agentLoading && <p className="text-sm text-text-secondary">Thinking…</p>}
              {agentReply && (
                <div className="rounded-lg border border-border bg-bg-elevated p-3 text-sm text-text-primary">
                  {agentReply}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Private Vault ───────────────────────────────────────── */}
      {tab === "vault" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4" />
              Private Vault — sensitive disputes
            </CardTitle>
            <p className="text-xs text-text-secondary">
              These categories are hard-locked to private DM. They never appear in the class feed.
            </p>
          </CardHeader>
          <CardContent>
            {privateTickets.length === 0 ? (
              <p className="text-sm text-text-secondary">No private disputes pending.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {privateTickets.map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <div>
                      <p className="text-text-primary">{t.title}</p>
                      <p className="text-xs text-text-secondary">
                        {t.assignedRole}
                        {t.nextEscalationRole ? ` → ${t.nextEscalationRole}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={t.status === "OPEN" ? "leave" : "offline"} dot={false}>{t.status}</Badge>
                      {t.slaDueAt && (
                        <span className="flex items-center gap-1 text-xs text-text-secondary">
                          <Clock className="h-3 w-3" />
                          SLA {new Date(t.slaDueAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
