"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { usePolling } from "@/hooks/usePolling";
import { useApiResource } from "@/hooks/useApiResource";
import { DoorOpen, ShieldAlert, Loader2, Inbox } from "lucide-react";

interface PresenceMatrixResponse {
  success: boolean;
  data: {
    gates: Array<{ id: string; name: string; code: string; audience: string; type: string }>;
    roles: string[];
    matrix: Record<string, Record<string, number>>;
    lastUpdated: string;
  };
}

interface LockdownResponse {
  success: boolean;
  data: { id?: string; reason?: string; startedAt?: string; started_at?: string } | null;
}

function GateStatusInner() {
  const { data: lockdown } = useApiResource<LockdownResponse>("/api/lockdown/active", {
    ttlMs: 30_000,
  });
  const {
    data: presence,
    loading: presenceLoading,
    refresh: refreshPresence,
  } = useApiResource<PresenceMatrixResponse>("/api/occupancy/presence-matrix", {
    ttlMs: 30_000,
  });

  usePolling(refreshPresence, { intervalMs: 30_000, enabled: true });

  const gates = presence?.data?.gates ?? [];
  const matrix = presence?.data?.matrix ?? {};
  const activeLockdown = Boolean(lockdown?.data);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Gate Status">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          {activeLockdown && (
            <div className="px-4 py-3 border-b border-rose-500/30 bg-rose-500/10 text-sm text-rose-300 flex items-center gap-2 min-w-0">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span className="min-w-0">
                <span className="font-semibold">Active lockdown in effect</span>
                {lockdown?.data?.reason ? ` — ${lockdown.data.reason}` : ""}
              </span>
            </div>
          )}
          {presenceLoading && !presence ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading gate presence…
            </div>
          ) : gates.length === 0 ? (
            <div className="p-8 text-center text-sm min-w-0">
              <Inbox className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              No active gates in the live presence matrix.
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-3 py-2">Gate</th>
                    <th className="text-left px-3 py-2">Audience</th>
                    <th className="text-left px-3 py-2">On Campus</th>
                    <th className="text-left px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {gates.map((g) => {
                    const inside = Object.values(matrix[g.id] ?? {}).reduce((a, b) => a + b, 0);
                    const status = activeLockdown ? "LOCKDOWN" : inside > 0 ? "CLEAR" : "IDLE";
                    return (
                      <tr key={g.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-3 py-2.5 text-slate-200 font-medium min-w-0">
                          {g.name}
                          <span className="ml-2 font-mono text-[10px] text-slate-500">{g.code}</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 capitalize">{g.audience}</td>
                        <td className="px-3 py-2.5 font-mono text-sky-400">{inside}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              status === "LOCKDOWN"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : status === "CLEAR"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-slate-500/10 text-slate-400 border-slate-600/40"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function GateStatusPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <GateStatusInner />
    </Suspense>
  );
}
