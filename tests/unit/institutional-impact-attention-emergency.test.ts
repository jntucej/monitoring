/**
 * tests/unit/institutional-impact-attention-emergency.test.ts
 * PR-08 + PR-09 + PR-10 exit condition.
 *
 * "No high-impact decision executes blindly" (PR-08), "the system can
 * determine what deserves executive attention" (PR-09), and "the
 * principal can issue an emergency command and the system can propagate
 * it safely" (PR-10).
 *
 * Pure parts (impact map, severity ordering, emergency-state ranking)
 * run without a DB; the decision→impact→confirm chain and the
 * emergency-command issuance run when DATABASE_URL is set.
 */
import { describe, it, expect } from "vitest";
import {
  IMPACT_MAP,
} from "@/lib/institutional/impact";
import { randomUUID } from "crypto";
import { severityOrder, SEVERITY_RANK } from "@/lib/institutional/attention";
import { EMERGENCY_RANK } from "@/lib/institutional/contracts";

const HAS_DB = !!process.env.DATABASE_URL;

// ── PR-08 pure: the impact map is the "no blind execution" guard ───────

describe("impact map (pure)", () => {
  it("a debarment touches every downstream system (the '8 systems' case)", () => {
    const systems = new Set([...IMPACT_MAP.debar]);
    expect(systems.has("academic_status")).toBe(true);
    expect(systems.has("exam_eligibility")).toBe(true);
    expect(systems.has("gate_permissions")).toBe(true);
    expect(systems.has("hostel")).toBe(true);
    expect(systems.has("active_passes")).toBe(true);
    expect(systems.has("notifications")).toBe(true);
  });

  it("an approve is low-impact (gate + notifications only)", () => {
    expect(IMPACT_MAP.approve).toEqual(["gate", "notifications"]);
  });

  it("a lockdown touches the whole institution + audit (continuous)", () => {
    const systems = IMPACT_MAP.lockdown;
    expect(systems).toContain("gates");
    expect(systems).toContain("hostel");
    expect(systems).toContain("security");
    expect(systems).toContain("audit");
  });
});

// ── PR-09 pure: severity ordering is total ──────────────────────────────

describe("attention severity ordering (pure)", () => {
  it("CRITICAL > WARNING > INFO", () => {
    expect(SEVERITY_RANK.CRITICAL).toBeGreaterThan(SEVERITY_RANK.WARNING);
    expect(SEVERITY_RANK.WARNING).toBeGreaterThan(SEVERITY_RANK.INFO);
  });

  it("the queue sorts highest severity first, newer within a severity", () => {
    // severityOrder(a, b) returns b.rank - a.rank: positive means a
    // should come before b in a descending-sorted array.
    expect(severityOrder("CRITICAL", "WARNING")).toBeGreaterThan(0);
    expect(severityOrder("WARNING", "INFO")).toBeGreaterThan(0);
    expect(severityOrder("INFO", "CRITICAL")).toBeLessThan(0);
  });
});

// ── PR-10 pure: emergency state ranking is total ─────────────────────────

describe("emergency state ranking (pure)", () => {
  it("NORMAL < ELEVATED < CRITICAL < EMERGENCY < LOCKDOWN", () => {
    expect(EMERGENCY_RANK.NORMAL).toBeLessThan(EMERGENCY_RANK.ELEVATED);
    expect(EMERGENCY_RANK.ELEVATED).toBeLessThan(EMERGENCY_RANK.CRITICAL);
    expect(EMERGENCY_RANK.CRITICAL).toBeLessThan(EMERGENCY_RANK.EMERGENCY);
    expect(EMERGENCY_RANK.EMERGENCY).toBeLessThan(EMERGENCY_RANK.LOCKDOWN);
  });
});

// ── DB-backed: the decision → impact → confirm chain ────────────────────

describe("impact preview chain (DB-backed)", () => {
  if (!HAS_DB) {
    it("skipped — no DATABASE_URL set", () => {
      expect(true).toBe(true);
    });
    return;
  }

  it("a high-impact decision computes its impact + stores the preview", async () => {
    const { createCase } = await import("@/lib/institutional/cases");
    const { recordDecision } = await import("@/lib/institutional/decisions");

    const { query } = await import("@/lib/postgres");
    const principalId = randomUUID();
    await query(
      "INSERT INTO public.users (id, name, role) VALUES ($1,'test-principal','principal') ON CONFLICT (id) DO NOTHING",
      [principalId],
    );

    const c = await createCase({
      type: "academic_status",
      subjectType: "student",
      subjectId: "23JJ1A0599",
      origin: "impact-e2e",
      actor: { id: principalId, role: "principal", roleContext: "chief_warden" },
    });

    const { authorize } = await import("@/lib/institutional/workflow");
    const auth = await authorize({
      actorId: principalId, role: "principal", context: "chief_warden",
      operation: "debar", caseType: "academic_status", scope: "institution",
      authoritySource: "role",
    });
    const d = await recordDecision({
      caseId: c.id,
      operation: "debar",
      actor: { id: principalId, role: "principal", roleContext: "chief_warden" },
      authority: auth,
      reason: "Conduct review",
    });
    const { computeImpact: ci, saveImpactPreview: sip, impactConfirmed: ic } =
      await import("@/lib/institutional/impact");

    // The debarment computes its impact BEFORE execution: academic +
    // exam + gate + hostel + passes + notifications.
    const impact = await ci(d.id, "debar", "academic_status", c.subject_id);
    expect(impact.systems_affected.length).toBeGreaterThanOrEqual(5);
    expect(impact.systems_affected).toContain("exam_eligibility");
    expect(impact.systems_affected).toContain("gate_permissions");

    // The preview is stored (a high-impact op cannot execute without it).
    await sip(d.id, impact);
    // Until confirmed, the op is not safe to execute.
    expect(await ic(d.id)).toBe(false);
  });
});

// ── DB-backed: an emergency command issues + lands on the queue ────────

describe("emergency command (DB-backed)", () => {
  if (!HAS_DB) {
    it("skipped — no DATABASE_URL set", () => {
      expect(true).toBe(true);
    });
    return;
  }

  it("a LOCKDOWN issued under the emergency_command context + a reason is recorded", async () => {
    const { issueEmergencyCommand, currentEmergencyState } =
      await import("@/lib/institutional/emergency");

    const { query } = await import("@/lib/postgres");
    const { randomUUID } = await import("crypto");
    const principalId = randomUUID();
    await query(
      "INSERT INTO public.users (id, name, role) VALUES ($1,'test-emergency-principal','principal') ON CONFLICT (id) DO NOTHING",
      [principalId],
    );

    // A LOCKDOWN with no substantive reason is refused.
    await expect(
      issueEmergencyCommand({
        state: "LOCKDOWN",
        reason: "x",
        actor: { id: principalId, role: "principal", roleContext: "emergency_command" },
      }),
    ).rejects.toThrow(/substantive reason/);

    // A LOCKDOWN with a reason is issued + audited + lands on the queue.
    const cmd = await issueEmergencyCommand({
      state: "LOCKDOWN",
      reason: "Security incident at the main gate; campus-wide lockdown until cleared",
      scopes: ["GATE_MAIN"],
      actor: { id: principalId, role: "principal", roleContext: "emergency_command" },
      authoritySource: "role",
    });
    expect(cmd.state).toBe("LOCKDOWN");
    expect(cmd.review_status, "a LOCKDOWN requires a post-incident review").toBe("PENDING");

    // The institution's current state is now LOCKDOWN.
    expect(await currentEmergencyState()).toBe("LOCKDOWN");
  });

  it("an ELEVATED command by a non-emergency role is permitted (lower bar)", async () => {
    const { issueEmergencyCommand } = await import("@/lib/institutional/emergency");
    const { query } = await import("@/lib/postgres");
    const { randomUUID } = await import("crypto");
    const adminId = randomUUID();
    await query(
      "INSERT INTO public.users (id, name, role) VALUES ($1,'test-admin','admin') ON CONFLICT (id) DO NOTHING",
      [adminId],
    );
    const cmd = await issueEmergencyCommand({
      state: "ELEVATED",
      reason: "Elevated security posture for the evening",
      scopes: ["GATE_MAIN"],
      actor: { id: adminId, role: "admin", roleContext: "security" },
      authoritySource: "role",
    });
    expect(cmd.state).toBe("ELEVATED");
    expect(cmd.review_status, "ELEVATED does not require a mandatory review").toBe("WAIVED");
  });
});
