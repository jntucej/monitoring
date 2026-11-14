"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import { getAuthHeaders } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ListChecks,
} from "lucide-react";

/* /api/permissions response shape — filtered to pending exam clearances */
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

function isOverdue(sla: string | undefined): boolean {
  return !!sla && new Date(sla).getTime() < Date.now();
}

function ExamBranchPassQueueInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_branch") as Role;
  const tier = getRoleTier(role);
  const [forwarding, setForwarding] = useState<string | null>(null);

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

  const total = data?.total ?? requests.length;
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const overdueCount = requests.filter((r) => isOverdue(r.sla_deadline)).length;

  // 1.14 — "Send to OIE": exam branch prepares, OIE approves. The forward POST
  // moves the ticket's current_stage from exam_branch to oie.
  const sendToOie = useCallback(
    async (ticket: PermissionRequest) => {
      setForwarding(ticket.id);
      try {
        const res = await fetch(
          `/api/permissions/${encodeURIComponent(ticket.ticket_number)}/forward`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({
              targetRole: "oie",
              comment: "Forwarded to OIE for clearance",
            }),
          },
        );
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          console.error("[exam-branch] forward to OIE failed", res.status, json);
        }
        await refreshAll();
      } finally {
        setForwarding(null);
      }
    },
    [refreshAll],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <Link
        href="/exam-branch"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowRight className="size-3.5 rotate-180" /> Back to Overview
      </Link>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-text-muted min-w-0">
            Signed in as <span className="font-mono text-text-secondary">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Pass queue unavailable: {error}</span>
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="surface-card px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI cards */}
      <WidgetBoundary title="Pass Queue Stats">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
          <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
            <p className="text-xs text-text-muted uppercase tracking-wide">In Queue</p>
            <p className="mt-1 text-2xl font-bold text-action-warning">{pendingCount}</p>
            <p className="text-xs text-text-muted">Exam passes awaiting OIE clearance</p>
          </div>
          <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
            <p className="text-xs text-text-muted uppercase tracking-wide">Overdue (SLA)</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                overdueCount > 0 ? "text-action-danger" : "text-text-muted"
              }`}
            >
              {overdueCount}
            </p>
            <p className="text-xs text-text-muted">Past SLA deadline — escalate to OIE</p>
          </div>
          <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
            <p className="text-xs text-text-muted uppercase tracking-wide">Total Pending</p>
            <p className="mt-1 text-2xl font-bold text-white">{total}</p>
            <p className="text-xs text-text-muted">All pending exam-stage requests</p>
          </div>
        </div>
      </WidgetBoundary>

      {/* OIE dependency notice */}
      <div
        className="surface-card bg-sky-500/10 p-3 min-w-0"
        role="note"
      >
        <p className="flex items-center gap-2 text-xs text-action-info font-medium">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          Pass clearances require OIE approval. Exam branch cannot self-clear.
        </p>
        <p className="mt-1 text-xs text-sky-200/60">
          Items here are visible for preparation only. Final approval is owned
          by the OIE — see the{" "}
          <Link
            href="/exam-branch/oie-approval-requests"
            className="underline decoration-dotted hover:text-sky-100"
          >
            OIE Approvals
          </Link>{" "}
          tab to track approval status.
        </p>
      </div>

      {/* Queue list */}
      <WidgetBoundary title="Exam Pass Queue">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ListChecks className="w-4 h-4 text-action-success shrink-0" />
              <span className="text-sm font-semibold text-white truncate">
                Passes Awaiting Clearance
              </span>
            </div>
            <span className="text-xs text-text-muted shrink-0">{requests.length} shown</span>
          </div>

          {busy ? (
            <div className="p-4 space-y-3 min-w-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg border border-border bg-bg-surface/40 animate-pulse motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <ListChecks className="size-6 mx-auto text-text-muted mb-2" />
              <p className="text-sm text-text-muted">
                No exam passes in the queue.
              </p>
              <p className="text-xs text-text-muted mt-1">
                Passes appear here when a candidate enters the exam clearance
                workflow.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800 min-w-0">
              {requests.map((req) => (
                <li
                  key={req.id}
                  className={`px-4 py-3 flex flex-col gap-1 min-w-0 ${
                    isOverdue(req.sla_deadline) ? "bg-rose-500/5" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-text-secondary">
                      {req.ticket_number}
                    </span>
                    <span className="surface-card inline-flex items-center bg-amber-500/15 text-action-warning px-2 py-0.5 text-xs">
                      PENDING
                    </span>
                    {isOverdue(req.sla_deadline) && (
                      <span className="surface-card inline-flex items-center bg-rose-500/15 text-action-danger px-2 py-0.5 text-xs font-semibold">
                        SLA EXCEEDED
                      </span>
                    )}
                    <span className="text-xs text-text-muted">
                      stage: {req.current_stage}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted min-w-0">
                    {new Date(req.created_at).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {req.sla_deadline
                      ? ` · SLA: ${new Date(req.sla_deadline).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                      : ""}
                  </p>
                  <button
                    type="button"
                    disabled={forwarding === req.id}
                    onClick={() => void sendToOie(req)}
                    className="surface-card mt-1 self-start px-2 py-1 text-xs text-action-info hover:bg-sky-500/10 disabled:opacity-50"
                  >
                    {forwarding === req.id ? "Forwarding…" : "Send to OIE"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </WidgetBoundary>

    </div>
  );
}

export default function ExamBranchPassQueuePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExamBranchPassQueueInner />
    </Suspense>
  );
}
