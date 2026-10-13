"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import { Clock, Loader2, ShieldCheck, AlertTriangle, ArrowRight, CalendarClock } from "lucide-react";

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
  } = useApiResource<DataResponse>("/api/permissions?workflowType=exam&status=PENDING", { ttlMs: 30_000 });

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
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
      </Link>

      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Schedule data unavailable: {error}</span>
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <WidgetBoundary title="Exam Schedule">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarClock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white">Exam Schedule</span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {pending.length} pending exam clearance(s)
            </span>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 min-w-0">
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
              <p className="mt-1 text-lg font-bold text-emerald-400">Live</p>
              <p className="text-xs text-slate-500">Exam schedule streams from the permission workflow engine.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Deadlines at Risk</p>
              <p className={`mt-1 text-lg font-bold ${breached.length > 0 ? "text-amber-400" : "text-slate-300"}`}>
                {breached.length}
              </p>
              <p className="text-xs text-slate-500">Pending items past their SLA deadline.</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Last Updated</p>
              <p className="mt-1 text-lg font-bold text-sky-400">
                {new Date().toLocaleString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-xs text-slate-500">Auto-refreshes every 30 seconds.</p>
            </div>
          </div>

          {/* Upcoming exam clearances */}
          <div className="px-4 pb-4 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Upcoming Clearance Deadlines</p>
            {busy ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-800/40" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-6 text-center min-w-0">
                <ShieldCheck className="w-5 h-5 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No scheduled exam clearance deadlines in view.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
                {upcoming.map((row) => (
                  <div key={row.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{row.candidate_name ?? row.ticket_number ?? "Exam candidate"}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {row.roll_number ? `Roll ${row.roll_number} · ` : ""}
                      Stage: {row.current_stage ?? "—"}
                    </p>
                    <p className="text-xs text-sky-400 mt-1">
                      Due {row.sla_deadline ? new Date(row.sla_deadline).toLocaleString() : "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </WidgetBoundary>

      <DevContactStrip />
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
