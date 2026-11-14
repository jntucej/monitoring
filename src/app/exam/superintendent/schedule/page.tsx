"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import { ShieldCheck, AlertTriangle, ArrowRight, CalendarClock } from "lucide-react";

/* response shapes */

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

interface ScheduleRow {
  id?: string;
  ticket_number?: string;
  current_stage?: string;
  status?: string;
  sla_deadline?: string | null;
  candidate_name?: string | null;
  roll_number?: string | null;
}

function ExamSuperintendentScheduleInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_superintendent") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<DataResponse>("/api/permissions?workflow_type=exam&status=PENDING", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const pending: ScheduleRow[] = Array.isArray((data as DataResponse | null)?.data)
    ? ((data as DataResponse | null)?.data as unknown as ScheduleRow[])
    : [];
  const withDeadline = pending.filter((p) => p.sla_deadline);
  const now = Date.now();
  const breached = withDeadline.filter((p) => new Date(p.sla_deadline as string).getTime() < now);
  const upcoming = [...withDeadline]
    .filter((p) => new Date(p.sla_deadline as string).getTime() >= now)
    .sort((a, b) => new Date(a.sla_deadline as string).getTime() - new Date(b.sla_deadline as string).getTime())
    .slice(0, 10);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/exam/superintendent"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowRight className="size-3.5 rotate-180" /> Back to Overview
      </Link>

      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-text-muted min-w-0">
            Signed in as <span className="font-mono text-text-secondary">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Schedule data unavailable: {error}</span>
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="surface-card px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <WidgetBoundary title="Exam Schedule">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarClock className="w-4 h-4 text-action-success shrink-0" />
              <span className="text-sm font-semibold text-white">Exam Schedule</span>
            </div>
            <span className="text-xs text-text-muted shrink-0">
              {pending.length} pending exam clearance(s)
            </span>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 min-w-0">
            <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
              <p className="text-xs text-text-muted uppercase tracking-wide">Status</p>
              <p className="mt-1 text-lg font-bold text-action-success">Live</p>
              <p className="text-xs text-text-muted">Exam schedule streams from the permission workflow engine.</p>
            </div>
            <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
              <p className="text-xs text-text-muted uppercase tracking-wide">Deadlines at Risk</p>
              <p className={`mt-1 text-lg font-bold ${breached.length > 0 ? "text-action-warning" : "text-text-secondary"}`}>
                {breached.length}
              </p>
              <p className="text-xs text-text-muted">Pending items past their SLA deadline.</p>
            </div>
            <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
              <p className="text-xs text-text-muted uppercase tracking-wide">Last Updated</p>
              <p className="mt-1 text-lg font-bold text-action-info">
                {new Date().toLocaleString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-xs text-text-muted">Auto-refreshes every 30 seconds.</p>
            </div>
          </div>

          {/* Upcoming exam clearances */}
          <div className="px-4 pb-4 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">Upcoming Clearance Deadlines</p>
            {busy ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-elevated/40" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <div className="surface-card bg-bg-surface/30 p-6 text-center min-w-0">
                <ShieldCheck className="w-5 h-5 text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-muted">No scheduled exam clearance deadlines in view.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
                {upcoming.map((row) => (
                  <div key={row.id} className="surface-card bg-bg-surface/40 p-3 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{row.candidate_name ?? row.ticket_number ?? "Exam candidate"}</p>
                    <p className="text-xs text-text-muted mt-0.5 truncate">
                      {row.roll_number ? `Roll ${row.roll_number} · ` : ""}
                      Stage: {row.current_stage ?? "—"}
                    </p>
                    <p className="text-xs text-action-info mt-1">
                      Due {row.sla_deadline ? new Date(row.sla_deadline).toLocaleString() : "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </WidgetBoundary>

    </div>
  );
}

export default function ExamSuperintendentSchedulePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExamSuperintendentScheduleInner />
    </Suspense>
  );
}
