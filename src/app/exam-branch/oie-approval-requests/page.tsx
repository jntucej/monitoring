"use client";

import { Suspense, useCallback, useMemo } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { ShieldCheck, AlertTriangle, Inbox, ArrowRight, FileWarning } from "lucide-react";
import Link from "next/link";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { ApproverDecisionQueue } from "@/components/approver/ApproverDecisionQueue";
import {
  useEntityInspector,
  EntityInspectorPanel,
} from "@/components/shared/useEntityInspector";
import {
  KVPairs,
  ActionRow,
  InspectorButton,
  type EntityInspection,
} from "@/components/shared/EntityInspector";

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
  student?: { name?: string; student_details?: { roll?: string } | null } | null;
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

/** Build an EntityInspection for an OIE approval request (exam-branch view — read-only). */
function buildOieApprovalInspection(r: PermissionRequest): EntityInspection {
  const slaBreached = r.sla_deadline
    ? new Date(r.sla_deadline).getTime() < Date.now()
    : false;

  const sections: EntityInspection["sections"] = [
    {
      title: "Overview",
      content: (
        <KVPairs
          items={[
            { label: "Ticket", value: <code className="font-mono">{r.ticket_number}</code> },
            { label: "Student", value: r.student?.name ?? r.student_user_id ?? "—" },
            { label: "Roll", value: r.student?.student_details?.roll ?? "—" },
            { label: "Stage", value: stageLabel(r.current_stage) },
            { label: "Created", value: new Date(r.created_at).toLocaleString() },
            { label: "SLA", value: r.sla_deadline ? (slaBreached ? "BREACHED" : new Date(r.sla_deadline).toLocaleString()) : "—" },
          ]}
        />
      ),
    },
    {
      title: "Actions",
      content: (
        <ActionRow>
          <InspectorButton href="/oie/queue" variant="primary">
            OIE queue
          </InspectorButton>
          <InspectorButton href="/exam-branch/oie-approval-requests" variant="ghost">
            All requests
          </InspectorButton>
        </ActionRow>
      ),
    },
  ];

  return {
    kind: "exam_case",
    title: r.ticket_number,
    subtitle: `${r.student?.name ?? ""} · ${stageLabel(r.current_stage)}`.trim() || null,
    status: <StatusBadge text={slaBreached ? "SLA BREACHED" : "PENDING OIE"} tone={slaBreached ? "danger" : "warn"} />,
    sections,
    detailHref: "/exam-branch/oie-approval-requests",
    detailLabel: "All OIE requests",
  };
}

function OieApprovalRequestsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_branch") as Role;
  const tier = getRoleTier(role);
  const { inspection, inspect, closeInspection } = useEntityInspector();

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
        roleLabel="Exam Branch"
        purpose="Review exam clearance requests pending OIE decision and track escalation bottlenecks."
        why="Tracking items submitted to the OIE ensures clearance requests do not stall before hall ticket printing deadlines."
        contextLabel="OIE Approval Queue"
        statusTone={requests.length > 0 ? "warn" : "ok"}
        statusPill={requests.length > 0 ? `${requests.length} awaiting OIE` : "Queue clear"}
        statusSummary={
          requests.length > 0
            ? `${requests.length} exam clearance request${requests.length === 1 ? "" : "s"} submitted and awaiting OIE sign-off.`
            : "No exam requests pending OIE approval."
        }
        primaryAction={{ label: "Pass Queue", href: "/exam-branch" }}
        secondaryActions={[
          { label: "OIE Handoff", href: "/exam-branch/oie-handoff" },
          { label: "Verification", href: "/exam-branch/verification" },
        ]}
      />
      <ApproverDecisionQueue
        roleLabel="Exam Branch"
        forwardLabel="Forward to OIE"
        relatedHref="/exam-branch/oie-handoff"
        relatedLabel="OIE Handoff"
      />

      {/* OIE handoff notice — never bypass */}
      <div
        className="surface-card bg-emerald-500/10 p-4 min-w-0"
        role="note"
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-action-success">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          OIE approval required
        </p>
        <p className="mt-1 text-xs text-emerald-700/70 leading-relaxed">
          Items on this page are pending <strong>OIE review</strong>. The exam branch cannot
          approve or reject them — only the Office of the Instructor of Examinations (OIE) can
          make the final call. Bypassing OIE approval is not permitted. If you need to expedite
          a request, contact the OIE directly; do not escalate through vice-principal or
          principal channels for exam-stage clearances.
        </p>
      </div>

      {error && (
        <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">
              OIE approval queue unavailable: {error}
            </span>
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

      <WidgetBoundary title="OIE Approval Requests">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="surface-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Inbox className="w-4 h-4 text-action-success shrink-0" />
              <span className="text-sm font-semibold text-white truncate">
                Requests Requiring OIE Approval
              </span>
            </div>
            <span className="text-xs text-text-muted shrink-0">
              {data?.total ?? 0} pending
            </span>
          </div>

          {busy ? (
            <div className="p-4 space-y-3 min-w-0">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg border border-border bg-bg-surface/40 animate-pulse motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <Inbox className="size-6 mx-auto text-text-muted mb-2" />
              <p className="text-sm text-text-muted">
                No exam requests are currently pending OIE approval.
              </p>
              <p className="text-xs text-text-muted mt-1">
                Items appear here when an exam clearance reaches the OIE stage.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-800 min-w-0">
              {requests.map((req) => (
                <li key={req.id} className="px-4 py-3 min-w-0 cursor-pointer hover:bg-bg-elevated/30 transition" onClick={() => inspect(buildOieApprovalInspection(req))}>
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-text-secondary">
                        {req.ticket_number}
                      </span>
                      <span className="surface-card inline-flex items-center gap-1 bg-emerald-500/15 text-action-success px-2 py-0.5 text-xs">
                        <FileWarning className="size-3.5" />
                        {stageLabel(req.current_stage)}
                      </span>
                      {req.sla_deadline && (
                        <span
                          className={`text-xs ${
                            new Date(req.sla_deadline).getTime() < Date.now()
                              ? "text-action-danger font-semibold"
                              : "text-text-muted"
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
                    <p className="text-xs text-text-muted min-w-0">
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
                    <p className="text-xs text-text-muted italic">
                      OIE must review and approve before the next stage.
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </WidgetBoundary>

      <EntityInspectorPanel inspection={inspection} onClose={closeInspection} />
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
