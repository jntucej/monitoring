"use client";

import { Suspense, useCallback, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import { ArrowRight, Loader2, FileText, AlertTriangle } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { useEntityInspector, EntityInspectorPanel } from "@/components/shared/useEntityInspector";
import { buildOieRecordInspection } from "@/lib/role-registers/oieInspections";
import {
  KVPairs,
  ActionRow,
  InspectorButton,
  type EntityInspection,
} from "@/components/shared/EntityInspector";
import {
  ApproverStageDrawer,
  type StagePivotItem,
} from "@/components/nav/level2/ApproverStageDrawer";

function StatusBadge({ text, tone }: { text: string; tone?: "ok" | "warn" | "danger" | "neutral" }) {
  const cls: Record<string, string> = {
    ok: "bg-emerald-500/10 text-action-success border border-emerald-500/20",
    warn: "bg-amber-500/10 text-action-warning border border-amber-500/20",
    danger: "bg-rose-500/10 text-action-danger border border-rose-500/20",
    neutral: "bg-bg-elevated text-text-muted border border-border",
  };
  const t = tone ?? "neutral";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${cls[t]}`}>
      {text}
    </span>
  );
}

/** Build an EntityInspection for an OIE exam permission record. */
function buildOiePermissionInspection(r: PermissionRequestRow): EntityInspection {
  const slaBreached = r.sla_deadline
    ? new Date(r.sla_deadline).getTime() < Date.now()
    : false;
  const tone: "ok" | "warn" | "danger" | "neutral" =
    r.status === "APPROVED" ? "ok" : slaBreached ? "danger" : "warn";

  const sections: EntityInspection["sections"] = [
    {
      title: "Overview",
      content: (
        <KVPairs
          items={[
            { label: "Student", value: r.student?.name ?? "—" },
            { label: "Roll", value: r.student?.student_details?.roll ?? "—" },
            { label: "Ticket", value: <code className="font-mono">{r.ticket_number}</code> },
            { label: "Workflow", value: r.workflow_type.replace(/_/g, " ") },
            { label: "Stage", value: r.current_stage.replace(/_/g, " ") },
            { label: "SLA", value: r.sla_deadline ? (slaBreached ? "BREACHED" : new Date(r.sla_deadline).toLocaleString()) : "—" },
          ]}
        />
      ),
    },
    {
      title: "Actions",
      content: (
        <ActionRow>
          <InspectorButton href="/exam/permissions" variant="primary">
            Open approvals desk
          </InspectorButton>
          <InspectorButton href={`/permissions/${r.ticket_number}`} variant="ghost">
            View ticket
          </InspectorButton>
        </ActionRow>
      ),
    },
  ];

  return {
    kind: "exam_case",
    title: r.student?.name ?? r.ticket_number,
    subtitle: r.ticket_number,
    status: <StatusBadge text={r.status} tone={tone} />,
    sections,
    detailHref: `/permissions/${r.ticket_number}`,
    detailLabel: "Full ticket",
  };
}

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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="surface-card bg-bg-elevated/30 p-8 text-center text-sm text-text-muted">
      {message}
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        onClick={onRetry}
        className="surface-card px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

function TicketTable({
  rows,
  onInspect,
}: {
  rows: PermissionRequestRow[];
  onInspect: (r: PermissionRequestRow) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState message="No pending items at the OIE examination stage. The queue is clear." />;
  }
  return (
    <div className="overflow-x-auto min-w-0">
      <table className="w-full text-sm min-w160">
        <thead>
          <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wide">
            <th className="text-left px-4 py-3">Ticket</th>
            <th className="text-left px-4 py-3">Student</th>
            <th className="text-left px-4 py-3">Workflow</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">SLA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {rows.slice(0, 15).map((r) => (
            <tr
              key={r.id}
              onClick={() => onInspect(r)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onInspect(r);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`Inspect operational record ${r.ticket_number}`}
              className="hover:bg-bg-elevated/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
            >
              <td className="px-4 py-3">
                <a
                  href={`/permissions/${r.ticket_number}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-white font-mono text-xs whitespace-nowrap hover:text-action-success"
                >
                  {r.ticket_number}
                </a>
              </td>
              <td className="px-4 py-3 text-text-secondary min-w-0">
                {r.student?.name || "—"}
                {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
              </td>
              <td className="px-4 py-3 text-text-muted capitalize whitespace-nowrap">
                {r.workflow_type.replace(/_/g, " ")}
              </td>
              <td className="px-4 py-3">
                <span className="surface-card inline-block px-2 py-0.5 text-xs font-medium bg-amber-400/10 text-action-warning whitespace-nowrap">
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                {r.sla_deadline ? (
                  new Date(r.sla_deadline).getTime() < Date.now() ? (
                    <span className="text-action-danger">
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
      {rows.length > 0 && (
        <div className="surface-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <p className="text-xs text-text-muted min-w-0">
            {rows.length} pending at the OIE stage — all are actionable.
          </p>
          <a
            href="/exam/permissions"
            className="surface-card inline-flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-action-success hover:bg-emerald-500/20 shrink-0"
          >
            Open Approvals Desk <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

function OieRecordsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "oie") as Role;
  const tier = getRoleTier(role);
  const { inspection, inspect, closeInspection } = useEntityInspector();
  const [stageItem, setStageItem] = useState<StagePivotItem | null>(null);

  const {
    data: oieQueue,
    loading: queueLoading,
    error: queueError,
    refresh: refreshQueue,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflow_type=exam&stage=oie&status=PENDING",
    { ttlMs: 30_000 }
  );

  const refresh = useCallback(async () => {
    clearCache();
    await refreshQueue();
  }, [refreshQueue]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const oieRows = oieQueue?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 overflow-x-hidden space-y-6 px-4 py-6 md:px-6">
      {/* Back link */}
      <Link
        href="/oie"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowRight className="size-3.5 rotate-180" /> Back to Overview
      </Link>

      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-text-muted min-w-0">
            Signed in as <span className="font-medium capitalize text-text-secondary">{role.replace(/_/g, " ")}</span>
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

      <ContextSituationBar
        roleLabel="Officer In-Charge of Examinations"
        purpose="Search and inspect examination hall permits, hall tickets, and verified candidate files."
        why="Archived examination files and student permits serve as permanent proof of candidate standing and clearance validity."
        contextLabel="Exam Records"
        statusTone="info"
        statusPill={`${oieRows.length} records`}
        statusSummary={`Archive of ${oieRows.length} examination clearance records and hall permits.`}
        primaryAction={{ label: "Pending Queue", href: "/oie/queue/pending" }}
        secondaryActions={[
          { label: "OIE Overview", href: "/oie" },
          { label: "Reports", href: "/oie/examination-reports" },
        ]}
      />

      {queueError && (
        <ErrorBanner
          message={`OIE queue loading failed: ${queueError}`}
          onRetry={() => void refreshQueue()}
        />
      )}

      <WidgetBoundary title="Assigned Operational Records">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-action-success shrink-0" />
              <span className="text-sm font-semibold text-white truncate">
                OIE Examination-Stage Queue
              </span>
            </div>
            <span className="text-xs text-text-muted shrink-0">assigned duties only</span>
          </div>
          {queueLoading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-text-muted min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading OIE queue…
            </div>
          ) : (
            <TicketTable
              rows={oieRows}
              onInspect={(r) => {
                inspect(buildOieRecordInspection(r));
                setStageItem({
                  ticketId: r.id,
                  ticketNumber: r.ticket_number,
                  workflowType: r.workflow_type,
                  currentStage: r.current_stage,
                  status: r.status,
                  studentName: r.student?.name,
                  studentRoll: r.student?.student_details?.roll,
                  stages: ["student", "oie", "exam_branch", "vice_principal"],
                });
              }}
            />
          )}
          <div className="surface-card px-4 py-3 text-xs text-text-muted min-w-0">
            Broader institutional records (staff attendance, attendance statistics) are
            restricted at this tier — this desk surfaces only the records assigned to the
            OIE examination duties.
          </div>
        </div>
      </WidgetBoundary>

      <EntityInspectorPanel
        inspection={inspection}
        onClose={() => {
          closeInspection();
          setStageItem(null);
        }}
      />
      <ApproverStageDrawer item={stageItem} onClose={() => setStageItem(null)} />
    </div>
  );
}
export default function OieRecordsPage() {
  return (
    <AuthGuard allowedRoles={['oie', 'exam_branch', 'exam_superintendent', 'vice_principal', 'principal', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <OieRecordsInner />
      </Suspense>
    </AuthGuard>
  );
}
