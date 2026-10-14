"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import {
  Loader2,
  Inbox
} from "lucide-react";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { RequestTimeline } from "@/components/shared/RequestTimeline";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";

/* ── shapes ── */

interface PermissionRow {
  id: string;
  ticket_number?: string;
  workflow_type?: string;
  status?: string;
  current_stage?: string;
  created_at?: string;
  student?: { name?: string; student_details?: { roll?: string } | null } | null;
}

interface PermissionListData {
  success: boolean;
  data: PermissionRow[];
  total?: number;
}

/* ── helpers ── */

function statusPill(status?: string) {
  const s = (status ?? "PENDING").toUpperCase();
  if (s === "APPROVED" || s === "COMPLETED")
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-400";
  if (s === "REJECTED" || s === "CANCELLED")
    return "border-rose-400/30 bg-rose-400/10 text-rose-400";
  if (s === "ESCALATED")
    return "border-amber-400/30 bg-amber-400/10 text-amber-400";
  if (s === "PENDING")
    return "border-sky-400/30 bg-sky-400/10 text-sky-400";
  return "border-slate-400/30 bg-slate-400/10 text-slate-400";
}

/* ── main ── */

function RequestStatusPageInner() {
  const searchParams = useSearchParams();
  return <RequestStatusContent ticketParam={searchParams.get("ticket") ?? ""} />;
}

function RequestStatusContent({ ticketParam }: { ticketParam: string }) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? "";

  const {
    data: perms,
    loading,
    error,
    refresh,
  } = useApiResource<PermissionListData>("/api/permissions?status=PENDING", {
    ttlMs: 30_000,
    enabled: !!userId,
  });

  const rows = useMemo<PermissionRow[]>(() => {
    const r = perms?.data;
    return Array.isArray(r) ? r : [];
  }, [perms]);

  const [selectedTicket, setSelectedTicket] = useState<string>(ticketParam);
  const effectiveTicket =
    rows.some((r) => (r.ticket_number ?? r.id) === selectedTicket) || ticketParam
      ? selectedTicket
      : (rows[0]?.ticket_number ?? rows[0]?.id ?? "");

  const refreshAll = useCallback(async () => {
    void refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 60_000, enabled: !!userId });

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <Inbox className="w-6 h-6 text-emerald-400" />
            Request Status
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Track the approval timeline of pass and leave requests for your wards
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* request list */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 space-y-3 min-w-0">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
            Ward requests
          </h2>
          {loading && rows.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading requests…
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--text-muted)]">
              No requests found for your wards.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {rows.map((r) => {
                const isActive = effectiveTicket === (r.ticket_number ?? r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedTicket(r.ticket_number ?? r.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors motion-reduce:transition-none ${
                      isActive
                        ? "border-emerald-400/50 bg-emerald-500/10"
                        : "border-[var(--border)] bg-[var(--bg-base)]/50 hover:bg-[var(--bg-elevated)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-mono font-medium text-[var(--text-primary)]">
                        {r.ticket_number || r.id.slice(0, 8)}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${statusPill(r.status)}`}
                      >
                        {r.status || "PENDING"}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {r.workflow_type ? r.workflow_type.replace(/_/g, " ") : "—"}
                      {r.student?.name ? ` · ${r.student.name}` : ""}
                      {r.student?.student_details?.roll ? ` (${r.student.student_details.roll})` : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* timeline */}
        <div className="min-w-0">
          {effectiveTicket ? (
            <RequestTimeline ticket={effectiveTicket} />
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)] h-full flex items-center justify-center">
              Select a request to view its approval timeline.
            </div>
          )}
        </div>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function RequestStatusPage() {
  return (
    <WidgetBoundary title="Request Status">
      <Suspense fallback={<PageLoading />}>
        <RequestStatusPageInner />
      </Suspense>
    </WidgetBoundary>
  );
}
