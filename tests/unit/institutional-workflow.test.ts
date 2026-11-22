/**
 * tests/unit/institutional-workflow.test.ts — PR-03 + PR-04 exit condition.
 *
 * "A case can move through a configurable workflow without hard-coded
 * route logic" and "you cannot transition a case merely because your role
 * exists — the authority engine decides."
 *
 * Pure parts (state resolution, bound evaluation) run without a DB. The
 * end-to-end transition chain runs when DATABASE_URL is set (CI postgres:17
 * + the migration chain); otherwise it skips cleanly.
 */
import { describe, it, expect } from "vitest";
import { resolveWorkflowTarget, evaluateBounds } from "@/lib/institutional/workflow";
import type { AuthorityRequest } from "@/lib/institutional/contracts";

// ── Pure: target-state resolution is configurable, not hard-coded routing ─

describe("workflow target-state resolution (pure)", () => {
  it("approve/reject map deterministically to terminal states", () => {
    expect(resolveWorkflowTarget("manager_review", "approve")).toBe("approved");
    expect(resolveWorkflowTarget("deputy_review", "reject")).toBe("rejected");
  });

  it("route_* actions move to the next review state, not across the board", () => {
    expect(resolveWorkflowTarget("submitted", "route_manager")).toBe("manager_review");
    expect(resolveWorkflowTarget("manager_review", "route_deputy")).toBe("deputy_review");
    expect(resolveWorkflowTarget("deputy_review", "route_principal")).toBe("principal_review");
  });

  it("an unknown action leaves the instance in place (caller decides)", () => {
    expect(resolveWorkflowTarget("manager_review", "frobulate")).toBe("manager_review");
  });

  it("expire is a terminal move", () => {
    expect(resolveWorkflowTarget("principal_review", "expire")).toBe("expired");
  });
});

// ── Pure: authority bounds — a role existing is NOT authority ────────────

describe("authority bounds (pure)", () => {
  it("empty bounds are satisfied by anything", () => {
    expect(evaluateBounds({}, {} as AuthorityRequest)).toBe(true);
  });

  it("a max_duration_days bound rejects a longer request", () => {
    const req = { durationDays: 15 } as unknown as AuthorityRequest;
    expect(evaluateBounds({ max_duration_days: 3 }, req)).toBe(false);
    expect(evaluateBounds({ max_duration_days: 7 }, req)).toBe(false);
    expect(evaluateBounds({ max_duration_days: 30 }, req)).toBe(true);
  });

  it("an absent request field does not trip a max_ bound", () => {
    expect(evaluateBounds({ max_duration_days: 3 }, {} as AuthorityRequest)).toBe(true);
  });
});

// ── DB-backed: the full institutional loop ───────────────────────────────

const HAS_DB = !!process.env.DATABASE_URL;

describe("workflow + authority end-to-end (DB-backed)", () => {
  if (!HAS_DB) {
    it("skipped — no DATABASE_URL set", () => {
      expect(true).toBe(true);
    });
    return;
  }

  it("a case walks the gate_pass workflow and authority bounds gate it", async () => {
    const { createCase } = await import("@/lib/institutional/cases");
    const { transitionWorkflow: tw } = await import("@/lib/institutional/workflow");

    // A principal user (the single warden) and a hostel manager.
    const { query } = await import("@/lib/postgres");
    const { randomUUID } = await import("crypto");
    const principalId = randomUUID();
    const managerId = randomUUID();
    await query(
      "INSERT INTO public.users (id, name, role) VALUES ($1,'test-principal','principal'),($2,'test-manager','hostel_manager') ON CONFLICT (id) DO NOTHING",
      [principalId, managerId],
    );

    const c = await createCase({
      type: "gate_pass",
      subjectType: "student",
      subjectId: "23JJ1A0599",
      origin: "workflow-e2e",
      actor: { id: managerId, name: "test-manager", role: "hostel_manager", roleContext: "administrative" },
    });

    // The manager approves a 15-day gate pass: authority bound is 3 days,
    // so this must be refused → the instance stays put and the refusal is
    // recorded (PR-05 would escalate from here).
    await expect(
      tw(
        c.id,
        "approve",
        { id: managerId, role: "hostel_manager", roleContext: "administrative" },
        "gate_pass",
        { durationDays: 15 },
      ),
    ).rejects.toThrow(/authority refused/);

    // The principal (institution-wide, no duration bound) approves the same
    // case: the instance moves to 'approved'.
    const res = await tw(
      c.id,
      "approve",
      { id: principalId, role: "principal", roleContext: "chief_warden" },
      "gate_pass",
      { durationDays: 15 },
    );
    expect(res.toState).toBe("approved");
  });

  it("authorize() cites the exact policy that allowed a decision", async () => {
    const { authorize } = await import("@/lib/institutional/workflow");

    const { randomUUID } = await import("crypto");
    const principalId = randomUUID();
    const { query } = await import("@/lib/postgres");
    await query(
      "INSERT INTO public.users (id, name, role) VALUES ($1,'test-principal','principal') ON CONFLICT (id) DO NOTHING",
      [principalId],
    );
    const decision = await authorize({
      actorId: principalId,
      role: "principal",
      context: "chief_warden",
      operation: "approve",
      caseType: "gate_pass",
      scope: "institution",
      authoritySource: "role",
    });
    expect(decision.allowed).toBe(true);
    // A decision record (PR-06) / audit row (PR-11) can cite this rule.
    expect(decision.rule).toMatch(/principal|gate_pass/);
  });
});
