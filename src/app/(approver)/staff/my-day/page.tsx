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
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { StaffMyDayResponse } from "../types";

function StaffMydayInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "staff") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<StaffMyDayResponse>("/api/staff/my-day", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const summary = data?.data?.myDaySummary;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <Link
        href="/staff"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Staff Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-white">My Day</h1>
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
            <span className="truncate">My Day data unavailable: {error}</span>
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

      <WidgetBoundary title="My Day">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Day at a glance</span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {summary?.movementsToday ?? 0} movements · {summary?.rosterOnShift ?? 0} on shift
            </span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading My Day…
            </div>
          ) : (
            <div className="p-4 min-w-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Movements</p>
                  <p className="mt-1 text-lg font-bold text-emerald-400">{summary?.movementsToday ?? 0}</p>
                  <p className="text-xs text-slate-500">Recent in/out events.</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Open requests</p>
                  <p className="mt-1 text-lg font-bold text-amber-400">{summary?.openRequestsCount ?? 0}</p>
                  <p className="text-xs text-slate-500">Staff-leave requests pending.</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">On shift</p>
                  <p className="mt-1 text-lg font-bold text-sky-400">{summary?.rosterOnShift ?? 0}</p>
                  <p className="text-xs text-slate-500">Staff on duty today.</p>
                </div>
              </div>
              {summary?.lastMovements?.length ? (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Recent movements</p>
                  <div className="space-y-1.5 min-w-0">
                    {summary.lastMovements.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 min-w-0">
                        <span className={`text-xs font-bold shrink-0 ${m.direction === "IN" ? "text-emerald-400" : "text-rose-400"}`}>
                          {m.direction}
                        </span>
                        <span className="text-xs text-slate-400 truncate">
                          {new Date(m.timestamp).toLocaleString("en-IN", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        {m.gate_id && (
                          <span className="text-[11px] text-slate-500 font-mono truncate">gate {m.gate_id}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No recent movements recorded.</p>
              )}
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}
export default function StaffMydayPage() {
  return (
    <AuthGuard allowedRoles={['staff', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <StaffMydayInner />
      </Suspense>
    </AuthGuard>
  );
}
