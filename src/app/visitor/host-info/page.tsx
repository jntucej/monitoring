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
import { Loader2, User, AlertTriangle, ArrowRight } from "lucide-react";
import type { VisitorsMineResponse } from "../types";

function VisitorHostinfoInner() {
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
  const host = data?.data?.hostInfo;
  const visit = data?.data?.visitDetails;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <Link
        href="/visitor"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Visitor Portal
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-white">Host Info</h1>
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
            <span className="truncate">Host info unavailable: {error}</span>
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

      <WidgetBoundary title="Host Info">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <User className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Your host</span>
            </div>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading host info…
            </div>
          ) : host?.name ? (
            <div className="p-4 min-w-0 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Host</p>
                  <p className="mt-1 text-base font-semibold text-slate-100">{host.name}</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Host ID</p>
                  <p className="mt-1 text-base font-mono text-sky-400">
                    {host.uniqueId ?? "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Host role</p>
                  <p className="mt-1 text-base font-bold text-amber-400">{host.role ?? "—"}</p>
                </div>
              </div>
              {visit?.purpose && (
                <p className="text-xs text-slate-500">
                  Visit purpose: <span className="text-slate-300">{visit.purpose}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 min-w-0">
              <p className="text-sm text-slate-500">No host is linked to your most recent visit.</p>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function VisitorHostinfoPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VisitorHostinfoInner />
    </Suspense>
  );
}
