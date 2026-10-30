import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit } from "@/lib/db";
import { addNotification } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

/**
 * PATCH /api/users/me/gate
 * Self-scoped operator gate binding.
 * - Operator role only
 * - Body: { gateId }
 * - 409 if user already has a gate (prevents mid-shift hopping without sign-out)
 * - 404 if gate not found or not active
 * - Updates users.gate_id
 * - Audit log: OPERATOR_GATE_ASSIGNED
 * - Notification to supervisors on gate
 */
export const PATCH = withMutationGuard(
  async (req: NextRequest, { auth }: { auth: AuthContext }) => {
    try {
      // Parse and validate body
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return fail("INVALID_BODY", "Request body must be a JSON object", 400);
      }

      const rawGateId = (body as any).gateId;
      if (typeof rawGateId !== "string") {
        return fail("MISSING_GATE_ID", "gateId is required and must be a string", 400);
      }

      const gateId = rawGateId.trim();
      if (!gateId) {
        return fail("MISSING_GATE_ID", "gateId is required", 400);
      }

      // Check if user already has a gate assigned (prevent mid-shift hopping)
      const client = getSupabaseServiceClient();
      const { data: currentUser, error: userErr } = await client
        .from("users")
        .select("gate_id")
        .eq("id", auth.userId)
        .single();

      if (userErr) {
        console.error("[users/me/gate] Error fetching current user:", userErr);
        return fail("INTERNAL_ERROR", "Failed to verify current gate assignment", 500);
      }

      if (currentUser?.gate_id) {
        return fail(
          "CONFLICT",
          "Operator already assigned to a gate. Sign out from current gate before switching.",
          409
        );
      }

      // Verify gate exists and is active
      const { data: gate, error: gateErr } = await client
        .from("gates")
        .select("id, gate_code, name, is_active")
        .eq("id", gateId)
        .single();

      if (gateErr || !gate) {
        return fail("NOT_FOUND", "Gate not found", 404);
      }

      if (gate.is_active === false) {
        return fail("NOT_FOUND", "Gate not found or not active", 404);
      }

      // Update user's gate_id
      const { error: updateErr } = await client
        .from("users")
        .update({ gate_id: gateId })
        .eq("id", auth.userId);

      if (updateErr) {
        console.error("[users/me/gate] Error updating user gate_id:", updateErr);
        return fail("INTERNAL_ERROR", "Failed to assign gate", 500);
      }

      // Audit log - non-fatal
      try {
        await addAudit({
          action: "OPERATOR_GATE_ASSIGNED",
          userId: auth.userId,
          userName: auth.email,
          role: auth.role,
          details: {
            from: null,
            to: gateId,
            gateName: gate.name,
          },
          gateId,
        });
      } catch (auditErr) {
        console.error("[users/me/gate] Non-fatal audit error:", auditErr);
      }

      // Count active operators on the gate
      let activeOperatorCount = 0;
      try {
        const { data: operators, error: opErr } = await client
          .from("users")
          .select("id")
          .eq("gate_id", gateId)
          .eq("role", "operator")
          .in("status", ["ACTIVE"]);

        if (!opErr && operators) {
          activeOperatorCount = operators.length;
        }
      } catch (countErr) {
        console.error("[users/me/gate] Non-fatal operator count error:", countErr);
      }

      // Notify supervisors - non-fatal
      try {
        await addNotification(
          "role",
          "supervisor",
          "gate_assigned",
          "Operator assigned to gate",
          `${auth.email} picked ${gate.name}. ${activeOperatorCount} operator(s) now on this gate.`,
          gateId
        );
      } catch (notifErr) {
        console.error("[users/me/gate] Non-fatal notification error:", notifErr);
      }

      return ok({ gateId: gate.id, gateName: gate.name });
    } catch (err) {
      console.error("[users/me/gate] Unexpected error:", err);
      return fail("INTERNAL_ERROR", "Internal server error", 500);
    }
  },
  {
    requiredRole: ["operator"],
    rateLimit: { windowMs: 60_000, maxRequests: 5 },
  }
);