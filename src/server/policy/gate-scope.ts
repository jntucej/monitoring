import { ForbiddenError } from "@/server/http/errors";
import { assertOperatorHasGate } from "@/server/policy/gate-access";
import type { AuthContext } from "@/lib/authContext";

/**
 * Resolves the effective gate scope for operator-scoped endpoints.
 *
 * - operator: hard binding to auth.gateId (403 when unassigned).
 * - supervisor (or anyone with supervised_gates): the ?gateId= hint must be
 *   one of their supervised gates; without a hint, fall back to the first
 *   supervised gate or auth.gateId.
 * - other privileged roles: admin/sysadmin/warden use auth.gateId when set,
 *   otherwise all-gate scope (null).
 */
export function resolveOperatorGateScope(
  auth: Pick<AuthContext, "role" | "gateId" | "supervisedGates">,
  hintedGateId?: string | null,
): string | null {
  if (auth.role === "operator") {
    assertOperatorHasGate(auth.role, auth.gateId);
    return auth.gateId ?? null;
  }

  const supervised = auth.supervisedGates;
  if (supervised && supervised.length > 0) {
    if (hintedGateId) {
      if (!supervised.includes(hintedGateId)) {
        throw new ForbiddenError("Hinted gate is not one of your supervised gates");
      }
      return hintedGateId;
    }
    return supervised[0];
  }

  return auth.gateId ?? null;
}
