"use client";

import { Suspense } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { Inbox, UserX, Clock4, Flag, AlertTriangle } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";


interface ExceptionRecord {
  id: string;
  uniqueId?: string;
  fullName: string;
  department?: string;
  designation?: string;
  status?: string;
  firstInTime?: string | null;
  punctualityStatus?: string;
  flagStatus?: string | null;
}

interface AttendanceExceptionsResponse {
  success: boolean;
  data?: {
    summary: {
      totalStaff: number;
      absentCount: number;
      lateCount: number;
      flaggedCount: number;
    };
    exceptions: {
      absent: ExceptionRecord[];
      late: ExceptionRecord[];
      flagged: ExceptionRecord[];
    };
  };
}

function VpAttendanceExceptionsInner() {
  const {
    data: resp,
    loading,
    error,
    refresh,
  } = useApiResource<AttendanceExceptionsResponse>(
    "/api/staff/my-day-exceptions",
    { ttlMs: 30_000 }
  );

  usePolling(refresh, { intervalMs: 30_000, enabled: true });

  const exceptions = resp?.data?.exceptions;
  const summary = resp?.data?.summary;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Attendance Exceptions">
        <div className="surface-card bg-bg-base p-4 min-w-0">
          <div className="flex items-center gap-2 text-text-muted mb-3 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Today&apos;s Staff Attendance Exceptions
            </span>
          </div>

          {error && (
            <div className="surface-card mb-3 bg-amber-500/10 p-3 text-xs text-action-warning">
              Exception data unavailable: {error}
            </div>
          )}

          {loading && !resp ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-bg-elevated/60 animate-pulse" />
              ))}
            </div>
          ) : !exceptions ? (
            <div className="p-6 text-center">
              <Inbox className="w-6 h-6 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">No exception data recorded yet.</p>
            </div>
          ) : (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 min-w-0">
                <div className="surface-card bg-bg-elevated/40 p-3 min-w-0">
                  <div className="flex items-center gap-2 text-text-muted">
                    <UserX className="w-4 h-4 text-action-danger" />
                    <span className="text-xs uppercase tracking-wide">Absent</span>
                  </div>
                  <p className="text-xl font-bold text-action-danger">{summary?.absentCount ?? 0}</p>
                </div>
                <div className="surface-card bg-bg-elevated/40 p-3 min-w-0">
                  <div className="flex items-center gap-2 text-text-muted">
                    <Clock4 className="w-4 h-4 text-action-warning" />
                    <span className="text-xs uppercase tracking-wide">Late Check-ins</span>
                  </div>
                  <p className="text-xl font-bold text-action-warning">{summary?.lateCount ?? 0}</p>
                </div>
                <div className="surface-card bg-bg-elevated/40 p-3 min-w-0">
                  <div className="flex items-center gap-2 text-text-muted">
                    <Flag className="w-4 h-4 text-action-info" />
                    <span className="text-xs uppercase tracking-wide">Flagged Staff</span>
                  </div>
                  <p className="text-xl font-bold text-action-info">{summary?.flaggedCount ?? 0}</p>
                </div>
              </div>

              {(exceptions.absent.length > 0 || exceptions.late.length > 0 || exceptions.flagged.length > 0) ? (
                <div className="space-y-4 min-w-0">
                  {exceptions.absent.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-action-danger mb-2">
                        Absent ({exceptions.absent.length})
                      </p>
                      <ul className="space-y-1">
                        {exceptions.absent.map((e) => (
                          <li
                            key={`a-${e.id}`}
                            className="surface-card bg-bg-surface/40 px-3 py-2 text-sm flex flex-wrap items-center gap-2 min-w-0"
                          >
                            <span className="text-text-secondary truncate min-w-0 flex-1">{e.fullName}</span>
                            <span className="text-xs text-text-muted">{e.department}</span>
                            <span className="text-xs font-mono text-text-muted">{e.uniqueId}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {exceptions.late.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-action-warning mb-2">
                        Late ({exceptions.late.length})
                      </p>
                      <ul className="space-y-1">
                        {exceptions.late.map((e) => (
                          <li
                            key={`l-${e.id}`}
                            className="surface-card bg-bg-surface/40 px-3 py-2 text-sm flex flex-wrap items-center gap-2 min-w-0"
                          >
                            <span className="text-text-secondary truncate min-w-0 flex-1">{e.fullName}</span>
                            <span className="text-xs text-text-muted">{e.department}</span>
                            <span className="text-xs text-action-warning">
                              in at {e.firstInTime || "—"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {exceptions.flagged.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-action-info mb-2">
                        Flagged ({exceptions.flagged.length})
                      </p>
                      <ul className="space-y-1">
                        {exceptions.flagged.map((e) => (
                          <li
                            key={`f-${e.id}`}
                            className="surface-card bg-bg-surface/40 px-3 py-2 text-sm flex flex-wrap items-center gap-2 min-w-0"
                          >
                            <span className="text-text-secondary truncate min-w-0 flex-1">{e.fullName}</span>
                            <span className="text-xs text-action-info">{e.flagStatus}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  No exceptions today — all staff present and on time.
                </p>
              )}
            </>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}
export default function VpAttendanceExceptionsPage() {
  return (
    <AuthGuard allowedRoles={['vice_principal', 'exam_branch', 'oie', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <VpAttendanceExceptionsInner />
      </Suspense>
    </AuthGuard>
  );
}
