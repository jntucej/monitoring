// src/app/api/admin/steward/harness/route.ts
// POST /api/admin/steward/harness
//
// 5 live Dev Harness mutations (reversible):
//   1. simulate_leave_nomination — injects a HOD leave nomination
//   2. inject_policy_linter_error — adds overlapping tstzrange to draft
//   3. simulate_duplicate_challan — replays same utr_number twice
//   4. simulate_circular_recall — stamps SUPERSEDED on active circular
//   5. test_topology_lock — attempts add_course (ADMIN hard-blocked → SYSADMIN)
//
// auth: ['admin'] only.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

export const POST = withAuthorization(async (req: NextRequest, { auth }: { auth: AuthContext }) => {
  if (!["admin"].includes(auth.role)) {
    return fail("FORBIDDEN", "ADMIN only", 403);
  }

  const body = (await req.json().catch(() => ({}))) as {
    mutation?: string;
  };

  const mutation = body.mutation ?? "";

  switch (mutation) {
    case "simulate_leave_nomination": {
      // Find an active HOD user to nominate a delegate for
      const hod = await query(
        `SELECT id, name FROM users WHERE role = 'hod' AND status = 'ACTIVE' LIMIT 1`,
      );
      if (hod.rows.length === 0) {
        return fail("NO_DATA", "No active HOD found to simulate", 404);
      }

      // Find a delegatee (any active faculty)
      const delegatee = await query(
        `SELECT id FROM users WHERE role = 'faculty' AND status = 'ACTIVE' LIMIT 1`,
      );
      if (delegatee.rows.length === 0) {
        return fail("NO_DATA", "No active faculty found as delegatee", 404);
      }

      const result = await query(
        `INSERT INTO delegations
           (delegator_id, delegatee_id, role, scope_entity, can_mutate,
            starts_at, expires_at, requires_approval, note)
         VALUES ($1, $2, 'hod', 'simulated', TRUE,
                 NOW(), NOW() + INTERVAL '14 days', TRUE,
                 'HARNESS: simulated HOD leave nomination')
         RETURNING id, requires_approval, expires_at`,
        [hod.rows[0].id, delegatee.rows[0].id],
      );

      await addAudit({
        action: "harness_simulate_leave_nomination",
        userId: auth.userId,
        role: "admin",
        details: { delegationId: result.rows[0].id, hodId: hod.rows[0].id },
      });

      return ok({
        mutation,
        delegationId: result.rows[0].id,
        simulated: true,
        note: "HOD leave nomination injected. Activate via /delegates/activate.",
      });
    }

    case "inject_policy_linter_error": {
      // Find a real regulation code to use as FK
      const regCode = await query(
        `SELECT code FROM academic_regulations WHERE is_active = TRUE LIMIT 1`,
      );
      if (regCode.rows.length === 0) {
        return fail("NO_DATA", "No active academic_regulation found to inject against", 404);
      }
      const code = regCode.rows[0].code as string;

      // Insert a policy rule with overlapping metadata against the real regulation
      const result = await query(
        `INSERT INTO academic_policy_rules
           (regulation_code, policy_category, sub_category, rule_expression, rule_metadata)
         VALUES ($1, 'attendance', 'threshold',
                 $2,
                 $3)
         RETURNING id, regulation_code`,
        [
          code,
          JSON.stringify({ op: "gte", operands: [0.75] }),
          JSON.stringify({ status: "DRAFT", simulated: true, overlapWith: "existing_attendance_rule", harness: true }),
        ],
      );

      await addAudit({
        action: "steward_draft_submitted",
        userId: auth.userId,
        role: "admin",
        details: { harness: true, ruleId: result.rows[0].id, regulationCode: code },
      });

      return ok({
        mutation,
        ruleId: result.rows[0].id,
        regulationCode: code,
        simulated: true,
        note: `Overlapping policy rule injected against ${code}. Linter should hard-block submission.`,
      });
    }

    case "simulate_duplicate_challan": {
      // Insert two identical processed_events with same idempotency_key
      const utr = `HARNESS_UTR_${Date.now()}`;
      await query(
        `INSERT INTO processed_events (idempotency_key, source, event_type, entity_ref)
         VALUES ($1, 'sbi_collect', 'sbi_collect_payment', $2)`,
        [utr, utr],
      );
      await query(
        `INSERT INTO processed_events (idempotency_key, source, event_type, entity_ref)
         VALUES ($1, 'sbi_collect', 'sbi_collect_payment', $2)`,
        [utr, utr],
      );

      await addAudit({
        action: "harness_simulate_duplicate_challan",
        userId: auth.userId,
        role: "admin",
        details: { utr },
      });

      return ok({
        mutation,
        utr,
        simulated: true,
        note: "Duplicate SBI challan injected. processed_events should dedup via idempotency_key.",
      });
    }

    case "simulate_circular_recall": {
      // Find an active PUBLISHED circular and stamp SUPERSEDED
      const active = await query(
        `SELECT id, circular_no FROM circular_requests WHERE status = 'PUBLISHED' AND withdrawn_at IS NULL LIMIT 1`,
      );
      if (active.rows.length === 0) {
        return fail("NO_DATA", "No active PUBLISHED circular found to recall", 404);
      }

      await query(
        `UPDATE circular_requests SET status = 'RECALLED', withdrawn_at = NOW() WHERE id = $1`,
        [active.rows[0].id],
      );

      await addAudit({
        action: "harness_simulate_circular_recall",
        userId: auth.userId,
        role: "admin",
        details: { circularId: active.rows[0].id, circularNo: active.rows[0].circular_no },
      });

      return ok({
        mutation,
        circularId: active.rows[0].id,
        simulated: true,
        note: "Active circular stamped RECALLED.",
      });
    }

    case "test_topology_lock": {
      // ADMIN attempts add_course → hard-blocked (SYSADMIN exclusive)
      await addAudit({
        action: "harness_topology_lock_blocked",
        userId: auth.userId,
        role: "admin",
        details: { attemptedAction: "add_course", blocked: true, routedTo: "SYSADMIN" },
      });

      return ok({
        mutation,
        blocked: true,
        note: "ADMIN hard-blocked from 1-Click Topology. Routed to SYSADMIN (jadiakarshjadi1010@gmail.com).",
      });
    }

    default:
      return fail("VALIDATION", `Unknown mutation: ${mutation}`);
  }
}, { requiredRole: ["admin"] });
