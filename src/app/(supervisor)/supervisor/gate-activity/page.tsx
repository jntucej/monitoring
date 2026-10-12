"use client";

import { Suspense } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { usePolling } from "@/hooks/usePolling";
import { useApiResource } from "@/hooks/useApiResource";
import { MapPin, Loader2, Inbox, ArrowRight } from "lucide-react";

interface PresenceMatrixResponse {
  success: boolean;
  data: {
    gates: Array<{ id: string; name: string; code: string; audience: string; type: string }>;
    roles: string[];
    matrix: Record<string, Record<string, number>>;
    lastUpdated: string;
  };
}

function GateActivityInner() {
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

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Assigned Gate Activity">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          {presenceLoading && !presence ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading gate presence…
            </div>
          ) : gates.length === 0 ? (
            <div className="p-4 text-sm min-w-0">
              <Inbox className="w-5 h-5 text-slate-600 mb-2" />
              No active gates in the live presence matrix.
            </div>
          ) : (
            <div className="space-y-3 min-w-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 min-w-0">
                {gates.map((g) => {
                  const inside = Object.values(matrix[g.id] ?? {}).reduce((a, b) => a + b, 0);
                  return (
                    <div key={g.id} className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 min-w-0">
                      <p className="text-xs font-semibold text-slate-300 truncate">{g.name}</p>
                      <p className="text-[10px] font-mono text-slate-500">{g.code}</p>
                      <p className="text-lg font-bold text-sky-400 mt-1">
                        {inside} <span className="text-xs font-normal text-slate-500">on campus</span>
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-3 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 min-w-0">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  Assigned-gate detail (duty rosters per gate) is not exposed at this tier.
                </span>
                <a
                  href="/gates"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
                >
                  Gate desk <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function GateActivityPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <GateActivityInner />
    </Suspense>
  );
}
