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
  Clock,
  Loader2,
  AlertTriangle,
  UserCheck,
  Building2,
  ArrowRight,
} from "lucide-react";

/* response shapes */

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

interface PresenceMatrixData {
  gates: Array<{ id: string; name: string; code: string }>;
  roles: string[];
  matrix: Record<string, Record<string, number>>;
}

interface PresenceMatrixResponse {
  success: boolean;
  data: PresenceMatrixData;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-white",
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 text-slate-400 min-w-0">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide truncate">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none text-slate-500" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-500 min-w-0">{sub}</p>}
    </div>
  );
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

function WardenRoomOccupancyInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const {
    data: current,
    loading: currentLoading,
    error: currentError,
    refresh: refreshCurrent,
  } = useApiResource<DataResponse>("/api/occupancy/current", { ttlMs: 30_000 });

  const {
    data: presence,
    loading: presenceLoading,
    error: presenceError,
    refresh: refreshPresence,
  } = useApiResource<PresenceMatrixResponse>("/api/occupancy/presence-matrix", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([refreshCurrent(), refreshPresence()]);
  }, [refreshCurrent, refreshPresence]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const matrix = presence?.data?.matrix ?? {};
  const gates = presence?.data?.gates ?? [];
  const busy =
    (currentLoading && !current) || (presenceLoading && !presence);

  const onCampusTotal = gates.reduce(
    (sum, g) => sum + Object.values(matrix[g.id] ?? {}).reduce((a, b) => a + b, 0),
    0
  );

  const currentStats = current?.data as
    | { totalOnCampus?: number; byGate?: Array<{ gate?: { name?: string; code?: string }; count?: number }> }
    | null;

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

      {/* error banner */}
      {(currentError || presenceError) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {[currentError, presenceError].filter(Boolean).join(" · ")}
            </span>
          </span>
          <button
            type="button"
            onClick={() => void refreshAll()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI snapshot */}
      <WidgetBoundary title="Occupancy Snapshot">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard
            icon={UserCheck}
            label="On Campus Now"
            value={onCampusTotal}
            sub="Total people inside active gates"
            accent="text-emerald-400"
            loading={presenceLoading && !presence}
          />
          <StatCard
            icon={Building2}
            label="Active Gates"
            value={gates.length}
            sub="Gates currently reporting"
            accent="text-sky-400"
            loading={presenceLoading && !presence}
          />
          <StatCard
            icon={Inbox}
            label="Current Stats"
            value={currentStats?.totalOnCampus ?? "—"}
            sub="From /api/occupancy/current"
            accent="text-amber-400"
            loading={currentLoading && !current}
          />
          <StatCard
            icon={AlertTriangle}
            label="Snapshot"
            value="live"
            sub="Occupancy refreshes every 30s"
            accent="text-white"
          />
        </div>
      </WidgetBoundary>

      {/* Per-gate occupancy */}
      <WidgetBoundary title="Per-Gate Occupancy">
        {busy ? (
          <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
            Loading occupancy…
          </div>
        ) : gates.length === 0 ? (
          <EmptyState message="No gate occupancy data available right now." />
        ) : (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Gate</th>
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-right px-4 py-3">Occupancy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {gates.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-300">{g.name}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                      {g.code || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-semibold">
                      {Object.values(matrix[g.id] ?? {}).reduce((a, b) => a + b, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function WardenRoomOccupancyPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <WardenRoomOccupancyInner />
    </Suspense>
  );
}
