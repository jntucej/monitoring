"use client";

import { Suspense, useCallback, useMemo } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CircleAlert,
  ShieldAlert,
} from "lucide-react";

/* /api/alerts response shape */
interface AlertItem {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  gateId?: string;
  studentRoll?: string;
  timestamp: string;
  resolved: boolean;
  visibleToRoles?: string[];
  minTier?: number;
}

interface AlertsResponse {
  success: boolean;
  data: AlertItem[];
}

const SEVERITY_STYLES: Record<
  AlertItem["severity"],
  { badge: string; dot: string }
> = {
  critical: {
    badge: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
    dot: "bg-rose-400",
  },
  high: {
    badge: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    dot: "bg-amber-400",
  },
  medium: {
    badge: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30",
    dot: "bg-yellow-400",
  },
  low: {
    badge: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
    dot: "bg-sky-400",
  },
};

function ExamBranchDiscrepanciesInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_branch") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<AlertsResponse>("/api/alerts?resolved=false", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const alerts = useMemo<AlertItem[]>(() => data?.data ?? [], [data]);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const highCount = alerts.filter((a) => a.severity === "high").length;
  const totalOpen = alerts.length;

  /* /api/alerts is restricted to [admin, sysadmin, supervisor, principal].
   * exam_branch will receive a 403 — handle it gracefully with an empty state
   * and the "restricted access" note below. */
  const forbidden =
    typeof error === "string" && (error.includes("403") || error.includes("FORBIDDEN"));

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <Link
        href="/exam-branch"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
      </Link>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && !forbidden && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Discrepancies unavailable: {error}</span>
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

      {/* KPI cards */}
      <WidgetBoundary title="Discrepancy Summary">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Open Discrepancies</p>
            <p className="mt-1 text-2xl font-bold text-white">{totalOpen}</p>
            <p className="text-xs text-slate-500">Unresolved alerts visible to this role</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Critical</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                criticalCount > 0 ? "text-rose-400" : "text-slate-400"
              }`}
            >
              {criticalCount}
            </p>
            <p className="text-xs text-slate-500">Requires immediate attention</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
            <p className="text-xs text-slate-500 uppercase tracking-wide">High</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                highCount > 0 ? "text-amber-400" : "text-slate-400"
              }`}
            >
              {highCount}
            </p>
            <p className="text-xs text-slate-500">Elevated severity — escalate if unresolved</p>
          </div>
        </div>
      </WidgetBoundary>

      {/* Discrepancy list */}
      <WidgetBoundary title="Attendance Discrepancies">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <CircleAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">
                Flagged Discrepancies
              </span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">{totalOpen} open</span>
          </div>

          {forbidden ? (
            <div className="p-6 text-center min-w-0">
              <ShieldAlert className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">
                Access to live discrepancies is restricted.
              </p>
              <p className="text-xs text-slate-600 mt-1">
                The alerts feed is limited to administrative roles. Contact your
                supervisor or admin if you need attendance discrepancy details.
              </p>
            </div>
          ) : busy ? (
            <div className="p-4 space-y-3 min-w-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg border border-slate-800 bg-slate-900/40 animate-pulse motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <CircleAlert className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
              <p className="text-sm text-slate-400">
                No open discrepancies.
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Attendance and access discrepancies appear here when they are
                flagged by the gate system.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800 min-w-0">
              {alerts.map((alert) => {
                const sev = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.low;
                return (
                  <li
                    key={alert.id}
                    className="px-4 py-3 flex flex-col gap-1.5 min-w-0"
                  >
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${sev.badge}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-white min-w-0 flex-1 truncate">
                        {alert.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 min-w-0 break-words">
                      {alert.message}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 min-w-0">
                      <span>
                        {new Date(alert.timestamp).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {alert.gateId && <span>gate: {alert.gateId}</span>}
                      {alert.studentRoll && <span>roll: {alert.studentRoll}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function ExamBranchDiscrepanciesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExamBranchDiscrepanciesInner />
    </Suspense>
  );
}
