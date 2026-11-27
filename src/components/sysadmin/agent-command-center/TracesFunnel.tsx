"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  EntityInspector,
  KVPairs,
  Timeline,
  type EntityInspection,
} from "@/components/shared/EntityInspector";
import { useEntityInspector } from "@/components/shared/useEntityInspector";

export interface AgentTraceRecord {
  id: string;
  request_id: string;
  session_id: string | null;
  actor_role: string;
  lane: string;
  tool_name: string | null;
  tool_status: string | null;
  knowledge_match_type: string | null;
  draft_emitted: boolean;
  latency_ms: number;
  created_at: string;
}

export type TraceStatusFilter = "all" | "running" | "completed" | "failed";

export function getTraceStatus(trace: AgentTraceRecord): "running" | "completed" | "failed" {
  if (trace.tool_status === "error") return "failed";
  if (trace.tool_status === "ok" || trace.tool_status === "denied" || trace.tool_status === "empty") {
    return "completed";
  }
  if (trace.tool_name && trace.tool_status === null) return "running";
  return "completed";
}

interface TracesFunnelProps {
  refreshSignal?: number;
}

export default function TracesFunnel({ refreshSignal = 0 }: TracesFunnelProps) {
  const api = useApi();
  const { inspection, inspect, closeInspection } = useEntityInspector();

  const [traces, setTraces] = useState<AgentTraceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TraceStatusFilter>("all");
  const [search, setSearch] = useState<string>("");

  const fetchTraces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.request<{ traces: AgentTraceRecord[] }>("/api/sysadmin/agent-traces");
      if (res.success && res.data && Array.isArray(res.data.traces)) {
        setTraces(res.data.traces);
      } else {
        setError(res.error || "Failed to fetch agent traces from server.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error fetching traces.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchTraces();
  }, [fetchTraces, refreshSignal]);

  const funnelMetrics = useMemo(() => {
    const totalTraces = traces.length;
    const toolKbHits = traces.filter(
      (t) => Boolean(t.tool_name) || Boolean(t.knowledge_match_type),
    ).length;
    const draftEmittedCount = traces.filter((t) => Boolean(t.draft_emitted)).length;
    const confirmedCount = traces.filter((t) => t.tool_status === "ok").length;
    return { totalTraces, toolKbHits, draftEmittedCount, confirmedCount };
  }, [traces]);

  const funnelStages = useMemo(() => {
    const maxVal = Math.max(funnelMetrics.totalTraces, 1);
    return [
      {
        step: "Opened @agent Drawer",
        count: null as number | null,
        source: null,
        dropLabel: "Dismissed Early",
        dropCount: null as number | null,
        dropReason: "Drawer open telemetry not captured in agent_traces table",
        note: "no data for this stage",
      },
      {
        step: "Tool / KB Hit",
        count: funnelMetrics.toolKbHits,
        source: "agent_traces (tool_name != null OR knowledge_match_type != null)",
        dropLabel: "No Match / Early Exit",
        dropCount: Math.max(0, funnelMetrics.totalTraces - funnelMetrics.toolKbHits),
        dropReason: "Traces without tool invocation or knowledge match",
        note: null,
      },
      {
        step: "Draft Action Card",
        count: funnelMetrics.draftEmittedCount,
        source: "agent_traces (draft_emitted = true)",
        dropLabel: "Escalated to Authority",
        dropCount: null as number | null,
        dropReason: "Escalation breakdown not captured in agent_traces table",
        note: null,
      },
      {
        step: "Confirmed & Sent",
        count: funnelMetrics.confirmedCount,
        source: "agent_traces (tool_status = 'ok')",
        dropLabel: "Abandoned Draft",
        dropCount: null as number | null,
        dropReason: "Draft abandonment vs dismissal not captured in agent_traces table",
        note: null,
      },
    ].map((s, idx) => ({
      ...s,
      pct: s.count === null ? 0 : Math.round((s.count / maxVal) * 100),
      idx: idx + 1,
    }));
  }, [funnelMetrics]);

  const openTraceInspection = useCallback(
    (trace: AgentTraceRecord) => {
      const status = getTraceStatus(trace);
      const isFailed = status === "failed";
      const isRunning = status === "running";

      const timelineItems: Array<{
        label: string;
        time?: string;
        detail?: string;
        tone?: "ok" | "warn" | "danger" | "neutral";
      }> = [
        {
          label: "1. Prompt Ingestion / Invocation",
          time: new Date(trace.created_at).toLocaleTimeString(),
          detail: `Actor role: ${trace.actor_role} · Lane: ${trace.lane} · Req: ${trace.request_id}`,
          tone: "neutral",
        },
        {
          label: "2. KB Hit Verification",
          detail: trace.knowledge_match_type
            ? `Knowledge match: ${trace.knowledge_match_type}`
            : "No knowledge base match required",
          tone: trace.knowledge_match_type ? "ok" : "neutral",
        },
        {
          label: "3. Tool Call Dispatch",
          detail: trace.tool_name
            ? `Tool: ${trace.tool_name} (Status: ${trace.tool_status ?? "in-flight"})`
            : "No external tool dispatched for this trace",
          tone: trace.tool_status === "error" ? "danger" : trace.tool_name ? "ok" : "neutral",
        },
        {
          label: "4. Action Draft Generation",
          detail: trace.draft_emitted
            ? "Draft action card created for user review"
            : "No draft emitted for this trace",
          tone: trace.draft_emitted ? "warn" : "neutral",
        },
        {
          label: "5. Execution Outcome",
          time: `${trace.latency_ms} ms total elapsed`,
          detail:
            trace.tool_status === "ok"
              ? "Confirmed & successfully executed"
              : trace.tool_status === "error"
              ? "Execution encountered an error"
              : trace.tool_status === "denied"
              ? "Action denied by policy or guardrails"
              : trace.tool_status === "empty"
              ? "Executed with empty result"
              : "Completed without tool action",
          tone: isFailed ? "danger" : isRunning ? "warn" : "ok",
        },
      ];

      const model: EntityInspection = {
        kind: "agent_trace",
        title: trace.tool_name ? `Agent Run: ${trace.tool_name}` : `Agent Run (${trace.lane})`,
        subtitle: `Trace ID: ${trace.id} · Session: ${trace.session_id || "direct"}`,
        status: (
          <span
            className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded ${
              status === "completed"
                ? "bg-emerald-500/15 text-action-success border border-emerald-500/20"
                : status === "failed"
                ? "bg-rose-500/15 text-action-danger border border-rose-500/20"
                : "bg-blue-500/15 text-action-info border border-blue-500/20 animate-pulse"
            }`}
          >
            {status}
          </span>
        ),
        sections: [
          {
            title: "Trace Overview",
            content: (
              <KVPairs
                items={[
                  { label: "Trace ID", value: <span className="font-mono">{trace.id}</span> },
                  { label: "Request ID", value: <span className="font-mono">{trace.request_id}</span> },
                  {
                    label: "Session ID",
                    value: trace.session_id ? (
                      <span className="font-mono">{trace.session_id}</span>
                    ) : (
                      "—"
                    ),
                  },
                  { label: "Actor Role", value: trace.actor_role },
                  { label: "Execution Lane", value: trace.lane },
                  { label: "Total Latency", value: `${trace.latency_ms} ms` },
                  {
                    label: "Logged At",
                    value: new Date(trace.created_at).toLocaleString(),
                  },
                ]}
              />
            ),
          },
          {
            title: "Nested Step Trace",
            content: <Timeline items={timelineItems} />,
          },
          {
            title: "Tool & Draft Parameters",
            content: (
              <KVPairs
                items={[
                  { label: "Tool Dispatched", value: trace.tool_name ?? "None" },
                  { label: "Tool Status", value: trace.tool_status ?? "None" },
                  {
                    label: "KB Match Type",
                    value: trace.knowledge_match_type ?? "None",
                  },
                  {
                    label: "Draft Emitted",
                    value: trace.draft_emitted ? "Yes (Card Drafted)" : "No",
                  },
                ]}
              />
            ),
          },
        ],
      };

      inspect(model);
    },
    [inspect],
  );

  const filteredTraces = useMemo(() => {
    return traces.filter((t) => {
      const status = getTraceStatus(t);
      if (filter !== "all" && status !== filter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTool = t.tool_name?.toLowerCase().includes(q) ?? false;
        const matchesRole = t.actor_role.toLowerCase().includes(q);
        const matchesLane = t.lane.toLowerCase().includes(q);
        const matchesId = t.id.toLowerCase().includes(q) || t.request_id.toLowerCase().includes(q);
        if (!matchesTool && !matchesRole && !matchesLane && !matchesId) return false;
      }
      return true;
    });
  }, [traces, filter, search]);

  const counts = useMemo(() => {
    let running = 0;
    let completed = 0;
    let failed = 0;
    for (const t of traces) {
      const s = getTraceStatus(t);
      if (s === "running") running++;
      else if (s === "completed") completed++;
      else if (s === "failed") failed++;
    }
    return { all: traces.length, running, completed, failed };
  }, [traces]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── 4-step Sankey / Doubt Funnel ── */}
      <section className="surface-card bg-bg-surface p-4 sm:p-5 rounded-xl border border-border flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Layers className="size-4 text-action-primary" />
              Agent &amp; Doubt Funnel
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              4-step progression derived strictly from real <code className="font-mono text-[11px]">agent_traces</code> telemetry
            </p>
          </div>
          <span className="text-xs font-mono text-text-muted">
            {traces.length} total runs analyzed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {funnelStages.map((stage, idx) => {
            const isNoData = stage.count === null;
            return (
              <div
                key={stage.step}
                className={`flex flex-col justify-between rounded-xl p-3.5 border transition-all ${
                  isNoData
                    ? "border-dashed border-border bg-bg-base/40 opacity-80"
                    : "border-border bg-bg-elevated/40 hover:bg-bg-elev-2"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                      Step {stage.idx}
                    </span>
                    <h3 className="text-xs font-bold text-text-primary truncate mt-0.5" title={stage.step}>
                      {stage.step}
                    </h3>
                  </div>
                  {idx < funnelStages.length - 1 && (
                    <ArrowRight className="size-3.5 text-text-muted shrink-0 hidden lg:block mt-1" />
                  )}
                </div>

                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span
                    className={`text-xl font-bold font-mono ${
                      isNoData ? "text-text-muted text-base" : "text-text-primary"
                    }`}
                  >
                    {isNoData ? "—" : stage.count}
                  </span>
                  {!isNoData && (
                    <span className="text-[11px] font-mono text-text-muted">
                      {stage.pct}%
                    </span>
                  )}
                </div>

                {isNoData ? (
                  <div className="mt-2 text-[11px] font-medium text-action-warning bg-action-warning/10 border border-action-warning/20 px-2 py-1 rounded">
                    {stage.note}
                  </div>
                ) : (
                  <div className="mt-2 truncate text-[10px] font-mono text-text-muted" title={stage.source ?? ""}>
                    {stage.source}
                  </div>
                )}

                {/* Drop-off slot */}
                <div className="mt-3 border-t border-border pt-2 text-[10px] text-text-muted">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium text-text-secondary">Drop: {stage.dropLabel}</span>
                    <span className="font-mono">
                      {stage.dropCount === null ? "no telemetry" : `${stage.dropCount}`}
                    </span>
                  </div>
                  <div className="text-[9px] text-text-muted truncate mt-0.5" title={stage.dropReason}>
                    {stage.dropReason}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Live Activity Feed ── */}
      <section className="surface-card bg-bg-surface p-4 sm:p-5 rounded-xl border border-border flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Activity className="size-4 text-action-primary" />
              Live Activity Feed
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Recent agent executions from <code className="font-mono text-[11px]">/api/sysadmin/agent-traces</code>. Click any row to inspect nested steps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by tool, role, id..."
                className="w-full rounded-lg border border-border bg-bg-base pl-8 pr-2.5 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-action-primary"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchTraces}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs h-7 px-2.5"
            >
              <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* HeroUI v3 Tabs for status filter */}
        <Tabs
          value={filter}
          onValueChange={(val) => setFilter(val as TraceStatusFilter)}
        >
          <Tabs.List className="surface-card flex gap-1 rounded-lg p-1 bg-bg-base border border-border">
            <Tabs.Tab value="all" className="px-2.5 py-1 text-xs">
              All ({counts.all})
            </Tabs.Tab>
            <Tabs.Tab value="running" className="px-2.5 py-1 text-xs">
              Running ({counts.running})
            </Tabs.Tab>
            <Tabs.Tab value="completed" className="px-2.5 py-1 text-xs">
              Completed ({counts.completed})
            </Tabs.Tab>
            <Tabs.Tab value="failed" className="px-2.5 py-1 text-xs">
              Failed ({counts.failed})
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        {/* Retryable Error Card */}
        {error && (
          <div className="surface-card bg-action-danger/10 border border-action-danger/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-action-danger">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="size-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold">Failed to fetch agent traces</p>
                <p className="text-xs opacity-90 mt-0.5">{error}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchTraces}
              className="shrink-0 flex items-center gap-1.5 text-xs self-start sm:self-auto bg-action-danger/20 hover:bg-action-danger/30 text-action-danger border border-action-danger/30"
            >
              <RefreshCw className="size-3" />
              Retry Fetch
            </Button>
          </div>
        )}

        {/* Loading shimmer */}
        {loading && traces.length === 0 && (
          <div className="space-y-2 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-lg bg-bg-elevated/40 border border-border animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredTraces.length === 0 && (
          <div className="surface-card rounded-xl border border-dashed border-border p-8 text-center flex flex-col items-center justify-center">
            <Bot className="size-8 text-text-muted mb-2 stroke-[1.5]" />
            <p className="text-sm font-semibold text-text-primary">No agent traces yet</p>
            <p className="text-xs text-text-muted mt-1 max-w-sm">
              {traces.length === 0
                ? "No traces have been logged by the agent runtime in the last 7 days."
                : `No traces match the "${filter}" filter${search ? ` with query "${search}"` : ""}.`}
            </p>
          </div>
        )}

        {/* Activity list */}
        {filteredTraces.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="divide-y divide-border bg-bg-base">
              {filteredTraces.map((trace) => {
                const status = getTraceStatus(trace);
                return (
                  <button
                    key={trace.id}
                    type="button"
                    onClick={() => openTraceInspection(trace)}
                    className="w-full text-left p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-bg-elevated/60 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-action-primary"
                    aria-label={`Inspect trace ${trace.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`inline-flex items-center justify-center size-7 rounded-lg shrink-0 ${
                          status === "completed"
                            ? "bg-emerald-500/10 text-action-success border border-emerald-500/20"
                            : status === "failed"
                            ? "bg-rose-500/10 text-action-danger border border-rose-500/20"
                            : "bg-blue-500/10 text-action-info border border-blue-500/20"
                        }`}
                      >
                        {status === "completed" ? (
                          <CheckCircle2 className="size-4" />
                        ) : status === "failed" ? (
                          <XCircle className="size-4" />
                        ) : (
                          <Clock className="size-4 animate-spin" />
                        )}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-xs font-semibold text-text-primary">
                            {trace.tool_name ?? `Lane: ${trace.lane}`}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-bg-elevated text-text-muted border border-border">
                            {trace.actor_role}
                          </span>
                          {trace.draft_emitted && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-amber-500/10 text-action-warning border border-amber-500/20">
                              draft emitted
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-text-muted mt-0.5 truncate font-mono">
                          <span>req: {trace.request_id.slice(0, 8)}</span>
                          <span>·</span>
                          <span>{trace.latency_ms}ms</span>
                          <span>·</span>
                          <span>{new Date(trace.created_at).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                          status === "completed"
                            ? "bg-emerald-500/10 text-action-success"
                            : status === "failed"
                            ? "bg-rose-500/10 text-action-danger"
                            : "bg-blue-500/10 text-action-info"
                        }`}
                      >
                        {status}
                      </span>
                      <ExternalLink className="size-3.5 text-text-muted" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── Single shared EntityInspector for trace inspection ── */}
      <EntityInspector
        inspection={inspection}
        onClose={closeInspection}
      />
    </div>
  );
}
