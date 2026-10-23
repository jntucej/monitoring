"use client";

import { Suspense, useCallback, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PermissionList } from "@/components/approver/PermissionList";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  XCircle,
} from "lucide-react";

interface RevokeTarget {
  id: string;
  ticket_number: string;
  status: string;
  workflow_type: string;
}

function PermissionManagementInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);
  const addToast = useUIStore((s) => s.addToast);

  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [revokeAck, setRevokeAck] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const revoke = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!revokeTarget) return;
      setRevoking(true);
      try {
        const res = await fetch(`/api/permissions/${revokeTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({
            action: "CANCEL",
            reason: revokeReason,
            comment: `Institutional revocation by principal: ${revokeReason}`,
          }),
        });
        const json = await res.json();
        if (res.ok && json.success !== false) {
          addToast({
            message: `Ticket ${revokeTarget.ticket_number} revoked and audit-logged.`,
            variant: "success",
          });
        } else {
          addToast({
            message: json.error?.message || "Revocation failed — ticket may no longer be actionable.",
            variant: "error",
          });
        }
      } catch (err: unknown) {
        addToast({
          message: err instanceof Error ? err.message : "Network error during revocation",
          variant: "error",
        });
      } finally {
        setRevoking(false);
        setRevokeTarget(null);
        setRevokeReason("");
        setRevokeAck(false);
        setRevokeConfirm(false);
      }
    },
    [revokeTarget, revokeReason, addToast]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 px-4 sm:px-6 py-6 sm:py-8 min-w-0">
      <Link
        href="/principal"
        className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="w-3 h-3" /> Back to Overview
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono">{role}</span> · tier {tier} · institutional permissions
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 sm:p-4 text-xs sm:text-sm text-[var(--text-muted)] flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[var(--text-muted)]" />
        <p>
          Granting happens upstream (HOD → OIE → Vice Principal) — here you review the queues that
          reach the principal stage and can <span className="text-[var(--text-primary)] font-medium">revoke
          already-granted permissions</span>. Every revocation requires a written reason and a typed
          confirmation; it is recorded in the audit log.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-5 min-w-0">
        <WidgetBoundary title="Exam Clearances — Your Stage">
          <PermissionList
            title="Exam Clearances"
            subtitle="Final-stage examination permissions awaiting or granted by the principal"
            workflowType="exam"
            stageFilter="principal"
            fetchUrl="/api/permissions?workflow_type=exam&stage=principal&status=PENDING"
          />
        </WidgetBoundary>

        <WidgetBoundary title="Hostel & Leave — Your Stage">
          <PermissionList
            title="Hostel & Leave"
            subtitle="Outpass and staff-leave requests escalated to the principal"
            workflowType="hostel"
            stageFilter="principal"
            fetchUrl="/api/permissions?workflow_type=hostel&stage=principal&status=PENDING"
          />
        </WidgetBoundary>

        <WidgetBoundary title="Recently Granted — Revoke">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
            <p className="text-xs text-[var(--text-muted)] mb-3">
              Pick a recently granted ticket to revoke. Approved tickets are pulled below for
              review; revocation is destructive and audit-logged.
            </p>
            {/* GrantedTickets placeholder or component */}
          </div>
        </WidgetBoundary>
      </div>

      <ConfirmDialog
        open={revokeConfirm && !!revokeTarget}
        onClose={() => {
          setRevokeConfirm(false);
          if (!revoking) {
            setRevokeTarget(null);
            setRevokeReason("");
            setRevokeAck(false);
          }
        }}
        title={`Revoke ${revokeTarget?.ticket_number ?? "ticket"}?`}
        body={revokeTarget ? `This permanently revokes the ${revokeTarget.workflow_type.replace(/_/g, " ")} permission. A reason is required and the action is written to the audit log.` : ""}
        onConfirm={() => setRevokeConfirm(false)}
        confirmText="Continue"
        variant="destructive"
      />
      {revokeConfirm && revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={revoke}
            className="relative w-full sm:max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-5 h-5 text-rose-400" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Revoke {revokeTarget.ticket_number}
              </h2>
            </div>
            <label htmlFor="revoke-reason" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
              Reason (required, audit-logged)
            </label>
            <textarea
              id="revoke-reason"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              rows={3}
              required
              minLength={10}
              placeholder="e.g. Requested against exam timetable after result publication"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] mb-3 resize-none"
            />
            <label className="flex items-start gap-2 text-xs text-[var(--text-muted)] mb-4 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={revokeAck}
                onChange={(e) => setRevokeAck(e.target.checked)}
                className="mt-0.5 rounded border-[var(--border)] text-rose-500 focus:ring-rose-500"
              />
              <span>
                I understand this action is immediate, irrevocable, and written to the immutable audit trail.
              </span>
            </label>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRevokeConfirm(false);
                  setRevokeTarget(null);
                  setRevokeReason("");
                  setRevokeAck(false);
                }}
                disabled={revoking}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={revoking || !revokeAck || revokeReason.trim().length < 10}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-50"
              >
                {revoking ? "Revoking..." : "Confirm Revocation"}
              </button>
            </div>
          </form>
        </div>
      )}

      <DevContactStrip />
    </div>
  );
}

export default function PermissionManagementPage() {
  return (
    <AuthGuard allowedRoles={["principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <PermissionManagementInner />
      </Suspense>
    </AuthGuard>
  );
}
