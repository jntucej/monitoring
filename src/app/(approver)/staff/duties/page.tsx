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
import { Loader2, Users, AlertTriangle, ArrowRight } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import type { StaffMyDayResponse } from "../types";

function StaffDutiesInner() {
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
  const slice = data?.data?.duties;

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 overflow-x-hidden space-y-6 px-4 py-6 md:px-6">
      <Link
        href="/staff"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowRight className="size-3.5 rotate-180" /> Back to Staff Overview
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-white">Duties</h1>
          <p className="mt-1 text-sm text-text-muted min-w-0">
            Signed in as <span className="font-medium capitalize text-text-secondary">{role.replace(/_/g, " ")}</span>
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      <ContextSituationBar
        roleLabel="Campus Staff"
        purpose="Monitor active duty rosters and colleagues currently on shift across campus."
        why="Viewing peer shift rosters ensures handover readiness and verifies departmental desk coverage."
        contextLabel="Shift & Duty Schedule"
        statusTone={slice && slice.totalOnShift > 0 ? "ok" : "info"}
        statusPill={`${slice?.totalOnShift ?? 0} On Shift`}
        statusSummary={
          slice && slice.totalOnShift > 0
            ? `${slice.totalOnShift} staff member${slice.totalOnShift === 1 ? "" : "s"} currently scheduled on shift.`
            : "No staff roster entries recorded on shift for today."
        }
        primaryAction={{ label: "My Day", href: "/staff/my-day" }}
        secondaryAction={{ label: "Assigned Tasks", href: "/staff/assigned-tasks" }}
      />

      {error && (
        <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Duties data unavailable: {error}</span>
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="surface-card px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <WidgetBoundary title="Duties">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-4 h-4 text-action-success shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Today&apos;s duty roster</span>
            </div>
            <span className="text-xs text-text-muted shrink-0">{slice?.totalOnShift ?? 0} on shift</span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-text-muted min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading Duties…
            </div>
          ) : slice && slice.roster.length > 0 ? (
            <div className="divide-y divide-slate-800 min-w-0">
              {slice.roster.map((m) => (
                <div key={m.id} className="px-4 py-2.5 flex items-center gap-3 min-w-0">
                  <span className="flex-1 text-sm text-text-secondary truncate">{m.name}</span>
                  <span className="text-xs text-text-muted capitalize shrink-0">{m.role}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 min-w-0 text-center space-y-2">
              <p className="text-sm font-medium text-text-secondary">No staff are on shift today</p>
              <p className="text-xs text-text-muted">Duty schedules will populate once shifts are assigned by administration.</p>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <Link
                  href="/staff/my-day"
                  className="surface-card inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-action-primary text-white hover:opacity-90 transition-opacity"
                >
                  View My Day
                </Link>
                <Link
                  href="/staff/assigned-tasks"
                  className="surface-card inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
                >
                  Check Tasks
                </Link>
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>

    </div>
  );
}
export default function StaffDutiesPage() {
  return (
    <AuthGuard allowedRoles={['staff', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <StaffDutiesInner />
      </Suspense>
    </AuthGuard>
  );
}
