"use client";

/**
 * ExamDayPanel — exam-day gate access panel for the OIE console.
 *
 * Desktop: a side panel (rendered by RoleConsole alongside the board).
 * Mobile: a full-width section below the board. No horizontal scroll.
 *
 * Reads the gate-access state + today's exam sessions from GET
 * /api/exam/access. The endpoint exposes `data.authorised` (authorised /
 * pending exam candidates) and `data.stageSummary`, but has no dedicated
 * "today's sessions" field, so when that data is absent the panel shows the
 * gate access state (open/closed) + the two action buttons only, with an
 * EmptyState note (per the task spec).
 *
 * Action buttons "Open day access" / "Close day access" POST to
 * /api/exam/access. That route currently exposes GET only (no POST handler),
 * so the POST is best-effort: on a non-2xx response the panel surfaces an
 * "endpoint not available" toast instead of 404ing the user.
 */

import { useCallback, useMemo, useState } from "react";
import { DoorOpen, DoorClosed, Loader2, ShieldAlert } from "lucide-react";
import { useApiResource } from "@/hooks/useApiResource";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

/** GET /api/exam/access response (no today-sessions field yet). */
interface ExamAccessRow {
  id: string;
  ticket_number: string;
  current_stage: string;
  status: string;
  candidate_name?: string;
  roll?: string;
}
interface ExamAccessResponse {
  success: boolean;
  data: {
    authorised: ExamAccessRow[];
    stageSummary: Array<{ current_stage: string; status: string; count: number }>;
  };
}

export function ExamDayPanel() {
  const addToast = useUIStore((s) => s.addToast);
  const { data } = useApiResource<ExamAccessResponse>("/api/exam/access", {
    ttlMs: 30_000,
  });

  const [busy, setBusy] = useState(false);

  // The endpoint exposes no explicit open/closed flag. Derive the gate state
  // from the authorised candidate set: any authorised / approved candidate
  // means the day is "open" for exam access; otherwise "closed". This is a
  // best-effort proxy until a dedicated day-state endpoint lands.
  const examDay: "open" | "closed" = useMemo(() => {
    if (!data?.data) return "closed";
    const hasAccess = (data.data.authorised ?? []).some(
      (r) => r.status === "APPROVED"
    );
    return hasAccess ? "open" : "closed";
  }, [data]);

  const todaySessions = useMemo(() => {
    // No "today's sessions" field on /api/exam/access. When absent the panel
    // shows the gate state + action buttons only (see the EmptyState note).
    return (data?.data?.authorised ?? []).filter((r) => r.status === "APPROVED");
  }, [data]);

  const setDay = useCallback(
    async (open: boolean) => {
      setBusy(true);
      try {
        const res = await fetch("/api/exam/access", {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ open }),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success) {
          addToast({
            variant: "success",
            message: `Exam day access ${open ? "opened" : "closed"}`,
          });
        } else {
          // POST handler not implemented yet — surface a friendly note.
          addToast({
            variant: "info",
            message:
              json?.error?.message ||
              `Day-access ${open ? "open" : "close"}: endpoint not available yet`,
          });
        }
      } catch {
        addToast({
          variant: "info",
          message: `Day-access ${open ? "open" : "close"}: endpoint not available yet`,
        });
      } finally {
        setBusy(false);
      }
    },
    [addToast]
  );

  const isOpen = examDay === "open";

  return (
    <section className="surface-card bg-bg-surface/60 p-4 min-w-0">
      {/* Header: gate state pill */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {isOpen ? (
            <DoorOpen className="w-4 h-4 text-action-success shrink-0" />
          ) : (
            <DoorClosed className="w-4 h-4 text-action-danger shrink-0" />
          )}
          <span className="text-sm font-bold text-text-primary truncate">
            Exam-Day Access
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${
            isOpen
              ? "text-action-success bg-emerald-400/10 border-emerald-400/20"
              : "text-action-danger bg-rose-400/10 border-rose-400/20"
          }`}
        >
          <span className={`size-2 rounded-full ${isOpen ? "bg-action-success" : "bg-action-danger"}`} />
          {isOpen ? "Open" : "Closed"}
        </span>
      </div>

      {/* Body: today's sessions (or an EmptyState note) */}
      {todaySessions.length > 0 ? (
        <ul className="space-y-1.5 max-h55 overflow-y-auto custom-scrollbar pr-1 mb-3">
          {todaySessions.map((r) => (
            <li
              key={r.id}
              className="surface-card flex items-center justify-between gap-2 bg-bg-elevated px-2.5 py-1.5 min-w-0"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-primary truncate">
                  {r.candidate_name || r.ticket_number}
                </p>
                <p className="text-xs font-mono text-text-muted truncate">
                  {r.ticket_number}
                </p>
              </div>
              <span className="text-xs font-mono text-text-muted shrink-0">
                {r.current_stage}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="surface-card bg-bg-base/50 px-3 py-3 mb-3">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
            <p className="text-xs text-text-muted">
              No exam-day sessions published yet. The gate access state and
              open/close controls remain available.
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={busy || isOpen}
          onClick={() => void setDay(true)}
          className="surface-card inline-flex items-center justify-center gap-2 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-action-success hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DoorOpen className="w-3.5 h-3.5" />}
          Open day access
        </button>
        <button
          type="button"
          disabled={busy || !isOpen}
          onClick={() => void setDay(false)}
          className="surface-card inline-flex items-center justify-center gap-2 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-action-danger hover:bg-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DoorClosed className="w-3.5 h-3.5" />}
          Close day access
        </button>
      </div>
    </section>
  );
}

export default ExamDayPanel;
