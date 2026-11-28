/**
 * Rule-based lockdown persistence.
 *
 * Lockdowns live in the generic `lockdown_broadcasts` table (CEJ-96 stub:
 * id + data JSONB + timestamps). This module writes the *extended* JSONB
 * payload so a rule can target any of the eight scope types with direction
 * control, time-boxed expiry, two-person approval state, and audit trails —
 * without a schema migration on the shared stub table.
 *
 * Authority model enforced by the API layer (route.ts):
 *   - principal creates → status ACTIVE immediately (approved_by = self)
 *   - admin/supervisor campus-wide → status PENDING_PRINCIPAL (co-sign)
 *   - admin/supervisor narrow holds → ACTIVE but time-boxed
 *   - lift: only principal / delegated vice_principal / sysadmin break-glass
 */
import { getSupabaseServiceClient } from "./dbClient";
import { addAudit } from "./db";
import type {
  LockdownScopeType,
  LockdownDirection,
  LockdownStatus,
} from "@/server/policy/lockdown";

export interface CreateLockdownInput {
  scope_type: LockdownScopeType;
  target_values: string[];
  direction: LockdownDirection;
  /** Human-safe message shown to operators & affected users (no UUIDs). */
  public_message: string;
  /** Initiator (admin/supervisor/principal) userId. */
  initiated_by: string;
  initiator_role: string;
  /** ISO timestamp; auto-expiry. Required for narrow holds; optional campus. */
  expires_at: string | null;
  evacuation?: boolean;
}

export interface LockdownRow {
  id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Persist a new lockdown rule. The `status` is decided by the caller
 * (route.ts) based on the authority split: ACTIVE for principal-initiated,
 * PENDING_PRINCIPAL for admin/supervisor campus-wide requests.
 */
export async function createLockdownRule(
  input: CreateLockdownInput,
  status: LockdownStatus,
  approvedBy: string | null,
): Promise<LockdownRow | null> {
  const service = getSupabaseServiceClient();
  const issuedAt = new Date().toISOString();
  const data = {
    // Legacy fields (kept so old readers still work)
    scopes: input.scope_type === "campus" ? [] : input.target_values,
    message: input.public_message,
    issued_by: input.initiated_by,
    issued_at: issuedAt,
    // New rule fields
    scope_type: input.scope_type,
    target_values: input.scope_type === "campus" ? [] : input.target_values,
    direction: input.direction,
    status,
    public_message: input.public_message,
    initiated_by: input.initiated_by,
    initiated_role: input.initiator_role,
    approved_by: approvedBy,
    evacuation: input.evacuation === true,
    expires_at: input.expires_at,
    lifted_at: null,
    lifted_by: null,
    lift_reason: null,
  };

  const { data: row, error } = await service
    .from("lockdown_broadcasts")
    .insert({ data })
    .select()
    .single();
  if (error || !row) {
    console.error("createLockdownRule error:", error);
    return null;
  }
  await addAudit({
    action: status === "ACTIVE" ? "LOCKDOWN_BROADCAST" : "LOCKDOWN_PENDING",
    userId: input.initiated_by,
    userName: input.initiator_role,
    role: input.initiator_role as any,
    details: {
      ruleId: (row as any).id,
      scope_type: input.scope_type,
      target_count: input.target_values.length,
      direction: input.direction,
      status,
      evacuation: input.evacuation === true,
      expires_at: input.expires_at,
    },
  });
  return row as unknown as LockdownRow;
}

/**
 * Approve a PENDING_PRINCIPAL rule (two-person sign-off). Flips status to
 * ACTIVE and records who approved.
 */
export async function approveLockdownRule(
  ruleId: string,
  approverId: string,
): Promise<boolean> {
  const service = getSupabaseServiceClient();
  const { data: row, error } = await service
    .from("lockdown_broadcasts")
    .select("*")
    .eq("id", ruleId)
    .maybeSingle();
  if (error || !row) {
    console.error("approveLockdownRule fetch error:", error);
    return false;
  }
  const d = (row.data ?? {}) as Record<string, unknown>;
  if (d.status !== "PENDING_PRINCIPAL") return true; // already active/terminal
  const { error: upErr } = await service
    .from("lockdown_broadcasts")
    .update({
      data: { ...d, status: "ACTIVE", approved_by: approverId },
      updated_at: new Date().toISOString(),
    })
    .eq("id", ruleId);
  if (upErr) {
    console.error("approveLockdownRule update error:", upErr);
    return false;
  }
  await addAudit({
    action: "LOCKDOWN_APPROVED",
    userId: approverId,
    role: "principal" as any,
    details: { ruleId, status: "ACTIVE" },
  });
  return true;
}

/**
 * Lift / override a rule. Principal-only (enforced by route.ts). Records
 * who lifted and the mandatory reason; terminal status LIFTED.
 */
export async function liftLockdownRule(
  ruleId: string,
  liftedBy: string,
  lifterRole: string,
  liftReason: string,
): Promise<boolean> {
  const service = getSupabaseServiceClient();
  const { data: row, error } = await service
    .from("lockdown_broadcasts")
    .select("*")
    .eq("id", ruleId)
    .maybeSingle();
  if (error || !row) {
    console.error("liftLockdownRule fetch error:", error);
    return false;
  }
  const d = (row.data ?? {}) as Record<string, unknown>;
  if (d.lifted_at) return true; // already lifted
  const { error: upErr } = await service
    .from("lockdown_broadcasts")
    .update({
      data: {
        ...d,
        status: "LIFTED",
        lifted_at: new Date().toISOString(),
        lifted_by: liftedBy,
        lift_reason: liftReason,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", ruleId);
  if (upErr) {
    console.error("liftLockdownRule update error:", upErr);
    return false;
  }
  await addAudit({
    action: "LOCKDOWN_LIFTED",
    userId: liftedBy,
    role: lifterRole as any,
    details: { ruleId, lift_reason: liftReason },
  });
  return true;
}
