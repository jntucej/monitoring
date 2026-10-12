"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useProbe } from "../_probe";
import { Loader2, Inbox, ArrowRight } from "lucide-react";

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

function VpApprovalsInner() {
  const user = useAuthStore((s) => s.user);

  const {
    data: vpQueue,
    loading: queueLoading,
    refresh: refreshQueue,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?status=PENDING&stage=vice_principal",
    { ttlMs: 30_000 }
  );

  const [activeTab, setActiveTab] = useState<"all" | "exam" | "memo" | "staff_leave">("all");
  const rows = vpQueue?.data ?? [];
  const filtered =
    activeTab === "all" ? rows : rows.filter((r) => r.workflow_type === activeTab);

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([
      refreshQueue(),
      new Promise<void>((resolve) => {
        const handler = () => resolve();
        window.addEventListener("vp-probe-refresh", handler, { once: true });
        window.dispatchEvent(new Event("vp-probe-refresh"));
      }),
    ]);
  }, [refreshQueue]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Pending Approvals">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex items-center gap-2 text-slate-400 mb-3 min-w-0">
            <Inbox className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Pending Approvals — VP Stage
            </span>
          </div>
          {/* workflow filter tabs */}
          <div className="flex items-center gap-2 overflow-x-auto mb-3 min-w-0">
            {(
              [
                { id: "all", label: "All" },
                { id: "exam", label: "Exam" },
                { id: "memo", label: "Memo" },
                { id: "staff_leave", label: "Staff Leave" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border shrink-0 ${
                  activeTab === t.id
                    ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                }`}
              >
                {t.label}
                {t.id !== "all"
                  ? ` (${rows.filter((r) => r.workflow_type === t.id).length})`
                  : ` (${rows.length})`}
              </button>
            ))}
          </div>
          {queueLoading && !vpQueue ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading queue…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                No pending items at the Vice Principal stage. The queue is clear.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800">
                    <th className="text-left px-3 py-2">Ticket</th>
                    <th className="text-left px-3 py-2">Student</th>
                    <th className="text-left px-3 py-2">Workflow</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.slice(0, 15).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30">
                      <td className="px-3 py-2 text-white font-mono text-xs whitespace-nowrap">
                        {r.ticket_number}
                      </td>
                      <td className="px-3 py-2 text-slate-300 min-w-0">
                        {r.student?.name || "—"}
                        {r.student?.student_details?.roll
                          ? ` · ${r.student.student_details.roll}`
                          : ""}
                      </td>
                      <td className="px-3 py-2 text-slate-400 capitalize whitespace-nowrap">
                        {r.workflow_type.replace(/_/g, " ")}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                            r.status === "PENDING"
                              ? "border-amber-400/30 bg-amber-400/10 text-amber-400"
                              : "border-slate-700 bg-slate-800 text-slate-300"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">
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
              {rows.length > 15 && (
                <p className="mt-2 text-xs text-slate-600">
                  Showing {Math.min(filtered.length, 15)} of {rows.length} items.
                </p>
              )}
            </div>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function VpApprovalsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VpApprovalsInner />
    </Suspense>
  );
}
