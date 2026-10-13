"use client";

import { Suspense, useCallback, useMemo } from "react";
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
  Clock,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  SearchCheck,
} from "lucide-react";

/* /api/occupancy/presence-matrix response shape */
interface PresenceMatrixResponse {
  success: boolean;
  data: {
    gates: Array<{
      id: string;
      name: string;
      code: string;
      audience: string;
      type: string;
    }>;
    roles: string[];
    matrix: Record<string, Record<string, number>>;
    lastUpdated: string;
  };
}

/* /api/permissions response shape */
interface PermissionRequest {
  id: string;
  ticket_number: string;
  workflow_type: string;
  status: string;
  current_stage: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionRequest[] | null;
  total: number;
}

function ExamBranchVerificationInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_branch") as Role;
  const tier = getRoleTier(role);

  const {
    data: presence,
    loading: presenceLoading,
    error: presenceError,
    refresh: refreshPresence,
  } = useApiResource<PresenceMatrixResponse>("/api/occupancy/presence-matrix", {
    ttlMs: 30_000,
  });

  const {
    data: examReqs,
    loading: examReqsLoading,
    error: examReqsError,
    refresh: refreshExamReqs,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflowType=exam&status=PENDING&stage=vice_principal",
    { ttlMs: 30_000 }
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([refreshPresence(), refreshExamReqs()]);
  }, [refreshPresence, refreshExamReqs]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy =
    (presenceLoading && !presence) || (examReqsLoading && !examReqs);

  const gates = presence?.data?.gates ?? [];
  const matrix = presence?.data?.matrix ?? {};
  const lastUpdated = presence?.data?.lastUpdated;

  const vpRequests = useMemo<PermissionRequest[]>(
    () => (examReqs?.data as unknown as PermissionRequest[]) ?? [],
    [examReqs]
  );

  const totalOnCampus = useMemo(() => {
    return Object.values(matrix).reduce(
      (sum, gateCounts) => sum + Object.values(gateCounts).reduce((a, b) => a + b, 0),
      0
    );
  }, [matrix]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <Link
        href="/exam-branch"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
      </Link>

      {/* Toolbar */}
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

      {presenceError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Presence data unavailable: {presenceError}</span>
          </span>
          <button
            type="button"
            onClick={() => void refreshPresence()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {examReqsError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Verification queue unavailable: {examReqsError}</span>
          </span>
          <button
            type="button"
            onClick={() => void refreshExamReqs()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* On-campus presence summary */}
      <WidgetBoundary title="On-Campus Presence">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">
                Access Verification — Live Presence
              </span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {lastUpdated
                ? new Date(lastUpdated).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "…"}
            </span>
          </div>

          {presenceLoading && !presence ? (
            <div className="p-4 space-y-3 min-w-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg border border-slate-800 bg-slate-900/40 animate-pulse motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : gates.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <BadgeCheck className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">No active gates reporting.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="text-left px-4 py-2 font-semibold">Gate</th>
                    {Object.keys(
                      presence?.data?.matrix?.[gates[0]?.id] ?? {}
                    ).map((roleKey) => (
                      <th key={roleKey} className="text-right px-4 py-2 font-semibold">
                        {roleKey}
                      </th>
                    ))}
                    <th className="text-right px-4 py-2 font-semibold text-emerald-400">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {gates.map((gate) => {
                    const gateCounts = matrix[gate.id] ?? {};
                    const gateTotal = Object.values(gateCounts).reduce(
                      (a, b) => a + b,
                      0
                    );
                    return (
                      <tr
                        key={gate.id}
                        className="border-b border-slate-800/50 last:border-b-0"
                      >
                        <td className="px-4 py-2.5 text-slate-300 font-medium">
                          {gate.name}
                          <span className="ml-2 text-slate-600">{gate.code}</span>
                        </td>
                        {presence?.data?.roles?.map((roleKey) => (
                          <td
                            key={roleKey}
                            className="px-4 py-2.5 text-right tabular-nums text-slate-400"
                          >
                            {gateCounts[roleKey] ?? 0}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-right tabular-nums text-emerald-400 font-semibold">
                          {gateTotal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-800 text-slate-400 font-semibold">
                    <td className="px-4 py-2.5">Total on campus</td>
                    {presence?.data?.roles?.map((roleKey) => (
                      <td key={roleKey} className="px-4 py-2.5 text-right tabular-nums">
                        {gates.reduce(
                          (sum, g) => sum + (matrix[g.id]?.[roleKey] ?? 0),
                          0
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right tabular-nums text-emerald-400">
                      {totalOnCampus}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* VP-escalated exam requests needing verification */}
      <WidgetBoundary title="Escalated Exam Requests">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <SearchCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">
                Requests Escalated to Vice Principal
              </span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {examReqs?.total ?? vpRequests.length} pending
            </span>
          </div>

          {examReqsLoading && !examReqs ? (
            <div className="p-4 space-y-3 min-w-0">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg border border-slate-800 bg-slate-900/40 animate-pulse motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : vpRequests.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <SearchCheck className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">
                No exam requests escalated to the vice-principal stage.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800 min-w-0">
              {vpRequests.map((req) => (
                <li key={req.id} className="px-4 py-3 flex flex-col gap-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-slate-300">
                      {req.ticket_number}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-sky-500/15 text-sky-300 px-2 py-0.5 text-xs">
                      VP STAGE
                    </span>
                    <span className="text-xs text-slate-500">{req.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 min-w-0">
                    Created{" "}
                    {new Date(req.created_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {" · "}
                    Updated{" "}
                    {new Date(req.updated_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function ExamBranchVerificationPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExamBranchVerificationInner />
    </Suspense>
  );
}
