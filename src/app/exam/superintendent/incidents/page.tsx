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
import { ShieldCheck, AlertTriangle, ArrowRight, BellRing } from "lucide-react";

/* response shapes */

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

interface AlertItem {
  id: string;
  title?: string;
  message?: string;
  severity?: string;
  source?: string;
  created_at?: string;
}

const EXAM_KEYWORDS = /exam|exam|oie|superintend|hall|invigilat|board/i;

function ExamSuperintendentIncidentsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_superintendent") as Role;
  const tier = getRoleTier(role);

  const alertsRes = useApiResource<DataResponse>("/api/alerts?resolved=false", { ttlMs: 30_000 });
  const exceptionsRes = useApiResource<DataResponse>("/api/exam/access-exceptions?limit=50", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([alertsRes.refresh(), exceptionsRes.refresh()]);
  }, [alertsRes.refresh, exceptionsRes.refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = (alertsRes.loading && !alertsRes.data) || (exceptionsRes.loading && !exceptionsRes.data);

  const allAlerts: AlertItem[] = Array.isArray((alertsRes.data as DataResponse | null)?.data)
    ? ((alertsRes.data as DataResponse | null)?.data as unknown as AlertItem[])
    : [];
  const examAlerts = allAlerts.filter(
    (a) =>
      EXAM_KEYWORDS.test(`${a.title ?? ""} ${a.message ?? ""} ${a.source ?? ""}`) ||
      EXAM_KEYWORDS.test(a.id ?? "")
  );
  const exceptions: AlertItem[] = Array.isArray((exceptionsRes.data as DataResponse | null)?.data)
    ? ((exceptionsRes.data as DataResponse | null)?.data as unknown as AlertItem[])
    : [];

  const error = alertsRes.error ?? exceptionsRes.error;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/exam/superintendent"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
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
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Incidents data unavailable: {error}</span>
          </span>
          <button
            type="button"
            onClick={() => void refreshAll()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <WidgetBoundary title="Exam Incidents">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <BellRing className="w-4 h-4 text-action-warning shrink-0" />
              <span className="text-sm font-semibold text-white">Exam-Related Alerts & Exceptions</span>
            </div>
            <span className="text-xs text-text-muted shrink-0">
              {examAlerts.length + exceptions.length} open item(s)
            </span>
          </div>

          {busy ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 min-w-0">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-elevated/40" />
              ))}
            </div>
          ) : examAlerts.length === 0 && exceptions.length === 0 ? (
            <div className="p-8 text-center min-w-0">
              <div className="flex flex-col items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-text-muted" />
                <p className="text-sm text-text-muted">
                  No open exam-related alerts or access exceptions right now.
                </p>
                <p className="text-xs text-text-muted max-w-md">
                  Unresolved alerts from /api/alerts and exam access exceptions are auto-filtered
                  to exam topics; the rest stay on the shared alerting console.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4 min-w-0">
              {exceptions.length > 0 && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                    Exam Access Exceptions
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
                    {exceptions.slice(0, 9).map((row, i) => (
                      <div key={row.id ?? i} className="rounded-lg border border-border bg-bg-surface/40 p-3 min-w-0">
                        <p className="text-sm font-semibold text-action-warning truncate">
                          {row.title ?? (row.id ? `Exception ${row.id.slice(0, 8)}` : "Exam exception")}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5 truncate">{row.message ?? row.source}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {examAlerts.length > 0 && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                    Unresolved Alerts (exam-related)
                  </p>
                  <div className="space-y-2 min-w-0">
                    {examAlerts.slice(0, 12).map((a) => (
                      <div key={a.id} className="rounded-lg border border-border bg-bg-surface/40 p-3 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-text-secondary truncate">{a.title ?? a.message ?? "Alert"}</p>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                              a.severity === "critical"
                                ? "bg-rose-500/20 text-action-danger"
                                : a.severity === "warning"
                                  ? "bg-amber-500/20 text-action-warning"
                                  : "bg-bg-elevated/40 text-text-muted"
                            }`}
                          >
                            {a.severity ?? "info"}
                          </span>
                        </div>
                        {a.message && a.title && <p className="text-xs text-text-muted mt-1 truncate">{a.message}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </WidgetBoundary>

    </div>
  );
}

export default function ExamSuperintendentIncidentsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExamSuperintendentIncidentsInner />
    </Suspense>
  );
}
