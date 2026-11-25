"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { TaskRecordsList } from "@/components/shared/TaskRecordsList";
import { Loader2, ShieldCheck, AlertTriangle, ArrowRight, ListChecks } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

/* response shapes */

interface PermissionItem {
  id: string;
  ticket_number: string;
  workflow_type?: string;
  status?: string;
  current_stage?: string;
  created_at?: string;
  sla_deadline?: string;
}

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

function ExamBranchOiehandoffInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_branch") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<DataResponse>("/api/permissions?workflow_type=exam&status=PENDING&stage=oie", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const items = (Array.isArray((data as DataResponse | null)?.data)
    ? ((data as DataResponse | null)!.data as unknown as PermissionItem[])
    : []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Back link */}
      <Link
        href="/exam-branch"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowRight className="size-3.5 rotate-180" /> Back to Pass Queue
      </Link>

      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-white">OIE Handoff</h1>
          <p className="mt-1 text-sm text-text-muted min-w-0">
            Signed in as <span className="font-medium capitalize text-text-secondary">{role.replace(/_/g, " ")}</span>
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      <ContextSituationBar
        roleLabel="Exam Branch"
        purpose="Batch forward verified student clearance bundles to the OIE for sign-off."
        why="Batching verified student clearance bundles streamlines OIE executive review and eliminates individual ticket delays."
        contextLabel="OIE Handoff"
        statusTone={items.length > 0 ? "warn" : "ok"}
        statusPill={items.length > 0 ? `${items.length} pending` : "Queue clear"}
        statusSummary={
          items.length > 0
            ? `${items.length} exam clearance bundle(s) awaiting OIE sign-off. Forward from the Pass Queue.`
            : "No exam clearance bundles awaiting OIE sign-off."
        }
        primaryAction={{ label: "Pass Queue", href: "/exam-branch" }}
        secondaryActions={[
          { label: "OIE Requests", href: "/exam-branch/oie-approval-requests" },
          { label: "Verification", href: "/exam-branch/verification" },
        ]}
      />

      {error && (
        <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">OIE Handoff data unavailable: {error}</span>
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

      <WidgetBoundary title="OIE Handoff">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <ListChecks className="w-4 h-4 text-action-success shrink-0" />
              <span className="text-sm font-semibold text-white truncate">Pending OIE Sign-off</span>
            </div>
            <span className="text-xs text-text-muted shrink-0">
              {(data as DataResponse | null)?.total ?? items.length} item(s)
            </span>
          </div>
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-text-muted min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" /> Loading OIE Handoff…
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <ShieldCheck className="size-6 mx-auto text-text-muted mb-2" />
              <p className="text-sm text-text-muted">No clearance bundles awaiting OIE sign-off.</p>
              <p className="text-xs text-text-muted mt-1">
                Bundules appear here once the exam branch forwards them via{" "}
                <Link href="/exam-branch" className="underline decoration-dotted hover:text-sky-400">
                  Pass Queue
                </Link>
                .
              </p>
            </div>
          ) : (
            <TaskRecordsList
              title="Pending OIE Sign-off"
              records={items.map((r) => ({
                id: r.id,
                identifier: r.ticket_number ?? r.id,
                status: r.status ?? "PENDING",
                created_at: r.created_at,
                sla_deadline: r.sla_deadline,
                meta: r.current_stage,
                actionLabel: "Forward to OIE",
                onAction: async () => {
                  const res = await fetch(
                    `/api/permissions/${encodeURIComponent(r.ticket_number ?? r.id)}/forward`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                      body: JSON.stringify({ targetRole: "oie", comment: "Forwarded to OIE for clearance" }),
                    },
                  );
                  if (!res.ok) {
                    console.error("[exam-branch] forward to OIE failed", res.status);
                    return;
                  }
                  await refreshAll();
                },
              }))}
            />
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function ExamBranchOiehandoffPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ExamBranchOiehandoffInner />
    </Suspense>
  );
}
