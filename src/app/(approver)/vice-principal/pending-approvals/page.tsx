"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import { Loader2, Inbox, CheckCircle2, XCircle, ArrowUpRight, ShieldCheck } from "lucide-react";

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

function slaBreached(row: PermissionRequestRow): boolean {
  if (!row.sla_deadline) return false;
  const ts = new Date(row.sla_deadline).getTime();
  return !Number.isNaN(ts) && ts < Date.now();
}

function VpPendingApprovalsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "vice_principal") as string;

  const {
    data: vpQueue,
    loading: queueLoading,
    error: queueError,
    refresh: refreshQueue,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?status=PENDING&stage=vice_principal",
    { ttlMs: 30_000 }
  );

  const [actingTicket, setActingTicket] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);

  const rows = vpQueue?.data ?? [];
  const delegated = rows.filter((r) =>
    ["exam", "memo", "staff_leave", "attendance"].includes(r.workflow_type)
  );

  const actOnTicket = useCallback(
    async (row: PermissionRequestRow, action: "APPROVE" | "REJECT" | "ESCALATE") => {
      setActionOk(null);
      setActionError(null);
      setActingTicket(row.ticket_number);
      try {
        const res = await fetch(
          `/api/permissions/${encodeURIComponent(row.ticket_number)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({
              action,
              comment:
                action === "ESCALATE"
                  ? "Escalated by Vice Principal for principal review."
                  : action === "APPROVE"
                    ? "Approved at Vice Principal stage."
                    : "Rejected at Vice Principal stage.",
            }),
          }
        );
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            (body as { error?: { message?: string } } | null)?.error?.message ||
            `Request failed (${res.status})`;
          throw new Error(msg);
        }
        clearCache();
        await refreshQueue();
        setActionOk(`${row.ticket_number} ${action.toLowerCase()}d.`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Action failed";
        // 403 means this item is outside the VP's delegated action scope — view-only.
        setActionError(
          msg.includes("403") || msg.toLowerCase().includes("not authorized")
            ? `${row.ticket_number}: outside delegated scope — view-only.`
            : `${row.ticket_number}: ${msg}`
        );
      } finally {
        setActingTicket(null);
      }
    },
    [refreshQueue]
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await refreshQueue();
  }, [refreshQueue]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const grouped = useMemo(() => {
    return [...rows].sort((a, b) => Number(slaBreached(b)) - Number(slaBreached(a)));
  }, [rows]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Pending Approvals">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-slate-400 mb-3 min-w-0">
            <Inbox className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              VP-Stage Queue · {rows.length} pending
            </span>
          </div>

          {actionOk && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {actionOk}
            </div>
          )}
          {actionError && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              {actionError}
            </div>
          )}
          {queueError && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              Queue load failed: {queueError}
            </div>
          )}

          {queueLoading && !vpQueue ? (
            <div className="space-y-2 min-w-0">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-slate-800/60 animate-pulse" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className="p-6 text-center">
              <Inbox className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No pending items at the Vice Principal stage.</p>
              <p className="mt-2 text-xs text-slate-600">
                <ShieldCheck className="inline w-3.5 h-3.5 mr-1" />
                When a request lands at the VP stage, approve, reject, or escalate it here.
              </p>
            </div>
          ) : (
            <ul className="space-y-3 min-w-0">
              {grouped.slice(0, 12).map((r) => {
                const inScope = delegated.some((d) => d.id === r.id);
                const busy = actingTicket === r.ticket_number;
                return (
                  <li
                    key={r.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-sky-400">{r.ticket_number}</span>
                      <span className="text-sm text-slate-300 truncate min-w-0 flex-1">
                        {r.student?.name || "—"}
                        {r.student?.student_details?.roll
                          ? ` · ${r.student.student_details.roll}`
                          : ""}
                      </span>
                      <span className="text-xs text-slate-500 capitalize whitespace-nowrap">
                        {r.workflow_type.replace(/_/g, " ")}
                      </span>
                      {slaBreached(r) && (
                        <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-full px-2 py-0.5 whitespace-nowrap">
                          SLA breached
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void actOnTicket(r, "APPROVE")}
                        disabled={busy || !inScope}
                        title={inScope ? "Approve" : "View-only: outside delegated scope"}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void actOnTicket(r, "REJECT")}
                        disabled={busy || !inScope}
                        title={inScope ? "Reject" : "View-only: outside delegated scope"}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => void actOnTicket(r, "ESCALATE")}
                        disabled={busy}
                        title="Escalate to the next stage (principal)"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" /> Escalate
                      </button>
                      {!inScope && (
                        <span className="text-[11px] text-slate-600">
                          view-only · outside delegated scope
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
              {rows.length > 12 && (
                <li className="text-xs text-slate-600">
                  Showing 12 of {rows.length} items.
                </li>
              )}
            </ul>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function VpPendingApprovalsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VpPendingApprovalsInner />
    </Suspense>
  );
}
