"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShieldAlert, ShieldOff, Loader2, Clock, LockKeyhole, UserCheck,
} from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { SectionCard } from "@/components/admin/shared/SectionCard";
import { ConfirmDialog } from "@/components/admin/shared/ConfirmDialog";
import { LockdownCommandCenter } from "@/components/principal/LockdownCommandCenter";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/utils";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { useAuthStore } from "@/stores/authStore";

interface LockdownRuleOut {
  id: string;
  scope_type: string;
  target_values: string[];
  direction: string;
  status: "PENDING_PRINCIPAL" | "ACTIVE" | "LIFTED" | "EXPIRED";
  public_message: string | null;
  expires_at: string | null;
  evacuation: boolean;
  initiated_by?: string | null;
  approved_by?: string | null;
}

const SCOPE_LABEL: Record<string, string> = {
  campus: "Entire campus",
  gate: "Gate(s)",
  role: "Role-wise",
  persona: "Persona",
  department: "Department",
  hostel_block: "Hostel block",
  class_section: "Class / section",
  user: "Individual",
};

/**
 * Admin Lockdown Console — the *initiate + monitor* surface.
 *
 * Authority split: Admin / Supervisor can INITIATE a lockdown request and
 * monitor all active rules, but they CANNOT lift. Lifting an active lockdown
 * is Principal-only (or a delegated Vice-Principal / sysadmin break-glass)
 * and happens on /principal/emergency with a step-up + mandatory reason. This
 * page therefore renders the Lift action as an explicit locked-out badge,
 * never as a working button, for admin/supervisor.
 *
 * No raw UUIDs are rendered: scope is shown as SCOPE_LABEL + a human target
 * summary, never the target_values array.
 */
function AdminLockdownInner() {
  const [rules, setRules] = useState<LockdownRuleOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmBroadcast, setConfirmBroadcast] = useState(false);
  const [draft, setDraft] = useState({
    scopeType: "campus",
    target: "",
    direction: "BOTH",
    message: "",
    expiryMin: 60,
    evacuation: false,
  });

  const role = useAuthStore((s) => s.user?.role ?? "admin");
  // Principal (and sysadmin break-glass) MAY lift; everyone else is locked out.
  const canLift = role === "principal" || role === "sysadmin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/lockdown", { headers: getAuthHeaders() });
      const body = await res.json();
      const list: LockdownRuleOut[] = Array.isArray(body?.data) ? body.data : [];
      setRules(list);
    } catch {
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = rules.filter((r) => r.status === "ACTIVE");
  const pending = rules.filter((r) => r.status === "PENDING_PRINCIPAL");

  const broadcast = async () => {
    setConfirmBroadcast(false);
    setBusy(true);
    try {
      const target_values =
        draft.scopeType === "campus"
          ? []
          : draft.target.split(",").map((s) => s.trim()).filter(Boolean);
      await fetch("/api/admin/lockdown", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          scope_type: draft.scopeType,
          target_values,
          direction: draft.direction,
          public_message: draft.message.trim(),
          expires_at:
            draft.scopeType === "campus"
              ? null
              : new Date(Date.now() + draft.expiryMin * 60_000).toISOString(),
          evacuation: draft.evacuation,
        }),
      });
      await load();
    } catch {
      /* surface via toast elsewhere */
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <ContextSituationBar
          roleLabel="Campus Admin"
          purpose="Initiate + monitor scoped gate lockdowns"
          why="Lockdowns block gate movement instantly. Initiating is Admin; lifting is Principal-only."
          contextLabel="Initiate + monitor scoped gate lockdowns"
          statusSummary="Review active + pending lockdown rules. Lifting lives on the Principal console."
          primaryAction={{ label: "Admin Overview", href: "/admin" }}
        />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Emergency Lockdown"
        subtitle="Initiate + monitor scoped gate lockdowns — lifting is Principal-only"
        onRefresh={load}
      />

      <ContextSituationBar
        roleLabel={role === "principal" ? "Principal" : "Campus Admin"}
        purpose="Initiate + monitor scoped gate lockdowns"
        why="Lockdowns block gate movement instantly. Initiating is Admin; approving + lifting is Principal-only (two-person rule)."
        contextLabel="Lockdown console"
        statusSummary={`${active.length} active · ${pending.length} awaiting Principal approval`}
        severity={active.length ? "critical" : "warn"}
        primaryAction={{ label: "Admin Overview", href: "/admin" }}
        secondaryAction={{ label: "Principal Console", href: "/principal/emergency" }}
      />

      {/* Active rules monitor */}
      <WidgetBoundary title="Active lockdowns">
        {active.length === 0 ? (
          <SectionCard
            title="No active lockdowns"
            description="All gates are in normal operation"
            icon={ShieldOff}
            iconTone="default"
          >
            <p className="text-sm text-text-secondary">
              No scoped lockdown rules are currently enforced. Use the initiate form
              below to raise one.
            </p>
          </SectionCard>
        ) : (
          <div className="space-y-3">
            {active.map((r) => (
              <SectionCard
                key={r.id}
                title={`${SCOPE_LABEL[r.scope_type] ?? r.scope_type} · ${r.direction}`}
                description={humanTargetSummary(r)}
                icon={ShieldAlert}
                iconTone="accent"
              >
                <div className="space-y-3">
                  {r.public_message && (
                    <p className="text-sm text-text-secondary">
                      <strong>Message:</strong> {r.public_message}
                    </p>
                  )}
                  <div className="text-xs text-text-muted flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {r.expires_at
                      ? `Auto-expires ${new Date(r.expires_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
                      : "No auto-expiry (campus-wide)"}
                    {r.evacuation && " · evacuation (OUT allowed, IN blocked)"}
                  </div>

                  {/* Lift authority — the gap the spec calls out. */}
                  {canLift ? (
                    <a
                      href="/principal/emergency"
                      className="surface-card inline-flex items-center gap-2 px-4 py-2.5 bg-action-danger hover:bg-action-danger text-white text-xs font-bold"
                    >
                      <LockKeyhole className="w-4 h-4" /> Lift / Override →
                    </a>
                  ) : (
                    <div className="surface-card bg-amber-500/10 p-3 text-xs text-amber-700/90 flex items-start gap-2.5">
                      <LockKeyhole className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Locked — Principal approval required to lift.</strong>{" "}
                        Admins and Supervisors can initiate + monitor, but only the
                        Principal (or a delegated Vice-Principal) can lift an active
                        lockdown. Use{" "}
                        <a className="underline" href="/principal/emergency">
                          the Principal console
                        </a>{" "}
                        to approve pending requests or lift active ones.
                      </span>
                    </div>
                  )}
                </div>
              </SectionCard>
            ))}
          </div>
        )}
      </WidgetBoundary>

      {/* Full-context command center: when each scope was locked, elapsed +
          auto-expiry, Inside/Outside affected split, live blocked-scan attempts
          (who tried to cross, how many times, which gate), repeat-offender
          highlight, and the unacknowledged-alert badge. Read-only telemetry —
          the Lift authority stays with the Principal console. */}
      <LockdownCommandCenter />

      {/* Pending Principal-approval (two-person sign-off) */}
      {pending.length > 0 && (
        <WidgetBoundary title="Awaiting Principal approval">
          <SectionCard
            title={`${pending.length} request${pending.length === 1 ? "" : "s"} pending co-sign`}
            description="Campus-wide requests from Admin/Supervisor park here until the Principal approves them."
            icon={UserCheck}
            iconTone="accent"
          >
            <ul className="space-y-2">
              {pending.map((r) => (
                <li key={r.id} className="text-sm text-text-secondary">
                  <span className="font-medium text-text-primary">
                    {SCOPE_LABEL[r.scope_type] ?? r.scope_type} · {r.direction}
                  </span>
                  {r.public_message && ` — ${r.public_message}`}
                </li>
              ))}
            </ul>
          </SectionCard>
        </WidgetBoundary>
      )}

      {/* Initiate form */}
      <WidgetBoundary title="Initiate a lockdown">
        <SectionCard
          title="New lockdown rule"
          description="Scoped rules are time-boxed; campus-wide rules from this role require Principal sign-off"
          icon={ShieldAlert}
          iconTone="accent"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label>
                <span className="text-xs font-semibold text-text-secondary block mb-1">Scope</span>
                <select
                  value={draft.scopeType}
                  onChange={(e) => setDraft((d) => ({ ...d, scopeType: e.target.value }))}
                  className="surface-card w-full px-3 py-2.5 bg-bg-elevated text-sm text-text-primary"
                >
                  {Object.entries(SCOPE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-xs font-semibold text-text-secondary block mb-1">Direction</span>
                <select
                  value={draft.direction}
                  onChange={(e) => setDraft((d) => ({ ...d, direction: e.target.value }))}
                  className="surface-card w-full px-3 py-2.5 bg-bg-elevated text-sm text-text-primary"
                >
                  <option value="BOTH">Both IN + OUT</option>
                  <option value="IN">IN (entry) only</option>
                  <option value="OUT">OUT (exit) only</option>
                </select>
              </label>
              {draft.scopeType !== "campus" && (
                <label>
                  <span className="text-xs font-semibold text-text-secondary block mb-1">
                    Auto-expiry (minutes)
                  </span>
                  <input
                    type="number"
                    min={5}
                    value={draft.expiryMin}
                    onChange={(e) => setDraft((d) => ({ ...d, expiryMin: Number(e.target.value) || 0 }))}
                    className="surface-card w-full px-3 py-2.5 bg-bg-elevated text-sm text-text-primary"
                  />
                </label>
              )}
            </div>
            {draft.scopeType !== "campus" && (
              <label>
                <span className="text-xs font-semibold text-text-secondary block mb-1">
                  Targets ({SCOPE_LABEL[draft.scopeType]}) — comma-separated
                </span>
                <input
                  type="text"
                  value={draft.target}
                  onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))}
                  placeholder="e.g. Boys Block 2 / visitor / CSE / 3-B"
                  className="surface-card w-full px-3 py-2.5 bg-bg-elevated text-sm text-text-primary"
                />
              </label>
            )}
            <label>
              <span className="text-xs font-semibold text-text-secondary block mb-1">
                Public message (shown to operators + affected users)
              </span>
              <input
                type="text"
                value={draft.message}
                onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                placeholder="e.g. Gate exit restricted for hostel block B until 06:00 — Principal office"
                className="surface-card w-full px-3 py-2.5 bg-bg-elevated text-sm text-text-primary"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={draft.evacuation}
                onChange={(e) => setDraft((d) => ({ ...d, evacuation: e.target.checked }))}
                className="accent-action-danger"
              />
              Evacuation mode — allow OUT (egress) while blocking IN
            </label>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setConfirmBroadcast(true)}
                disabled={
                  busy ||
                  !draft.message.trim() ||
                  (draft.scopeType !== "campus" && (!draft.target.trim() || !draft.expiryMin))
                }
                className="surface-card px-5 py-2.5 bg-action-danger hover:bg-action-danger text-white text-xs font-bold disabled:opacity-50 inline-flex items-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                Initiate lockdown
              </button>
            </div>
          </div>
        </SectionCard>
      </WidgetBoundary>

      <ConfirmDialog
        open={confirmBroadcast}
        onClose={() => setConfirmBroadcast(false)}
        title="Initiate lockdown?"
        body={`A ${SCOPE_LABEL[draft.scopeType] ?? draft.scopeType} lockdown (${draft.direction}) will take effect. ${
          draft.scopeType === "campus" && role !== "principal"
            ? "Campus-wide requests from this role require Principal sign-off before they are enforced."
            : "This action is audited."
        }`}
        confirmText="Initiate"
        variant="destructive"
        onConfirm={() => { void broadcast(); }}
      />
    </div>
  );
}

/** Human summary of a rule's targets — never the raw UUID array. For
 *  `user`-scoped rules the targets ARE user UUIDs, which are sysadmin-only,
 *  so they are deliberately omitted (shown as a count, not the values). */
function humanTargetSummary(r: LockdownRuleOut): string {
  if (r.scope_type === "campus") return "Applies to the entire campus";
  if (r.target_values.length === 0) return "No targets recorded";
  if (r.scope_type === "user") {
    // Never render the target user UUIDs on a non-sysadmin screen.
    return `Target: ${r.target_values.length} individual${r.target_values.length === 1 ? "" : "s"} (sysadmin-only detail)`;
  }
  const humanized = r.target_values.slice(0, 6).join(", ");
  const more = r.target_values.length > 6 ? ` +${r.target_values.length - 6} more` : "";
  return `Target: ${humanized}${more}`;
}

export default function AdminLockdownPage() {
  return (
    <AdminLockdownInner />
  );
}
