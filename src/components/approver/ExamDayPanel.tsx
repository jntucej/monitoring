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
    <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-4 min-w-0">
      {/* Header: gate state pill */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {isOpen ? (
            <DoorOpen className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <DoorClosed className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-bold text-[var(--text-primary)] truncate">
            Exam-Day Access
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
            isOpen
              ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
              : "text-rose-400 bg-rose-400/10 border-rose-400/20"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? "bg-emerald-400" : "bg-rose-400"}`} />
          {isOpen ? "Open" : "Closed"}
        </span>
      </div>

      {/* Body: today's sessions (or an EmptyState note) */}
      {todaySessions.length > 0 ? (
        <ul className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1 mb-3">
          {todaySessions.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 min-w-0"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {r.candidate_name || r.ticket_number}
                </p>
                <p className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                  {r.ticket_number}
                </p>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
                {r.current_stage}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-base)]/50 px-3 py-3 mb-3">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[var(--text-muted)]">
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
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DoorOpen className="w-3.5 h-3.5" />}
          Open day access
        </button>
        <button
          type="button"
          disabled={busy || !isOpen}
          onClick={() => void setDay(false)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DoorClosed className="w-3.5 h-3.5" />}
          Close day access
        </button>
      </div>
    </section>
  );
}

export default ExamDayPanel;
