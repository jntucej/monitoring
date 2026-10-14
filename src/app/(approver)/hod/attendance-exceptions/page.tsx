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
import { Loader2, ShieldCheck, AlertTriangle, ArrowRight } from "lucide-react";

/* response shapes */

interface FacultyAttendanceResponse {
  success: boolean;
  records?: Array<{
    id: string;
    fullName: string;
    designation: string;
    status: string;
    firstInTime?: string;
  }>;
  summary?: {
    totalFaculty?: number;
    absentCount?: number;
    lateArrivals?: number;
  };
}

function HodAttendanceExceptionsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "hod") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<FacultyAttendanceResponse>("/api/faculty/attendance", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/hod"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to HOD Overview
      </Link>

      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Attendance Exceptions data unavailable: {error}</span>
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

      <WidgetBoundary title="Attendance Exceptions">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Attendance Exceptions</span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {data?.summary?.absentCount ?? 0} exception(s)
            </span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading Attendance Exceptions…
            </div>
          ) : (
            <div className="p-4 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Absent Today</p>
                  <p className="mt-1 text-lg font-bold text-rose-400">{data?.summary?.absentCount ?? 0}</p>
                  <p className="text-xs text-slate-500">Faculty marked absent today.</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Late Arrivals</p>
                  <p className="mt-1 text-lg font-bold text-amber-400">{data?.summary?.lateArrivals ?? 0}</p>
                  <p className="text-xs text-slate-500">Faculty arriving past the window.</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Roster Size</p>
                  <p className="mt-1 text-lg font-bold text-white">{data?.summary?.totalFaculty ?? 0}</p>
                  <p className="text-xs text-slate-500">Total faculty on roster.</p>
                </div>
              </div>

              {data?.records && data.records.length > 0 ? (
                <div className="mt-4 overflow-x-auto -mx-4 px-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-xs text-slate-500">
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Designation</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2">First In</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.records.map((r) => (
                        <tr key={r.id} className="border-b border-slate-800/50 last:border-0">
                          <td className="py-2 pr-4 text-slate-200">{r.fullName}</td>
                          <td className="py-2 pr-4 text-slate-400">{r.designation}</td>
                          <td className="py-2 pr-4">
                            <span className={`text-xs font-semibold ${r.status === "PRESENT" ? "text-emerald-400" : r.status === "ABSENT" ? "text-rose-400" : "text-slate-400"}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2 text-slate-400">{r.firstInTime ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No attendance exceptions queued today.</p>
              )}
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function HodAttendanceExceptionsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <HodAttendanceExceptionsInner />
    </Suspense>
  );
}