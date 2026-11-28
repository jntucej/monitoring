import { NextRequest, NextResponse } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withMutationGuard } from "@/server/http/mutation-guard";
import type { Role } from "@/lib/types";
import type { AuthContext } from "@/lib/authContext";
import { hasActiveDelegation } from "@/lib/institutional/workflow";
import {
  createLockdownRule,
  approveLockdownRule,
  liftLockdownRule,
} from "@/lib/lockdown-rules";
import {
  findLockdownRulesForConsole,
  toLockdownRule,
} from "@/server/repositories/lockdown/findActive";
import { broadcastLockdownEvent } from "@/lib/lockdown-broadcast";
import type {
  LockdownRule,
  LockdownScopeType,
  LockdownDirection,
} from "@/server/policy/lockdown";

/**
 * Rule-based lockdown engine API.
 *
 * Authority split (enforced in-handler, not just by role-list):
 *   POST  — create a rule.
 *         · principal            → status ACTIVE immediately (approved_by=self)
 *         · admin / supervisor   → campus-wide → PENDING_PRINCIPAL (two-person
 *                                  co-sign); narrow holds → ACTIVE but time-boxed
 *                                  (expiry required), still Principal-liftable.
 *   PATCH — approve a PENDING_PRINCIPAL rule. principal only.
 *   DELETE — lift / override a rule. principal, OR delegated vice_principal
 *         (active non-expired delegation), OR sysadmin break-glass. NEVER
 *         admin / supervisor / operator. Requires lift_reason + step-up.
 *
 * GET — list all rules the caller's console should surface (active + pending +
 * auto-expired). Admin/Principal/Supervisor/Sysadmin; operators poll the
 * compact active set.
 */

function jsonErr(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

/** Roles that may create a lockdown request (initiate). */
const CREATE_ROLES: Role[] = ["admin", "sysadmin", "principal", "supervisor"];
/** Roles that may read the lockdown console list. */
const READ_ROLES: Role[] = ["admin", "sysadmin", "principal", "supervisor", "operator"];
/** Roles that may lift (override). Authority is re-checked in-handler. */
const LIFT_ROLES: Role[] = ["principal", "vice_principal", "sysadmin"];

/** A rule's human-safe, UUID-free shape for the gate stream / UI. */
function publicRule(r: LockdownRule) {
  return {
    id: r.id,
    scope_type: r.scope_type,
    target_values: r.target_values,
    direction: r.direction,
    status: r.status,
    public_message: r.public_message,
    expires_at: r.expires_at,
    evacuation: r.evacuation,
    initiated_by: r.initiated_by,
    approved_by: r.approved_by,
  };
}

// ── GET: list rules for consoles ───────────────────────────────────────
async function handleGet(_req: NextRequest) {
  const rules = await findLockdownRulesForConsole();
  return NextResponse.json({ success: true, data: rules.map(publicRule) });
}

// ── POST: create a rule (initiate) ────────────────────────────────────
async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const role = auth.role;
  const initiatorId = auth.userId;

  const body = (await req.json().catch(() => null)) as {
    scope_type?: LockdownScopeType;
    target_values?: string[];
    direction?: LockdownDirection;
    public_message?: string;
    expires_at?: string | null;
    evacuation?: boolean;
  } | null;
  if (!body) return jsonErr("BAD_REQUEST", "Body is required", 400);

  const scope_type: LockdownScopeType = body.scope_type ?? "campus";
  const direction: LockdownDirection = body.direction ?? "BOTH";
  const public_message = (body.public_message ?? "").trim();
  if (!public_message) {
    return jsonErr("MISSING_MESSAGE", "public_message is required", 400);
  }

  // target_values: required for every scope except campus.
  const target_values =
    scope_type === "campus"
      ? []
      : (Array.isArray(body.target_values) ? body.target_values : []);
  if (scope_type !== "campus" && target_values.length === 0) {
    return jsonErr(
      "MISSING_TARGETS",
      `target_values[] is required for a ${scope_type} lockdown`,
      400,
    );
  }

  // Narrow (non-campus) holds MUST be time-boxed — no indefinite scoped locks.
  const expires_at = body.expires_at ?? null;
  if (scope_type !== "campus" && !expires_at) {
    return jsonErr(
      "MISSING_EXPIRY",
      `A ${scope_type} lockdown must set expires_at (time-boxed hold)`,
      400,
    );
  }

  // Authority split → status.
  let status: "ACTIVE" | "PENDING_PRINCIPAL";
  let approvedBy: string | null;
  if (role === "principal") {
    status = "ACTIVE";
    approvedBy = initiatorId;
  } else if (role === "admin" || role === "supervisor") {
    // Campus-wide from admin/supervisor → Principal co-sign required.
    // Narrow holds → ACTIVE but time-boxed (still Principal-liftable).
    status = scope_type === "campus" ? "PENDING_PRINCIPAL" : "ACTIVE";
    approvedBy = null;
  } else {
    // sysadmin may initiate campus rules; they park for Principal sign-off too
    // (sysadmin is not the campus's accountable Principal).
    status = scope_type === "campus" ? "PENDING_PRINCIPAL" : "ACTIVE";
    approvedBy = null;
  }

  const row = await createLockdownRule(
    {
      scope_type,
      target_values,
      direction,
      public_message,
      initiated_by: initiatorId,
      initiator_role: role,
      expires_at,
      evacuation: body.evacuation === true,
    },
    status,
    approvedBy,
  );
  if (!row) return jsonErr("INTERNAL_ERROR", "Failed to broadcast lockdown", 500);

  const rule = toLockdownRule({
    id: row.id,
    data: row.data,
    created_at: row.created_at,
  });
  void broadcastLockdownEvent(
    {
      id: rule.id,
      scope_type: rule.scope_type,
      direction: rule.direction,
      status: rule.status,
      public_message: rule.public_message,
      expires_at: rule.expires_at,
    },
    "created",
  );

  return NextResponse.json(
    { success: true, data: publicRule(rule) },
    { status: 201 },
  );
}

// ── PATCH: approve a PENDING_PRINCIPAL rule (two-person sign-off) ─────
async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (auth.role !== "principal") {
    return jsonErr("FORBIDDEN", "Only the Principal may approve a lockdown request", 403);
  }
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  const ruleId = body?.id;
  if (!ruleId) return jsonErr("MISSING_ID", "id is required", 400);

  const ok = await approveLockdownRule(ruleId, auth.userId);
  if (!ok) return jsonErr("NOT_FOUND", "No pending lockdown to approve", 404);

  void broadcastLockdownEvent(
    {
      id: ruleId,
      scope_type: "campus",
      direction: "BOTH",
      status: "ACTIVE",
      public_message: null,
      expires_at: null,
    },
    "approved",
  );
  return NextResponse.json({ success: true, data: null });
}

// ── DELETE: lift / override a rule (Principal-only) ───────────────────
async function handleDelete(req: NextRequest, { auth }: { auth: AuthContext }) {
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    lift_reason?: string;
  } | null;

  const ruleId =
    body?.id ??
    (await (async () => {
      // Fallback: lift the most recent active rule when no id is supplied
      // (back-compat with the old Admin page that DELETEd without a body).
      const rules = await findLockdownRulesForConsole();
      return rules.find((r) => r.status === "ACTIVE")?.id ?? null;
    })());
  if (!ruleId) return jsonErr("NOT_FOUND", "No active lockdown to lift", 404);

  const liftReason = (body?.lift_reason ?? "").trim();
  if (!liftReason) {
    return jsonErr("MISSING_LIFT_REASON", "A lift_reason is required", 400);
  }

  // Authority: principal, delegated vice_principal, or sysadmin break-glass.
  const role = auth.role;
  let canLift = false;
  if (role === "principal") {
    canLift = true;
  } else if (role === "vice_principal") {
    // Vice-Principal lifts ONLY with an active, non-expired delegation.
    const deleg = await hasActiveDelegation(auth.userId, "vice_principal", null);
    canLift = deleg.active;
  } else if (role === "sysadmin") {
    // Break-glass: allowed, but the audit trail records the sysadmin override.
    canLift = true;
  }
  if (!canLift) {
    return jsonErr(
      "FORBIDDEN",
      role === "vice_principal"
        ? "No active delegation — a Vice-Principal needs a valid delegation to lift a lockdown."
        : "Only the Principal (or a delegated Vice-Principal) may lift an active lockdown.",
      403,
    );
  }

  const ok = await liftLockdownRule(ruleId, auth.userId, role, liftReason);
  if (!ok) return jsonErr("INTERNAL_ERROR", "Failed to lift lockdown", 500);

  void broadcastLockdownEvent(
    {
      id: ruleId,
      scope_type: "campus",
      direction: "BOTH",
      status: "LIFTED",
      public_message: null,
      expires_at: null,
    },
    "lifted",
  );
  return NextResponse.json({ success: true, data: null });
}

const rl = { keyPrefix: "lockdown", maxRequests: 20 };

// Operators poll GET for compact active state; consoles use it for the list.
export const GET = withApiChain(handleGet, {
  route: "/api/admin/lockdown",
  auth: "user",
  requiredRole: READ_ROLES,
  rateLimit: { keyPrefix: "lockdown_get", maxRequests: 120 },
});
export const POST = withMutationGuard(handlePost, {
  requiredRole: CREATE_ROLES,
  rateLimit: rl,
});
// Approval + lift are sensitive: step-up re-auth required (stolen-cookie
// resistant). Lift also gates the delegated-VP authority.
export const PATCH = withMutationGuard(handlePatch, {
  requiredRole: ["principal"] as Role[],
  requiresStepUp: true,
  rateLimit: { keyPrefix: "lockdown_approve", maxRequests: 30 },
});
export const DELETE = withMutationGuard(handleDelete, {
  requiredRole: LIFT_ROLES,
  requiresStepUp: true,
  rateLimit: { keyPrefix: "lockdown_lift", maxRequests: 30 },
});
