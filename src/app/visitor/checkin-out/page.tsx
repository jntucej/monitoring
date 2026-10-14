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
import { Inbox, Clock, Loader2, ShieldCheck, AlertTriangle, ArrowRight } from "lucide-react";

/* response shapes */

interface VisitorsMineResponse {
  success: boolean;
  data: {
    logs: unknown[];
    active: { status: string; log: unknown } | null;
    lastCompleted: unknown | null;
  };
}

function VisitorCheckinoutInner() {
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

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/visitor"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Visitor Portal
      </Link>

      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Check-in / Out data unavailable: {error}</span>
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

      <WidgetBoundary title="Check-in / Out">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Check-in / Out</span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {data?.data?.logs?.length ?? 0} log(s)
            </span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading Check-in / Out…
            </div>
          ) : (
            <div className="p-4 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
                  <p className="mt-1 text-lg font-bold text-emerald-400">Live</p>
                  <p className="text-xs text-slate-500">Check-in / Out data streams from the campus gate network.</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Last Updated</p>
                  <p className="mt-1 text-lg font-bold text-sky-400">
                    {new Date().toLocaleString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-xs text-slate-500">Auto-refreshes every 30 seconds.</p>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Records</p>
                  <p className="mt-1 text-lg font-bold text-amber-400">
                    {data?.data?.logs?.length ?? 0}
                  </p>
                  <p className="text-xs text-slate-500">Your visitor logs on record.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* Access expiry */}
      <WidgetBoundary title="Access Expiry">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex flex-col gap-2 min-w-0">
            <p className="text-sm font-semibold text-white min-w-0">Time-bound, host-linked visitor access</p>
            <p className="text-xs text-slate-400 min-w-0">
              Visitor passes are granted for the approved visit window and tied to your host&apos;s department.
              Unchecked-out passes auto-expire when the approved window ends, after which gate scans are refused.
            </p>
            {(() => {
              const logs = (data as { data?: { logs?: Array<{ check_in_at?: string; check_out_at?: string | null; status?: string; expires_at?: string | null }> } } | null)?.data?.logs ?? [];
              const active = logs.find((l) => l.status === "active" && !l.check_out_at);
              const expAt = active?.expires_at;
              if (expAt) {
                const ms = new Date(expAt).getTime() - Date.now();
                const expired = ms < 0;
                const hours = Math.max(1, Math.ceil(Math.abs(ms) / 3_600_000));
                return (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${expired ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                    {expired ? "Pass expired" : `Expires in ~${hours}h`}
                  </span>
                );
              }
              return (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-700/40 px-2.5 py-1 text-xs text-slate-300">
                  Expiry set by approved visit window
                </span>
              );
            })()}
          </div>
        </div>
      </WidgetBoundary>

<DevContactStrip />
    </div>
  );
}

export default function VisitorCheckinoutPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VisitorCheckinoutInner />
    </Suspense>
  );
}
