"use client";

import { Suspense, useCallback, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import {
  BadgeCheck,
  Check,
  X,
  Loader2,
  Clock,
  AlertTriangle,
  Inbox,
} from "lucide-react";

/* ── response shapes (mirror /api/permissions) ── */

interface PermissionRow {
  id: string;
  ticket_number?: string;
  workflow_type?: string;
  current_stage?: string;
  status?: string;
  sla_deadline?: string | null;
  stage_history?: unknown;
  student?: {
    name?: string;
    unique_id?: string;
    student_details?: { roll?: string; year?: number; hostel_block?: string } | null;
  } | null;
  [key: string]: unknown;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionRow[];
  total?: number;
}

function safeText(v: string | number | null | undefined, fallback = "—"): string {
  const s = String(v ?? "").trim();
  if (!s || s === "undefined" || s === "NaN" || s.toLowerCase() === "null") return fallback;
  return s;
}

function PassVerificationInner() {
  const user = useAuthStore((s) => s.user);
  const [actingTicket, setActingTicket] = useState<string | null>(null);
  const [rejectingTicket, setRejectingTicket] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  // The operator stage in the permission workflow is "hostel_manager"; the
  // /api/permissions route scopes operator callers to that stage
  // automatically, so no explicit stage param is needed.
  const queueUrl = "/api/permissions?status=PENDING";

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<PermissionsResponse>(queueUrl, { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const rows = data?.data ?? [];
  const busy = loading && !data;

  const act = useCallback(
    async (ticket: string, action: "APPROVE" | "REJECT", comment?: string) => {
      const key = `${ticket}:${action}`;
      setActingTicket(key);
      try {
        const res = await fetch(`/api/permissions/${encodeURIComponent(ticket)}`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({ action, comment }),
        });
        const json = await res.json();
        if (json.success) {
          refreshAll();
        } else {
          console.error("Pass action failed:", json.error?.message ?? json.error);
        }
      } catch (err) {
        console.error("Pass action failed:", err);
      } finally {
        setActingTicket(null);
      }
    },
    [refreshAll]
  );

  const handleRejectConfirm = (ticket: string) => {
    if (!rejectComment.trim()) return;
    void act(ticket, "REJECT", rejectComment.trim());
    setRejectingTicket(null);
    setRejectComment("");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <BadgeCheck className="w-5 h-5 text-[var(--action-primary)] shrink-0" />
            <h2 className="text-lg font-bold text-[var(--text-primary)] truncate">
              Pass Verification
            </h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1 min-w-0">
            Pending gate-pass tickets at the {user?.role === "operator" ? "main-gate" : "your"} stage —
            verify against the ID before approving.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Queue unavailable: {error}</span>
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-amber-400/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <WidgetBoundary title="Verification Queue">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-2 min-w-0">
            <span className="text-sm font-semibold text-[var(--text-primary)] min-w-0">
              Pending tickets
            </span>
            <span className="text-xs text-[var(--text-muted)] shrink-0">
              {busy ? "…" : `${rows.length} in queue`}
            </span>
          </div>

          {busy ? (
            <div className="p-4 flex items-center gap-2 text-sm text-[var(--text-muted)] min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />
              Loading verification queue…
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <Inbox className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-[var(--text-muted)]">
                Verification queue is clear — no pending passes at this stage.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)] min-w-0">
              {rows.map((row) => {
                const ticket = row.ticket_number ?? row.id;
                const key = `${ticket}:APPROVE`;
                const rejectKey = `${ticket}:REJECT`;
                const roll = row.student?.student_details?.roll;
                const sla = row.sla_deadline
                  ? new Date(row.sla_deadline)
                  : null;
                const slaBreached = sla ? sla.getTime() < Date.now() : false;
                return (
                  <li key={row.id} className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {row.student?.name || safeText(row.student?.unique_id, "Unknown applicant")}
                        {roll && (
                          <span className="ml-1.5 font-mono text-xs text-[var(--text-muted)]">
                            {roll}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                        <span className="font-mono">{ticket}</span>
                        <span className="uppercase">
                          {safeText(row.workflow_type).replace(/_/g, " ")}
                        </span>
                        {sla && (
                          <span className={slaBreached ? "text-rose-400 font-semibold" : ""}>
                            SLA {new Date(sla).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            {slaBreached ? " · breached" : ""}
                          </span>
                        )}
                      </p>
                    </div>

                    {rejectingTicket === ticket ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto min-w-0">
                        <input
                          type="text"
                          value={rejectComment}
                          onChange={(e) => setRejectComment(e.target.value)}
                          placeholder="Reason for rejection (required)"
                          className="w-full sm:w-56 rounded-lg border border-rose-500/40 bg-[var(--bg-base)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-rose-500/40 outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRejectConfirm(ticket)}
                            disabled={!rejectComment.trim() || actingTicket === rejectKey}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-600 disabled:opacity-50 transition-colors"
                          >
                            {actingTicket === rejectKey ? (
                              <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingTicket(null);
                              setRejectComment("");
                            }}
                            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => void act(ticket, "APPROVE")}
                          disabled={actingTicket === key}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition-colors"
                        >
                          {actingTicket === key ? (
                            <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Verify &amp; Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingTicket(ticket);
                            setRejectComment("");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors"
                        >
                          <X className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {!busy && rows.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[var(--border)] text-xs text-[var(--text-muted)] flex items-center gap-1.5 min-w-0">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              Auto-refreshes every 30 seconds.
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function PassVerificationPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <PassVerificationInner />
    </Suspense>
  );
}
