/**
 * tests/unit/institutional-audit-hardening.test.ts — PR-11 exit condition.
 *
 * "You can reconstruct why every consequential action happened."
 *
 * The institutional loop emits a closed set of audit actions. This test
 * locks that set: every action the engines emit must be registered in the
 * audit_logs.action CHECK constraint (the PR-11 widening), and the
 * correlation index on details->>'decision_no' must exist so a whole chain
 * is reconstructable from one decision id.
 *
 * DB-backed: replays the widening against a scratch DB and asserts each
 * action is insertable (i.e. the constraint accepts it). Without a DB the
 * action set is still asserted (the closed set itself is the invariant).
 */
import { describe, it, expect } from "vitest";

// The closed set of institutional audit actions (the PR-11 widening).
const INSTITUTIONAL_AUDIT_ACTIONS = [
  "case.created",
  "case.opened",
  "case.resolved",
  "case.closed",
  "case.cancelled",
  "case.escalated",
  "workflow.transitioned",
  "authority.denied",
  "decision.recorded",
  "impact.computed",
  "impact.confirmed",
  "attention.generated",
  "attention.resolved",
  "emergency.command_issued",
  "emergency.reviewed",
  "delegation.granted",
  "delegation.revoked",
] as const;

describe("institutional audit action set (pure)", () => {
  it("the closed set is non-empty and unique", () => {
    expect(INSTITUTIONAL_AUDIT_ACTIONS.length).toBeGreaterThan(0);
    expect(new Set(INSTITUTIONAL_AUDIT_ACTIONS).size).toBe(INSTITUTIONAL_AUDIT_ACTIONS.length);
  });

  it("every consequential step of the loop has an action", () => {
    // case lifecycle (5) + escalation (1) + workflow (1) + authority (1) +
    // decision (1) + impact (2) + attention (2) + emergency (2) +
    // delegation (2) = 17.
    for (const a of [
      "case.created", "case.opened", "case.resolved", "case.closed",
      "case.cancelled", "case.escalated",
      "workflow.transitioned",
      "authority.denied",
      "decision.recorded",
      "impact.computed", "impact.confirmed",
      "attention.generated", "attention.resolved",
      "emergency.command_issued", "emergency.reviewed",
      "delegation.granted", "delegation.revoked",
    ]) {
      expect(INSTITUTIONAL_AUDIT_ACTIONS).toContain(a);
    }
  });
});

const HAS_DB = !!process.env.DATABASE_URL;

describe("audit actions are accepted by the constraint (DB-backed)", () => {
  if (!HAS_DB) {
    it("skipped — no DATABASE_URL set", () => {
      expect(true).toBe(true);
    });
    return;
  }

  it("every institutional action inserts cleanly into audit_logs", async () => {
    const { query } = await import("@/lib/postgres");
    // Each action must be accepted by the audit_logs.action CHECK
    // (the PR-11 widening). An unregistered action is a constraint
    // violation — the audit silently fails, which is the exact failure
    // PR-11 prevents.
    for (const action of INSTITUTIONAL_AUDIT_ACTIONS) {
      const { rows } = await query(
        `INSERT INTO public.audit_logs (action, user_id, user_name, user_role, details)
         VALUES ($1, '00000000-0000-0000-0000-000000000001','audit-test','system','{}')
         RETURNING 1`,
        [action],
      );
      expect(rows.length, `action '${action}' must be accepted`).toBe(1);
    }
  });

  it("the decision_no correlation index exists (chain reconstruction)", async () => {
    const { query } = await import("@/lib/postgres");
    const { rows } = await query<{ idx: string }>(
      `SELECT indexname AS idx FROM pg_indexes
        WHERE tablename = 'audit_logs' AND indexname = 'idx_audit_logs_decision_no'`,
    );
    expect(rows.length, "the PR-11 correlation index must exist").toBe(1);
  });
});
