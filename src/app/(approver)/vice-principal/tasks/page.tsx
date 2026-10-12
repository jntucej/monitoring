"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { Loader2, Inbox, CalendarClock, ArrowRight, ShieldCheck, ClipboardCheck } from "lucide-react";

/* ── response shapes ── */

interface PermissionRequestRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  student?: {
    name: string;
    student_details?: { roll?: string } | null;
  } | null;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionRequestRow[];
  total?: number;
}

function VpTasksInner() {
  const user = useAuthStore((s) => s.user);

  const {
    data: vpQueue,
    loading: queueLoading,
    refresh: refreshQueue,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?status=PENDING&stage=vice_principal",
    { ttlMs: 30_000 }
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await refreshQueue();
  }, [refreshQueue]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const rows = vpQueue?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Delegated Tasks">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex items-center gap-2 text-slate-400 mb-3 min-w-0">
            <CalendarClock className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Delegated Tasks — items escalated to you for review
            </span>
          </div>
          {queueLoading && !vpQueue ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading tasks…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No delegated tasks at the Vice Principal stage.</p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <ul className="divide-y divide-slate-800/60">
                {rows.slice(0, 10).map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 py-2 min-w-0 hover:bg-slate-800/20 rounded-lg px-2"
                  >
                    <span className="font-mono text-xs text-sky-400 shrink-0 w-28 truncate">
                      {r.ticket_number}
                    </span>
                    <span className="text-sm text-slate-300 truncate min-w-0 flex-1">
                      {r.student?.name || "Unknown requester"}
                      {" · "}
                      <span className="text-slate-500">{r.workflow_type.replace(/_/g, " ")}</span>
                    </span>
                    <span className="text-xs text-slate-500 shrink-0">
                      {r.sla_deadline
                        ? new Date(r.sla_deadline).toLocaleDateString()
                        : "No SLA"}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        r.status === "PENDING"
                          ? "bg-amber-400/15 text-amber-400 border border-amber-400/30"
                          : "bg-slate-700 text-slate-300 border border-slate-600"
                      }`}
                    >
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>
              {rows.length > 10 && (
                <p className="mt-2 text-xs text-slate-600">
                  Showing 10 of {rows.length} delegated tasks.
                </p>
              )}
            </div>
          )}

          {/* Authority note */}
          <div className="mt-4 rounded-lg border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-slate-300 space-y-3 min-w-0">
            <div className="flex items-start gap-3 min-w-0">
              <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium text-white">Delegated Authority</p>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  The Vice Principal handles{" "}
                  <strong className="text-sky-300">delegated institutional operations</strong>.
                  Delegation scope is set by the institution administrator via role permissions.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 min-w-0">
              <ClipboardCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium text-white">Approvals Desk</p>
                <p className="text-xs text-slate-400 mt-1">
                  For full approval actions (forward, reject with remarks, bulk operations),
                  use the shared approvals desk.
                </p>
              </div>
            </div>
            <a
              href="/exam/permissions"
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:bg-sky-500/20 transition-colors"
            >
              Open Approvals Desk
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function VpTasksPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VpTasksInner />
    </Suspense>
  );
}
