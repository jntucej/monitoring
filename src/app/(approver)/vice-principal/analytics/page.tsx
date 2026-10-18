"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { BarChart3, ScrollText, CheckCircle2, XCircle, Clock } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";

interface AnalyticsRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  updated_at?: string | null;
  student?: { name: string } | null;
}

interface PermissionsResponse {
  success: boolean;
  data: AnalyticsRow[];
  total?: number;
}

const STAGE_LABELS: Record<string, string> = {
  oie: "OIE",
  exam_branch: "Exam Branch",
  vice_principal: "Vice Principal",
  principal: "Principal",
  hod: "HOD",
};

function VpAnalyticsInner() {
  const {
    data: approved,
    loading,
    error,
    refresh: refreshApproved,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?status=APPROVED&workflow_type=exam",
    { ttlMs: 60_000 }
  );

  const refresh = useCallback(async () => {
    clearCache();
    await refreshApproved();
  }, [refreshApproved]);

  usePolling(refresh, { intervalMs: 60_000, enabled: true });

  const rows: AnalyticsRow[] = (approved?.data ?? []) as AnalyticsRow[];
  const total = approved?.total ?? rows.length;

  // Aggregate: by-stage counts and by-status counts across the exam-approval set.
  const byStage = rows.reduce<Record<string, number>>((acc, r) => {
    const k = r.current_stage || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const byStatus = rows.reduce<Record<string, number>>((acc, r) => {
    const k = r.status || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="VP Analytics">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-slate-400 mb-4 min-w-0">
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Exam Approvals — Analytics
            </span>
            <span className="ml-auto text-xs text-slate-500">{total} approved</span>
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              Analytics unavailable: {error}
            </div>
          )}

          {loading && !approved ? (
            <div className="space-y-2 min-w-0">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-slate-800/60 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3 min-w-0">
              {/* By stage */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
                  <ScrollText className="w-3.5 h-3.5" /> By stage
                </div>
                {Object.keys(byStage).length === 0 ? (
                  <p className="text-xs text-slate-600">No stage data.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {Object.entries(byStage)
                      .sort((a, b) => b[1] - a[1])
                      .map(([stage, n]) => (
                        <li key={stage} className="flex items-center justify-between text-xs">
                          <span className="text-slate-300">{STAGE_LABELS[stage] || stage}</span>
                          <span className="font-mono text-sky-400">{n}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              {/* By status */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> By status
                </div>
                {Object.keys(byStatus).length === 0 ? (
                  <p className="text-xs text-slate-600">No status data.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {Object.entries(byStatus)
                      .sort((a, b) => b[1] - a[1])
                      .map(([status, n]) => (
                        <li key={status} className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 capitalize">{status}</span>
                          <span className="font-mono text-sky-400">{n}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              {/* Recent approved tickets */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" /> Recent tickets
                </div>
                {rows.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <XCircle className="w-3.5 h-3.5" /> No approved exam tickets yet.
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {rows
                      .slice()
                      .sort((a, b) => {
                        const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                        const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                        return tb - ta;
                      })
                      .slice(0, 5)
                      .map((r) => (
                        <li key={r.id} className="flex items-center justify-between text-xs gap-2">
                          <span className="font-mono text-sky-400 truncate">{r.ticket_number}</span>
                          <span className="text-slate-500 truncate">{r.student?.name || "—"}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function VpAnalyticsPage() {
  return (
    <AuthGuard allowedRoles={["vice_principal", "exam_branch", "oie", "principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <VpAnalyticsInner />
      </Suspense>
    </AuthGuard>
  );
}
