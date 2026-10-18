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
import { Inbox, Loader2, ShieldCheck, AlertTriangle, ArrowRight } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";

/* response shapes */

interface StudentsStatsData {
  total: number;
  active: number;
  suspended: number;
  flagged: number;
  onCampusToday: number;
  todayEntries: number;
  todayExits: number;
  byDepartment?: Array<{ code: string; name: string; count: number }>;
}

interface StudentsStatsResponse {
  success: boolean;
  data: StudentsStatsData;
}

function HodStudentsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "hod") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<StudentsStatsResponse>("/api/students/stats", { ttlMs: 30_000 });

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
            <span className="truncate">Students data unavailable: {error}</span>
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

      <WidgetBoundary title="Students">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Students</span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">{data?.data?.total ?? 0} student(s) in your department</span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading Students…
            </div>
          ) : (
            <div className="p-4 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">On Campus Today</p>
                  <p className="mt-1 text-lg font-bold text-emerald-400">{data?.data?.onCampusToday ?? 0}</p>
                  <p className="text-xs text-slate-500">Currently on premises.</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Entries / Exits</p>
                  <p className="mt-1 text-lg font-bold text-sky-400">{data?.data?.todayEntries ?? 0} / {data?.data?.todayExits ?? 0}</p>
                  <p className="text-xs text-slate-500">Gate movements logged today.</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Active</p>
                  <p className="mt-1 text-lg font-bold text-white">{data?.data?.active ?? 0}</p>
                  <p className="text-xs text-slate-500">Not suspended or checked out.</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Roster Size</p>
                  <p className="mt-1 text-lg font-bold text-amber-400">{data?.data?.total ?? 0}</p>
                  <p className="text-xs text-slate-500">Total students on record.</p>
                </div>
              </div>

              {data?.data?.byDepartment && data.data.byDepartment.length > 0 && (
                <div className="mt-4 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">By Department</p>
                  <div className="flex flex-wrap gap-2 min-w-0">
                    {data.data.byDepartment.map((d) => (
                      <span key={d.code} className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-1 text-xs text-slate-300">
                        <span className="font-mono text-slate-400">{d.name}</span>
                        <span className="text-slate-500">{d.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}
export default function HodStudentsPage() {
  return (
    <AuthGuard allowedRoles={['hod', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <HodStudentsInner />
      </Suspense>
    </AuthGuard>
  );
}
