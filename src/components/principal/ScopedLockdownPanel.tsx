"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { useApiResource } from "@/hooks/useApiResource";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { StepUpModal } from "@/components/shared/StepUpModal";
import { ShieldAlert, CheckCircle2, Clock3, Ban, ShieldQuestion } from "lucide-react";

/**
 * ScopedLockdownPanel — the Principal-facing lockdown control surface.
 *
 *   · Builder: pick a scope (campus / gate / role / persona / department /
 *     hostel_block / class_section / user), direction, expiry, and a
 *     human-safe public message → POST /api/admin/lockdown. The server decides
 *     the status by role (principal → ACTIVE; admin/supervisor campus →
 *     PENDING_PRINCIPAL).
 *   · Pending list: PENDING_PRINCIPAL rules the Principal can approve
 *     (PATCH, step-up) — the two-person sign-off.
 *   · Active list: ACTIVE rules the Principal can lift (DELETE, step-up +
 *     reason) — the Principal-only override/removal.
 *
 * Every rendered identifier is human-labeled (scope_type + human_label); raw
 * target_values UUIDs are never printed on this non-sysadmin surface.
 */

interface LockdownRuleOut {
  id: string;
  scope_type: string;
  target_values: string[];
  direction: string;
  status: string;
  public_message: string | null;
  expires_at: string | null;
  evacuation: boolean;
  initiated_by?: string | null;
  approved_by?: string | null;
}

const SCOPE_OPTIONS: SelectOption[] = [
  { value: "campus", label: "Campus (entire)" },
  { value: "gate", label: "Gate(s)" },
  { value: "role", label: "Role-wise" },
  { value: "persona", label: "Persona (hosteller / day-scholar)" },
  { value: "department", label: "Department" },
  { value: "hostel_block", label: "Hostel block" },
  { value: "class_section", label: "Class / section" },
  { value: "user", label: "Single user" },
];

const DIRECTION_OPTIONS: SelectOption[] = [
  { value: "BOTH", label: "Both IN and OUT" },
  { value: "IN", label: "IN (entry) only" },
  { value: "OUT", label: "OUT (exit) only" },
];

const SCOPE_HUMAN: Record<string, string> = {
  campus: "Entire campus",
  gate: "Gate(s)",
  role: "Role",
  persona: "Persona",
  department: "Department",
  hostel_block: "Hostel block",
  class_section: "Class / section",
  user: "Individual",
};

export function ScopedLockdownPanel() {
  const { data, refresh } = useApiResource<{ success: boolean; data: LockdownRuleOut[] }>(
    "/api/admin/lockdown",
    { ttlMs: 15_000 },
  );
  const { request } = useApi();

  const rules = data?.data ?? [];
  const active = rules.filter((r) => r.status === "ACTIVE");
  const pending = rules.filter((r) => r.status === "PENDING_PRINCIPAL");
  const expired = rules.filter((r) => r.status === "EXPIRED");

  // Builder state
  const [scopeType, setScopeType] = useState("campus");
  const [direction, setDirection] = useState("BOTH");
  const [targets, setTargets] = useState("");
  const [message, setMessage] = useState("");
  const [expiryMinutes, setExpiryMinutes] = useState(60);
  const [evacuation, setEvacuation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Lift state
  const [liftingId, setLiftingId] = useState<string | null>(null);
  const [liftReason, setLiftReason] = useState("");
  const [liftBusy, setLiftBusy] = useState(false);
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [pendingLift, setPendingLift] = useState<{ id: string; reason: string } | null>(null);

  // Approve state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveBusy, setApproveBusy] = useState(false);

  const needsTargets = scopeType !== "campus";

  async function onCreate() {
    setBusy(true);
    setFormError(null);
    const target_values = needsTargets ? targets.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const expires_at = new Date(Date.now() + expiryMinutes * 60_000).toISOString();
    const res = await request<{ id: string }>(
      "/api/admin/lockdown",
      {
        method: "POST",
        body: JSON.stringify({
          scope_type: scopeType,
          target_values,
          direction,
          public_message: message.trim(),
          expires_at: scopeType === "campus" ? null : expires_at,
          evacuation,
        }),
      },
    );
    setBusy(false);
    if (res.success) {
      setMessage("");
      setTargets("");
      void refresh();
    } else {
      setFormError(res.error ?? "Failed to issue lockdown");
    }
  }

  async function onApprove(id: string) {
    setApprovingId(id);
    setApproveBusy(true);
    const res = await request<{ id: string }>(
      "/api/admin/lockdown",
      { method: "PATCH", body: JSON.stringify({ id }) },
    );
    setApproveBusy(false);
    setApprovingId(null);
    if (res.success) {
      void refresh();
    } else if (res.code === "STEP_UP_REQUIRED") {
      setStepUpOpen(true);
    }
  }

  async function doLift(id: string, reason: string): Promise<boolean> {
    const res = await request<{ id: string }>(
      "/api/admin/lockdown",
      { method: "DELETE", body: JSON.stringify({ id, lift_reason: reason }) },
    );
    if (res.success) {
      setLiftingId(null);
      setLiftReason("");
      void refresh();
      return true;
    }
    if (res.code === "STEP_UP_REQUIRED") {
      setPendingLift({ id, reason });
      setStepUpOpen(true);
    }
    return false;
  }

  async function onLiftConfirm() {
    if (!liftingId || !liftReason.trim()) return;
    setLiftBusy(true);
    const ok = await doLift(liftingId, liftReason.trim());
    setLiftBusy(false);
    if (!ok && !(pendingLift && stepUpOpen)) {
      // Keep the reason modal open on non-step-up failures.
    }
  }

  function onStepUpSuccess() {
    setStepUpOpen(false);
    if (pendingLift) {
      void doLift(pendingLift.id, pendingLift.reason);
      setPendingLift(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Builder ─────────────────────────────────────────────── */}
      <section className="surface-card p-4">
        <header className="mb-3 flex items-center gap-2">
          <ShieldAlert className="size-4 text-action-danger" aria-hidden />
          <h3 className="text-sm font-semibold text-text-primary">Issue a scoped lockdown</h3>
        </header>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="mb-1 block text-xs font-medium text-text-secondary">Scope</span>
            <Select
              options={SCOPE_OPTIONS}
              value={scopeType}
              onChange={setScopeType}
              aria-label="Lockdown scope"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-medium text-text-secondary">Direction</span>
            <Select
              options={DIRECTION_OPTIONS}
              value={direction}
              onChange={setDirection}
              aria-label="Lockdown direction"
            />
          </div>
          {needsTargets && (
            <Input
              label={`Targets (${SCOPE_HUMAN[scopeType] ?? scopeType}) — comma-separated`}
              placeholder={scopeTargetPlaceholder(scopeType)}
              value={targets}
              onChange={(e) => setTargets(e.target.value)}
            />
          )}
          <Input
            label="Public message (shown to operators & affected users)"
            placeholder="e.g. Gate exit restricted for hostel block B until 06:00 — issued by Principal office"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {scopeType !== "campus" && (
            <Input
              label="Auto-expiry (minutes)"
              type="number"
              min={5}
              value={expiryMinutes}
              onChange={(e) => setExpiryMinutes(Number(e.target.value) || 0)}
            />
          )}
          <label className="flex items-center gap-2 text-sm text-text-secondary sm:col-span-2">
            <input
              type="checkbox"
              checked={evacuation}
              onChange={(e) => setEvacuation(e.target.checked)}
              className="accent-action-danger"
            />
            Evacuation mode — allow OUT (egress) while blocking IN
          </label>
        </div>
        {formError && <p className="mt-2 text-xs text-action-danger">{formError}</p>}
        <div className="mt-3 flex justify-end">
          <Button
            variant="danger"
            loading={busy}
            onClick={onCreate}
            disabled={
              busy ||
              !message.trim() ||
              (needsTargets && !targets.trim()) ||
              (scopeType !== "campus" && !expiryMinutes)
            }
          >
            Issue lockdown
          </Button>
        </div>
      </section>

      {/* ── Pending approval (two-person sign-off) ──────────────── */}
      {pending.length > 0 && (
        <section className="surface-card p-4 border-l-4 border-l-action-warning">
          <header className="mb-2 flex items-center gap-2">
            <Clock3 className="size-4 text-action-warning" aria-hidden />
            <h3 className="text-sm font-semibold">Awaiting your approval ({pending.length})</h3>
          </header>
          <p className="mb-3 text-xs text-text-muted">
            An Admin or Supervisor requested a campus-wide lockdown. As Principal, you co-sign it
            before it takes effect.
          </p>
          <ul className="space-y-2">
            {pending.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg bg-bg-surface/50 p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {SCOPE_HUMAN[r.scope_type] ?? r.scope_type} · {r.direction}
                  </p>
                  <p className="truncate text-xs text-text-muted">{r.public_message}</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  loading={approveBusy && approvingId === r.id}
                  onClick={() => onApprove(r.id)}
                >
                  <CheckCircle2 className="size-3.5" /> Approve
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Active rules (Principal-only lift) ──────────────────── */}
      <section className="surface-card p-4">
        <header className="mb-2 flex items-center gap-2">
          <ShieldQuestion className="size-4 text-action-danger" aria-hidden />
          <h3 className="text-sm font-semibold">Active lockdowns ({active.length})</h3>
        </header>
        {active.length === 0 && (
          <p className="text-xs text-text-muted">No active lockdown rules.</p>
        )}
        <ul className="space-y-2">
          {active.map((r) => (
            <li key={r.id} className="rounded-lg bg-bg-surface/50 p-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    {SCOPE_HUMAN[r.scope_type] ?? r.scope_type} · {r.direction}
                    {r.evacuation && " · evacuation"}
                  </p>
                  <p className="truncate text-xs text-text-muted">{r.public_message}</p>
                  <p className="mt-0.5 text-[11px] text-text-muted">
                    {r.expires_at
                      ? `Auto-expires ${new Date(r.expires_at).toLocaleString()}`
                      : "No auto-expiry"}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setLiftingId(r.id); setLiftReason(""); }}>
                  <Ban className="size-3.5" /> Lift
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {expired.length > 0 && (
          <p className="mt-2 text-[11px] text-text-muted">
            {expired.length} rule{expired.length === 1 ? "" : "s"} auto-expired and are no longer enforced.
          </p>
        )}
      </section>

      {/* Lift reason modal */}
      <Modal
        isOpen={liftingId !== null}
        onClose={() => { setLiftingId(null); setLiftReason(""); }}
        title="Lift lockdown"
      >
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Only the Principal (or a delegated Vice-Principal) may lift an active lockdown. A
            reason is mandatory and is recorded to the audit trail.
          </p>
          <Input
            label="Lift reason (required)"
            value={liftReason}
            onChange={(e) => setLiftReason(e.target.value)}
            placeholder="e.g. Evacuation complete, all students accounted for"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setLiftingId(null); setLiftReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={liftBusy}
              disabled={!liftReason.trim()}
              onClick={onLiftConfirm}
            >
              <Ban className="size-3.5" /> Lift lockdown
            </Button>
          </div>
        </div>
      </Modal>

      {/* Step-up verification (lift / approve) */}
      <StepUpModal open={stepUpOpen} onClose={() => setStepUpOpen(false)} onSuccess={onStepUpSuccess} />
    </div>
  );
}

function scopeTargetPlaceholder(scope: string): string {
  switch (scope) {
    case "gate": return "gate ids or codes — e.g. Main, Back";
    case "role": return "e.g. visitor, student, faculty";
    case "persona": return "hosteller, day_scholar";
    case "department": return "e.g. CSE, IT, MECH";
    case "hostel_block": return "e.g. Boys Block 2";
    case "class_section": return "e.g. 3-B, 2-A";
    case "user": return "user id(s) / roll number(s)";
    default: return "target value(s)";
  }
}
