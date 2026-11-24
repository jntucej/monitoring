"use client";

import { useCallback, Suspense, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { requestInspection } from "@/components/shared/roleInspectors";
import { ClipboardList, Loader2, Inbox, Clock } from "lucide-react";
import { FrontlineSubjectSheet } from "@/components/nav/level1/FrontlinePivot";
import type { FrontlineSubject } from "@/components/nav/level1/FrontlinePivot";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

/**
 * Caretaker maintenance queue — plumbing, electrical, and sanitation repair
 * requests scoped to the caller's assigned hostel.
 *
 * Data: GET /api/caretaker/maintenance (roles: caretaker/admin/sysadmin).
 * Each ticket row opens the standardized request inspector (kind
 * "request"): overview → history → role-gated actions. The actions are
 * only the real routes: the shared ComplaintConsole for complaint-style
 * records and this maintenance console for caretaker-stage tickets;
 * mutating a ticket happens at the shared ComplaintDetail panel
 * (PATCH /api/complaints/[id]) which the caretaker role is authorized
 * for through the complaint owner chain.
 */

interface MaintenanceTicket {
  ticketNumber: string;
  workflowType: string;
  status: string;
  slaDeadline: string | null;
  createdAt: string | null;
  currentStage: string;
  studentName: string | null;
  studentRoll: string | null;
  hostelBlock: string | null;
}

interface MaintenanceResponse {
  success: boolean;
  data: {
    tickets: MaintenanceTicket[];
    total: number;
    summary: { pending: number; escalated: number; resolvedToday: number };
    assignedHostel: string | null;
  };
}

function CaretakerMaintenanceInner() {
  const { data, loading, error, refresh } = useApiResource<MaintenanceResponse>(
    "/api/caretaker/maintenance",
    { ttlMs: 30_000 },
  );
  const { inspection, inspect, closeInspection } = useEntityInspector();
  // L1 FrontlinePivot: duty-scoped subject sheet.
  const [frontlineSubject, setFrontlineSubject] = useState<FrontlineSubject | null>(null);

  const tickets = data?.data?.tickets ?? [];
  const summary = data?.data?.summary;
  const busy = loading && !data;

  const openRequest = useCallback(
    (t: MaintenanceTicket) => {
      inspect(
        requestInspection({
          id: t.ticketNumber,
          ticket: t.ticketNumber,
          type: t.workflowType || "maintenance",
          stage: t.currentStage || "caretaker",
          status: t.status || "PENDING",
          requesterName: t.studentName ?? undefined,
          createdAt: t.createdAt ?? undefined,
        }),
      );
    },
    [inspect],
  );

  const statusTone = (s: string) => {
    const v = s.toUpperCase();
    if (/ESCALATED/.test(v)) return "text-action-warning";
    if (/PENDING|OPEN/.test(v)) return "text-text-secondary";
    return "text-action-success";
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-5 py-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <ClipboardList className="w-5 h-5 text-action-primary shrink-0" />
            <h1 className="text-lg font-bold text-text-primary truncate">Maintenance &amp; Complaints</h1>
          </div>
          <p className="text-xs text-text-muted mt-1 min-w-0">
            {data?.data?.assignedHostel
              ? `Scoped to your assigned hostel: ${data.data.assignedHostel}`
              : "All open maintenance requests in your queue"}
          </p>
        </div>
        {!busy && summary && (
          <div className="flex items-center gap-3 text-xs shrink-0">
            <span className="text-text-muted">
              {summary.pending} pending · {summary.escalated} escalated
            </span>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-action-primary hover:underline"
            >
              <Clock className="size-3.5" /> Refresh
            </button>
          </div>
        )}
      </div>

      <ContextSituationBar
        roleLabel="Caretaker"
        purpose="Review and resolve hostel maintenance requests, track repair SLAs, and verify facility completion"
        contextLabel={data?.data?.assignedHostel ? `Maintenance Queue · ${data.data.assignedHostel}` : "Maintenance Queue"}
        statusSummary={
          summary
            ? `${summary.pending} pending repair ticket${summary.pending === 1 ? "" : "s"} and ${summary.escalated} escalated in this block.`
            : "Review and resolve plumbing, electrical, and facility repair requests."
        }
        severity={summary && summary.escalated > 0 ? "warn" : "info"}
        primaryAction={{ label: "Facilities Overview", href: "/caretaker/home" }}
        secondaryActions={[
          { label: "Complaint Console", href: "/caretaker" },
          { label: "Workers Status", href: "/caretaker/workers" },
        ]}
      />

      {error && (
        <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="truncate">Maintenance queue unavailable: {error}</span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="text-xs font-semibold text-action-primary hover:underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <WidgetBoundary title="Maintenance Requests">
        <div className="rounded-xl border border-border bg-bg-elevated overflow-hidden min-w-0">
          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-text-muted min-w-0" role="status" aria-busy="true">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading maintenance queue…
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <Inbox className="w-5 h-5 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">No open maintenance requests in your queue.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border min-w-0">
              {tickets.map((t) => (
                <li
                  key={t.ticketNumber}
                  onClick={() => openRequest(t)}
                  className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 min-w-0 cursor-pointer hover:bg-bg-surface/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {t.studentName ?? "Unattributed request"}
                      {t.studentRoll && (
                        <span className="ml-1.5 font-mono text-xs text-text-muted">{t.studentRoll}</span>
                      )}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5 font-mono truncate">
                      {t.ticketNumber} · {t.workflowType || "maintenance"}
                      {t.hostelBlock ? ` · block ${t.hostelBlock}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFrontlineSubject({
                          id: t.ticketNumber,
                          name: t.studentName ?? "Unattributed",
                          code: t.ticketNumber,
                          statusTag: t.status || "PENDING",
                          locationOrScope: t.hostelBlock ? `Block ${t.hostelBlock}` : undefined,
                        });
                      }}
                      className="surface-card min-h-11 px-2 py-0.5 text-xs font-semibold bg-bg-elevated text-text-secondary hover:bg-bg-surface transition-colors"
                    >
                      Verify
                    </button>
                    <span
                      className={`surface-card px-2 py-0.5 text-xs font-medium ${statusTone(t.status)}`}
                    >
                      {t.status || "PENDING"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </WidgetBoundary>

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />

      {/* L1 FrontlinePivot: duty-scoped subject sheet */}
      <FrontlineSubjectSheet
        subject={frontlineSubject}
        onClose={() => setFrontlineSubject(null)}
      />
    </div>
  );
}

export default function CaretakerMaintenancePage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CaretakerMaintenanceInner />
    </Suspense>
  );
}
