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
  UserCog,
  Plus,
  ScrollText,
  AlertTriangle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGuard } from "@/components/shared/AuthGuard";

interface Delegation {
  id: string;
  delegate_role: string;
  scope: string;
  starts_at: string;
  expires_at: string;
  status: string;
  note: string | null;
  created_at: string;
}

interface DelegationAuditRow {
  id: string;
  action: string;
  user_name: string | null;
  details: Record<string, unknown>;
  timestamp: string;
}

interface DelegationsResponse {
  success: boolean;
  data?: {
    delegations?: Delegation[];
    auditTrail?: DelegationAuditRow[];
  };
  error?: { message?: string };
}

interface CreateForm {
  delegate_role: string;
  delegate_user_id: string;
  scope: string;
  expires_at: string;
  note: string;
}

const DELEGATE_ROLES = [
  "vice_principal",
  "hod",
  "supervisor",
  "oie",
  "hostel_manager",
] as const;

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

function isExpired(d: Delegation): boolean {
  return d.expires_at ? new Date(d.expires_at).getTime() < Date.now() : false;
}

function DelegationManagerInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);
  const addToast = useUIStore((s) => s.addToast);

  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    delegate_role: "vice_principal",
    delegate_user_id: "",
    scope: "Exam approvals",
    expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    note: "",
  });

  const { data, loading, error, refresh } = useApiResource<DelegationsResponse>(
    user ? "/api/principal/delegations?status=ALL" : null,
    { enabled: !!user, ttlMs: 15_000 }
  );

  usePolling(refresh, { intervalMs: 60_000, enabled: !!user && !creating });

  const manualRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const delegations = data?.data?.delegations ?? [];
  const auditTrail = data?.data?.auditTrail ?? [];
  const active = delegations.filter((d) => d.status === "ACTIVE" && !isExpired(d));
  const expired = delegations.filter((d) => d.status === "ACTIVE" && isExpired(d));

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (form.scope.trim().length < 2) {
        addToast({ message: "Scope is required (min 2 characters).", variant: "error" });
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch("/api/principal/delegations", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({
            delegate_role: form.delegate_role,
            delegate_user_id: form.delegate_user_id.trim() || undefined,
            scope: form.scope.trim(),
            expires_at: form.expires_at || undefined,
            note: form.note.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (json.success) {
          addToast({ message: "Delegation recorded and audit-logged.", variant: "success" });
          setCreating(false);
          void refresh();
        } else {
          addToast({
            message: json.error?.message || "Failed to record delegation",
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
    [form, addToast, refresh]
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
            Signed in as <span className="font-mono">{role}</span> · tier {tier} · delegation of authority
          </p>
        </div>
        <button
          type="button"
          onClick={() => void manualRefresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Create delegation */}
      <WidgetBoundary title="Create Delegation">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
          {!creating ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
            >
              <Plus className="w-4 h-4" /> Delegate authority
            </button>
          ) : (
            <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0">
              <div>
                <label htmlFor="dlg-role" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  Acting authority
                </label>
                <select
                  id="dlg-role"
                  value={form.delegate_role}
                  onChange={(e) => setForm((f) => ({ ...f, delegate_role: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
                >
                  {DELEGATE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dlg-user" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  Specific user (optional)
                </label>
                <input
                  id="dlg-user"
                  type="text"
                  value={form.delegate_user_id}
                  onChange={(e) => setForm((f) => ({ ...f, delegate_user_id: e.target.value }))}
                  placeholder="User ID"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div>
                <label htmlFor="dlg-scope" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  Scope <span className="text-rose-400">*</span>
                </label>
                <input
                  id="dlg-scope"
                  type="text"
                  required
                  minLength={2}
                  value={form.scope}
                  onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                  placeholder="e.g. Hostel outpasses, exam sign-off"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div>
                <label htmlFor="dlg-expiry" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  Expiry
                </label>
                <input
                  id="dlg-expiry"
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="dlg-note" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
                  Audit note (optional)
                </label>
                <input
                  id="dlg-note"
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Why is this delegation needed?"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Recording…" : "Record delegation"}
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  disabled={submitting}
                  className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </WidgetBoundary>

      {/* Active / expired delegations */}
      <WidgetBoundary title="Delegation Register">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
          {loading && delegations.length === 0 ? (
            <div className="space-y-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <EmptyState
              title="Delegation backend pending"
              description={error}
              icon={<AlertTriangle className="w-6 h-6 text-amber-400" />}
              action={
                <button
                  type="button"
                  onClick={() => void manualRefresh()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              }
            />
          ) : delegations.length === 0 ? (
            <EmptyState
              title="No delegations on file"
              description="Record your first delegation of authority above. Every entry is written to the audit log."
              icon={<UserCog className="w-6 h-6 text-[var(--text-muted)]" />}
              action={
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
                >
                  <Plus className="w-3 h-3" /> New delegation
                </button>
              }
            />
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
                  Active ({active.length})
                </h3>
                {active.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No active delegations.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {active.map((d) => (
                      <div key={d.id} className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <UserCog className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-sm font-semibold text-[var(--text-primary)] capitalize truncate">
                            {d.delegate_role.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">{d.scope}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-2">
                          Valid through {fmtDate(d.expires_at)}
                          {d.note ? ` · ${d.note}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {expired.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-rose-400 mb-2">
                    Expired ({expired.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {expired.map((d) => (
                      <div key={d.id} className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 min-w-0">
                        <span className="text-sm font-semibold text-[var(--text-primary)] capitalize">
                          {d.delegate_role.replace(/_/g, " ")}
                        </span>
                        <p className="text-xs text-[var(--text-muted)] mt-1 line-through">{d.scope}</p>
                        <p className="text-[10px] text-rose-400 mt-2">Expired {fmtDate(d.expires_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* Delegation audit trail */}
      <WidgetBoundary title="Delegation Audit Trail">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
          {auditTrail.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-3 text-center">
              No delegation events recorded yet.
            </p>
          ) : (
            <ul className="space-y-2 min-w-0">
              {auditTrail.slice(0, 12).map((a) => (
                <li key={a.id} className="min-w-0 flex items-start gap-2 text-xs">
                  <ScrollText className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[var(--text-primary)]">
                      <span className="font-semibold">{a.action.replace(/_/g, " ")}</span>
                      {a.user_name ? <span className="text-[var(--text-muted)]"> · {a.user_name}</span> : null}
                    </p>
                    <p className="text-[var(--text-muted)] mt-0.5 truncate">
                      {typeof a.details?.scope === "string" ? `${a.details.scope} — ` : ""}
                      {a.timestamp}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}
export default function DelegationManagerPage() {
  return (
    <AuthGuard allowedRoles={['principal', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <DelegationManagerInner />
      </Suspense>
    </AuthGuard>
  );
}
