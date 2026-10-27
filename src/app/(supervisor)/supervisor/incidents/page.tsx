"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";
import type { Alert, Role } from "@/lib/types";
import { BellOff, Loader2, Inbox, AlertTriangle, UserCheck } from "lucide-react";

interface Assignee {
  id: string;
  name: string;
  role: string;
}

async function fetchAssignees(): Promise<Assignee[]> {
  try {
    const res = await fetch("/api/supervisor/assignees", { headers: getAuthHeaders(), cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    if (json?.success && Array.isArray(json.data)) {
      return json.data.map((u: any) => ({ id: u.id, name: u.name || "—", role: u.role || "operator" }));
    }
  } catch { /* fall through */ }
  return [];
}

function SupervisorIncidentsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "supervisor") as Role;

  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [assigned, setAssigned] = useState<Record<string, string>>({}); // alertId -> assignee name
  const [assignNote, setAssignNote] = useState<Record<string, string>>({});

  const {
    data: alertsRes,
    loading: alertsLoading,
    error: alertsError,
    refresh: refreshAlerts,
  } = useApiResource<{ success: boolean; data: Alert[] }>("/api/alerts?limit=20", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refreshAlerts();
  }, [refreshAlerts]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const alerts = alertsRes?.data ?? [];

  const handleAssign = async (alertId: string, assigneeId: string) => {
    setAssigned((prev) => ({ ...prev, [alertId]: "…" }));
    try {
      const res = await fetch("/api/alerts/assign", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          alert_id: alertId,
          assignee_user_id: assigneeId,
          assignee_role: role,
          note: assignNote[alertId] || "",
        }),
      });
      const json = await res.json();
      if (json.success) {
        const a = assignees.find((x) => x.id === assigneeId);
        setAssigned((prev) => ({ ...prev, [alertId]: a?.name || "assigned" }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: true }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <p className="text-sm text-[var(--text-muted)]">
          Signed in as <span className="font-mono text-[var(--text-secondary)]">{role}</span> · incident assignment
        </p>
        <button
          type="button"
          onClick={() => { if (assignees.length === 0) void fetchAssignees().then(setAssignees); }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
        >
          <UserCheck className="w-3.5 h-3.5" />
          {assignees.length > 0 ? `${assignees.length} assignees loaded` : "Load assignees"}
        </button>
      </div>

      <WidgetBoundary title="Incident Assignment">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          {alertsError ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-rose-400 min-w-0">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="truncate">Alert feed unavailable: {alertsError}</span>
                <button
                  type="button"
                  onClick={() => void refreshAll()}
                  className="rounded-lg border border-rose-500/40 px-3 py-1 text-xs font-semibold hover:bg-rose-500/20 shrink-0"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : alertsLoading && !alerts.length ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Checking active incidents…
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <Inbox className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No active incidents — all clear.</p>
            </div>
          ) : (
            <div className="space-y-3 min-w-0">
              {alerts.slice(0, 10).map((a) => {
                const assignedName = assigned[a.id];
                return (
                  <div key={a.id} className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs min-w-0">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-rose-300 break-words min-w-0">{a.title || "Incident"}</p>
                        <p className="text-slate-400 mt-1.5 break-words min-w-0">{a.message}</p>
                        {a.severity && (
                          <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 border border-amber-500/30">
                            {a.severity}
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        {assignedName ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
                            ✓ {assignedName}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <select
                              value=""
                              onChange={(e) => e.target.value && void handleAssign(a.id, e.target.value)}
                              className="rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-xs text-[var(--text-primary)] px-2 py-1.5 max-w-[130px]"
                              aria-label={`Assign ${a.title}`}
                              disabled={assignees.length === 0}
                            >
                              <option value="">Assign to…</option>
                              {assignees.map((op) => (
                                <option key={op.id} value={op.id}>{op.name} ({op.role})</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => void handleResolveAlert(a.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-[11px]"
                            >
                              Resolve
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {assignees.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-3 text-xs text-slate-500 min-w-0">
                  Load assignees to route incidents to a named operator or supervisor.
                  Use &ldquo;Resolve&rdquo; to acknowledge directly (admin/principal tier required).
                </div>
              )}
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* Quick link to escalation centre for SLA-breached items */}
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex items-center justify-between gap-3 min-w-0">
        <p className="text-xs text-slate-400 min-w-0">
          SLA-breached or escalated requests surface in the escalation centre.
        </p>
        <Link
          href="/supervisor/escalation-centre"
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
        >
          Escalation centre
        </Link>
      </div>
    </div>
  );
}

export default function SupervisorIncidentsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SupervisorIncidentsInner />
    </Suspense>
  );
}
