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
import { ShieldCheck, AlertTriangle, Inbox, ArrowRight, FileWarning } from "lucide-react";
import Link from "next/link";

interface PermissionRequest {
  id: string;
  ticket_number: string;
  workflow_type: string;
  student_user_id: string;
  status: string;
  current_stage: string;
  created_at: string;
  updated_at: string;
  sla_deadline?: string;
  hostel_scope?: string | null;
  [key: string]: unknown;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionRequest[] | null;
  total: number;
}

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    oie: "OIE Review",
    vice_principal: "Vice Principal Escalation",
    principal: "Principal Approval",
    faculty: "Faculty",
    hod: "HOD",
  };
  return map[stage] ?? stage;
}

function OieApprovalRequestsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_branch") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflow_type=exam&status=PENDING&stage=oie",
    { ttlMs: 30_000 }
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const requests = useMemo<PermissionRequest[]>(
    () => (data?.data as unknown as PermissionRequest[]) ?? [],
    [data]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/exam-branch"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Overview
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

      {/* OIE handoff notice — never bypass */}
      <div
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 min-w-0"
        role="note"
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          OIE approval required
        </p>
        <p className="mt-1 text-xs text-emerald-200/70 leading-relaxed">
          Items on this page are pending <strong>OIE review</strong>. The exam branch cannot
          approve or reject them — only the Office of the Instructor of Examinations (OIE) can
          make the final call. Bypassing OIE approval is not permitted. If you need to expedite
          a request, contact the OIE directly; do not escalate through vice-principal or
          principal channels for exam-stage clearances.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">
              OIE approval queue unavailable: {error}
            </span>
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

      <WidgetBoundary title="OIE Approval Requests">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Inbox className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">
                Requests Requiring OIE Approval
              </span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {data?.total ?? 0} pending
            </span>
          </div>

          {busy ? (
            <div className="p-4 space-y-3 min-w-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg border border-slate-800 bg-slate-900/40 animate-pulse motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <Inbox className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">
                No exam requests are currently pending OIE approval.
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Items appear here when an exam clearance reaches the OIE stage.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800 min-w-0">
              {requests.map((req) => (
                <li key={req.id} className="px-4 py-3 min-w-0">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-slate-300">
                        {req.ticket_number}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-300 px-2 py-0.5 text-xs">
                        <FileWarning className="w-3 h-3" />
                        {stageLabel(req.current_stage)}
                      </span>
                      {req.sla_deadline && (
                        <span
                          className={`text-xs ${
                            new Date(req.sla_deadline).getTime() < Date.now()
                              ? "text-rose-400 font-semibold"
                              : "text-slate-500"
                          }`}
                        >
                          SLA {new Date(req.sla_deadline).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 min-w-0">
                      Created{" "}
                      {new Date(req.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {req.hostel_scope
                        ? ` · scope: ${req.hostel_scope}`
                        : ""}
                    </p>
                    <p className="text-xs text-slate-400 italic">
                      OIE must review and approve before the next stage.
                    </p>
                  </div>
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

export default function OieApprovalRequestsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <OieApprovalRequestsInner />
    </Suspense>
  );
}
