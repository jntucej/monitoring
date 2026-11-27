"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useApi } from "@/hooks/useApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch, SwitchControl, SwitchThumb } from "@/components/ui/switch";
import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  ShieldAlert,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  XCircle,
  Activity,
  Layers,
  Clock,
  UserCheck,
} from "lucide-react";

export interface OperatorAction {
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
export interface Forecast {
  id: string;
  signal: string;
  predictedBreachAt: string;
  predictedValue: number | null;
  confidence: number;
  recommendedAction: string;
  evidence: Record<string, unknown>;
}
export interface AutomationControl {
  name: string;
  enabled: boolean;
  reason: string | null;
  disabledBy: string | null;
  disabledAt: string | null;
}
export interface EscalationStep {
  level: number;
  role: string;
  notifyAtMin: number;
  channels: string[];
}
export interface LiveHealth {
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

const FILTERS = ["pending", "executed", "approved", "rejected", "expired", "all"] as const;

export interface ApprovalsGuardrailsProps {
  refreshSignal?: number;
}

export default function ApprovalsGuardrails({ refreshSignal }: ApprovalsGuardrailsProps) {
  const { request } = useApi();
  const user = useAuthStore((s) => s.user);

  const [filter, setFilter] = useState<string>("pending");
  const [actions, setActions] = useState<OperatorAction[]>([]);
  const [actionsLoading, setActionsLoading] = useState(true);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [decisionError, setDecisionError] = useState<{ id: string; message: string } | null>(null);

  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [health, setHealth] = useState<LiveHealth | null>(null);
  const [forecastsLoading, setForecastsLoading] = useState(true);
  const [forecastsError, setForecastsError] = useState<string | null>(null);

  const [controls, setControls] = useState<AutomationControl[]>([]);
  const [ladder, setLadder] = useState<EscalationStep[]>([]);
  const [controlsLoading, setControlsLoading] = useState(true);
  const [controlsError, setControlsError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const [pendingToggle, setPendingToggle] = useState<{ control: AutomationControl; nextEnabled: boolean } | null>(null);
  const [toggleReason, setToggleReason] = useState("");

  const fetchActions = useCallback(async () => {
    setActionsLoading(true);
    setActionsError(null);
    try {
      const res = await request<{ actions: OperatorAction[] }>(`/api/sysadmin/actions?status=${encodeURIComponent(filter)}`);
      if (res.success && res.data) setActions(res.data.actions ?? []);
      else setActionsError(res.error ?? res.code ?? "Failed to fetch operator actions");
    } catch (err) {
      setActionsError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionsLoading(false);
    }
  }, [filter, request]);

  const fetchForecasts = useCallback(async () => {
    setForecastsLoading(true);
    setForecastsError(null);
    try {
      const res = await request<{ forecasts: Forecast[]; latestSnapshot: LiveHealth | null }>("/api/sysadmin/forecasts");
      if (res.success && res.data) {
        setForecasts(res.data.forecasts ?? []);
        setHealth(res.data.latestSnapshot ?? null);
      } else {
        setForecastsError(res.error ?? res.code ?? "Failed to fetch forecasts");
      }
    } catch (err) {
      setForecastsError(err instanceof Error ? err.message : String(err));
    } finally {
      setForecastsLoading(false);
    }
  }, [request]);

  const fetchControls = useCallback(async () => {
    setControlsLoading(true);
    setControlsError(null);
    try {
      const res = await request<{ controls: AutomationControl[]; ladder: EscalationStep[] }>("/api/sysadmin/automation-controls");
      if (res.success && res.data) {
        setControls(res.data.controls ?? []);
        setLadder(res.data.ladder ?? []);
      } else {
        setControlsError(res.error ?? res.code ?? "Failed to fetch automation controls");
      }
    } catch (err) {
      setControlsError(err instanceof Error ? err.message : String(err));
    } finally {
      setControlsLoading(false);
    }
  }, [request]);

  useEffect(() => { void fetchActions(); }, [fetchActions, refreshSignal]);
  useEffect(() => { void fetchForecasts(); void fetchControls(); }, [fetchForecasts, fetchControls, refreshSignal]);

  const toggleControl = async (name: string, enabled: boolean, reason: string) => {
    setToggling(name);
    try {
      const res = await request(`/api/sysadmin/automation-controls/${encodeURIComponent(name)}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled, reason }),
      });
      if (res.success) {
        await fetchControls();
      } else {
        setControlsError(`Toggle failed for ${name}: ${res.error ?? res.code ?? "unknown error"}`);
      }
    } catch (err) {
      setControlsError(`Toggle error for ${name}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setToggling(null);
      setPendingToggle(null);
      setToggleReason("");
    }
  };

  const decide = useCallback(
    async (id: string, decision: "approve" | "reject") => {
      setBusy((b) => ({ ...b, [id]: true }));
      setDecisionError(null);
      try {
        const res = await request<{ status: string }>(`/api/sysadmin/actions/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ decision, note: note[id] || undefined }),
        });
        if (res.success) {
          await fetchActions();
        } else {
          setDecisionError({ id, message: `Decision failed: ${res.error ?? res.code ?? "unknown error"}` });
        }
      } catch (err) {
        setDecisionError({ id, message: `Decision error: ${err instanceof Error ? err.message : String(err)}` });
      } finally {
        setBusy((b) => ({ ...b, [id]: false }));
      }
    },
    [note, fetchActions, request]
  );

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Live Health Strip */}
      {health && (
        <section className="surface-card p-3.5 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-text-primary">
              <Activity className="h-3.5 w-3.5 text-action-primary" /> Live Infrastructure Snapshot
            </span>
            {health.capturedAt && (
              <span className="text-[11px] text-text-muted">{new Date(health.capturedAt).toLocaleTimeString()}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-text-secondary">
            <span>pool: <strong className="text-text-primary">{health.dbPoolUsed ?? "?"}/{health.dbPoolMax ?? "?"}</strong></span>
            <span>queue: <strong className="text-text-primary">{health.queueDepth ?? "?"}</strong></span>
            {health.sseStreams != null && <span>sse: <strong className="text-text-primary">{health.sseStreams}/{health.sseCapacity ?? "?"}</strong></span>}
            {health.diskFreePct != null && <span>disk: <strong className="text-text-primary">{health.diskFreePct}%</strong></span>}
            {health.scanP95Ms != null && <span>p95: <strong className="text-text-primary">{health.scanP95Ms}ms</strong></span>}
            {health.errorRate != null && <span>err: <strong className="text-text-primary">{(health.errorRate * 100).toFixed(1)}%</strong></span>}
            {health.backupAgeHours != null && <span>backup: <strong className="text-text-primary">{health.backupAgeHours}h</strong></span>}
          </div>
          {health.containerUnhealthy.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1 text-action-danger">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>Unhealthy: {health.containerUnhealthy.join(", ")}</span>
            </div>
          )}
        </section>
      )}

      {/* 2. Automation Controls & Escalation Ladder */}
      <section className="surface-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-action-warning" />
            <h3 className="text-sm font-semibold text-text-primary">Automation Kill Switches</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void fetchControls()} disabled={controlsLoading}>
            <RotateCw className={`h-3 w-3 ${controlsLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {controlsLoading && controls.length === 0 ? (
          <Skeleton className="h-20 w-full" />
        ) : controlsError ? (
          <div role="alert" className="surface-card flex items-center justify-between gap-3 bg-action-danger/10 p-3 text-xs text-action-danger">
            <span>Failed to load kill switches: {controlsError}</span>
            <Button variant="danger" size="sm" onClick={() => void fetchControls()}>Retry</Button>
          </div>
        ) : controls.length === 0 ? (
          <div className="surface-card p-3 text-center text-xs text-text-muted">No automation kill switches configured.</div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {controls.map((c) => (
              <div key={c.name} className="surface-card flex items-center justify-between gap-3 bg-bg-surface/40 p-2.5 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium capitalize text-text-primary">{c.name.replace("_enabled", "").replace(/_/g, " ")}</span>
                    <Badge variant={c.enabled ? "success" : "error"}>{c.enabled ? "RUNNING" : "STOPPED"}</Badge>
                  </div>
                  {c.reason && <p className="mt-0.5 truncate text-[11px] text-text-muted" title={c.reason}>{c.reason}</p>}
                </div>
                <Switch
                  isSelected={c.enabled}
                  isDisabled={toggling === c.name}
                  onChange={() => {
                    setToggleReason(c.enabled ? "Disabled via Command Center" : "Resumed via Command Center");
                    setPendingToggle({ control: c, nextEnabled: !c.enabled });
                  }}
                >
                  <SwitchControl><SwitchThumb /></SwitchControl>
                </Switch>
              </div>
            ))}
          </div>
        )}

        {ladder.length > 0 && (
          <div className="mt-3.5 border-t border-border pt-2.5">
            <span className="flex items-center gap-1 text-[11px] font-medium text-text-muted">
              <Layers className="h-3 w-3" /> Escalation Ladder
            </span>
            <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
              {ladder.map((s) => (
                <span key={s.level} className="surface-card bg-bg-surface/50 px-2 py-0.5 text-[11px]">
                  <strong>L{s.level}</strong>: {s.role} @ {s.notifyAtMin}m ({s.channels.join("/")})
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 3. Forecast Breach Cards */}
      <section className="surface-card p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-action-info" />
            <h3 className="text-sm font-semibold text-text-primary">Predictive SRE Breaches</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void fetchForecasts()} disabled={forecastsLoading}>
            <RotateCw className={`h-3 w-3 ${forecastsLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {forecastsLoading && forecasts.length === 0 ? (
          <Skeleton className="h-16 w-full" />
        ) : forecastsError ? (
          <div role="alert" className="surface-card flex items-center justify-between gap-3 bg-action-danger/10 p-3 text-xs text-action-danger">
            <span>Failed to load forecasts: {forecastsError}</span>
            <Button variant="danger" size="sm" onClick={() => void fetchForecasts()}>Retry</Button>
          </div>
        ) : forecasts.length === 0 ? (
          <div className="surface-card p-3 text-center text-xs text-text-muted">No forecast breaches predicted in the latest snapshot.</div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {forecasts.map((f) => (
              <div key={f.id} className="surface-card border-l-2 border-l-action-warning bg-bg-surface/40 p-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-text-primary">{f.signal}</span>
                  <span className="rounded bg-action-warning/10 px-1.5 py-0.2 text-[10px] font-medium text-action-warning">
                    {(f.confidence * 100).toFixed(0)}% conf
                  </span>
                </div>
                <p className="mt-1 text-text-muted">Breach: {new Date(f.predictedBreachAt).toLocaleString()}</p>
                <p className="mt-1 text-text-secondary">Action: <code className="rounded bg-bg-surface px-1 font-mono text-action-primary">{f.recommendedAction}</code></p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Operator Action Approval Queue */}
      <section className="surface-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-action-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Operator Action Queue</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex flex-wrap gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`surface-card px-2.5 py-0.5 text-xs capitalize ${
                    filter === f ? "bg-action-primary text-white font-semibold" : "bg-bg-surface/50 text-text-secondary hover:bg-bg-elevated"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => void fetchActions()} disabled={actionsLoading}>
              <RotateCw className={`h-3 w-3 ${actionsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {decisionError && (
          <div role="alert" className="surface-card mb-2 flex items-center justify-between gap-2 bg-action-danger/10 p-2.5 text-xs text-action-danger">
            <span>{decisionError.message}</span>
            <Button variant="ghost" size="sm" onClick={() => setDecisionError(null)}>Dismiss</Button>
          </div>
        )}

        {actionsLoading && actions.length === 0 ? (
          <Skeleton className="h-36 w-full" />
        ) : actionsError && actions.length === 0 ? (
          <div role="alert" className="surface-card flex items-center justify-between gap-3 bg-action-danger/10 p-3 text-xs text-action-danger">
            <span>Failed to load actions: {actionsError}</span>
            <Button variant="danger" size="sm" onClick={() => void fetchActions()}>Retry</Button>
          </div>
        ) : actions.length === 0 ? (
          <div className="surface-card p-5 text-center text-xs text-text-muted">No {filter === "all" ? "" : `${filter} `}operator actions found.</div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {actions.map((a) => {
              const isPending = a.status === "pending";
              const isDecidable = isPending && user?.role !== undefined;
              const isHigh = a.risk.toLowerCase() === "high";
              const ev = a.evidence as Record<string, unknown> | null | undefined;

              return (
                <div
                  key={a.id}
                  className={`surface-card p-3 text-xs ${
                    isHigh ? "border-action-danger/50 bg-action-danger/[0.03]" : "border-border bg-bg-surface/40"
                  }`}
                >
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${isHigh ? "bg-action-danger text-white" : "bg-action-primary text-white"}`}>
                          {a.risk}
                        </span>
                        <h4 className="font-semibold text-text-primary">{a.title}</h4>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-text-muted">
                        <span>kind: <strong>{a.kind}</strong></span>
                        <span>source: <strong>{a.source}</strong></span>
                        <span>status: <strong>{a.status}</strong></span>
                        {a.autoRunSeconds > 0 && isPending && <span className="text-action-warning">runs in {a.autoRunSeconds}s</span>}
                      </div>
                      {ev && Object.keys(ev).length > 0 && (
                        <details className="mt-1.5">
                          <summary className="cursor-pointer text-[11px] text-text-muted hover:text-text-primary">Diagnostic Evidence</summary>
                          <pre className="surface-card mt-1 max-h-32 overflow-auto bg-black/40 p-2 font-mono text-[10px] text-text-secondary">
                            {JSON.stringify(ev, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>

                    {isDecidable && (
                      <div className="flex shrink-0 flex-col gap-1.5 sm:w-56">
                        <Input
                          placeholder="Note (optional)"
                          value={note[a.id] ?? ""}
                          onChange={(e) => setNote((n) => ({ ...n, [a.id]: e.target.value }))}
                          className="h-7 text-xs"
                        />
                        <div className="flex gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1 h-7"
                            disabled={busy[a.id]}
                            onClick={() => void decide(a.id, "approve")}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="flex-1 h-7"
                            disabled={busy[a.id]}
                            onClick={() => void decide(a.id, "reject")}
                          >
                            <XCircle className="h-3 w-3" /> Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Kill Switch Toggle Confirmation Dialog */}
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={pendingToggle !== null}
          onOpenChange={(open) => {
            if (!open) {
              setPendingToggle(null);
              setToggleReason("");
            }
          }}
        >
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-md">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status={pendingToggle?.nextEnabled ? "accent" : "danger"} />
                <AlertDialog.Heading>
                  {pendingToggle?.nextEnabled ? "Resume Automation Job?" : "Trigger Automation Kill Switch?"}
                </AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body className="space-y-2 text-xs">
                <p className="text-text-secondary">
                  {pendingToggle?.nextEnabled
                    ? `Re-enable automated execution for "${pendingToggle?.control.name}". Background jobs will resume immediately.`
                    : `STOP automated execution for "${pendingToggle?.control.name}". Background tasks halt immediately.`}
                </p>
                <div>
                  <label htmlFor="killswitch-audit-reason" className="font-semibold text-text-muted">Reason / Justification</label>
                  <Input
                    id="killswitch-audit-reason"
                    className="mt-1 h-8 text-xs"
                    placeholder="Enter audit reason..."
                    value={toggleReason}
                    onChange={(e) => setToggleReason(e.target.value)}
                  />
                </div>
              </AlertDialog.Body>
              <AlertDialog.Footer className="flex justify-end gap-2">
                <Button slot="close" variant="ghost" size="sm" onClick={() => { setPendingToggle(null); setToggleReason(""); }}>
                  Cancel
                </Button>
                <Button
                  slot="close"
                  variant={pendingToggle?.nextEnabled ? "primary" : "danger"}
                  size="sm"
                  onClick={() => {
                    if (pendingToggle) {
                      void toggleControl(
                        pendingToggle.control.name,
                        pendingToggle.nextEnabled,
                        toggleReason || (pendingToggle.nextEnabled ? "Enabled via Command Center" : "Disabled via Command Center")
                      );
                    }
                  }}
                >
                  {pendingToggle?.nextEnabled ? "Confirm Resume" : "Confirm Stop"}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
