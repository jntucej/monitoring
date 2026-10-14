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
  UserCheck,
  ArrowRight,
} from "lucide-react";

/* response shapes (mirror /api/occupancy/presence-matrix) */

interface PresenceMatrixData {
  gates: Array<{ id: string; name: string; code: string; audience?: string; type?: string }>;
  roles: string[];
  matrix: Record<string, Record<string, number>>;
  lastUpdated?: string;
}

interface PresenceMatrixResponse {
  success: boolean;
  data: PresenceMatrixData;
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

function WardenHostelAttendanceInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<PresenceMatrixResponse>("/api/occupancy/presence-matrix", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const matrix = data?.data?.matrix ?? {};
  const gates = data?.data?.gates ?? [];
  const roles = data?.data?.roles ?? [];
  const busy = loading && !data;

  const gateTotals = gates
    .map((g) => ({
      gate: g,
      total: Object.values(matrix[g.id] ?? {}).reduce((a, b) => a + b, 0),
    }))
    .filter((x) => x.total > 0 || true);

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
            <span className="truncate">Attendance data unavailable: {error}</span>
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

      {/* Attendance matrix */}
      <WidgetBoundary title="Hostel Attendance — Live Presence">
        {busy ? (
          <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
            Loading attendance…
          </div>
        ) : gates.length === 0 ? (
          <EmptyState message="No active gates reporting presence right now." />
        ) : (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Gate</th>
                  {roles.map((r) => (
                    <th key={r} className="text-right px-4 py-3 capitalize">
                      {r}
                    </th>
                  ))}
                  <th className="text-right px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {gateTotals.map(({ gate, total }) => (
                  <tr key={gate.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-300">
                      {gate.name}
                      {gate.code ? (
                        <span className="ml-2 text-xs text-slate-500 font-mono">{gate.code}</span>
                      ) : null}
                    </td>
                    {roles.map((r) => (
                      <td key={r} className="px-4 py-3 text-right text-slate-400">
                        {matrix[gate.id]?.[r] ?? 0}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right text-emerald-400 font-semibold">
                      {total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="flex items-center gap-2 px-4 py-3 text-xs text-slate-500 border-t border-slate-800">
              <UserCheck className="w-3 h-3" />
              Live presence snapshot{data?.data?.lastUpdated ? ` · updated ${new Date(data.data.lastUpdated).toLocaleTimeString()}` : ""}
            </p>
          </div>
        )}
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function WardenHostelAttendancePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WardenHostelAttendanceInner />
    </Suspense>
  );
}
