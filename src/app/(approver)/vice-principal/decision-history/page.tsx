"use client";

import { Suspense, useCallback, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { History, ScrollText } from "lucide-react";

interface DecisionRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  updated_at?: string | null;
  student?: {
    name: string;
    student_details?: { roll?: string } | null;
  } | null;
}

interface PermissionsResponse {
  success: boolean;
  data: DecisionRow[];
  total?: number;
}

type StatusFilter = "ALL" | "APPROVED" | "REJECTED";

function VpDecisionHistoryInner() {
  const [filter, setFilter] = useState<StatusFilter>("ALL");

  const {
    data: approved,
    loading: approvedLoading,
    error: approvedError,
    refresh: refreshApproved,
  } = useApiResource<PermissionsResponse>("/api/permissions?status=APPROVED", {
    ttlMs: 60_000,
  });

  const {
    data: rejected,
    loading: rejectedLoading,
    error: rejectedError,
    refresh: refreshRejected,
  } = useApiResource<PermissionsResponse>("/api/permissions?status=REJECTED", {
    ttlMs: 60_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([refreshApproved(), refreshRejected()]);
  }, [refreshApproved, refreshRejected]);

  usePolling(refreshAll, { intervalMs: 60_000, enabled: true });

  const approvedRows: DecisionRow[] = (approved?.data ?? []) as DecisionRow[];
  const rejectedRows: DecisionRow[] = (rejected?.data ?? []) as DecisionRow[];

  const merged =
    filter === "APPROVED"
      ? approvedRows.map((r) => ({ ...r, status: "APPROVED" as const }))
      : filter === "REJECTED"
        ? rejectedRows.map((r) => ({ ...r, status: "REJECTED" as const }))
        : [
            ...approvedRows.map((r) => ({ ...r, status: "APPROVED" as const })),
            ...rejectedRows.map((r) => ({ ...r, status: "REJECTED" as const })),
          ].sort((a, b) => {
            const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return tb - ta;
          });

  const loading =
    (approvedLoading && !approved) ||
    (filter !== "APPROVED" && rejectedLoading && !rejected);
  const error = approvedError || (filter !== "APPROVED" ? rejectedError : null);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Decision History">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-slate-400 mb-3 min-w-0">
            <History className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Past Decisions — VP Scope
            </span>
          </div>

          {/* status filter */}
          <div className="flex items-center gap-2 overflow-x-auto mb-3 min-w-0">
            {(["ALL", "APPROVED", "REJECTED"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border shrink-0 transition-colors ${
                  filter === f
                    ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                }`}
              >
                {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-600 shrink-0">
              {approved?.total ?? 0} approved · {rejected?.total ?? 0} rejected
            </span>
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              History unavailable: {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-2 min-w-0">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-slate-800/60 animate-pulse" />
              ))}
            </div>
          ) : merged.length === 0 ? (
            <div className="p-6 text-center">
              <ScrollText className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No past decisions recorded in this scope.</p>
            </div>
          ) : (
            <ul className="space-y-2 min-w-0">
              {merged.slice(0, 20).map((r) => (
                <li
                  key={`${r.status}-${r.id}`}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 min-w-0 flex flex-wrap items-center gap-2"
                >
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                      r.status === "APPROVED"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {r.status}
                  </span>
                  <span className="font-mono text-xs text-sky-400 shrink-0">{r.ticket_number}</span>
                  <span className="text-sm text-slate-300 truncate min-w-0 flex-1">
                    {r.student?.name || "—"}
                    {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
                  </span>
                  <span className="text-xs text-slate-500 capitalize shrink-0">
                    {r.workflow_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-slate-600 shrink-0 ml-auto">
                    {r.updated_at
                      ? new Date(r.updated_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                </li>
              ))}
              {merged.length > 20 && (
                <li className="text-xs text-slate-600">
                  Showing 20 of {merged.length} decisions.
                </li>
              )}
            </ul>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function VpDecisionHistoryPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VpDecisionHistoryInner />
    </Suspense>
  );
}
