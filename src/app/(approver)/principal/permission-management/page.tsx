"use client";

import { Suspense, useCallback, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
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
  CheckCircle2,
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
            action: "reject",
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

      {/* Role-filtered review queues */}
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
            workflowType="outpass"
            stageFilter="principal"
            fetchUrl="/api/permissions?workflow_type=outpass&stage=principal&status=PENDING"
          />
        </WidgetBoundary>

        <WidgetBoundary title="Recently Granted — Revoke">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
            <p className="text-xs text-[var(--text-muted)] mb-3">
              Pick a recently granted ticket to revoke. Approved tickets are pulled below for
              review; revocation is destructive and audit-logged.
            </p>
            <GrantedTickets onRevoke={(t) => { setRevokeTarget(t); setRevokeConfirm(true); }} />
          </div>
        </WidgetBoundary>
      </div>

      {/* Revoke confirmation modal (destructive, reason mandatory) */}
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
                checked={revokeAck}
                onChange={(e) => setRevokeAck(e.target.checked)}
                className="mt-0.5 accent-rose-500"
              />
              <span>
                I understand this revocation is immediate, destructive, and permanently recorded in
                the audit log under my identity.
              </span>
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!revokeAck || revokeReason.trim().length < 10 || revoking}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {revoking ? "Revoking…" : "Revoke permission"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRevokeConfirm(false);
                  setRevokeTarget(null);
                  setRevokeReason("");
                  setRevokeAck(false);
                }}
                disabled={revoking}
                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <DevContactStrip />
    </div>
  );
}

function GrantedTickets({ onRevoke }: { onRevoke: (t: RevokeTarget) => void }) {
  const [rows, setRows] = useState<RevokeTarget[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/permissions?status=APPROVED&stage=principal&limit=20", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRows(json.data as RevokeTarget[]);
      } else {
        setError(json.error?.message ?? "Failed to load granted tickets");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading && rows === null) {
    return <p className="text-sm text-[var(--text-muted)]">Loading granted tickets…</p>;
  }
  if (error) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-center gap-2">
        <XCircle className="w-4 h-4 shrink-0" /> {error}
      </div>
    );
  }
  if ((rows ?? []).length === 0) {
    return (
      <EmptyState
        title="No granted tickets to review"
        description="Once exam or hostel permissions are signed off at your stage they appear here for revocation."
        icon={<CheckCircle2 className="w-6 h-6 text-[var(--text-muted)]" />}
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
          >
            <RefreshCw className="w-3 h-3" /> Reload
          </button>
        }
      />
    );
  }
  return (
    <div className="overflow-x-auto min-w-0">
      <table className="w-full text-sm min-w-[420px]">
        <thead>
          <tr className="text-[var(--text-muted)] text-xs uppercase tracking-wide border-b border-[var(--border)]">
            <th className="text-left px-3 py-2">Ticket</th>
            <th className="text-left px-3 py-2">Workflow</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-right px-3 py-2">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {(rows ?? []).map((r) => (
            <tr key={r.id} className="hover:bg-[var(--bg-elevated)]">
              <td className="px-3 py-2.5 font-mono text-xs text-[var(--text-primary)]">{r.ticket_number}</td>
              <td className="px-3 py-2.5 text-[var(--text-muted)] capitalize">{r.workflow_type.replace(/_/g, " ")}</td>
              <td className="px-3 py-2.5">
                <span className="inline-block rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  {r.status}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right">
                <button
                  type="button"
                  onClick={() => onRevoke(r)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/20"
                >
                  <XCircle className="w-3 h-3" /> Revoke
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default function PermissionManagementPage() {
  return (
    <AuthGuard allowedRoles={['principal', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <PermissionManagementInner />
      </Suspense>
    </AuthGuard>
  );
}
