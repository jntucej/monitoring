"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { FileText, Users, Activity, ArrowRight } from "lucide-react";
import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";

interface StaffAttendanceResponse {
  success: boolean;
  summary?: { totalStaff: number; presentToday: number; overallAttendanceRate?: number };
}

interface DailyAnalyticsResponse {
  success: boolean;
  data?: { entries?: number; exits?: number; onCampus?: number };
}

function SupervisorReportsInner() {
  const user = useAuthStore((s) => s.user);
  const today = new Date().toISOString().slice(0, 10);

  const { data: staffData, refresh: refreshStaff } = useApiResource<StaffAttendanceResponse>(
    "/api/staff/attendance", { ttlMs: 60_000 }
  );
  const { data: dailyData, refresh: refreshDaily } = useApiResource<DailyAnalyticsResponse>(
    `/api/analytics/daily?date=${today}`, { ttlMs: 60_000 }
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([refreshStaff(), refreshDaily()]);
  }, [refreshStaff, refreshDaily]);

  usePolling(refreshAll, { intervalMs: 60_000, enabled: !!user });

  const summary = staffData?.summary;
  const daily = dailyData?.data;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <Link href="/supervisor" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Supervisor Overview
      </Link>
      <WidgetBoundary title="Security Reports">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 space-y-4">
          <div className="flex items-center gap-2 text-slate-400">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Read-only summary · signed in as {user?.role ?? "supervisor"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <div className="flex items-center gap-2 text-slate-400">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-xs uppercase tracking-wide">Staff Present Today</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {summary?.presentToday ?? "—"}
                <span className="text-xs text-slate-500 ml-1">/ {summary?.totalStaff ?? "—"}</span>
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <div className="flex items-center gap-2 text-slate-400">
                <Activity className="w-4 h-4 text-sky-400" />
                <span className="text-xs uppercase tracking-wide">Entries Today</span>
              </div>
              <p className="text-2xl font-bold text-sky-400 mt-1">{daily?.entries ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
              <div className="flex items-center gap-2 text-slate-400">
                <Activity className="w-4 h-4 text-amber-400" />
                <span className="text-xs uppercase tracking-wide">Currently On Campus</span>
              </div>
              <p className="text-2xl font-bold text-amber-400 mt-1">{daily?.onCampus ?? "—"}</p>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/30 p-3 text-xs text-slate-500">
            Full signed-PDF report exports are produced by the system desk on request. Ask the
            administrator to issue one against your identity.
          </div>
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function SupervisorReportsPage() {
  return (
    <AuthGuard allowedRoles={["supervisor", "principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <SupervisorReportsInner />
      </Suspense>
    </AuthGuard>
  );
}
