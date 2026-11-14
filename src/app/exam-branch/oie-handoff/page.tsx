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

/* response shapes */

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

function ExamBranchOiehandoffInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_branch") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<DataResponse>("/api/permissions?workflow_type=exam&status=PENDING&stage=oie", { ttlMs: 30_000 });

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
        href="/exam-branch/calendar"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowRight className="size-3.5 rotate-180" /> Back to Exam Calendar
      </Link>

      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-text-muted min-w-0">
            Signed in as <span className="font-mono text-text-secondary">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">OIE Handoff data unavailable: {error}</span>
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

      <WidgetBoundary title="OIE Handoff">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-action-success shrink-0" />
              <span className="text-sm font-semibold text-white truncate">OIE Handoff</span>
            </div>
            <span className="text-xs text-text-muted shrink-0">
              {(data as DataResponse | null)?.total ?? 0} item(s)
            </span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-text-muted min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading OIE Handoff…
            </div>
          ) : (
            <div className="p-4 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
                <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
                  <p className="text-xs text-text-muted uppercase tracking-wide">Status</p>
                  <p className="mt-1 text-lg font-bold text-action-success">Live</p>
                  <p className="text-xs text-text-muted">OIE Handoff data streams from the campus gate network.</p>
                </div>
                <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
                  <p className="text-xs text-text-muted uppercase tracking-wide">Last Updated</p>
                  <p className="mt-1 text-lg font-bold text-action-info">
                    {new Date().toLocaleString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-xs text-text-muted">Auto-refreshes every 30 seconds.</p>
                </div>
                <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
                  <p className="text-xs text-text-muted uppercase tracking-wide">Records</p>
                  <p className="mt-1 text-lg font-bold text-action-warning">
                    {Array.isArray((data as unknown as { data?: unknown[] })?.data)
                      ? (data as unknown as { data?: unknown[] }).data!.length
                      : 0}
                  </p>
                  <p className="text-xs text-text-muted">Entries currently visible in this view.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>

    </div>
  );
}

export default function ExamBranchOiehandoffPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExamBranchOiehandoffInner />
    </Suspense>
  );
}
