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
import {
  Inbox,
  Loader2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

/* response shapes (mirror /api/alerts) */

interface AlertRow {
  id: string;
  title?: string;
  severity?: string;
  location?: string | null;
  created_at?: string;
  resolved_at?: string | null;
  [key: string]: unknown;
}

interface AlertsResponse {
  success: boolean;
  data: AlertRow[];
  total?: number;
}

function severityAccent(sev?: string): string {
  switch ((sev ?? "").toLowerCase()) {
    case "critical":
      return "text-rose-400 border-rose-400/30 bg-rose-400/10";
    case "high":
      return "text-orange-400 border-orange-400/30 bg-orange-400/10";
    case "medium":
      return "text-amber-400 border-amber-400/30 bg-amber-400/10";
    case "low":
      return "text-sky-400 border-sky-400/30 bg-sky-400/10";
    default:
      return "text-slate-400 border-slate-500/30 bg-slate-500/10";
  }
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-8 text-center text-sm min-w-0">
      <div className="flex flex-col items-center gap-2">
        <Inbox className="w-5 h-5 text-slate-600" />
        <p className="max-w-md text-slate-400">{message}</p>
      </div>
    </div>
  );
}

/* main content */

function WardenIncidentsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<AlertsResponse>("/api/alerts?resolved=false", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const rows = data?.data ?? [];
  const total = data?.total ?? rows.length;
  const busy = loading && !data;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/warden"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Warden Overview
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

      {/* error banner */}
      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Incident data unavailable: {error}</span>
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

      <WidgetBoundary title="Hostel Incidents — Open Alerts">
        {busy ? (
          <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
            Loading incidents…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState message="No open hostel incidents right now. The alert queue is clear." />
        ) : (
          <>
            <div className="px-4 py-3 border-b border-slate-800 text-xs text-slate-500">
              {total} open incident(s) visible to this role
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 min-w-0">
              {rows.slice(0, 12).map((a) => (
                <div
                  key={a.id}
                  className={`rounded-lg border p-3 min-w-0 ${severityAccent(a.severity)}`}
                >
                  <p className="text-sm font-semibold text-white truncate">
                    {a.title || `Alert ${a.id.slice(0, 8)}`}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Severity: {a.severity ? a.severity : "info"}
                    {a.location ? ` · ${a.location}` : ""}
                  </p>
                  {a.created_at && (
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function WardenIncidentsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WardenIncidentsInner />
    </Suspense>
  );
}
