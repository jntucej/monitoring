"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useApi } from "@/hooks/useApi";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";

interface OperatorAction {
  id: string;
  kind: string;
  title: string;
  payload: unknown;
  evidence: unknown;
  risk: string;
  status: string;
  approverRole: string;
  autoRunSeconds: number;
  source: string;
  expiresAt: string;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  decisionNote: string | null;
}

const FILTERS = ["pending", "executed", "approved", "rejected", "expired", "all"] as const;

interface Forecast {
  id: string;
  signal: string;
  predictedBreachAt: string;
  predictedValue: number | null;
  confidence: number;
  recommendedAction: string;
  evidence: Record<string, unknown>;
}
interface AutomationControl {
  name: string;
  enabled: boolean;
  reason: string | null;
  disabledBy: string | null;
  disabledAt: string | null;
}
interface EscalationStep {
  level: number;
  role: string;
  notifyAtMin: number;
  channels: string[];
}
interface LiveHealth {
  capturedAt: string | null;
  dbPoolUsed: number | null;
  dbPoolMax: number | null;
  queueDepth: number | null;
  sseStreams: number | null;
  sseCapacity: number | null;
  diskFreePct: number | null;
  scanP95Ms: number | null;
  errorRate: number | null;
  backupAgeHours: number | null;
  containerUnhealthy: string[];
}

export default function OperatorActionsPage() {
  const [filter, setFilter] = useState<string>("pending");
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [rows, setRows] = useState<OperatorAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [health, setHealth] = useState<LiveHealth | null>(null);
  const [controls, setControls] = useState<AutomationControl[]>([]);
  const [ladder, setLadder] = useState<EscalationStep[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);
  const { request } = useApi();
  const user = useAuthStore((s) => s.user);

  async function toggleControl(name: string, enabled: boolean, reason: string) {
    setToggling(name);
    try {
      await request(
        "/api/sysadmin/automation-controls/" + encodeURIComponent(name),
        { method: "PATCH", body: JSON.stringify({ enabled, reason }) }
      );
      await refresh();
    } catch {
      setToggling(null);
    }
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Each data source is fetched INDEPENDENTLY so that a 429 or transient
    // failure on one endpoint cannot cascade-blank the other two panels.
    // The previous Promise.all((actions, forecasts)) + sequential-controls
    // layout meant a single 429 rejected the whole batch and every section
    // (kill-switches, live health, escalation ladder, forecast cards) stayed
    // hidden while the page silently showed "No pending operator actions".
    const actionsP = request<{ actions: OperatorAction[] }>(
      `/api/sysadmin/actions?status=${encodeURIComponent(filter)}`
    )
      .then((res) => {
        if (res.success && res.data) setRows(res.data.actions ?? []);
        else setError(res.error ?? "load failed");
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));

    const forecastsP = request<{ forecasts: Forecast[]; latestSnapshot: LiveHealth | null }>(
      "/api/sysadmin/forecasts"
    )
      .then((res) => {
        setForecasts(res.data?.forecasts ?? []);
        setHealth(res.data?.latestSnapshot ?? null);
      })
      .catch(() => { /* non-fatal — forecasts panel stays empty */ });

    const controlsP = request<{ controls: AutomationControl[]; ladder: EscalationStep[] }>(
      "/api/sysadmin/automation-controls"
    )
      .then((res) => {
        setControls(res.data?.controls ?? []);
        setLadder(res.data?.ladder ?? []);
      })
      .catch(() => { /* non-fatal — kill-switch panel stays empty */ });

    await Promise.allSettled([actionsP, forecastsP, controlsP]);
  }, [filter, request]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const decide = useCallback(
    async (id: string, decision: "approve" | "reject") => {
      setBusy((b) => ({ ...b, [id]: true }));
      try {
        const res = await request<{ status: string }>(`/api/sysadmin/actions/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ decision, note: note[id] || undefined }),
        });
        if (res.success) {
          await refresh();
        } else {
          alert(`Decision failed: ${res.error ?? res.code ?? "unknown"}`);
        }
      } finally {
        setBusy((b) => ({ ...b, [id]: false }));
      }
    },
    [note, refresh, request]
  );

  const actions = rows;

  return (
    <WidgetBoundary>
      <PageHeader
        title="Automation Actions"
        subtitle="Approval gate for automated & manual operator actions — one-tap approve/reject"
        onRefresh={refresh}
      />

      {health && (
        <div
          className="mb-3 rounded-lg border p-3 text-xs"
          style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
        >
          <div className="mb-1 font-semibold text-sm">Live Health</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>pool: {health.dbPoolUsed ?? "?"}/{health.dbPoolMax ?? "?"}</span>
            <span>queue: {health.queueDepth ?? "?"}</span>
            {health.sseStreams != null && <span>sse: {health.sseStreams}/{health.sseCapacity ?? "?"}</span>}
            {health.diskFreePct != null && <span>disk: {health.diskFreePct}%</span>}
            {health.scanP95Ms != null && <span>p95: {health.scanP95Ms}ms</span>}
            {health.errorRate != null && <span>err: {(health.errorRate * 100).toFixed(1)}%</span>}
            {health.backupAgeHours != null && <span>backup: {health.backupAgeHours}h</span>}
          </div>
          {health.containerUnhealthy.length > 0 && (
            <div style={{ color: "var(--action-danger)" }}>
              unhealthy: {health.containerUnhealthy.join(", ")}
            </div>
          )}
        </div>
      )}

      {forecasts.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {forecasts.slice(0, 5).map((f) => (
            <div
              key={f.id}
              className="rounded-md border p-2 text-xs"
              style={{ borderColor: "var(--action-accent)" }}
            >
              <span className="font-medium">{f.signal}</span>{" "}
              → breach in{" "}
              {new Date(f.predictedBreachAt).toLocaleString()} (confidence{" "}
              {(f.confidence * 100).toFixed(0)}%) → <code>{f.recommendedAction}</code>
            </div>
          ))}
        </div>
      )}

      {controls.length > 0 && (
        <div className="mb-4 rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
          <div className="mb-2 text-sm font-semibold">Automation Kill Switches</div>
          <div className="flex flex-col gap-2">
            {controls.map((c) => (
              <div key={c.name} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex-1">
                  <code>{c.name.replace("_enabled", "")}</code>
                  {c.reason && <span style={{ opacity: 0.6 }}> — {c.reason}</span>}
                </span>
                <button
                  type="button"
                  disabled={toggling === c.name}
                  onClick={() => toggleControl(c.name, !c.enabled, c.enabled ? "Re-enabled via dashboard" : "Disabled via dashboard")}
                  className="rounded px-2 py-1 text-xs font-medium"
                  style={{
                    background: c.enabled ? "var(--action-danger)" : "var(--action-success, var(--action-success))",
                    color: "#fff",
                    opacity: toggling === c.name ? 0.5 : 1,
                  }}
                >
                  {c.enabled ? "ENABLED — click to stop" : "STOPPED — click to resume"}
                </button>
              </div>
            ))}
          </div>
          {ladder.length > 0 && (
            <div className="mt-3 text-xs" style={{ opacity: 0.7 }}>
              <div className="font-medium">Escalation ladder</div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {ladder.map((s) => (
                  <span key={s.level}>
                    {s.level}. {s.role} @ {s.notifyAtMin}m ({s.channels.join("/")})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 py-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="rounded px-3 py-1 text-sm"
            style={{
              background: filter === f ? "var(--action-accent)" : "transparent",
              color: filter === f ? "#fff" : "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && rows.length === 0 ? (
        <Skeleton className="h-48 w-full" />
      ) : error && rows.length === 0 ? (
        <div className="rounded-md border p-4 text-sm" style={{ borderColor: "var(--action-danger)", color: "var(--action-danger)" }}>
          Failed to load actions: {String(error)}
        </div>
      ) : actions.length === 0 ? (
        <div className="rounded-md border p-6 text-center text-sm text-text-secondary">
          No {filter === "all" ? "" : filter + " "}operator actions.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {actions.map((a) => {
            const isDecidable = a.status === "pending" && user?.role !== undefined;
            return (
              <div
                key={a.id}
                className="rounded-lg border p-4"
                style={{
                  borderColor:
                    a.risk === "high" ? "var(--action-danger)" : "var(--border)",
                  background:
                    a.risk === "high"
                      ? "color-mix(in srgb, var(--action-danger) 6%, transparent)"
                      : "transparent",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded px-2 py-0.5 text-xs font-semibold uppercase"
                        style={{
                          background:
                            a.risk === "high" ? "var(--action-danger)" : "var(--action-accent)",
                          color: "#fff",
                        }}
                      >
                        {a.risk === "high" ? "HIGH RISK" : "LOW RISK"}
                      </span>
                      <span className="text-sm font-medium">{a.title}</span>
                    </div>
                    <div className="mt-1 text-xs text-text-secondary">
                      kind: {a.kind} · source: {a.source} · status: {a.status}
                      {a.autoRunSeconds > 0 && ` · auto-runs in ${a.autoRunSeconds}s`}
                      {a.decidedAt && ` · decided ${new Date(a.decidedAt).toLocaleString()}`}
                    </div>
                    {(() => {
                      const ev = a.evidence as Record<string, unknown> | null | undefined;
                      return ev && Object.keys(ev).length > 0 ? (
                        <pre
                          className="mt-2 overflow-x-auto rounded p-2 text-xs"
                          style={{ background: "var(--bg-surface)" }}
                        >
                          {JSON.stringify(ev, null, 2)}
                        </pre>
                      ) : null;
                    })()}
                  </div>
                  {isDecidable && (
                    <div className="flex shrink-0 flex-col gap-2">
                      <input
                        value={note[a.id] ?? ""}
                        onChange={(e) => setNote((n) => ({ ...n, [a.id]: e.target.value }))}
                        placeholder="decision note (optional)"
                        className="w-48 rounded border px-2 py-1 text-xs"
                        style={{ borderColor: "var(--border)" }}
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={busy[a.id]}
                          onClick={() => decide(a.id, "approve")}
                          className="rounded px-3 py-1 text-xs font-medium"
                          style={{ background: "var(--action-accent)", color: "#fff", opacity: busy[a.id] ? 0.5 : 1 }}
                        >
                          Approve
                        </button>
                        <button
                          disabled={busy[a.id]}
                          onClick={() => decide(a.id, "reject")}
                          className="rounded px-3 py-1 text-xs font-medium"
                          style={{ background: "var(--action-danger)", color: "#fff", opacity: busy[a.id] ? 0.5 : 1 }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetBoundary>
  );
}
