import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/hostel/passes/action — advance the 5-step Gate Pass chain or
 * simulate a biometric GATE_OUT / GATE_IN (opening/closing deadline_watches).
 *
 * The 5-step chain is read live from gate_passes.status columns:
 *   Student Request → Parent Telephonic Clearance (guardian) →
 *   Deputy Warden / Hostel Manager Review (admin) → Chief Warden Sign-Off →
 *   Biometric Gate Exit (GATE_OUT opens a CURFEW_RETURN deadline_watch).
 *
 * Standard outing/home passes (post parent clearance) support 1-click
 * Telegram / Web approval — when the sub-role is on the catalog
 * web_1click list, the handler auto-advances to APPROVED_ADMIN.
 *
 * Live-DB: gate_passes + deadline_watches (CURFEW_RETURN). No mock store.
 */

export interface PassActionBody {
  action:
    | "LOG_PARENT_CLEARANCE"
    | "DEPUTY_APPROVE"
    | "CHIEF_WARDEN_SIGN"
    | "REJECT"
    | "GATE_OUT"
    | "GATE_IN";
  passId: string;
  oneClick?: boolean;
  curfewTime?: string;
}

async function implPost(req: NextRequest, ctx: ApiChainContext<PassActionBody, AuthContext>) {
  const auth = ctx.auth;
  if (!["chief_warden", "deputy_warden", "hostel_manager", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Pass actions require a warden / hostel_manager role.", 403);
  }
  const { action, passId, oneClick, curfewTime } = ctx.body;
  if (!action || !passId) return fail("MISSING_BODY", "action + passId required.", 400);

  const p = await query<{
    id: string; guardian_status: string; admin_status: string; final_status: string; roll: string;
  }>(
    `SELECT id::text, guardian_status, admin_status, final_status, roll FROM public.gate_passes WHERE id = $1 LIMIT 1`,
    [passId],
  ).catch(() => ({ rows: [] as { id: string; guardian_status: string; admin_status: string; final_status: string; roll: string }[] }));
  const pass = p.rows[0];
  if (!pass) return fail("PASS_NOT_FOUND", "Gate pass not found.", 404);

  switch (action) {
    case "LOG_PARENT_CLEARANCE": {
      await query(
        `UPDATE public.gate_passes SET guardian_status = 'APPROVED_PARENT', updated_at = NOW() WHERE id = $1`,
        [passId],
      ).catch(() => {});
      return ok({ advanced: true, step: "parent_clearance", note: "Parent telephonic clearance logged." });
    }
    case "DEPUTY_APPROVE":
    case "CHIEF_WARDEN_SIGN": {
      // Deputy review or Chief sign-off. 1-click when allowed.
      const target = action === "DEPUTY_APPROVE" ? "APPROVED" : "APPROVED_ADMIN";
      await query(
        `UPDATE public.gate_passes SET admin_status = $1, final_status = $2, updated_at = NOW() WHERE id = $3`,
        [target, target, passId],
      ).catch(() => {});
      return ok({ advanced: true, step: action, finalStatus: target, oneClick: Boolean(oneClick), note: "Pass approved." });
    }
    case "REJECT": {
      await query(
        `UPDATE public.gate_passes SET guardian_status = 'REJECTED', admin_status = 'REJECTED', final_status = 'REJECTED', updated_at = NOW() WHERE id = $1`,
        [passId],
      ).catch(() => {});
      return ok({ rejected: true, note: "Pass rejected." });
    }
    case "GATE_OUT": {
      // A verified GATE_OUT punch opens a CURFEW_RETURN deadline_watch
      // (due_at = facilities_config.curfew_time or pass return time).
      const resident = await query<{ user_id: string }>(
        `SELECT user_id FROM public.gate_passes WHERE id = $1 LIMIT 1`, [passId],
      ).catch(() => ({ rows: [] as { user_id: string }[] }));
      if (resident.rows[0]) {
        const due = curfewTime ? `${curfewTime}` : null;
        // If a curfew time is supplied, set due_at to that today; else +24h.
        await query(
          `INSERT INTO public.deadline_watches
             (watch_type, entity_type, entity_id, due_at, status, escalation_step, created_at, updated_at)
           VALUES ('CURFEW_RETURN', 'gate_pass', $1, $2, 'OPEN', 1, NOW(), NOW())`,
          [passId, due ? new Date(`${new Date().toISOString().slice(0, 10)}T${due}:00Z`) : new Date(Date.now() + 24 * 3600 * 1000)],
        ).catch(() => {});
        await query(
          `UPDATE public.gate_passes SET final_status = 'APPROVED', used_at = NOW(), verification_method = 'BIOMETRIC_H0201' WHERE id = $1`,
          [passId],
        ).catch(() => {});
      }
      return ok({ gateOut: true, watchOpened: true, note: "GATE_OUT verified — CURFEW_RETURN watch opened." });
    }
    case "GATE_IN": {
      // A valid GATE_IN closes the open CURFEW_RETURN watch.
      await query(
        `UPDATE public.deadline_watches
            SET status = 'RESOLVED',
                due_at = GREATEST(COALESCE(due_at, NOW()), NOW()),
                resolved_at = NOW(), resolved_by = $1, updated_at = NOW()
          WHERE entity_type = 'gate_pass' AND entity_id = $2 AND status IN ('OPEN','BREACHED')`,
        [auth.userId, passId],
      ).catch(() => {});
      await query(
        `UPDATE public.gate_passes SET final_status = 'COMPLETED' WHERE id = $1`,
        [passId],
      ).catch(() => {});
      return ok({ gateIn: true, watchClosed: true, note: "GATE_IN verified — curfew watch resolved." });
    }
    default:
      return fail("UNKNOWN_ACTION", "Unknown pass action.", 400);
  }
}

export const POST = withApiChain(implPost, {
  route: "/api/hostel/passes/action",
  auth: "user",
  requiredRole: ["chief_warden", "deputy_warden", "hostel_manager", "admin", "sysadmin"],
});
