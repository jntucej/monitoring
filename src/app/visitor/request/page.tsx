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
import { Loader2, FileText, AlertTriangle, ArrowRight } from "lucide-react";
import type { VisitorsMineResponse } from "../types";

function VisitorRequestInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "visitor") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<VisitorsMineResponse>("/api/visitors/mine", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const req = data?.data?.request;
  const fmt = (v: string | null | undefined) =>
    v ? new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

  const stateLabel =
    req?.state === "ACTIVE" ? "Active visit" :
    req?.state === "COMPLETED" ? "Completed" : "No request";
  const stateTone =
    req?.state === "ACTIVE" ? "text-action-success" :
    req?.state === "COMPLETED" ? "text-action-info" : "text-text-muted";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <Link
        href="/visitor"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowRight className="size-3.5 rotate-180" /> Back to Visitor Portal
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-white">Visit Request</h1>
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
            <span className="truncate">Request data unavailable: {error}</span>
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

      <WidgetBoundary title="Visit Request">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-action-info shrink-0" />
              <span className="text-sm font-semibold text-white truncate">What you requested to visit</span>
            </div>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-text-muted min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading…
            </div>
          ) : (
            <div className="p-4 min-w-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
                <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
                  <p className="text-xs text-text-muted uppercase tracking-wide">State</p>
                  <p className={`mt-1 text-base font-bold ${stateTone}`}>{stateLabel}</p>
                </div>
                <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
                  <p className="text-xs text-text-muted uppercase tracking-wide">Host</p>
                  <p className="mt-1 text-base text-text-primary">{req?.hostName ?? "—"}</p>
                </div>
                <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
                  <p className="text-xs text-text-muted uppercase tracking-wide">Purpose</p>
                  <p className="mt-1 text-base text-text-primary">{req?.purpose ?? "—"}</p>
                </div>
                <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
                  <p className="text-xs text-text-muted uppercase tracking-wide">Requested</p>
                  <p className="mt-1 text-base font-semibold text-action-warning">{fmt(req?.requestedAt)}</p>
                </div>
              </div>
              {req?.state === "NONE" && (
                <p className="text-xs text-text-muted">
                  No visit request is on record yet. Ask your host to issue a visitor pass at the gate.
                </p>
              )}
            </div>
          )}
        </div>
      </WidgetBoundary>

    </div>
  );
}

export default function VisitorRequestPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VisitorRequestInner />
    </Suspense>
  );
}
