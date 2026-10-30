"use client";

import { useCallback, useState } from "react";
import { RefreshCw, UserCog, Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { PrincipalWidgetBoundary } from "@/components/principal/shared/PrincipalWidgetBoundary";
import { usePolling } from "@/hooks/usePolling";
import { useApiResource } from "@/hooks/useApiResource";
import { useUIStore } from "@/stores/uiStore";
import { getAuthHeaders } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface DelegationRule {
  id: string;
  name: string;
  workflowType: string;
  reason?: string | null;
  delegateRole: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

export interface DelegationRulesResponse {
  success: boolean;
  data?: { rules?: DelegationRule[] };
  error?: { message?: string };
}

/**
 * DelegationForm — form to create a delegation rule.
 * POST /api/admin/delegation-rules.
 */
export function DelegationForm({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const addToast = useUIStore((s) => s.addToast);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    workflowType: "hostel",
    reason: "",
    delegateRole: "vice_principal",
    priority: 0,
  });

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.name.trim() || !form.delegateRole.trim()) {
        addToast({ message: "Name and delegate role required.", variant: "error" });
        return;
      }
      setSubmitting(true);
      try {
        const res = await fetch("/api/admin/delegation-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({
            name: form.name.trim(),
            workflowType: form.workflowType,
            reason: form.reason.trim() || undefined,
            delegateRole: form.delegateRole,
            priority: form.priority,
          }),
        });
        const json = await res.json();
        if (json.success) {
          addToast({ message: "Delegation rule created.", variant: "success" });
          setForm({ name: "", workflowType: "hostel", reason: "", delegateRole: "vice_principal", priority: 0 });
          onCreated?.();
        } else {
          addToast({ message: json.error?.message || "Failed to create rule.", variant: "error" });
        }
      } catch (err: unknown) {
        addToast({ message: err instanceof Error ? err.message : "Network error", variant: "error" });
      } finally {
        setSubmitting(false);
      }
    },
    [form, addToast, onCreated],
  );

  return (
    <PrincipalWidgetBoundary title="Create Delegation Rule">
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label htmlFor="dlg-name" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
            Name *
          </label>
          <input
            id="dlg-name"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Exam delegation"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </div>
        <div>
          <label htmlFor="dlg-workflow" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
            Workflow
          </label>
          <select
            id="dlg-workflow"
            value={form.workflowType}
            onChange={(e) => setForm((f) => ({ ...f, workflowType: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            {["hostel", "exam", "gate", "memo", "staff_leave"].map((w) => (
              <option key={w} value={w}>{w.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dlg-role" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
            Delegate Role *
          </label>
          <select
            id="dlg-role"
            value={form.delegateRole}
            onChange={(e) => setForm((f) => ({ ...f, delegateRole: e.target.value }))}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            {["vice_principal", "hod", "supervisor", "oie", "hostel_manager"].map((r) => (
              <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dlg-priority" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
            Priority
          </label>
          <input
            id="dlg-priority"
            type="number"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <label htmlFor="dlg-reason" className="block text-xs font-semibold text-[var(--text-muted)] mb-1">
            Reason (optional)
          </label>
          <input
            id="dlg-reason"
            type="text"
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="Why is this delegation needed?"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Saving…" : <><Plus className="w-4 h-4" /> Create Rule</>}
          </button>
        </div>
      </form>
    </PrincipalWidgetBoundary>
  );
}

/**
 * DelegationCard — displays a single delegation rule.
 */
export function DelegationCard({ rule }: { rule: DelegationRule }) {
  return (
    <div className={`rounded-xl border p-3 min-w-0 ${
      rule.isActive
        ? "border-emerald-400/20 bg-emerald-400/5"
        : "border-[var(--border)] bg-[var(--bg-surface)] opacity-60"
    }`}>
      <div className="flex items-center justify-between min-w-0">
        <span className="font-semibold text-sm text-[var(--text-primary)]">{rule.name}</span>
        {rule.isActive ? (
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        )}
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-0.5">
        {rule.workflowType.replace(/_/g, " ")} → {rule.delegateRole.replace(/_/g, " ")}
        {rule.reason ? ` · ${rule.reason}` : ""}
      </p>
      <p className="text-[10px] text-[var(--text-muted)] mt-1">Priority {rule.priority}</p>
    </div>
  );
}

/**
 * DelegationConflictNotice — shown when creating a rule that conflicts with an existing active rule.
 */
export function DelegationConflictNotice({ ruleName }: { ruleName: string }) {
  return (
    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>
        A delegation rule already exists for <strong>{ruleName}</strong>. Consider whether this new rule should override or replace it.
      </span>
    </div>
  );
}

/**
 * DelegationHistory — shows the audit log for delegation rules from /api/principal/delegations.
 */
export function DelegationHistory() {
  interface AuditRow {
    id: string;
    action: string;
    user_name?: string | null;
    details?: Record<string, unknown>;
    timestamp: string;
  }
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  usePolling(
    async () => {
      try {
        const res = await fetch("/api/principal/delegations?status=ALL");
        const json = await res.json();
        if (json.success && json.data?.auditTrail) {
          setAudit(json.data.auditTrail as AuditRow[]);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    { intervalMs: 60_000 },
  );

  return (
    <PrincipalWidgetBoundary title="Delegation History">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : audit.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-3 text-center">No delegation history recorded.</p>
        ) : (
          <ul className="space-y-2">
            {audit.slice(0, 12).map((a) => (
              <li key={a.id} className="flex items-start gap-2 text-xs">
                <span className="font-mono text-[var(--text-muted)] shrink-0 mt-0.5">{a.action.replace(/_/g, " ")}</span>
                <span className="text-[var(--text-secondary)] flex-1 min-w-0">
                  {a.user_name && <span className="font-medium">{a.user_name}</span>}
                </span>
                <span className="text-[var(--text-muted)] shrink-0">{a.timestamp}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PrincipalWidgetBoundary>
  );
}
