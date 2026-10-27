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
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Inbox,
  Building2,
} from "lucide-react";

interface AttendanceBlockRow {
  hostelBlock: string;
  declared: number;
  confirmed: number;
  veg: number;
  nonVeg: number;
  attendanceRate: number;
}

interface AttendanceResponse {
  success: boolean;
  data: {
    messDayId: string | null;
    mealDate: string | null;
    byHostelBlock: AttendanceBlockRow[];
    totals: {
      declared: number;
      confirmed: number;
      veg: number;
      nonVeg: number;
      attendanceRate: number;
    };
  };
}

function WidgetError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

function rateColor(rate: number): string {
  if (rate >= 80) return "text-emerald-400";
  if (rate >= 50) return "text-amber-400";
  return "text-rose-400";
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "No meal day scheduled";
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function MessMealAttendanceInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "mess_incharge") as Role;
  const tier = getRoleTier(role);

  const {
    data: attendance,
    loading,
    error,
    refresh,
  } = useApiResource<AttendanceResponse>("/api/mess/attendance", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !attendance;
  const d = attendance?.data;
  const blocks = d?.byHostelBlock ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <Link
        href="/mess"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        Back to Mess Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <WidgetError message={`Meal attendance unavailable: ${error}`} onRetry={() => void refreshAll()} />
      )}

      <WidgetBoundary title="Meal Attendance">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Meal Attendance</span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">{d ? fmtDate(d.mealDate) : "—"}</span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading meal attendance…
            </div>
          ) : blocks.length > 0 ? (
            <div className="min-w-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 min-w-0">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Declared Present</p>
                  <p className="mt-1 text-lg font-bold text-sky-400">{d?.totals?.declared}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Confirmed Served</p>
                  <p className="mt-1 text-lg font-bold text-emerald-400">{d?.totals?.confirmed}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Veg / Non-Veg</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {d?.totals?.veg} / {d?.totals?.nonVeg}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Attendance Rate</p>
                  <p className={`mt-1 text-lg font-bold ${rateColor(d?.totals?.attendanceRate ?? 0)}`}>
                    {d?.totals?.attendanceRate}%
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="text-left px-4 py-2.5">Hostel Block</th>
                      <th className="text-left px-4 py-2.5">Declared</th>
                      <th className="text-left px-4 py-2.5">Confirmed</th>
                      <th className="text-left px-4 py-2.5">Veg / Non-Veg</th>
                      <th className="text-left px-4 py-2.5">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {blocks.map((b) => (
                      <tr key={b.hostelBlock} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-slate-200 font-medium whitespace-nowrap flex items-center gap-2 min-w-0">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{b.hostelBlock}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{b.declared}</td>
                        <td className="px-4 py-3 text-emerald-400 font-medium">{b.confirmed}</td>
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          {b.veg} / {b.nonVeg}
                        </td>
                        <td className={`px-4 py-3 font-semibold whitespace-nowrap ${rateColor(b.attendanceRate)}`}>
                          {b.attendanceRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500 min-w-0">
                Attendance is computed from mess preferences (declared present) vs confirmed
                servings recorded at the{" "}
                <Link href="/mess/scan" className="text-emerald-400 hover:underline">
                  Token Scanner
                </Link>
                .
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                No attendance data for this meal day. Records appear once students declare
                attendance and meals are confirmed.
              </p>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function MessMealAttendancePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MessMealAttendanceInner />
    </Suspense>
  );
}
