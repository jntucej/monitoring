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
  const { request } = useApi();
  const user = useAuthStore((s) => s.user);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [actionsRes, forecastRes] = await Promise.all([
        request<{ actions: OperatorAction[] }>(
          `/api/sysadmin/actions?status=${encodeURIComponent(filter)}`
        ),
        request<{ forecasts: Forecast[]; latestSnapshot: LiveHealth | null }>(
          "/api/sysadmin/forecasts"
        ),
      ]);
      const res = actionsRes;
      setForecasts(forecastRes.data?.forecasts ?? []);
      setHealth(forecastRes.data?.latestSnapshot ?? null);
      if (res.success && res.data) {
        setRows(res.data.actions ?? []);
      } else {
        setError(res.error ?? "load failed");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
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
        <div className="rounded-md border p-6 text-center text-sm text-[var(--text-secondary)]">
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
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">
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
