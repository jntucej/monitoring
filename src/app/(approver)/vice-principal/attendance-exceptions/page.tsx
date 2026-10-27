"use client";

import { Suspense } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { Loader2, Inbox, UserX, Clock4, Flag, AlertTriangle } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Role } from "@/lib/types";

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
    "/api/staff/attendance-exceptions",
    { ttlMs: 30_000 }
  );

  usePolling(refresh, { intervalMs: 30_000, enabled: true });

  const exceptions = resp?.data?.exceptions;
  const summary = resp?.data?.summary;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Attendance Exceptions">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex items-center gap-2 text-slate-400 mb-3 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Today&apos;s Staff Attendance Exceptions
            </span>
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              Exception data unavailable: {error}
            </div>
          )}

          {loading && !resp ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-slate-800/60 animate-pulse" />
              ))}
            </div>
          ) : !exceptions ? (
            <div className="p-6 text-center">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No exception data recorded yet.</p>
            </div>
          ) : (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 min-w-0">
                <div className="rounded-lg bg-slate-800/40 p-3 min-w-0">
                  <div className="flex items-center gap-2 text-slate-400">
                    <UserX className="w-4 h-4 text-rose-400" />
                    <span className="text-xs uppercase tracking-wide">Absent</span>
                  </div>
                  <p className="text-xl font-bold text-rose-400">{summary?.absentCount ?? 0}</p>
                </div>
                <div className="rounded-lg bg-slate-800/40 p-3 min-w-0">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock4 className="w-4 h-4 text-amber-400" />
                    <span className="text-xs uppercase tracking-wide">Late Check-ins</span>
                  </div>
                  <p className="text-xl font-bold text-amber-400">{summary?.lateCount ?? 0}</p>
                </div>
                <div className="rounded-lg bg-slate-800/40 p-3 min-w-0">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Flag className="w-4 h-4 text-sky-400" />
                    <span className="text-xs uppercase tracking-wide">Flagged Staff</span>
                  </div>
                  <p className="text-xl font-bold text-sky-400">{summary?.flaggedCount ?? 0}</p>
                </div>
              </div>

              {(exceptions.absent.length > 0 || exceptions.late.length > 0 || exceptions.flagged.length > 0) ? (
                <div className="space-y-4 min-w-0">
                  {exceptions.absent.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-rose-400 mb-2">
                        Absent ({exceptions.absent.length})
                      </p>
                      <ul className="space-y-1">
                        {exceptions.absent.map((e) => (
                          <li
                            key={`a-${e.id}`}
                            className="rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2 text-sm flex flex-wrap items-center gap-2 min-w-0"
                          >
                            <span className="text-slate-200 truncate min-w-0 flex-1">{e.fullName}</span>
                            <span className="text-xs text-slate-500">{e.department}</span>
                            <span className="text-xs font-mono text-slate-600">{e.uniqueId}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {exceptions.late.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-400 mb-2">
                        Late ({exceptions.late.length})
                      </p>
                      <ul className="space-y-1">
                        {exceptions.late.map((e) => (
                          <li
                            key={`l-${e.id}`}
                            className="rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2 text-sm flex flex-wrap items-center gap-2 min-w-0"
                          >
                            <span className="text-slate-200 truncate min-w-0 flex-1">{e.fullName}</span>
                            <span className="text-xs text-slate-500">{e.department}</span>
                            <span className="text-xs text-amber-300">
                              in at {e.firstInTime || "—"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {exceptions.flagged.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-sky-400 mb-2">
                        Flagged ({exceptions.flagged.length})
                      </p>
                      <ul className="space-y-1">
                        {exceptions.flagged.map((e) => (
                          <li
                            key={`f-${e.id}`}
                            className="rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2 text-sm flex flex-wrap items-center gap-2 min-w-0"
                          >
                            <span className="text-slate-200 truncate min-w-0 flex-1">{e.fullName}</span>
                            <span className="text-xs text-sky-300">{e.flagStatus}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
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
