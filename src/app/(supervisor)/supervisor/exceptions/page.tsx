"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { KeySquare, Loader2, AlertTriangle, Inbox, Lock, ArrowRight } from "lucide-react";

interface PermissionsResponse {
  success: boolean;
  data: Array<{
    id: string;
    ticket_number?: string;
    workflow_type?: string;
    status?: string;
    sla_deadline?: string | null;
    student?: { name?: string; student_details?: { roll?: string } | null } | null;
  }>;
  total?: number;
}

function safeText(v: string | number | null | undefined, fallback = "—"): string {
  const s = String(v ?? "").trim();
  if (!s || s === "undefined" || s === "NaN" || s.toLowerCase() === "null") return fallback;
  return s;
}

function SupervisorExceptionsInner() {
  const user = useAuthStore((s) => s.user);

  const {
    data: staffLeave,
    loading: staffLeaveLoading,
    error: staffLeaveError,
    refresh: refreshStaffLeave,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflow_type=staff_leave&status=PENDING",
    { ttlMs: 30_000 }
  );

  const {
    data: outpass,
    loading: outpassLoading,
    error: outpassError,
    refresh: refreshOutpass,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflow_type=outpass&status=PENDING",
    { ttlMs: 30_000 }
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([refreshStaffLeave(), refreshOutpass()]);
  }, [refreshStaffLeave, refreshOutpass]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const rows = [
    ...(staffLeave?.data ?? []).map((r) => ({ ...r, source: "staff-leave" as const })),
    ...(outpass?.data ?? []).map((r) => ({ ...r, source: "outpass" as const })),
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Access Exceptions">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          {(staffLeaveError || outpassError) && (
            <div className="space-y-2 mb-3">
              {staffLeaveError && (
                <div className="flex items-center gap-2 text-sm text-rose-400 min-w-0">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="truncate">Staff leave queue unavailable: {staffLeaveError}</span>
                </div>
              )}
              {outpassError && (
                <div className="flex items-center gap-2 text-sm text-rose-400 min-w-0">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="truncate">Outpass queue unavailable: {outpassError}</span>
                </div>
              )}
            </div>
          )}
          {staffLeaveLoading && !staffLeave ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading pending access exceptions…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <Inbox className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                No pending access exceptions. Staff leave and outpass queues are clear.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-3 py-2">Ticket</th>
                    <th className="text-left px-3 py-2">Applicant</th>
                    <th className="text-left px-3 py-2">Workflow</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rows.slice(0, 15).map((r, i) => (
                    <tr key={`${r.source}-${r.id}`} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-300 whitespace-nowrap">
                        <a href={`/permissions/${r.ticket_number ?? r.id}`} className="hover:text-emerald-400 whitespace-nowrap">
                          {r.ticket_number || safeText(r.id)}
                        </a>
                      </td>
                      <td className="px-3 py-2.5 text-slate-300 min-w-0">
                        {r.student?.name || "—"}
                        {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 capitalize whitespace-nowrap">
                        {r.workflow_type?.replace(/_/g, " ") || r.source.replace("-", " ")}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-amber-400/30 bg-amber-400/10 text-amber-400 whitespace-nowrap">
                          {r.status ?? "PENDING"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 text-xs whitespace-nowrap">
                        {r.sla_deadline ? (
                          new Date(r.sla_deadline).getTime() < Date.now() ? (
                            <span className="text-rose-400">
                              Breached · {new Date(r.sla_deadline).toLocaleString()}
                            </span>
                          ) : (
                            new Date(r.sla_deadline).toLocaleString()
                          )
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-2.5 border-t border-slate-800 text-xs text-slate-500 min-w-0">
                {rows.length} pending exceptions to review — decide them from the approvals desk.
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function SupervisorExceptionsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SupervisorExceptionsInner />
    </Suspense>
  );
}
