"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import type { Role } from "@/lib/types";
import {
  Siren, AlertTriangle, ScrollText, Loader2, Inbox, ArrowRight, CheckCircle2, Clock,
} from "lucide-react";

/* ── response shapes ── */

interface EscalationsResponse {
  success: boolean;
  data: {
    escalatedPermissions: Array<{
      ticket_number: string;
      workflow_type: string;
      status: string;
      current_stage: string;
      sla_deadline: string | null;
      student_name: string | null;
      created_at: string;
    }>;
    activeAlerts: Array<{
      id: string;
      severity: string;
      title: string;
      message: string;
      gate_id: string | null;
      gate_name: string | null;
      timestamp: string;
    }>;
    recentDecisions: Array<{
      action: string;
      user_name: string | null;
      user_role: string | null;
      details: string;
      timestamp: string;
    }>;
    counts: { escalated: number; alerts: number; decisions: number };
  };
}

/* ── helpers ── */

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function slaBreached(sla: string | null): boolean {
  return !!sla && new Date(sla).getTime() < Date.now();
}

/* ── assignee picker ── */

interface Assignee {
  id: string;
  name: string;
  role: string;
}

async function fetchAssignees(): Promise<Assignee[]> {
  try {
    const res = await fetch("/api/supervisor/assignees", {
      headers: getAuthHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (json?.success && Array.isArray(json.data)) {
      return json.data.map((u: any) => ({
        id: u.id,
        name: u.name || "—",
        role: u.role || "operator",
      }));
    }
  } catch { /* fall through */ }
  return [];
}

/* ── main component ── */

function SupervisorEscalationCentreInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "supervisor") as Role;

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<EscalationsResponse>("/api/supervisor/escalations", {
    ttlMs: 30_000,
    enabled: !!user,
  });

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  // Assignee state for the alert-assign UI
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [assigneeLoading, setAssigneeLoading] = useState(false);
  const [assignedAlertIds, setAssignedAlertIds] = useState<Record<string, string>>({}); // alertId -> assignee name
  const [assignNote, setAssignNote] = useState<Record<string, string>>({});

  const loadAssignees = useCallback(async () => {
    setAssigneeLoading(true);
    const list = await fetchAssignees();
    setAssignees(list);
    setAssigneeLoading(false);
  }, []);

  const handleAssign = async (alertId: string, assigneeId: string) => {
    if (!assigneeId) return;
    setAssignedAlertIds((prev) => ({ ...prev, [alertId]: "…" }));
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
        const assignee = assignees.find((a) => a.id === assigneeId);
        setAssignedAlertIds((prev) => ({ ...prev, [alertId]: assignee?.name || "assigned" }));
      } else {
        console.error("assign failed", json);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const escalated = data?.data.escalatedPermissions ?? [];
  const alerts = data?.data.activeAlerts ?? [];
  const decisions = data?.data.recentDecisions ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono text-[var(--text-secondary)]">{role}</span> · escalation centre
          </p>
        </div>
        <button
          type="button"
          onClick={() => void (clearCache(), refresh())}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] shrink-0"
        >
          <Loader2 className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* KPI chips */}
      <div className="grid grid-cols-3 gap-3 min-w-0">
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 min-w-0">
          <div className="flex items-center gap-2 text-rose-400 mb-1">
            <Siren className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wide">Escalated</span>
          </div>
          <p className="text-2xl font-black text-rose-400">{data ? data.data.counts.escalated : "—"}</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 min-w-0">
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wide">Critical Alerts</span>
          </div>
          <p className="text-2xl font-black text-amber-400">{data ? data.data.counts.alerts : "—"}</p>
        </div>
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 min-w-0">
          <div className="flex items-center gap-2 text-sky-400 mb-1">
            <ScrollText className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wide">Recent Decisions</span>
          </div>
          <p className="text-2xl font-black text-sky-400">{data ? data.data.counts.decisions : "—"}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400 min-w-0">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="min-w-0 truncate">Escalation data unavailable: {error}</span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-rose-500/40 px-2.5 py-1 text-xs font-bold hover:bg-rose-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Escalated permission tickets */}
      <WidgetBoundary title="Escalated Requests">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          {loading && !data ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading escalated requests…
            </div>
          ) : escalated.length === 0 ? (
            <div className="p-5 text-center min-w-0">
              <Inbox className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No escalated or SLA-breached requests. Queue is clear.</p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-3 py-2">Ticket</th>
                    <th className="text-left px-3 py-2">Workflow</th>
                    <th className="text-left px-3 py-2">Stage</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {escalated.map((r, i) => {
                    const breached = slaBreached(r.sla_deadline);
                    return (
                      <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-3 py-2.5 font-mono text-xs text-slate-300 whitespace-nowrap">
                          <Link href={`/permissions/${r.ticket_number}`} className="hover:text-emerald-400">
                            {r.ticket_number}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 capitalize whitespace-nowrap">
                          {r.workflow_type.replace(/_/g, " ")}
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 capitalize whitespace-nowrap">{r.current_stage}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              r.status === "ESCALATED"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                          {r.sla_deadline ? (
                            breached ? (
                              <span className="text-rose-400 font-semibold">Breached · {fmtDateTime(r.sla_deadline)}</span>
                            ) : (
                              <span className="text-slate-400">{fmtDateTime(r.sla_deadline)}</span>
                            )
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* Active critical / high alerts with assign action */}
      <WidgetBoundary title="Critical & High Alerts">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          {loading && !data ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading alerts…
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-5 text-center min-w-0">
              <CheckCircle2 className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No active critical or high-severity alerts. All clear.</p>
            </div>
          ) : (
            <div className="space-y-3 min-w-0">
              {/* Assignee picker (lazy-loaded once) */}
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => { if (assignees.length === 0) void loadAssignees(); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
                >
                  {assigneeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {assignees.length > 0 ? `${assignees.length} operators available` : "Load assignees"}
                </button>
                {assignees.length > 0 && (
                  <span className="text-xs text-slate-500 truncate min-w-0">
                    Use the per-alert dropdown to route each alert to a named operator.
                  </span>
                )}
              </div>

              {alerts.slice(0, 8).map((a) => {
                const assignedName = assignedAlertIds[a.id];
                return (
                  <div
                    key={a.id}
                    className={`rounded-xl border p-3 text-xs min-w-0 ${
                      a.severity === "critical"
                        ? "border-rose-500/40 bg-rose-500/5"
                        : "border-amber-500/40 bg-amber-500/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-200 truncate">{a.title || "Alert"}</p>
                        <p className="text-slate-400 mt-1 break-words min-w-0">{a.message}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 min-w-0">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              a.severity === "critical"
                                ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {a.severity}
                          </span>
                          {a.gate_name && (
                            <span className="text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {a.gate_name} · {fmtDateTime(a.timestamp)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        {assignedName ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
                            ✓ {assignedName}
                          </span>
                        ) : assignees.length > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value=""
                              onChange={(e) => e.target.value && void handleAssign(a.id, e.target.value)}
                              className="rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-xs text-[var(--text-primary)] px-2 py-1.5 max-w-[140px]"
                              aria-label={`Assign ${a.title}`}
                            >
                              <option value="">Assign to…</option>
                              {assignees.map((op) => (
                                <option key={op.id} value={op.id}>
                                  {op.name} ({op.role})
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={assignNote[a.id] || ""}
                              onChange={(e) => setAssignNote((prev) => ({ ...prev, [a.id]: e.target.value }))}
                              placeholder="Note (optional)"
                              className="rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-xs text-[var(--text-primary)] px-2 py-1.5 w-28"
                              aria-label="Assignment note"
                            />
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">Assignees not loaded</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-3 text-xs text-slate-500 flex items-center justify-between gap-2 min-w-0">
                <span className="min-w-0 truncate">
                  Resolving an alert requires admin or principal access. Use assign to route work to a named operator.
                </span>
                <Link
                  href="/supervisor/incidents"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
                >
                  All incidents <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* Recent decisions timeline */}
      <WidgetBoundary title="Recent Decisions & Escalations">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          {decisions.length === 0 ? (
            <div className="p-5 text-center min-w-0">
              <ScrollText className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No recent decisions recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-2 min-w-0">
              {decisions.map((d, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-800/30 p-3 text-xs min-w-0"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      /APPROVED|RESOLVED/i.test(d.action)
                        ? "bg-emerald-500/10 text-emerald-400"
                        : /REJECTED|ESCALATED/i.test(d.action)
                        ? "bg-rose-500/10 text-rose-400"
                        : "bg-sky-500/10 text-sky-400"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-200">{d.action}</p>
                    <p className="text-slate-400 mt-0.5">
                      {d.user_name || "system"} · {d.user_role || "unknown"} · {fmtDateTime(d.timestamp)}
                    </p>
                    {d.details && d.details !== "{}" && (
                      <p className="text-slate-500 mt-1 truncate" title={d.details}>{d.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function SupervisorEscalationCentrePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SupervisorEscalationCentreInner />
    </Suspense>
  );
}
