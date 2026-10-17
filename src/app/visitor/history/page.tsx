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
import { Loader2, History, AlertTriangle, ArrowRight } from "lucide-react";
import type { VisitorsMineResponse, VisitorLogRow } from "../types";

function fmtRange(l: VisitorLogRow): string {
  const inAt = l.check_in_at
    ? new Date(l.check_in_at).toLocaleString("en-IN", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : "—";
  const outAt = l.check_out_at
    ? new Date(l.check_out_at).toLocaleString("en-IN", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : "in progress";
  return `${inAt} → ${outAt}`;
}

function VisitorHistoryInner() {
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
  const history = data?.data?.history ?? [];

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
          <h1 className="text-base font-semibold text-white">History</h1>
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
            <span className="truncate">History unavailable: {error}</span>
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

      <WidgetBoundary title="History">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <History className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Completed visits</span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">{history.length} visit(s)</span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading…
            </div>
          ) : history.length === 0 ? (
            <div className="p-4 min-w-0">
              <p className="text-sm text-slate-500">No completed visits yet. Your visit history will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800 min-w-0">
              {history.map((l) => (
                <div key={l.id} className="px-4 py-3 flex flex-wrap items-center gap-3 min-w-0">
                  <span className="text-xs text-slate-400 w-40 shrink-0">{fmtRange(l)}</span>
                  <div className="flex-1 min-w-0">
                    {l.host?.name ? (
                      <p className="text-sm text-slate-200 truncate">Visiting <span className="font-semibold">{l.host.name}</span></p>
                    ) : (
                      <p className="text-sm text-slate-500">Host not recorded</p>
                    )}
                    {l.purpose && (
                      <p className="text-xs text-slate-500 truncate">Purpose: {l.purpose}</p>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-700/40 text-slate-300 shrink-0">completed</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function VisitorHistoryPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VisitorHistoryInner />
    </Suspense>
  );
}
