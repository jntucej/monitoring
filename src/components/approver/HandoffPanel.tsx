"use client";

/**
 * HandoffPanel — exam-branch console extra panel.
 *
 * Lists exam permission tickets flagged for OIE handoff (the caller's own
 * branch, self-scoped server-side). Each row shows: candidate name, roll
 * number, exam date, subject, and current stage. The "Send to OIE" button
 * POSTs the ticket's forward to the OIE role.
 *
 * Desktop: right-side panel inside the main column. Mobile: full-width, no
 * horizontal scroll. EmptyState when no handoffs.
 */

import { useCallback, useState } from "react";
import {
  ArrowLeftRight,
  Loader2,
  ShieldAlert,
  Send,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource } from "@/hooks/useApiResource";
import { useUIStore } from "@/stores/uiStore";
import { getAuthHeaders } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import type { PermissionItem } from "@/components/approver/PermissionRow";

/** Response shape: { success, data: PermissionItem[], total }. */
interface HandoffListResponse {
  success: boolean;
  data: PermissionItem[];
  total?: number;
}

export interface HandoffPanelProps {
  /** Optional callback fired after a successful forward. */
  onForwarded?: () => void;
}

export function HandoffPanel({ onForwarded }: HandoffPanelProps) {
  const addToast = useUIStore((s) => s.addToast);
  const user = useAuthStore((s) => s.user);

  // The board source (self-scoped to the caller's branch). Add a `stage`
  // filter so only forwarded exam tickets appear.
  const source = "/api/permissions?workflow_type=exam&branch=:self&stage=forwarded";

  const { data, loading, refresh } = useApiResource<HandoffListResponse>(source, {
    ttlMs: 15_000,
  });

  const handoffs: PermissionItem[] = data?.data ?? [];
  const busy = loading && !data;

  const [sending, setSending] = useState<Set<string>>(new Set());

  const sendToOie = useCallback(
    async (ticket: string) => {
      setSending((prev) => new Set(prev).add(ticket));
      try {
        const res = await fetch(
          `/api/permissions/${encodeURIComponent(ticket)}/forward`,
          {
            method: "POST",
            headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify({
              targetRole: "oie",
              comment: "forwarded from exam branch to OIE",
            }),
          },
        );
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success) {
          addToast({
            variant: "success",
            message: `Forwarded ${ticket} to OIE`,
          });
          void refresh();
          onForwarded?.();
        } else {
          addToast({
            variant: "error",
            message:
              json?.error?.message ||
              `Failed to forward ${ticket} to OIE`,
          });
        }
      } catch {
        addToast({
          variant: "error",
          message: "Network error while forwarding ticket to OIE",
        });
      } finally {
        setSending((prev) => {
          const next = new Set(prev);
          next.delete(ticket);
          return next;
        });
      }
    },
    [addToast, refresh, onForwarded],
  );

  return (
    <section
      className="w-full min-w-0 rounded-xl border border-border bg-bg-surface overflow-hidden"
      aria-label="OIE Handoff"
    >
      {/* Header */}
      <header className="surface-card flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <ArrowLeftRight className="w-4 h-4 text-action-primary shrink-0" />
          <h2 className="text-sm font-bold text-text-primary truncate">
            OIE Handoff
          </h2>
          <span className="text-xs font-mono text-text-muted uppercase tracking-wider shrink-0">
            {user?.name ? user.name : "Exam Branch"}
          </span>
        </div>
        <span className="text-xs text-text-muted shrink-0">
          {handoffs.length} item(s)
        </span>
      </header>

      {/* Body */}
      <div className="min-w-0">
        {busy ? (
          <div className="p-4 flex items-center gap-2 text-sm text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
            Loading OIE Handoff…
          </div>
        ) : handoffs.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<ShieldAlert className="w-5 h-5 text-text-muted" />}
              title="No handoffs"
              description="No exam tickets are currently flagged for OIE handoff in your branch."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border max-h120 overflow-y-auto min-w-0">
            {handoffs.map((item) => {
              const ticket = item.ticket_number;
              const isSending = sending.has(ticket);
              const candidateName =
                item.student?.name ||
                item.student?.student_details?.roll ||
                "Unknown candidate";
              const rollNo = item.student?.student_details?.roll ?? "—";
              // exam_date / subject are not first-class columns on the
              // permission row today; surface what we have.
              const examDate = item.sla_deadline ?? item.updated_at ?? "—";
              const subject = item.reason || item.workflow_type || "Exam";
              const fmtDate = (iso: string | null | undefined) => {
                if (!iso) return "—";
                try {
                  return new Date(iso).toLocaleDateString([], {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                } catch {
                  return "—";
                }
              };

              return (
                <li
                  key={item.id}
                  className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0"
                >
                  {/* Left: ticket + candidate */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono font-bold text-action-primary truncate">
                        {ticket}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                          item.status === "PENDING"
                            ? "text-action-warning bg-amber-400/10 border border-amber-400/20"
                            : "text-action-info bg-sky-400/10 border border-sky-400/20"
                        }`}
                      >
                        {item.current_stage}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-text-primary truncate">
                      {candidateName}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted min-w-0">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-xs font-mono uppercase tracking-wider">
                          Roll
                        </span>
                        <span className="font-mono text-text-secondary">
                          {rollNo}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="text-xs font-mono uppercase tracking-wider">
                          Date
                        </span>
                        <span>{fmtDate(examDate)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 min-w-0">
                        <span className="text-xs font-mono uppercase tracking-wider">
                          Subj
                        </span>
                        <span className="truncate">{subject}</span>
                      </span>
                    </div>
                  </div>

                  {/* Right: Send to OIE */}
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => void sendToOie(ticket)}
                    className="surface-card inline-flex items-center gap-1.5 bg-action-primary/10 px-3 py-1.5 text-xs font-semibold text-action-primary hover:bg-action-primary/20 disabled:opacity-50 transition-colors shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {isSending ? "Sending…" : "Send to OIE"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

export default HandoffPanel;
