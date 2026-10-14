"use client";

import { useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import { DataTable } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AlertTriangle, Bell, CheckCircle, Check, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { getAuthHeaders } from "@/lib/utils";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Alert } from "@/lib/types";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-rose-500/10 border-rose-500/30", text: "text-rose-400", label: "Critical Breach" },
  high: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", label: "High Suspicious" },
  medium: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400", label: "Medium Alert" },
  low: { bg: "bg-slate-500/10 border-slate-500/30", text: "text-slate-400", label: "Low Priority" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function AdminAlertsInner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "resolved" | "all">("active");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Alert | null>(null);
  const { addToast } = useToast();

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Alert Center</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Unresolved alerts plus those resolved in the last 7 days.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
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
                  ? "bg-[var(--action-primary)] text-white"
                  : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <WidgetBoundary title="Alerts">
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-[var(--action-warning)]" />
              <span>Alerts</span>
            </h3>
            <span className="text-sm text-[var(--text-muted)]">
              {loading ? "Loading…" : `${visible.length} alert${visible.length === 1 ? "" : "s"}`}
            </span>
          </div>
          {loading && visible.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">Loading alerts…</div>
          ) : (
          <DataTable
            columns={[
              {
                header: "Alert",
                accessor: (a: Alert) => {
                  const style = SEVERITY_STYLES[a.severity] ?? SEVERITY_STYLES.low;
                  return (
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg} ${style.text}`}
                      >
                        {a.resolved ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{a.title}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{a.message}</p>
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
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                      {a.studentRoll && (
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">{a.studentRoll}</span>
                      )}
                      {a.gateId && <span className="text-[10px] text-[var(--text-muted)]">at gate {a.gateId}</span>}
                    </div>
                  );
                },
              },
              {
                header: "Time",
                accessor: (a: Alert) => (
                  <span className="text-xs text-[var(--text-muted)]">{timeAgo(a.timestamp)}</span>
                ),
              },
              {
                header: "Action",
                accessor: (a: Alert) =>
                  !a.resolved ? (
                    <button
                      onClick={() => setConfirmTarget(a)}
                      disabled={busyId === a.id}
                      className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />
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
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <AdminAlertsInner />
    </AuthGuard>
  );
}
