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
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  Inbox,
  Loader2,
  Building2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

/* response shapes */

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

interface GateRow {
  id: string;
  name: string;
  code: string;
  audience?: string;
  type?: string;
}

function CaretakerFacilitiesInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "caretaker") as Role;
  const tier = getRoleTier(role);

  const {
    data: presence,
    loading,
    error,
    refresh,
  } = useApiResource<DataResponse>("/api/occupancy/presence-matrix", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !presence;
  const gateRows: GateRow[] =
    ((presence as { data?: { gates?: GateRow[] } } | null)?.data?.gates ?? []);

  const facilities: Array<{ name: string; detail: string; status: string }> = [
    {
      name: "Main Gate & Perimeter",
      detail: "Primary scan point for all arrivals and departures",
      status: "Active",
    },
    {
      name: "Hostel Blocks",
      detail: "Resident housing areas and housekeeping zones",
      status: "Active",
    },
    {
      name: "Utility & Maintenance Rooms",
      detail: "Electrical, plumbing and HVAC plant locations",
      status: "Active",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/caretaker"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Facilities Overview
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

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Facilities data unavailable: {error}</span>
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

      <WidgetBoundary title="Facilities">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Campus Facilities</span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {gateRows.length > 0
                ? `${gateRows.length} gate(s) reporting to presence matrix`
                : "Gate network status available via live presence matrix"}
            </span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading Facilities…
            </div>
          ) : (
            <div className="p-4 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
                {facilities.map((f) => (
                  <div key={f.name} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">{f.name}</p>
                    <p className="mt-1 text-lg font-bold text-emerald-400">{f.status}</p>
                    <p className="text-xs text-slate-500">{f.detail}</p>
                  </div>
                ))}
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Reports</p>
                  <p className="mt-1 text-lg font-bold text-sky-400">Live</p>
                  <p className="text-xs text-slate-500">
                    Auto-refreshes every 30 seconds via the presence matrix.
                  </p>
                </div>
              </div>

              {gateRows.length > 0 && (
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Gates Reporting</p>
                  <div className="flex flex-wrap gap-2">
                    {gateRows.map((g) => (
                      <span
                        key={g.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-800/60 text-slate-300 border border-slate-700"
                      >
                        <Inbox className="w-3 h-3 text-emerald-400" />
                        {g.name}
                        {g.code ? <span className="text-slate-500">({g.code})</span> : null}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}
export default function CaretakerFacilitiesPage() {
  return (
    <AuthGuard allowedRoles={['caretaker', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <CaretakerFacilitiesInner />
      </Suspense>
    </AuthGuard>
  );
}
