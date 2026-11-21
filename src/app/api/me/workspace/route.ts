// /api/me/workspace — the single source of truth for "what does this person
// see right now" + the `?explain=` debug surface (§3 debuggability).
//
// GET /api/me/workspace
//   → { context, capabilities, configVersion, provenance }
//
// GET /api/me/workspace?explain=hostel.leave.apply
//   → { decision, reason, contextHash, configVersion, source }
//
// The context is built server-side (the P0 split-residence fields), so the
// client is a pure projection. The explain endpoint answers "why does this
// user see/not-see X?" with one route — no screenshots.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { query } from "@/lib/postgres";
import {
  hasCapability,
  explainCapability,
  resolveRoleConfig,
  CONFIG_VERSION,
  type WorkspaceContext,
} from "@/config/roles";

/**
 * Build the server-side WorkspaceContext for the authenticated user.
 * Composes: users.role, student_details.student_type (residential),
 * campus_occupancy.current_status (presence), gate_passes (authorizations).
 * Request-scoped — NOT cached at login.
 */
async function loadWorkspaceContext(auth: AuthContext): Promise<WorkspaceContext> {
  const roles: string[] = auth.roles?.length ? auth.roles : [auth.role];
  const personType = auth.role;

  const { rows } = await query<{
    student_type: string | null;
    current_entry_type: string | null;
    hostel_block: string | null;
    room_number: string | null;
    roll: string | null;
  }>(
    `SELECT sd.student_type, sd.current_entry_type, sd.hostel_block, sd.room_number, sd.roll
       FROM public.student_details sd WHERE sd.user_id = $1 LIMIT 1`,
    [auth.userId],
  );
  const p = rows[0];
  // P0 residentialProfile: HM/HF = hosteller, DM/DF = day_scholar.
  let residentialStatus: "hosteller" | "day_scholar" | "n_a" = "n_a";
  if (p?.student_type === "HM" || p?.student_type === "HF" || p?.current_entry_type === "hosteller" || (p?.hostel_block ?? null)) {
    residentialStatus = "hosteller";
  } else if (p?.student_type === "DM" || p?.student_type === "DF") {
    residentialStatus = "day_scholar";
  } else if (personType === "student") {
    residentialStatus = "day_scholar";
  }

  // P0 campusPresence: live state, request-scoped.
  let campusStatus: "in_campus" | "out_campus" | "unknown" = "unknown";
  try {
    const occ = await query<{ current_status: string | null }>(
      `SELECT current_status FROM public.campus_occupancy WHERE user_id = $1 LIMIT 1`,
      [auth.userId],
    );
    const s = occ.rows[0]?.current_status;
    if (s === "IN") campusStatus = "in_campus";
    else if (s === "OUT") campusStatus = "out_campus";
  } catch {
    campusStatus = "unknown";
  }

  // Active authorizations (live gate passes).
  const activeAuthorizations: WorkspaceContext["activeAuthorizations"] = [];
  try {
    const passes = await query<{
      id: string;
      pass_type: string | null;
      status: string | null;
      expected_return_at: string | null;
      guardian_status: string | null;
      admin_status: string | null;
    }>(
      `SELECT id, pass_type, status, expected_return_at, guardian_status, admin_status
         FROM public.gate_passes
        WHERE user_id = $1 AND status IN ('pending','approved','active')
        ORDER BY created_at DESC LIMIT 20`,
      [auth.userId],
    );
    for (const g of passes.rows) {
      activeAuthorizations.push({
        kind: g.pass_type === "hostel_leave" || g.pass_type === "outpass" ? "hostel_leave" : "temporary_gate_pass",
        code: g.id,
        status: g.status === "approved" || g.status === "active" ? "active" : "pending",
        expectedReturnAt: g.expected_return_at,
        parentAcknowledged: g.guardian_status === "approved",
      });
    }
  } catch {
    // fail-open: pass-read errors don't blank the workspace.
  }

  return {
    roles,
    personType,
    residentialStatus,
    campusStatus,
    roll: p?.roll ?? null,
    hostel:
      residentialStatus === "hosteller"
        ? { blockId: p?.hostel_block ?? null, roomId: p?.room_number ?? null }
        : undefined,
    activeAuthorizations,
    activeApprovals: [],
  };
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }): Promise<Response> {
  const ctx = await loadWorkspaceContext(auth);
  const explainId = req.nextUrl.searchParams.get("explain");

  if (explainId) {
    // §3 debuggability: "why does this user see/not-see X?" — one route.
    const explanation = explainCapability(auth.role, ctx, explainId);
    return ok({
      capability: explainId,
      ...explanation,
    });
  }

  const { capabilities } = resolveRoleConfig(auth.role, ctx);
  return ok({
    context: {
      residentialStatus: ctx.residentialStatus,
      campusStatus: ctx.campusStatus,
      roles: ctx.roles,
      activeAuthorizations: ctx.activeAuthorizations.length,
    },
    capabilities,
    configVersion: CONFIG_VERSION,
    // §3 versioning: the config version rides in the payload + is logged in
    // audit events so "which config made this call" is answerable.
  });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  windowMs: 60_000,
  maxRequests: 60,
});
