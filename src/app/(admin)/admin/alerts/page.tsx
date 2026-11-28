"use client";

import { useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import { DataTable } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";
import { AlertTriangle, Bell, CheckCircle, Check, RefreshCw, ExternalLink, ShieldCheck } from "lucide-react";
import { EntityInspector, KVPairs, Timeline, InspectorButton } from "@/components/shared/EntityInspector";
import { useToast } from "@/components/ui/toast";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { getAuthHeaders, displayId } from "@/lib/utils";
import type { Alert } from "@/lib/types";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-rose-500/10 border-rose-500/30", text: "text-action-danger", label: "Critical Breach" },
  high: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-action-warning", label: "High Suspicious" },
  medium: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-action-primary", label: "Medium Alert" },
  low: { bg: "bg-bg-elevated/10 border-border/30", text: "text-text-muted", label: "Low Priority" },
};

import { fmtRelative } from "@/lib/formatters";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
const timeAgo = fmtRelative;

function AdminAlertsInner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "resolved" | "all">("active");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Alert | null>(null);
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const { addToast } = useToast();

  /** Standardized inspection model for an alert (what → who/what affected →
   *  evidence → responsible authority → actions). */
  const alertInspection = activeAlert
    ? {
        kind: "alert",
        title: activeAlert.title,
        subtitle: activeAlert.message,
        status: activeAlert.resolved ? (
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-action-success">
            Resolved
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-action-danger">
            Open
          </span>
        ),
        sections: [
          {
            title: "What happened",
            content: (
              <KVPairs
                columns={1}
                items={[
                  {
                    label: "Severity",
                    value: (
                      <span className="uppercase font-semibold">
                        {activeAlert.severity}
                      </span>
                    ),
                  },
                  { label: "Raised", value: timeAgo(activeAlert.timestamp) },
                  ...(activeAlert.studentRoll
                    ? [{ label: "Affected student", value: <span className="font-mono">{activeAlert.studentRoll}</span> }]
                    : []),
                  ...(activeAlert.gateId
                    ? [{ label: "Gate", value: <span className="font-mono">{displayId(activeAlert.gateId, "assigned")}</span> }]
                    : []),
                ]}
              />
            ),
          },
          {
            title: "Evidence & timeline",
            content: (
              <Timeline
                items={[
                  {
                    label: "Alert raised",
                    time: new Date(activeAlert.timestamp).toLocaleString(),
                    tone: "danger",
                  },
                  ...(activeAlert.studentRoll
                    ? [{
                        label: "Student involved",
                        detail: activeAlert.studentRoll,
                        tone: "neutral" as const,
                      }]
                    : []),
                  ...(activeAlert.resolved
                    ? [{ label: "Marked resolved", tone: "ok" as const }]
                    : []),
                ]}
              />
            ),
          },
          {
            title: "Responsible authority",
            content: (
              <div className="text-xs text-text-muted space-y-1.5">
                <p className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-action-primary" />
                  {activeAlert.severity === "critical"
                    ? "Principal — immediate action required"
                    : activeAlert.severity === "high"
                    ? "Deputy Warden / HOD review"
                    : "Operator / Gate staff"}
                </p>
                {activeAlert.studentRoll && (
                  <p className="flex items-center gap-1.5">
                    <ExternalLink className="size-3.5" />
                    Linked to student record
                  </p>
                )}
              </div>
            ),
          },
          {
            title: "Actions",
            content: (
              <div className="flex flex-wrap gap-2">
                {!activeAlert.resolved ? (
                  <InspectorButton
                    variant="primary"
                    onClick={() => {
                      setConfirmTarget(activeAlert);
                      setActiveAlert(null);
                    }}
                  >
                    <Check className="size-3.5" /> Resolve alert
                  </InspectorButton>
                ) : (
                  <span className="text-xs text-emerald-400/70 flex items-center gap-1">
                    <CheckCircle className="size-3.5" /> Resolved
                  </span>
                )}
                <InspectorButton
                  variant="ghost"
                  href="/admin/audit-logs"
                >
                  <ExternalLink className="size-3.5" /> Audit trail
                </InspectorButton>
              </div>
            ),
          },
        ],
      }
    : null;

  const load = async () => {
    try {
      // include resolved context so the "all"/"resolved" filters have data.
      const res = await fetch(`/api/admin/alerts?includeResolved=true`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch alerts");
      const json = await res.json();
      if (json.success) {
        const items = Array.isArray(json.data?.items) ? json.data.items : [];
        setAlerts(items);
        setError(null);
      } else {
        const msg =
          typeof json.error === "string" ? json.error : json.error?.message ?? "Failed to load alerts";
        setError(msg);
      }
    } catch (err) {
      console.error("Failed to load alerts:", err);
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  usePolling(load, { intervalMs: 15_000 });

  const visible = alerts.filter((a) => {
    if (filter === "active") return !a.resolved;
    if (filter === "resolved") return a.resolved;
    return true;
  });

  const doResolve = async () => {
    if (!confirmTarget) return;
    const id = confirmTarget.id;
    setConfirmTarget(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/alerts`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: id }),
      });
      const json = await res.json();
      if (json.success) {
        setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
        addToast({ variant: "success", title: "Alert resolved", message: "The alert was marked as resolved." });
      } else {
        addToast({
          variant: "error",
          title: "Resolve failed",
          message: (typeof json.error === "string" ? json.error : json.error?.message) || "Failed to resolve alert",
        });
      }
    } catch {
      addToast({ variant: "error", title: "Resolve failed", message: "Failed to resolve alert due to network error" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <ContextSituationBar
        roleLabel="Campus Admin"
        purpose="Triage real-time campus perimeter, attendance, hardware, and curfew security incidents across all gates."
        contextLabel="Alert Center"
        why="Investigating security and operational alerts promptly maintains perimeter integrity and safeguards campus safety protocols."
        statusTone={alerts.some((a) => !a.resolved && a.severity === "critical") ? "critical" : alerts.some((a) => !a.resolved) ? "warn" : "ok"}
        statusPill={`${alerts.filter((a) => !a.resolved).length} unresolved`}
        statusSummary={
          alerts.filter((a) => !a.resolved).length > 0
            ? `${alerts.filter((a) => !a.resolved).length} active alert${alerts.filter((a) => !a.resolved).length === 1 ? "" : "s"} requiring resolution or monitoring.`
            : "All operational and perimeter alerts are currently resolved."
        }
        primaryAction={{ label: "Exceptions Log", href: "/admin/exceptions" }}
        secondaryAction={{ label: "Campus Reports", href: "/admin/reports" }}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Alert Center</h1>
          <p className="text-sm text-text-muted">
            Unresolved alerts plus those resolved in the last 7 days.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="surface-card p-2 bg-bg-surface text-text-muted hover:bg-bg-elevated"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {(["active", "resolved", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
                filter === f
                  ? "bg-action-primary text-white"
                  : "bg-bg-surface text-text-muted border border-border"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <WidgetBoundary title="Alerts">
        <div className="bg-bg-surface rounded-xl border border-border">
          <div className="surface-card p-4 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-action-warning" />
              <span>Alerts</span>
            </h3>
            <span className="text-sm text-text-muted">
              {loading ? "Loading…" : `${visible.length} alert${visible.length === 1 ? "" : "s"}`}
            </span>
          </div>
          {loading && visible.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-muted">Loading alerts…</div>
          ) : (
          <DataTable
            columns={[
              {
                header: "Alert",
                accessor: (a: Alert) => {
                  const style = SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES.low;
                  return (
                    <div
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => setActiveAlert(a)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") setActiveAlert(a); }}
                    >
                      <div
                        className={`mt-0.5 size-5 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg} ${style.text}`}
                      >
                        {a.resolved ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-text-primary hover:text-action-primary transition-colors">{a.title}</p>
                        <p className="text-xs text-text-muted mt-0.5">{a.message}</p>
                      </div>
                    </div>
                  );
                },
              },
              {
                header: "Details",
                accessor: (a: Alert) => {
                  const style = SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES.low;
                  return (
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                      {a.studentRoll && (
                        <span className="text-xs font-mono text-text-muted">{a.studentRoll}</span>
                      )}
                      {a.gateId && <span className="text-xs text-text-muted">at gate {displayId(a.gateId, "assigned")}</span>}
                    </div>
                  );
                },
              },
              {
                header: "Time",
                accessor: (a: Alert) => (
                  <span className="text-xs text-text-muted">{timeAgo(a.timestamp)}</span>
                ),
              },
              {
                header: "Action",
                accessor: (a: Alert) =>
                  !a.resolved ? (
                    <button
                      onClick={() => setConfirmTarget(a)}
                      disabled={busyId === a.id}
                      className="surface-card text-xs px-2.5 py-1 bg-emerald-500/10 text-action-success hover:bg-emerald-500/20 inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <Check className="size-3.5" />
                      {busyId === a.id ? "Resolving…" : "Resolve"}
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400/70">Resolved</span>
                  ),
              },
            ]}
            data={visible}
            loading={loading}
            error={error}
            emptyMessage={`No ${filter === "all" ? "" : filter} alerts.`}
            keyExtractor={(a: Alert) => a.id}
          />
          )}
        </div>
      </WidgetBoundary>

      <EntityInspector inspection={alertInspection} onClose={() => setActiveAlert(null)} />

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title="Resolve alert?"
        body={
          confirmTarget
            ? `Mark "${confirmTarget.title}" (${confirmTarget.severity}) as resolved? This action is audit-logged.`
            : ""
        }
        confirmText="Resolve"
        onConfirm={doResolve}
        variant="primary"
      />
    </div>
  );
}

export default function AdminAlertsPage() {
  return (
    
      <AdminAlertsInner />
    
    

  );
}
