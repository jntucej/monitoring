"use client";

/**
 * StepUpModal — the mandatory two-person quorum sign-off gate for the
 * Principal dashboard. A high-risk action (publish a regulation, edit
 * DEBARRED, trigger a lockdown, edit governance_matrix, activate a leave
 * delegate) cannot execute without:
 *   1. A 6-digit step-up confirmation (mock TOTP/Passkey slot).
 *   2. A typed action confirmation (type the action key to arm the button).
 *   3. The co-approver's second signature (simulated by the harness, or a
 *      real co-sign via /api/principal/quorum/sign).
 *
 * Zero hardcoding: the required co-approver roles come from the live
 * governance_matrix via catalog.principalOsPolicy. The Immutable Meta-Rule
 * (editing the governance_matrix itself) always shows an unbypassable
 * "Requires Principal + Sysadmin Quorum" alert.
 */
import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InputOTP } from "@/components/ui/input-otp";
import { ShieldCheck, UserCheck, Lock, AlertTriangle } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { invalidateApiCache } from "@/hooks/useApiResource";

export interface StepUpModalProps {
  open: boolean;
  onClose: () => void;
  /** The governance_matrix action_key being signed. */
  actionKey: string;
  /** Human-readable label for the confirmation prompt. */
  label?: string;
  /** Required co-approver roles, read live from catalog (never hardcoded). */
  requiredRoles: string[];
  /** Immutable Meta-Rule: this action governs the governance_matrix itself. */
  isImmutableMetaRule?: boolean;
  /** The concrete request to co-sign (if any). */
  requestId?: string;
  domain?: string;
  key?: string;
  action?: "publish" | "rollback" | "sign";
  onSigned?: (res: Record<string, unknown>) => void;
}

export function StepUpModal({
  open,
  onClose,
  actionKey,
  label,
  requiredRoles,
  isImmutableMetaRule,
  requestId,
  domain,
  key,
  action = "sign",
  onSigned,
}: StepUpModalProps) {
  const [otp, setOtp] = useState("");
  const [typed, setTyped] = useState("");
  const [coSigned, setCoSigned] = useState(false);
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const armed = otp.length === 6 && typed.trim().toLowerCase() === actionKey.toLowerCase();
  const canSign = armed && coSigned && !signing;

  const waitingRoles = useMemo(
    () => requiredRoles.filter((r) => !coSigned),
    [requiredRoles, coSigned],
  );

  const close = () => {
    setOtp("");
    setTyped("");
    setCoSigned(false);
    setDone(false);
    setError(null);
    onClose();
  };

  const simulateCoSign = () => setCoSigned(true);

  const sign = async () => {
    if (!canSign) return;
    setSigning(true);
    setError(null);
    try {
      const res = await fetch(
        action === "publish" || action === "rollback"
          ? "/api/principal/policy/publish-or-rollback"
          : "/api/principal/quorum/sign",
        {
          method: "POST",
          credentials: "include",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            action,
            action_key: actionKey,
            subject: label ?? actionKey,
            step_up_token: otp,
            co_approver_id: `co:${requiredRoles[0] ?? "sysadmin"}`,
            co_approver_role: requiredRoles[0] ?? "sysadmin",
            retroactive: isImmutableMetaRule,
            request_id: requestId,
            domain,
            key,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
      }
      setDone(true);
      invalidateApiCache("/api/config/catalog");
      onSigned?.(json.data ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSigning(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={close} size="md" title="Step-Up · Two-Person Quorum">
      <div className="space-y-4">
        {isImmutableMetaRule && (
          <div className="flex items-start gap-2 rounded-md border border-action-danger/40 bg-action-danger/10 p-3 text-xs text-action-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong>Immutable Meta-Rule:</strong> this action governs the governance
              matrix itself. It always requires a Principal + Sysadmin two-person quorum
              and cannot be downgraded.
            </span>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 text-action-primary" />
            {label ?? actionKey}
          </div>
          <p className="text-xs text-text-secondary">
            Required co-approver roles:{" "}
            {requiredRoles.length ? requiredRoles.join(" + ") : "none (1-click)"}
          </p>
        </div>

        {/* 1) 6-digit step-up */}
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Step-up confirmation</label>
          <InputOTP value={otp} onChange={setOtp} maxLength={6}>
            <InputOTP.Group>
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTP.Slot key={i} index={i} />
              ))}
            </InputOTP.Group>
          </InputOTP>
        </div>

        {/* 2) typed confirmation */}
        <div>
          <label className="mb-1 block text-xs text-text-secondary">
            Type <code className="rounded bg-bg-elevated px-1 text-[11px]">{actionKey}</code> to confirm
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={actionKey}
            className="w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-focus-ring"
          />
        </div>

        {/* 3) co-approver status pill */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={coSigned ? "success" : "dayout"}>
            <UserCheck className="mr-1 size-3" />
            {coSigned ? "Co-signature captured" : `Waiting for Co-Approver: ${waitingRoles.join(" / ") || "—"}`}
          </Badge>
          {!coSigned && (
            <Button size="sm" variant="secondary" onPress={simulateCoSign}>
              Simulate 2nd signature
            </Button>
          )}
        </div>

        {done ? (
          <div className="flex items-center gap-2 rounded-md border border-action-primary/40 bg-action-primary/10 p-3 text-xs text-action-primary">
            <ShieldCheck className="size-4" /> Signed &amp; recorded to the immutable audit trail.
          </div>
        ) : error ? (
          <div className="rounded-md border border-action-danger/40 bg-action-danger/10 p-3 text-xs text-action-danger">{error}</div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onPress={close}>Cancel</Button>
          <Button size="sm" disabled={!canSign} isPending={signing} onPress={sign}>
            <Lock className="size-4" /> Sign off
          </Button>
        </div>
      </div>
    </Modal>
  );
}
