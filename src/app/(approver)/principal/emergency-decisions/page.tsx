"use client";

import { Suspense, useCallback, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useUIStore } from "@/stores/uiStore";
import { getAuthHeaders } from "@/lib/utils";
import Link from "next/link";
import {
  RefreshCw,
  ArrowLeft,
  ShieldAlert,
  ScrollText,
  Plus,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";

interface EmergencyRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  status: string;
  current_stage?: string | null;
  created_at?: string | null;
  student?: { name?: string; student_details?: { roll?: string } | null } | null;
}

interface EmergencyResponse {
  success: boolean;
  data?: EmergencyRow[];
  total?: number;
  error?: { message?: string };
}

function EmergencyDecisionsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);
  const addToast = useUIStore((s) => s.addToast);

  const [subject, setSubject] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState<string>("security");
  const [ack, setAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data, loading, error, refresh } = useApiResource<EmergencyResponse>(
    user
      ? "/api/permissions?status=PENDING&stage=principal&limit=100"
      : null,
    { enabled: !!user, ttlMs: 15_000 }
  );

  const flagged = data?.data ?? [];

  usePolling(refresh, { intervalMs: 60_000, enabled: !!user && !submitting });

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!ack || reason.trim().length < 20 || subject.trim().length < 3) return;
      setSubmitting(true);
      try {
        const res = await fetch("/api/principal/delegations", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({
            delegate_role: "oie",
            scope: `Emergency delegation (${category}): ${subject}`,
            note: reason,
            expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          }),
        });
        const json = await res.json();
        if (res.ok && json.success !== false) {
          addToast({
            message: "Emergency delegation logged to the audit trail.",
            variant: "success",
          });
          setSubmitted(true);
        } else {
          addToast({
            message: json.error?.message || "Could not record the emergency delegation",
            variant: "error",
          });
        }
      } catch (err: unknown) {
        addToast({
          message: err instanceof Error ? err.message : "Network error",
          variant: "error",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [ack, reason, subject, category, addToast]
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
            Signed in as <span className="font-mono">{role}</span> · tier {tier} · emergency delegation of authority
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 sm:p-4 text-xs sm:text-sm text-rose-300 flex items-start gap-2 min-w-0">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Delegates a slice of principal authority to a named role for 24 hours so an emergency can
          be handled out-of-band. The delegation, the mandatory reason, and the delegate are
          recorded in the delegation audit trail — it is <strong>not</strong> a permission decision.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
        <WidgetBoundary title="Emergency Delegation">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
            {submitted ? (
              <div className="text-center py-6">
                <ScrollText className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">Delegation logged</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  The delegation is now in the audit trail and visible in the Delegation Manager.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setSubject("");
                    setReason("");
                    setAck(false);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                >
                  <Plus className="w-3 h-3" /> Record another delegation
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3 min-w-0">
                <div>
                  <label htmlFor="emd-subject" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Subject / situation <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="emd-subject"
                    type="text"
                    required
                    minLength={3}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Power outage affecting hostel B curfew verification"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <div>
                  <label htmlFor="emd-category" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Category
                  </label>
                  <select
                    id="emd-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  >
                    <option value="security">Security & Access</option>
                    <option value="hostel">Hostel & Curfew</option>
                    <option value="exam">Examination</option>
                    <option value="facilities">Facilities & Maintenance</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="emd-reason" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Mandatory reason (min 20 chars) <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    id="emd-reason"
                    required
                    minLength={20}
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide full operational justification for this emergency delegation..."
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none"
                  />
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    {reason.trim().length}/20 characters minimum
                  </p>
                </div>
                <div className="flex items-start gap-2 pt-1">
                  <input
                    id="emd-ack"
                    type="checkbox"
                    required
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                    className="mt-0.5 rounded border-[var(--border)] text-[var(--action-primary)] focus:ring-[var(--action-primary)]"
                  />
                  <label htmlFor="emd-ack" className="text-xs text-[var(--text-muted)] cursor-pointer">
                    I confirm this is an urgent operational necessity and accept full audit accountability.
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={submitting || !ack || reason.trim().length < 20 || subject.trim().length < 3}
                  className="w-full mt-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold py-2.5 text-xs sm:text-sm transition-colors"
                >
                  {submitting ? "Logging Delegation..." : "Authorize & Log Delegation"}
                </button>
              </form>
            )}
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Pending Escalations">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
            <p className="text-xs text-[var(--text-muted)] mb-3">
              Requests currently stalled or flagged at the principal stage across hostel and staff workflows.
            </p>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : error ? (
              <p className="text-xs text-rose-400">Failed to load pending queue: {error}</p>
            ) : flagged.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-6 text-center">No pending items in the principal queue.</p>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto">
                {flagged.map((r) => (
                  <div key={r.id} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/50 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold font-mono text-[var(--text-primary)]">{r.ticket_number}</p>
                      <p className="text-[11px] text-[var(--text-muted)] capitalize">{r.workflow_type} · {r.student?.name || "Student"}</p>
                    </div>
                    <Link
                      href={`/principal/approval-centre`}
                      className="px-2.5 py-1 rounded-lg bg-[var(--action-primary)] text-white text-[11px] font-bold"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </WidgetBoundary>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function PrincipalEmergencyDecisionsPage() {
  return (
    <AuthGuard allowedRoles={["principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <EmergencyDecisionsInner />
      </Suspense>
    </AuthGuard>
  );
}
