"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ArrowUpRight, Keyboard, Loader2 } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { useHodRetention } from "@/stores/hodRetentionStore";
import { SlaBadge } from "@/components/approver/SlaBadge";
import { useUIStore } from "@/stores/uiStore";

interface PermissionItem {
  id: string;
  ticket_number: string;
  workflow_type: string;
  reason: string | null;
  current_stage: string;
  status: string;
  sla_deadline: string | null;
  created_at: string;
  student: { name: string; student_details?: { roll?: string } | null } | null;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionItem[];
}

export function FocusMode({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data, loading, refresh } = useApiResource<PermissionsResponse>(
    open
      ? "/api/permissions?stage=hod&status=PENDING,ESCALATED"
      : null,
    { ttlMs: 5_000 }
  );
  const addToast = useUIStore((s) => s.success);
  const errorToast = useUIStore((s) => s.error);
  const recordWin = useHodRetention((s) => s.recordWin);
  const sessionDecisions = useHodRetention((s) => s.sessionDecisions);

  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const items = data?.data ?? [];
  const current = items[index] ?? null;
  const total = items.length;
  const remaining = Math.max(0, total - index);

  // Clamp index when items shrink
  useEffect(() => {
    if (index >= total && total > 0) setIndex(total - 1);
    if (total === 0) setIndex(0);
  }, [total, index]);

  // Reset index when the panel opens
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const decide = useCallback(
    async (action: "APPROVE" | "REJECT" | "ESCALATE") => {
      if (!current || busy) return;
      setBusy(true);

      try {
        const res = await fetch(`/api/permissions/${current.ticket_number}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...((window as any).__getAuthHeaders?.() ?? {}),
          },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error?.message ?? `HTTP ${res.status}`);
        }
        recordWin({
          ticket: current.ticket_number,
          outcome:
            action === "APPROVE"
              ? "APPROVED"
              : action === "REJECT"
              ? "REJECTED"
              : "ESCALATED",
          subject: current.student?.name ?? current.ticket_number,
          at: new Date().toISOString(),
          responseMs: Date.now() - new Date(current.created_at).getTime(),
          impactedStudents: 1,
        });
        addToast(
          `${action === "APPROVE" ? "Approved" : action === "REJECT" ? "Rejected" : "Escalated"} ${current.ticket_number}`
        );
        await refresh();
      } catch (err: unknown) {
        errorToast(err instanceof Error ? err.message : "Action failed");
      } finally {
        setBusy(false);
      }
    },
    [current, busy, refresh, recordWin, addToast, errorToast]
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (busy) return;
      if (e.key === " ") {
        e.preventDefault();
        decide("APPROVE");
      } else if (e.key.toLowerCase() === "x") {
        decide("REJECT");
      } else if (e.key.toLowerCase() === "e") {
        decide("ESCALATE");
      } else if (e.key === "ArrowRight") {
        setIndex((i) => Math.min(i + 1, total - 1));
      } else if (e.key === "ArrowLeft") {
        setIndex((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, decide, onClose, total]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-base)]"
      >
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              aria-label="Exit focus mode"
            >
              <X className="size-4" />
            </button>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Focus mode
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {remaining > 0 ? `${remaining} of ${total} remaining` : "Queue clear"}
                {sessionDecisions > 0 && ` · ${sessionDecisions} this session`}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-[11px] text-[var(--text-muted)] sm:flex">
            <Keyboard className="size-3" />
            <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5">Space</kbd>
            approve
            <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5">X</kbd>
            reject
            <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5">E</kbd>
            escalate
            <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5">Esc</kbd>
            exit
          </div>
        </header>

        {/* Progress bar */}
        <div className="h-1 shrink-0 bg-[var(--bg-elevated)]">
          <div
            className="h-full bg-[var(--action-primary)] transition-[width] duration-500"
            style={{ width: total > 0 ? `${(index / total) * 100}%` : "0%" }}
          />
        </div>

        {/* Ticket */}
        <main className="flex flex-1 items-center justify-center overflow-y-auto p-4">
          <div className="w-full max-w-2xl">
            {loading && !current ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-[var(--text-muted)]" />
              </div>
            ) : !current ? (
              <div className="rounded-2xl border-2 border-[var(--action-primary)]/30 bg-[var(--action-primary)]/5 p-8 text-center">
                <Check className="mx-auto size-12 text-[var(--action-primary)]" />
                <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">
                  Queue is clear
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {sessionDecisions > 0
                    ? `You cleared ${sessionDecisions} item${sessionDecisions === 1 ? "" : "s"} this session.`
                    : "Nothing waiting for you."}
                </p>
              </div>
            ) : (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 sm:p-6"
              >
                <header className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                      {current.workflow_type} · {current.current_stage}
                    </p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                      {current.student?.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {current.student?.student_details?.roll ?? "—"} · {current.ticket_number}
                    </p>
                  </div>
                  {current.sla_deadline && (
                    <SlaBadge slaDeadline={current.sla_deadline} status={current.status} />
                  )}
                </header>

                <div className="space-y-2">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {current.reason ?? current.workflow_type}
                  </p>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    disabled={busy}
                    onClick={() => decide("APPROVE")}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[var(--action-primary)] px-4 py-3 text-sm font-medium text-white transition disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Approve
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => decide("REJECT")}
                    className="flex items-center justify-center gap-2 rounded-xl border border-[var(--action-danger)]/40 bg-[var(--action-danger)]/5 px-4 py-3 text-sm font-medium text-[var(--action-danger)] transition disabled:opacity-50"
                  >
                    <X className="size-4" />
                    Reject
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => decide("ESCALATE")}
                    className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition disabled:opacity-50"
                  >
                    <ArrowUpRight className="size-4" />
                    Escalate
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </motion.div>
    </AnimatePresence>
  );
}
