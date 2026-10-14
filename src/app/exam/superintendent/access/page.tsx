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
import { ShieldCheck, AlertTriangle, ArrowRight, KeyRound } from "lucide-react";

/* response shapes */

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

interface ExamAccessRow {
  id?: string;
  ticket_number?: string;
  current_stage?: string;
  status?: string;
  candidate_name?: string | null;
  candidate_unique_id?: string | null;
  roll_number?: string | null;
}

interface StageSummaryRow {
  current_stage?: string | null;
  status?: string;
  count?: number;
}

function ExamSuperintendentAccessInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_superintendent") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<DataResponse>("/api/exam/access", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const payload = (data as DataResponse | null)?.data as
    | { authorised?: ExamAccessRow[]; stageSummary?: StageSummaryRow[] }
    | undefined;
  const authorised: ExamAccessRow[] = payload?.authorised ?? [];
  const stageSummary: StageSummaryRow[] = payload?.stageSummary ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/exam/superintendent"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
      </Link>

      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Exam access data unavailable: {error}</span>
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

      <WidgetBoundary title="Exam Access">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white">Who Is Authorised for Exam Access</span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {authorised.length} active clearance record(s)
            </span>
          </div>

          {/* Stage summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 min-w-0">
            {busy ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-800/40" />
              ))
            ) : stageSummary.length === 0 ? (
              <div className="col-span-full rounded-lg border border-slate-800 bg-slate-900/30 p-4 text-center min-w-0">
                <ShieldCheck className="w-5 h-5 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No exam workflow records in the clearance pipeline right now.</p>
              </div>
            ) : (
              stageSummary.slice(0, 8).map((s, i) => (
                <div key={`${s.current_stage}-${s.status}-${i}`} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    {s.current_stage ?? "unknown"} / {s.status ?? "any"}
                  </p>
                  <p className="mt-1 text-lg font-bold text-sky-400">{s.count ?? 0}</p>
                  <p className="text-xs text-slate-500">exam clearance requests</p>
                </div>
              ))
            )}
          </div>

          {/* Authorised list */}
          <div className="px-4 pb-4 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Recent Authorisations</p>
            {!busy && authorised.length === 0 && (
              <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-6 text-center min-w-0">
                <p className="text-sm text-slate-500">No authorised exam access records in view.</p>
              </div>
            )}
            {authorised.length > 0 && (
              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-left text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase">
                      <th className="py-2 pr-3 font-medium">Candidate</th>
                      <th className="py-2 pr-3 font-medium">Roll / ID</th>
                      <th className="py-2 pr-3 font-medium">Stage</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {authorised.slice(0, 25).map((row, i) => (
                      <tr key={row.id ?? i} className="border-b border-slate-800/50">
                        <td className="py-2 pr-3 text-slate-200">{row.candidate_name ?? "—"}</td>
                        <td className="py-2 pr-3 text-slate-400">
                          {row.roll_number ?? row.candidate_unique_id ?? "—"}
                        </td>
                        <td className="py-2 pr-3 text-slate-400">{row.current_stage ?? "—"}</td>
                        <td className="py-2 pr-3">
                          <span
                            className={`text-xs font-semibold ${
                              row.status === "APPROVED"
                                ? "text-emerald-400"
                                : row.status === "ESCALATED"
                                  ? "text-amber-400"
                                  : "text-slate-300"
                            }`}
                          >
                            {row.status ?? "PENDING"}
                          </span>
                        </td>
                        <td className="py-2 text-slate-500">recent</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function ExamSuperintendentAccessPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExamSuperintendentAccessInner />
    </Suspense>
  );
}
