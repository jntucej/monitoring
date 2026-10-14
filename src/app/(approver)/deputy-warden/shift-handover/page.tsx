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
  ShieldCheck,
  Inbox,
  Loader2,
  ArrowRight,
  AlertTriangle
} from "lucide-react";

/* response shapes (mirror /api/campus-extra/handover) */

interface HandoverItem {
  type: string;
  title: string;
  details?: string;
  severity?: string;
}

interface HandoverRecord {
  id: string;
  toRole: string;
  items: HandoverItem[];
  notes?: string | null;
  byName?: string | null;
  createdAt: string;
}

interface HandoverResponse {
  success: boolean;
  data: { handovers: HandoverRecord[] };
}

function DeputyWardenHandoverInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "deputy_warden") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<HandoverResponse>("/api/campus-extra/handover?to_role=deputy_warden", {
    ttlMs: 30_000
  });

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
        href="/deputy-warden/daily-overview"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Daily Overview
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

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Handover data unavailable: {error}</span>
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

      <WidgetBoundary title="Handover">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Shift Handover</span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {(data?.data?.handovers ?? []).length} handover(s) · 7-day window
            </span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading Shift Handover…
            </div>
          ) : (data?.data?.handovers ?? []).length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                No shift handovers recorded in the last 7 days. End-of-shift notes from operators
                and supervisors will appear here.
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3 min-w-0">
              {(data?.data?.handovers ?? []).map((h) => (
                <div key={h.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                    <p className="text-sm font-semibold text-white min-w-0">
                      {h.byName ? `From ${h.byName}` : "From previous shift"}
                      <span className="ml-2 text-xs font-normal text-slate-500">{new Date(h.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </p>
                    <span className="text-xs text-slate-500">{(h.items ?? []).length} item(s)</span>
                  </div>
                  {h.notes ? <p className="mt-1 text-xs text-slate-400">{h.notes}</p> : null}
                  {(h.items ?? []).length > 0 ? (
                    <ul className="mt-2 space-y-1 min-w-0">
                      {(h.items ?? []).map((it, i) => (
                        <li key={i} className="text-xs text-slate-400 min-w-0">
                          <span className="text-slate-500 font-mono">{it.type}</span> · {it.title}
                          {it.details ? <span className="text-slate-500"> — {it.details}</span> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
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

export default function DeputyWardenHandoverPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <DeputyWardenHandoverInner />
    </Suspense>
  );
}
