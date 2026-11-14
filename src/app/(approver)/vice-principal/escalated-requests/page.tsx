"use client";

import { Suspense, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { RequestTimeline } from "@/components/shared/RequestTimeline";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { Inbox, ChevronDown, ChevronUp } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";


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

function VpEscalatedInner() {
  const {
    data: escalated,
    loading: queueLoading,
    error: queueError,
    refresh: refreshQueue,
  } = useApiResource<PermissionsResponse>("/api/permissions?status=ESCALATED", {
    ttlMs: 30_000,
  });

  usePolling(refreshQueue, { intervalMs: 30_000, enabled: true });

  const [openTicket, setOpenTicket] = useState<string | null>(null);
  const rows = (escalated?.data ?? []) as PermissionRequestRow[];

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Escalated Requests">
        <div className="surface-card bg-bg-base p-4 min-w-0">
          <div className="flex items-center gap-2 text-text-muted mb-3 min-w-0">
            <Inbox className="w-4 h-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Requests escalated for senior review
            </span>
          </div>

          {queueError && (
            <div className="surface-card mb-3 bg-amber-500/10 p-3 text-xs text-action-warning">
              Escalated list failed to load: {queueError}
            </div>
          )}

          {queueLoading && !escalated ? (
            <div className="space-y-2 min-w-0">
              {[0, 1].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-bg-elevated/60 animate-pulse" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center">
              <Inbox className="w-6 h-6 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">No escalated requests right now.</p>
            </div>
          ) : (
            <ul className="space-y-3 min-w-0">
              {rows.slice(0, 10).map((r) => {
                const open = openTicket === r.ticket_number;
                return (
                  <li
                    key={r.id}
                    className="surface-card bg-bg-surface/40 p-3 min-w-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-action-warning">{r.ticket_number}</span>
                      <span className="text-sm text-text-secondary truncate min-w-0 flex-1">
                        {r.student?.name || "—"}
                        {r.student?.student_details?.roll
                          ? ` · ${r.student.student_details.roll}`
                          : ""}
                      </span>
                      <span className="text-xs text-text-muted capitalize whitespace-nowrap">
                        {r.workflow_type.replace(/_/g, " ")}
                      </span>
                      <span className="surface-card text-xs font-semibold text-action-warning bg-amber-500/10 px-2 py-0.5">
                        escalated → {r.current_stage}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenTicket(open ? null : r.ticket_number)}
                        aria-expanded={open}
                        className="surface-card inline-flex items-center gap-1 bg-bg-elevated px-2.5 py-1.5 text-xs text-text-secondary hover:bg-bg-elevated transition-colors"
                      >
                        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {open ? "Hide timeline" : "Timeline"}
                      </button>
                    </div>
                    {open && (
                      <div className="surface-card mt-4 bg-bg-base p-3 min-w-0">
                        <RequestTimeline ticket={r.ticket_number} compact />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}
export default function VpEscalatedPage() {
  return (
    <AuthGuard allowedRoles={['vice_principal', 'exam_branch', 'oie', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <VpEscalatedInner />
      </Suspense>
    </AuthGuard>
  );
}
