"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Loader2,
  RefreshCw,
  Check,
  X,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { useAuthStore, useHasHydrated } from "@/stores/authStore";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useUIStore } from "@/stores/uiStore";
import { getAuthHeaders } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Roles that act as approvers in the permission workflow. The component
 * shows quick actions only to these roles — no approver power is granted
 * to students/parents/operators.
 */
const APPROVER_ROLES = new Set([
  "caretaker",
  "deputy_warden",
  "hostel_manager",
  "faculty",
  "hod",
  "oie",
  "vice_principal",
  "principal",
  "admin",
  "sysadmin",
]);

interface ApprovalInboxRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  created_at?: string | null;
  student?: {
    id?: string;
    name?: string;
    student_details?: { roll?: string } | null;
  } | null;
}

interface ApprovalInboxResponse {
  success: boolean;
  data: ApprovalInboxRow[];
  total?: number;
}

const STAGE_LABELS: Record<string, string> = {
  caretaker: "Caretaker",
  deputy_warden: "Deputy Warden",
  hostel_manager: "Hostel Manager",
  warden_or_principal: "Warden / Principal",
  main_gate: "Main Gate",
  hod: "HOD",
  oie: "Officer in Exam (OIE)",
  vice_principal: "Vice Principal",
  principal: "Principal",
  faculty: "Faculty",
  completed: "Completed",
};

function slaState(row: ApprovalInboxRow, now: number): "overdue" | "pending" {
  if (!row.sla_deadline) return "pending";
  const deadline = new Date(row.sla_deadline).getTime();
  return deadline < now ? "overdue" : "pending";
}

function slaDetail(row: ApprovalInboxRow, now: number): string {
  if (!row.sla_deadline) return "No SLA set";
  const deadline = new Date(row.sla_deadline).getTime();
  const diffMs = deadline - now;
  const absMin = Math.floor(Math.abs(diffMs) / 60_000);
  const label =
    absMin < 60
      ? `${absMin}m`
      : `${Math.floor(absMin / 60)}h ${absMin % 60 ? `${absMin % 60}m` : ""}`.trim();
  return diffMs < 0 ? `${label} overdue` : `due in ${label}`;
}

export interface ApprovalInboxProps {
  /** Optional embedded view (no wrapper card). Default: wrapped in a card. */
  compact?: boolean;
  /** Poll interval in ms. Default 30s. */
  pollMs?: number;
  /** Max rows to render (prioritised list). Default 20. */
  limit?: number;
}

/**
 * ApprovalInbox — a reusable "Action Inbox / Approval Inbox" panel.
 *
 * Fetches GET /api/permissions?status=PENDING&assigned_stage=<role> via
 * useApiResource + usePolling, renders a prioritized list (oldest /
 * overdue first), and exposes quick actions (Approve / Reject / Escalate)
 * that call the existing PATCH /api/permissions/[ticket] endpoint.
 * Role awareness comes from useAuthStore: quick actions render only for
 * approver roles; students/parents/operators get a read-only list with a
 * "View details" link instead.
 */
export function ApprovalInbox({ compact = false, pollMs = 30_000, limit = 20 }: ApprovalInboxProps) {
  const hasHydrated = useHasHydrated();
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? null;
  const isApprover = role ? APPROVER_ROLES.has(role) : false;
  const addToast = useUIStore((s) => s.addToast);
  const router = useRouter();

  const [actingTicket, setActingTicket] = useState<string | null>(null);

  // The server scopes the query by the caller's role already; the
  // `assigned_stage` param is the explicit stage filter the spec asks for.
  // (Caretaker / Deputy Warden etc. map to the stage of the same name.)
  const inboxUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("status", "PENDING");
    if (role && role !== "admin" && role !== "sysadmin") {
      params.set("assigned_stage", role);
    }
    return `/api/permissions?${params.toString()}`;
  }, [role]);

  const { data, loading, error, refresh } = useApiResource<ApprovalInboxResponse>(
    hasHydrated ? inboxUrl : null,
    { enabled: hasHydrated, ttlMs: 10_000 }
  );

  const rows = data?.data ?? [];

  usePolling(() => refresh(), { intervalMs: pollMs, enabled: hasHydrated });

  // Prioritise: overdue first, then oldest created_at first.
  const prioritized = useMemo(() => {
    const now = Date.now();
    return [...rows]
      .sort((a, b) => {
        const aOver = slaState(a, now) === "overdue" ? 0 : 1;
        const bOver = slaState(b, now) === "overdue" ? 0 : 1;
        if (aOver !== bOver) return aOver - bOver;
        const aTime = a.created_at ? new Date(a.created_at).getTime() : now;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : now;
        return aTime - bTime;
      })
      .slice(0, limit);
  }, [rows, limit]);

  const runAction = useCallback(
    async (ticket: string, action: "APPROVE" | "REJECT" | "ESCALATE", comment?: string) => {
      if (!isApprover) return;
      setActingTicket(ticket);
      try {
        const res = await fetch(`/api/permissions/${encodeURIComponent(ticket)}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({ action, comment }),
        });
        const json = await res.json().catch(() => null);
        if (json?.success) {
          addToast({
            message: `Ticket ${ticket} ${action.toLowerCase()}d`,
            variant: action === "REJECT" ? "info" : "success",
          });
          await refresh();
        } else {
          addToast({
            message:
              json?.error?.message ?? json?.error ?? `Failed to ${action.toLowerCase()} ticket ${ticket}`,
            variant: "error",
          });
        }
      } catch (err) {
        addToast({
          message: err instanceof Error ? err.message : "Action failed",
          variant: "error",
        });
      } finally {
        setActingTicket(null);
      }
    },
    [isApprover, addToast, refresh]
  );

  const viewTicket = useCallback(
    (ticket: string) => {
      // Approver-side standalone ticket page; students can view it too.
      router.push(`/approver/permissions/${encodeURIComponent(ticket)}`);
    },
    [router]
  );

  const now = Date.now();

  let body: React.ReactNode;
  if (!hasHydrated || loading) {
    body = (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  } else if (error) {
    body = (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-[var(--action-danger)]" />
        <p className="text-sm text-[var(--text-secondary)]">{error}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  } else if (prioritized.length === 0) {
    body = (
      <EmptyState
        title="No pending requests"
        description={
          isApprover
            ? "You're all caught up — nothing is awaiting your decision."
            : "There are no pending requests visible to you right now."
        }
        icon={<Inbox className="h-8 w-8" />}
      />
    );
  } else {
    body = (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {prioritized.map((row) => {
          const overdue = slaState(row, now) === "overdue";
          const studentName = row.student?.name ?? "Unknown student";
          const roll = row.student?.student_details?.roll;
          const busy = actingTicket === row.ticket_number;
          return (
            <div
              key={row.id || row.ticket_number}
              className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 min-w-0 transition-colors hover:border-[var(--text-muted)]"
            >
              {/* Header: ticket + SLA badge */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--action-primary)] truncate">
                  {row.ticket_number}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0 ${
                    overdue
                      ? "bg-[var(--action-danger)]/10 text-[var(--action-danger)]"
                      : "bg-[var(--action-info)]/10 text-[var(--action-info)]"
                  }`}
                >
                  {overdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {slaDetail(row, now)}
                </span>
              </div>

              {/* Student + workflow + stage */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {studentName}
                  {roll ? (
                    <span className="ml-1.5 text-xs font-normal text-[var(--text-muted)]">{roll}</span>
                  ) : null}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                  <span className="rounded bg-[var(--bg-elevated)] border border-[var(--border)] px-1.5 py-0.5">
                    {row.workflow_type}
                  </span>
                  <span className="rounded bg-[var(--bg-elevated)] border border-[var(--border)] px-1.5 py-0.5">
                    {STAGE_LABELS[row.current_stage] ?? row.current_stage}
                  </span>
                </div>
              </div>

              {/* Quick actions */}
              <div className="mt-auto flex flex-wrap items-center gap-1.5">
                {isApprover ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void runAction(row.ticket_number, "APPROVE")}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--action-primary)] px-2.5 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void runAction(row.ticket_number, "REJECT")}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--action-danger)] hover:bg-[var(--bg-surface)] disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <X className="h-3 w-3" /> Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => void runAction(row.ticket_number, "ESCALATE")}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--action-warning)] hover:bg-[var(--bg-surface)] disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <ArrowUpRight className="h-3 w-3" /> Escalate
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => viewTicket(row.ticket_number)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                  >
                    <Eye className="h-3 w-3" /> View details
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const inner = (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Inbox className="h-4 w-4 text-[var(--action-primary)] shrink-0" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
            Action Inbox
            {isApprover ? " — approvals" : " — pending"}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      <div className="mt-4">{body}</div>
    </>
  );

  if (compact) {
    return <WidgetBoundary title="Approval Inbox">{inner}</WidgetBoundary>;
  }

  return (
    <WidgetBoundary title="Approval Inbox">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/40 p-4 sm:p-5">
        {inner}
      </div>
    </WidgetBoundary>
  );
}

export default ApprovalInbox;
