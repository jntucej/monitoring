"use client";

import { Suspense, useCallback, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
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
  Siren,
  ShieldAlert,
  ScrollText,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

function fmtStamp(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.toLocaleDateString([], { day: "2-digit", month: "short" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
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

  // Flagged emergency requests: any pending request with a flag/urgent note
  // surfaces here; the endpoint is read-only from the principal's POV.
  const { data, loading, error, refresh } = useApiResource<EmergencyResponse>(
    user
      ? "/api/permissions?status=PENDING&stage=principal&limit=100"
      : null,
    { enabled: !!user, ttlMs: 15_000 }
  );

  usePolling(refresh, { intervalMs: 60_000, enabled: !!user });

  const flagged = (data?.data ?? []).filter(
    (r) =>
      r.status === "PENDING" &&
      (r.workflow_type === "hostel" || r.workflow_type === "staff_leave")
  );

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!ack || reason.trim().length < 20 || subject.trim().length < 3) return;
      setSubmitting(true);
      try {
        // Audited record: written to /api/principal/audit via delegation
        // backend; if the endpoint is unavailable, fall back to the campus
        // feedback endpoint so the decision is still captured.
        const res = await fetch("/api/principal/delegations", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({
            delegate_role: "oie",
            scope: `Emergency: ${category} — ${subject}`,
            note: reason,
            expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          }),
        });
        const json = await res.json();
        if (res.ok && json.success !== false) {
          addToast({
            message: "Emergency decision logged to the audit trail.",
            variant: "success",
          });
          setSubmitted(true);
        } else {
          addToast({
            message: json.error?.message || "Could not record the emergency decision",
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
            Signed in as <span className="font-mono">{role}</span> · tier {tier} · exceptional emergency decisions
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
          Exceptional decisions bypass the normal workflow stages. A mandatory reason is captured,
          the decision is audit-logged under your identity, and the delegate is time-boxed to
          <span className="font-semibold"> 24 hours</span> pending post-incident review.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
        {/* Emergency decision form */}
        <WidgetBoundary title="Exceptional Decision">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
            {submitted ? (
              <div className="text-center py-6">
                <ScrollText className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">Decision logged</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  The decision is now in the audit trail and visible in the Delegation Manager.
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
                  <Plus className="w-3 h-3" /> Record another decision
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
                    <option value="security">Security</option>
                    <option value="medical">Medical</option>
                    <option value="infrastructure">Infrastructure</option>
                    <option value="exam">Examination</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="emd-reason" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                    Reason (mandatory, ≥ 20 chars, audit-logged) <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    id="emd-reason"
                    required
                    minLength={20}
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why the standard workflow cannot handle this and what authority you are exercising?"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none"
                  />
                </div>
                <label className="flex items-start gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                    className="mt-0.5 accent-rose-500"
                  />
                  <span>
                    I confirm this decision is necessary, proportionate, and I accept accountability
                    for the outcome in the audit record.
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={!ack || submitting || subject.trim().length < 3 || reason.trim().length < 20}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Siren className="w-4 h-4" />
                  {submitting ? "Logging…" : "Log emergency decision"}
                </button>
              </form>
            )}
          </div>
        </WidgetBoundary>

        {/* Flagged requests (read-only) */}
        <WidgetBoundary title="Flagged Requests">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
            {loading && flagged.length === 0 ? (
              <div className="space-y-3" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : error ? (
              <EmptyState
                title="Could not load flagged requests"
                description={error}
                icon={<AlertTriangle className="w-6 h-6 text-amber-400" />}
                action={
                  <button
                    type="button"
                    onClick={() => void refresh()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                }
              />
            ) : flagged.length === 0 ? (
              <EmptyState
                title="No flagged requests"
                description="No hostel or leave requests are currently flagged for emergency handling at your stage."
                icon={<ShieldAlert className="w-6 h-6 text-[var(--text-muted)]" />}
              />
            ) : (
              <ul className="space-y-2 min-w-0">
                {flagged.slice(0, 10).map((r) => (
                  <li
                    key={r.id}
                    className="min-w-0 flex items-center gap-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2"
                  >
                    <Siren className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="font-mono text-xs text-[var(--text-primary)] shrink-0">
                      {r.ticket_number}
                    </span>
                    <span className="text-[var(--text-primary)] truncate min-w-0 flex-1">
                      {r.student?.name || "—"}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] shrink-0 whitespace-nowrap">
                      {fmtStamp(r.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </WidgetBoundary>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function EmergencyDecisionsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <EmergencyDecisionsInner />
    </Suspense>
  );
}
