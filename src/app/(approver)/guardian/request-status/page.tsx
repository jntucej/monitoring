"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { displayId } from "@/lib/utils";

import { PageLoading } from "@/components/shared/LoadingStates";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import {
  Loader2,
  Inbox
} from "lucide-react";

import { RequestTimeline } from "@/components/shared/RequestTimeline";
import { useAuthStore } from "@/stores/authStore";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { AuthGuard } from "@/components/shared/AuthGuard";


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
    return "border-emerald-400/30 bg-emerald-400/10 text-action-success";
  if (s === "REJECTED" || s === "CANCELLED")
    return "border-rose-400/30 bg-rose-400/10 text-action-danger";
  if (s === "ESCALATED")
    return "border-amber-400/30 bg-amber-400/10 text-action-warning";
  if (s === "PENDING")
    return "border-sky-400/30 bg-sky-400/10 text-action-info";
  return "border-border/30 bg-bg-elevated/10 text-text-muted";
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
            <Inbox className="w-6 h-6 text-action-success" />
            Request Status
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Track the approval timeline of pass and leave requests for your wards
          </p>
        </div>
      </div>

      <ContextSituationBar
        roleLabel="Student Guardian / Parent"
        purpose="Track stage-by-stage approval progress, verifications, and decisions for ward requests."
        why="Tracking stages indicates whether a request is waiting for class teacher sign-off, warden review, or is ready for gate departure."
        contextLabel="Request Lifecycle & Approvals"
        statusTone={rows.length > 0 ? "info" : "ok"}
        statusPill={`${rows.length} Request${rows.length === 1 ? "" : "s"}`}
        statusSummary={
          effectiveTicket
            ? `Viewing timeline for ticket ${effectiveTicket}. Click any request on the left to inspect its path.`
            : rows.length > 0
              ? `Tracking ${rows.length} ward request(s). Select a request to view its stage history.`
              : "No requests found for your wards. Submit a request to initiate approval tracking."
        }
        primaryAction={{ label: "Submit Request", href: "/guardian/pass-leave-submission" }}
        secondaryAction={{ label: "Ward Status", href: "/guardian/child-status" }}
      />

      {error && (
        <div className="surface-card bg-rose-500/10 p-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* request list */}
        <div className="surface-card bg-bg-surface p-4 space-y-3 min-w-0">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            Ward requests
          </h2>
          {loading && rows.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading requests…
            </div>
          ) : rows.length === 0 ? (
            <div className="surface-card p-6 text-center space-y-2">
              <p className="text-sm font-semibold text-text-secondary">No requests found</p>
              <p className="text-xs text-text-muted">No pass or leave requests have been found for your linked wards.</p>
              <div className="pt-2">
                <Link
                  href="/guardian/pass-leave-submission"
                  className="surface-card inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-action-primary text-white hover:opacity-90 transition-opacity"
                >
                  Submit Pass / Leave
                </Link>
              </div>
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
                        : "border-border bg-bg-base/50 hover:bg-bg-elevated"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-mono font-medium text-text-primary">
                        {r.ticket_number || displayId(r.id, "Ticket")}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${statusPill(r.status)}`}
                      >
                        {r.status || "PENDING"}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
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
            <div className="surface-card p-8 text-center text-sm text-text-muted h-full flex flex-col items-center justify-center space-y-2">
              <p className="font-medium text-text-secondary">Select a request</p>
              <p className="text-xs text-text-muted">Choose a request from the list to view its complete approval timeline.</p>
              {rows.length === 0 && (
                <div className="pt-2">
                  <Link
                    href="/guardian/pass-leave-submission"
                    className="surface-card inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-action-primary text-white hover:opacity-90 transition-opacity"
                  >
                    Submit a Request
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
export default function RequestStatusPagePage() {
  return (
    <AuthGuard allowedRoles={['guardian', 'parent', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <RequestStatusPageInner />
      </Suspense>
    </AuthGuard>
  );
}
