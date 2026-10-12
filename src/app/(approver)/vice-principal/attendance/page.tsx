"use client";

import { Suspense } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useProbe } from "../_probe";
import { Loader2, Lock, Inbox, CheckCircle2 } from "lucide-react";

interface StaffStatsResponse {
  summary?: {
    totalStaff: number;
    presentToday: number;
    absentToday: number;
    onLeave: number;
  };
}

function VpAttendanceInner() {
  const staffAttendance = useProbe<StaffStatsResponse>("/api/staff/attendance", 30_000);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Attendance Exceptions">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex items-center gap-2 text-slate-400 mb-3 min-w-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">Attendance Exceptions</span>
          </div>
          {staffAttendance.loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Checking access…
            </div>
          ) : staffAttendance.restricted ? (
            <div className="rounded-xl border-slate-800 bg-slate-800/20 p-6 text-center text-sm text-slate-500 min-w-0">
              <Lock className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              <p className="max-w-md text-center">
                Attendance exception detail is restricted at the Vice Principal tier. It is
                available to admin and sysadmin roles. If you need access, contact your
                institution administrator.
              </p>
            </div>
          ) : staffAttendance.error ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 min-w-0">
              Attendance data unavailable right now — try the Refresh button.
            </div>
          ) : staffAttendance.data?.summary ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-0">
              {(() => {
                const s = staffAttendance.data!.summary!;
                const pct = s.totalStaff > 0 ? Math.round((s.presentToday / s.totalStaff) * 100) : 0;
                return [
                  { label: "Present", value: s.presentToday, color: "text-emerald-400" },
                  { label: "Absent", value: s.absentToday, color: "text-rose-400" },
                  { label: "On Leave", value: s.onLeave, color: "text-amber-400" },
                  { label: "Rate", value: `${pct}%`, color: "text-white" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-slate-800/40 p-3 min-w-0">
                    <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-slate-500">{item.label}</p>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div className="p-6 text-center">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No attendance exception data recorded yet.</p>
            </div>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function VpAttendancePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VpAttendanceInner />
    </Suspense>
  );
}
