"use client";

import { Suspense } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { usePolling } from "@/hooks/usePolling";
import { useApiResource } from "@/hooks/useApiResource";
import { UserCheck, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

interface StaffAttendanceResponse {
  success: boolean;
  summary?: {
    totalStaff: number;
    presentToday: number;
    overallAttendanceRate?: number;
  };
  records?: Array<{
    id: string;
    fullName: string;
    designation?: string;
    status: "INSIDE" | "OUTSIDE" | "ABSENT";
    firstInTime?: string | null;
  }>;
}

function safeText(v: string | number | null | undefined, fallback = "—"): string {
  const s = String(v ?? "").trim();
  if (!s || s === "undefined" || s === "NaN" || s.toLowerCase() === "null") return fallback;
  return s;
}

function SupervisorShiftsInner() {
  const {
    data: staff,
    loading: staffLoading,
    error: staffError,
    refresh: refreshStaff,
  } = useApiResource<StaffAttendanceResponse>("/api/staff/attendance", {
    ttlMs: 30_000,
  });

  usePolling(refreshStaff, { intervalMs: 30_000, enabled: true });

  const summary = staff?.summary;
  const records = staff?.records ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Guard and Shift Management">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          {staffError ? (
            <div className="flex items-center gap-2 text-sm text-rose-400 min-w-0">
              <XCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">Attendance feed unavailable: {staffError}</span>
              <button
                type="button"
                onClick={() => void refreshStaff()}
                className="rounded-lg border border-rose-500/40 px-3 py-1 text-xs font-semibold hover:bg-rose-500/20 shrink-0"
              >
                Retry
              </button>
            </div>
          ) : staffLoading && !staff ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading attendance…
            </div>
          ) : (
            <div className="space-y-3 min-w-0">
              <div className="grid grid-cols-3 gap-2 min-w-0">
                <div className="rounded-lg bg-slate-800/40 p-3 min-w-0">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Present Today</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{summary?.presentToday ?? 0}</p>
                </div>
                <div className="rounded-lg bg-slate-800/40 p-3 min-w-0">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Absent Today</span>
                  </div>
                  <p className="text-2xl font-bold text-rose-400">
                    {summary ? (summary.totalStaff ?? 0) - (summary.presentToday ?? 0) : 0}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-800/40 p-3 min-w-0">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Attendance Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-400">
                    {summary?.overallAttendanceRate ?? 0}%
                  </p>
                </div>
              </div>

              {records.length > 0 && (
                <div className="overflow-x-auto min-w-0">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                        <th className="text-left px-3 py-2">Staff</th>
                        <th className="text-left px-3 py-2">Designation</th>
                        <th className="text-left px-3 py-2">First In</th>
                        <th className="text-left px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {records.slice(0, 8).map((r) => (
                        <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-3 py-2.5 text-slate-200 min-w-0">
                            <span className="truncate font-medium">{r.fullName}</span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-400">{safeText(r.designation)}</td>
                          <td className="px-3 py-2.5 text-slate-400 font-mono text-xs">
                            {r.firstInTime ?? "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                r.status === "ABSENT"
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-3 text-xs text-slate-500 min-w-0">
                Guard rosters and shift assignments are not exposed at this tier — no dedicated
                guard/shift feed is available. Attendance above is the only staff signal this
                dashboard surfaces.
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function SupervisorShiftsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SupervisorShiftsInner />
    </Suspense>
  );
}
