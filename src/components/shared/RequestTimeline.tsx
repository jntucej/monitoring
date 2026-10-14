"use client";

import { useCallback, useMemo } from "react";
import {
  Ticket,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  FileText,
  Send,
  Circle,
  Inbox,
} from "lucide-react";
import { useAuthStore, useHasHydrated } from "@/stores/authStore";
import { useApiResource } from "@/hooks/useApiResource";
import { getAuthHeaders, getTimeAgo, formatDateTime } from "@/lib/utils";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * RequestTimeline — a read-only, role-aware vertical timeline for a
 * permission ticket: submission → review → decision → escalation.
 *
 * Data source: GET /api/permissions/[ticket] (role-scoped server-side —
 * students see only their own tickets, parents/guardians only their
 * children's, approvers/admins everything). Each node renders who acted,
 * when, the decision, and the implied next step. No mutations — read-only.
 */

interface TimelineActor {
  id?: string;
  name?: string;
  role?: string;
}

interface TimelineEntry {
  stage?: string;
  actor_id?: string;
  actor?: string | TimelineActor | null;
  action: string;
  comment?: string | null;
  timestamp: string;
  transition?: { from?: string; to?: string } | null;
}

interface RequestDetail {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  student?: {
    id?: string;
    name?: string;
    student_details?: { roll?: string } | null;
  } | null;
  stage_history: TimelineEntry[] | null;
}

interface RequestDetailResponse {
  success: boolean;
  data: RequestDetail;
  error?: { code?: string; message?: string };
}

const STAGE_LABELS: Record<string, string> = {
  caretaker: "Caretaker",
  deputy_warden: "Deputy Warden",
  hostel_manager: "Hostel Manager",
  warden_or_principal: "Warden / Principal",
  lab_incharge: "Lab In-charge",
  hod: "HOD",
  oie: "Officer in Exam (OIE)",
  vice_principal: "Vice Principal",
  principal: "Principal",
  faculty: "Faculty",
  completed: "Completed",
  cancelled: "Cancelled",
  initial: "Submitted",
};

type NodeTone = "neutral" | "positive" | "negative" | "escalation";

const NODE_TONE_CLASS: Record<NodeTone, string> = {
  neutral: "bg-[var(--bg-elevated)] border-[var(--border)]",
  positive: "bg-[var(--action-primary)]/10 border-[var(--action-primary)]/30",
  negative: "bg-[var(--action-danger)]/10 border-[var(--action-danger)]/30",
  escalation: "bg-[var(--action-warning)]/10 border-[var(--action-warning)]/30",
};

const NODE_DOT_CLASS: Record<NodeTone, string> = {
  neutral: "bg-[var(--text-muted)] border-[var(--border)]",
  positive: "bg-[var(--action-primary)] border-[var(--action-primary)]",
  negative: "bg-[var(--action-danger)] border-[var(--action-danger)]",
  escalation: "bg-[var(--action-warning)] border-[var(--action-warning)]",
};

const NODE_ICON_CLASS: Record<NodeTone, string> = {
  neutral: "text-[var(--text-secondary)]",
  positive: "text-[var(--action-primary)]",
  negative: "text-[var(--action-danger)]",
  escalation: "text-[var(--action-warning)]",
};

function entryTone(entry: TimelineEntry): NodeTone {
  const a = entry.action?.toUpperCase() ?? "";
  if (a === "REJECTED" || a === "CANCELLED") return "negative";
  if (a === "ESCALATED") return "escalation";
  if (a === "APPROVED" || a === "SIGNED" || a === "COMPLETED" || a.includes("BIOMETRIC"))
    return "positive";
  return "neutral";
}

function actorLabel(entry: TimelineEntry): string {
  const actor = entry.actor;
  if (typeof actor === "object" && actor && actor.name) return actor.name;
  if (typeof actor === "string" && actor) return actor;
  if (entry.actor_id) return entry.actor_id;
  return "System";
}

function nextStepHint(entry: TimelineEntry, isLast: boolean, status: string): string {
  if (status === "REJECTED") return "Rejected — no further action";
  if (status === "COMPLETED") return "Request complete";
  if (isLast && status === "ESCALATED")
    return "Escalated — awaiting next stage decision";
  if (entry.transition?.to)
    return `Next step: ${STAGE_LABELS[entry.transition.to] ?? entry.transition.to} to review`;
  return "Awaiting next stage";
}

/**
 * One node in the vertical timeline.
 */
function TimelineNode({
  entry,
  isLast,
  status,
  isTerminal,
}: {
  entry: TimelineEntry;
  isLast: boolean;
  status: string;
  isTerminal: boolean;
}) {
  const tone = entryTone(entry);
  const action = entry.action?.toUpperCase() ?? "—";
  const stageLabel =
    entry.transition?.to ??
    (entry.stage && entry.stage !== "initial" ? STAGE_LABELS[entry.stage] ?? entry.stage : null);

  let Icon: React.ComponentType<{ className?: string }> = Circle;
  if (isLast && isTerminal) {
    Icon = status === "REJECTED" ? XCircle : status === "ESCALATED" ? ArrowUpRight : CheckCircle2;
  } else if (action === "APPROVED" || action === "SIGNED" || action === "COMPLETED") {
    Icon = CheckCircle2;
  } else if (action === "REJECTED") {
    Icon = XCircle;
  } else if (action === "ESCALATED") {
    Icon = ArrowUpRight;
  } else if (action === "REQUEST_INFO" || action.includes("BIOMETRIC")) {
    Icon = FileText;
  } else if (action === "SUBMITTED" || entry.stage === "initial" || action === "CREATED") {
    Icon = Send;
  } else {
    Icon = Inbox;
  }

  return (
    <li className="relative pl-10">
      {/* Node marker */}
      <span
        className={`absolute left-0 top-0 h-6 w-6 rounded-full flex items-center justify-center border ${NODE_TONE_CLASS[tone]}`}
        aria-hidden="true"
      >
        <Icon className={`h-3.5 w-3.5 ${NODE_ICON_CLASS[tone]}`} />
      </span>

      <div className="pb-6 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded border ${NODE_TONE_CLASS[tone]} ${
              tone === "neutral" ? "text-[var(--text-secondary)]" : NODE_ICON_CLASS[tone]
            }`}
          >
            {action}
          </span>
          {stageLabel && (
            <span className="text-[11px] text-[var(--text-muted)]">
              stage: {stageLabel}
            </span>
          )}
        </div>

        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">{actorLabel(entry)}</span>
          {typeof entry.actor === "object" && entry.actor?.role ? (
            <span className="text-[var(--text-muted)]"> · {entry.actor.role}</span>
          ) : null}
          <span className="mx-1.5 text-[var(--text-muted)]">·</span>
          {entry.timestamp ? (
            <time dateTime={entry.timestamp}>{formatDateTime(entry.timestamp)}</time>
          ) : (
            "unknown time"
          )}
        </p>

        {entry.comment ? (
          <p className="mt-1 text-[11px] text-[var(--text-muted)] italic line-clamp-2">
            “{entry.comment}”
          </p>
        ) : null}

        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
          {nextStepHint(entry, isLast, status)}
        </p>
      </div>
    </li>
  );
}

export interface RequestTimelineProps {
  /** Ticket number or UUID. */
  ticket: string;
  /** Optional embedded view (no wrapper card). Default: wrapped in a card. */
  compact?: boolean;
}

export function RequestTimeline({ ticket, compact = false }: RequestTimelineProps) {
  const hasHydrated = useHasHydrated();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? null;

  const { data, loading, error } = useApiResource<RequestDetailResponse>(
    hasHydrated ? `/api/permissions/${encodeURIComponent(ticket)}` : null,
    { enabled: hasHydrated, ttlMs: 30_000 }
  );

  const detail = data?.data ?? null;

  const nodes = useMemo<TimelineEntry[]>(() => {
    if (!detail) return [];
    const history = Array.isArray(detail.stage_history) ? detail.stage_history : [];
    // Always seed a "Submitted" node so the timeline reads
    // submission → review → decision even for a brand-new ticket.
    const seeded: TimelineEntry[] = [
      {
        stage: "initial",
        action: "SUBMITTED",
        actor: user?.name ? { id: user.id, name: user.name, role: role ?? undefined } : undefined,
        timestamp: detail.created_at ?? new Date().toISOString(),
        transition: { from: "initial", to: detail.current_stage },
      },
      ...history,
    ];
    return seeded;
  }, [detail, user, role]);

  const isTerminal =
    detail?.status === "REJECTED" ||
    detail?.status === "COMPLETED" ||
    detail?.status === "CANCELLED";

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-5/6 rounded-lg" />
          <Skeleton className="h-10 w-4/6 rounded-lg" />
        </div>
      );
    }

    if (error || !detail) {
      return (
        <div className="flex flex-col items-center gap-2 p-6 text-center">
          <XCircle className="h-7 w-7 text-[var(--action-danger)]" />
          <p className="text-sm text-[var(--text-secondary)]">
            {error ?? "Ticket not found"}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Check the ticket number or your access permissions.
          </p>
        </div>
      );
    }

    return (
      <div className="min-w-0">
        {/* Ticket header */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Ticket className="h-4 w-4 text-[var(--action-primary)]" />
          <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
            {detail.ticket_number}
          </span>
          <span className="rounded bg-[var(--bg-elevated)] border border-[var(--border)] px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)]">
            {detail.workflow_type}
          </span>
          <span className="rounded bg-[var(--bg-elevated)] border border-[var(--border)] px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)]">
            {detail.status}
          </span>
          {detail.sla_deadline ? (
            <span className="text-[11px] text-[var(--text-muted)]">
              SLA {getTimeAgo(detail.sla_deadline)}
            </span>
          ) : null}
        </div>

        {/* Vertical timeline */}
        <ol className="relative border-l border-[var(--border)] ml-3 pl-2 space-y-0">
          {nodes.map((entry, i) => (
            <TimelineNode
              key={`${entry.action}-${i}`}
              entry={entry}
              isLast={i === nodes.length - 1}
              status={detail.status}
              isTerminal={isTerminal}
            />
          ))}
        </ol>
      </div>
    );
  }, [loading, error, detail, nodes, isTerminal]);

  const inner = (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]/40 p-4 sm:p-5 min-w-0">
      {content}
    </div>
  );

  if (compact) {
    return <WidgetBoundary title="Request Timeline">{inner}</WidgetBoundary>;
  }
  return <WidgetBoundary title="Request Timeline">{inner}</WidgetBoundary>;
}

export default RequestTimeline;
