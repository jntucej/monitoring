// src/lib/capabilities/context.server.ts
//
// Server-only loader that builds a WorkspaceContext from the DB. This is the
// single source of truth for enforcement (guardrail #1): the client never
// computes its own capabilities — it projects these.
//
// Composition (no inventing):
//   users.role / users.roles            → roles
//   students + student_details.student_type (HM/HF hosteller, DM/DF day_scholar)
//                                        → residentialStatus, personType
//   campus_occupancy.current_status      → campusStatus (request-scoped, not
//                                           re-computed once at login)
//   gate_passes (active, this user)      → activeAuthorizations
//
// All conditions in the registry are pure; only THIS layer touches the DB.

import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import {
  CAPABILITY_REGISTRY_VERSION,
} from "./registry";
import type {
  WorkspaceContext,
  AccessAuthorization,
  ApprovalStage,
} from "./types";

type Residential = "day_scholar" | "hosteller" | "n_a";

/** HM/HF = hostel male/female; DM/DF = day scholar male/female (see mess-reviews.classifyHostelStatus). */
function classifyResidential(studentType: string | null, currentEntryType: string | null, hostelBlock: string | null): Residential {
  const st = studentType ?? null;
  const ce = currentEntryType ?? null;
  const hb = hostelBlock ?? null;
  if (st === "HM" || st === "HF" || ce === "hosteller" || (hb !== null && hb !== "")) {
    return "hosteller";
  }
  if (st === "DM" || st === "DF") return "day_scholar";
  // Default a student without a residential marker to day_scholar (they don't
  // get hostel features unless explicitly marked hosteller).
  return "day_scholar";
}

export interface WorkspaceLoad {
  context: WorkspaceContext;
  /** human-readable reasons for each resolved field (explain-why / audit #9). */
  provenance: Record<string, string>;
}

export async function loadWorkspaceContext(auth: AuthContext): Promise<WorkspaceLoad> {
  const roles: string[] = auth.roles?.length ? auth.roles : [auth.role];
  const personType = auth.role;

  // person → student_details (residential) + users (fallback role/gate)
  const { rows: personRows } = await query<{
    role: string | null;
    unique_id: string | null;
    student_type: string | null;
    current_entry_type: string | null;
    hostel_block: string | null;
    room_number: string | null;
    gate_id: string | null;
  }>(
    `SELECT u.role, u.unique_id, u.gate_id,
            sd.student_type, sd.current_entry_type, sd.hostel_block, sd.room_number
       FROM public.users u
       LEFT JOIN public.student_details sd ON sd.user_id = u.id
      WHERE u.id = $1`,
    [auth.userId],
  );
  const p = personRows[0];
  const residential: Residential = classifyResidential(
    p?.student_type ?? null,
    p?.current_entry_type ?? null,
    p?.hostel_block ?? null,
  );

  // request-scoped campus position (NOT session-cached) — campus_occupancy.
  let campusStatus: "in_campus" | "out_campus" | "unknown" = "unknown";
  try {
    const { rows: occ } = await query<{ current_status: string | null }>(
      `SELECT current_status FROM public.campus_occupancy WHERE user_id = $1 LIMIT 1`,
      [auth.userId],
    );
    const s = occ[0]?.current_status;
    if (s === "IN") campusStatus = "in_campus";
    else if (s === "OUT") campusStatus = "out_campus";
  } catch {
    campusStatus = "unknown";
  }

  // active authorizations: this user's live gate passes (hostel leave, etc.).
  const activeAuthorizations: AccessAuthorization[] = [];
  try {
    const { rows: passes } = await query<{
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
        ORDER BY created_at DESC
        LIMIT 20`,
      [auth.userId],
    );
    for (const g of passes) {
      activeAuthorizations.push({
        kind: g.pass_type === "hostel_leave" || g.pass_type === "outpass" ? "hostel_leave" : "temporary_gate_pass",
        code: g.id,
        status: g.status === "approved" || g.status === "active" ? "active" : "pending",
        expectedReturnAt: g.expected_return_at,
        parentAcknowledged: g.guardian_status === "approved",
        adminApproved: g.admin_status === "approved",
      });
    }
  } catch {
    // fail-open for the UX layer: pass-read errors don't blank the workspace.
  }

  // activeApprovals: for approver roles, the hostel-domain stages they can act
  // on. Derived from role + domain, not a hardcoded list (guardrail #8).
  const activeApprovals: ApprovalStage[] = [];
  if (["caretaker", "deputy_warden", "hostel_manager", "principal"].some((r) => roles.includes(r))) {
    activeApprovals.push({ stage: "hostel_review", role: "hostel_manager", domain: "hostel" });
    if (roles.includes("principal")) {
      activeApprovals.push({ stage: "final_signoff", role: "principal", domain: "hostel" });
    }
  }

  const context: WorkspaceContext = {
    personId: auth.userId,
    roles,
    personType,
    residentialStatus: residential,
    gender: null, // not sourced from a column here; leave null rather than guess
    hostel:
      residential === "hosteller"
        ? { blockId: p?.hostel_block ?? null, roomId: p?.room_number ?? null }
        : undefined,
    campusStatus,
    currentEntryType: p?.current_entry_type ?? null,
    activeAuthorizations,
    currentShift: null, // operator shift not sourced in this phase; null = not on shift
    assignedGate: p?.gate_id ?? null,
    activeApprovals,
    registryVersion: CAPABILITY_REGISTRY_VERSION,
  };

  const provenance: Record<string, string> = {
    roles: "users.roles / users.role",
    residential: "student_details.student_type (HM/HF→hosteller, DM/DF→day_scholar)",
    campusStatus: "campus_occupancy.current_status (request-scoped)",
    authorizations: "gate_passes where status in (pending,approved,active)",
    approvals: "derived from role + hostel domain",
  };

  return { context, provenance };
}
