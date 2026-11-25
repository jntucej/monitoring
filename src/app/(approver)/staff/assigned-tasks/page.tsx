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
import { Loader2, ShieldCheck, AlertTriangle, ArrowRight } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import type { StaffMyDayResponse } from "../types";

function StaffAssignedTasksInner() {
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
  const slice = data?.data?.assignedTasks;

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
          <h1 className="text-base font-semibold text-white">Assigned Tasks</h1>
          <p className="mt-1 text-sm text-text-muted min-w-0">
            Signed in as <span className="font-medium capitalize text-text-secondary">{role.replace(/_/g, " ")}</span>
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      <ContextSituationBar
        roleLabel="Campus Staff"
        purpose="Review and process staff-leave requests and workflow actions assigned to you."
        why="Processing staff tasks promptly avoids administrative delays and ensures required cover is confirmed."
        contextLabel="Assigned Task Queue"
        statusTone={slice && slice.totalOpen > 0 ? "warn" : "ok"}
        statusPill={slice && slice.totalOpen > 0 ? `${slice.totalOpen} Open` : "Queue Clear"}
        statusSummary={
          slice && slice.totalOpen > 0
            ? `You have ${slice.totalOpen} open staff-leave request${slice.totalOpen === 1 ? "" : "s"} waiting for review.`
            : "No pending staff-leave tasks assigned to you right now."
        }
        primaryAction={{ label: "My Requests", href: "/staff/requests" }}
        secondaryAction={{ label: "Staff Roster Duties", href: "/staff/duties" }}
      />

      {error && (
        <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Assigned Tasks data unavailable: {error}</span>
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

      <WidgetBoundary title="Assigned Tasks">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-action-success shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Open staff-leave requests</span>
            </div>
            <span className="text-xs text-text-muted shrink-0">
              {slice?.totalOpen ?? 0} open
            </span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-text-muted min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading Assigned Tasks…
            </div>
          ) : (
            <div className="p-4 min-w-0 space-y-3">
              {slice && slice.openRequests.length > 0 ? (
                <div className="space-y-2 min-w-0">
                  {slice.openRequests.map((r) => (
                    <div key={r.id} className="surface-card flex flex-wrap items-center gap-3 bg-bg-surface/40 p-3 min-w-0">
                      <span className="text-xs text-text-muted font-mono shrink-0">{r.ticket_number ?? r.id.slice(0, 8)}</span>
                      <span className="flex-1 text-sm text-text-secondary">{r.workflow_type}</span>
                      <span className="surface-card px-2 py-0.5 text-xs bg-bg-elevated/40 text-text-secondary shrink-0 capitalize">
                        {r.current_stage ?? r.status}
                      </span>
                      <span className="text-xs text-text-muted shrink-0">
                        {new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="surface-card p-6 text-center space-y-2">
                  <p className="text-sm font-medium text-text-secondary">No open staff-leave requests assigned to you</p>
                  <p className="text-xs text-text-muted">You are all caught up. Check your personal requests or duty schedule.</p>
                  <div className="pt-2 flex flex-wrap justify-center gap-2">
                    <Link
                      href="/staff/requests"
                      className="surface-card inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-action-primary text-white hover:opacity-90 transition-opacity"
                    >
                      View My Requests
                    </Link>
                    <Link
                      href="/staff/duties"
                      className="surface-card inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-bg-elevated text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Check Roster Duties
                    </Link>
                  </div>
                </div>
              )}
              {slice?.lastMovement && (
                <p className="text-xs text-text-muted">
                  Most recent movement:{" "}
                  <span className="text-text-secondary">{slice.lastMovement.direction}</span> at{" "}
                  <span className="text-text-secondary">
                    {new Date(slice.lastMovement.timestamp).toLocaleString("en-IN", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </WidgetBoundary>

    </div>
  );
}
export default function StaffAssignedTasksPage() {
  return (
    <AuthGuard allowedRoles={['staff', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <StaffAssignedTasksInner />
      </Suspense>
    </AuthGuard>
  );
}
