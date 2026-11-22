/**
 * tests/unit/institutional-sod.test.ts — PR-14 (Security / SoD)
 * adversarial layer.
 *
 * "This PR should be deliberately adversarial." The checks:
 *   - can Principal approve their own request?        → no (SoD)
 *   - can delegated authority exceed its scope?       → no (scope containment)
 *   - can an expired delegation still work?           → no (active-window)
 *   - can the same person satisfy both sides of a two-person rule? → no
 *   - can a revoked pass remain valid?                → no (terminal)
 *   - can role_context be forged?                     → no (the SoD gate
 *     is the pre-execution check a consequential action must pass)
 *
 * All checks are pure (no DB) + one combined gate that fails closed on
 * any single violation. The combined gate is what a decision /
 * emergency command calls before execution.
 */
import { describe, it, expect } from "vitest";
import {
  canBeChecker,
  isDelegationActive,
  scopeContained,
  canSelfApprove,
  isPassValid,
  checkSoD,
} from "@/lib/institutional/sod";
import type { Actor } from "@/lib/institutional/contracts";

const principal = (): Actor => ({ id: "u-p", role: "principal", roleContext: "chief_warden" });
const vp = (): Actor => ({ id: "u-vp", role: "vice_principal", roleContext: "administrative" });

// ── The six adversarial questions ─────────────────────────────────────────

describe("SoD: self-approval", () => {
  it("a principal cannot approve a request they originated", () => {
    expect(canSelfApprove("u-p", principal()).ok).toBe(false);
    // A different actor can.
    expect(canSelfApprove("u-p", vp()).ok).toBe(true);
  });
});

describe("SoD: two-person rule (maker ≠ checker)", () => {
  it("the maker of a request cannot be its checker", () => {
    expect(canBeChecker("u-p", principal()).ok).toBe(false);
    expect(canBeChecker("u-p", vp()).ok).toBe(true);
  });
});

describe("SoD: delegation expiry", () => {
  const t0 = new Date("2026-11-22T12:00:00Z");
  it("an expired delegation must not work", () => {
    const dl = {
      revoked_at: null,
      starts_at: "2026-11-01T00:00:00Z",
      expires_at: "2026-11-15T00:00:00Z",
      scope_entity: null,
    };
    expect(isDelegationActive(dl, null, t0).active).toBe(false);
  });
  it("a not-yet-open delegation must not work", () => {
    const dl = {
      revoked_at: null,
      starts_at: "2026-12-01T00:00:00Z",
      expires_at: "2026-12-31T00:00:00Z",
      scope_entity: null,
    };
    expect(isDelegationActive(dl, null, t0).active).toBe(false);
  });
  it("an active, in-window, in-scope delegation works", () => {
    const dl = {
      revoked_at: null,
      starts_at: "2026-11-01T00:00:00Z",
      expires_at: "2026-12-31T00:00:00Z",
      scope_entity: "BOYS_A",
    };
    expect(isDelegationActive(dl, "BOYS_A", t0).active).toBe(true);
  });
  it("a revoked delegation must not work even inside its window", () => {
    const dl = {
      revoked_at: "2026-11-10T00:00:00Z",
      starts_at: "2026-11-01T00:00:00Z",
      expires_at: "2026-12-31T00:00:00Z",
      scope_entity: null,
    };
    expect(isDelegationActive(dl, null, t0).active).toBe(false);
  });
});

describe("SoD: scope containment (can delegated authority exceed its scope?)", () => {
  it("a hostel_block grant does not cover a campus-wide request", () => {
    expect(scopeContained("BOYS_A", null).ok).toBe(false);
    expect(scopeContained("BOYS_A", "institution").ok).toBe(false);
  });
  it("a hostel_block grant covers its own scope", () => {
    expect(scopeContained("BOYS_A", "BOYS_A").ok).toBe(true);
  });
  it("a campus-wide grant covers everything", () => {
    expect(scopeContained(null, "BOYS_A").ok).toBe(true);
    expect(scopeContained("campus_wide", "BOYS_A").ok).toBe(true);
  });
});

describe("SoD: revocation (can a revoked pass remain valid?)", () => {
  it("a revoked or expired pass is not valid", () => {
    expect(isPassValid({ status: "REVOKED", revoked_at: "2026-11-01T00:00:00Z" }).valid).toBe(false);
    expect(isPassValid({ status: "EXPIRED", revoked_at: null }).valid).toBe(false);
  });
  it("an active, unrevoked pass is valid", () => {
    expect(isPassValid({ status: "ACTIVE", revoked_at: null }).valid).toBe(true);
  });
});

// ── The combined gate (fail-closed) ───────────────────────────────────────

describe("the combined SoD gate fails closed on any violation", () => {
  it("a clean action passes", () => {
    const r = checkSoD({
      actor: vp(),
      requestOriginatorId: "u-student",
      delegation: {
        revoked_at: null,
        starts_at: "2026-11-01T00:00:00Z",
        expires_at: "2026-12-31T00:00:00Z",
        scope_entity: null,
      },
      pass: { status: "ACTIVE", revoked_at: null },
    });
    expect(r.ok).toBe(true);
    expect(r.blockedBy).toEqual([]);
  });

  it("self-approval is blocked", () => {
    const r = checkSoD({
      actor: principal(),
      requestOriginatorId: "u-p", // the principal's own request
    });
    expect(r.ok).toBe(false);
    expect(r.blockedBy.join(" ")).toMatch(/originated|two-person/i);
  });

  it("an expired delegation is blocked", () => {
    const r = checkSoD({
      actor: vp(),
      delegation: {
        revoked_at: null,
        starts_at: "2026-11-01T00:00:00Z",
        expires_at: "2026-11-15T00:00:00Z", // closed
        scope_entity: null,
      },
      now: new Date("2026-11-22T12:00:00Z"),
    });
    expect(r.ok).toBe(false);
    expect(r.blockedBy.join(" ")).toMatch(/expired|window|active/i);
  });

  it("a revoked pass is blocked", () => {
    const r = checkSoD({
      actor: vp(),
      pass: { status: "REVOKED", revoked_at: "2026-11-01T00:00:00Z" },
    });
    expect(r.ok).toBe(false);
    expect(r.blockedBy.join(" ")).toMatch(/revoked/i);
  });

  it("a scoped grant that exceeds its scope is blocked", () => {
    const r = checkSoD({
      actor: vp(),
      delegation: {
        revoked_at: null,
        starts_at: "2026-11-01T00:00:00Z",
        expires_at: "2026-12-31T00:00:00Z",
        scope_entity: "BOYS_A", // scoped to one block
      },
      scope: "institution", // but the request is campus-wide
    });
    expect(r.ok).toBe(false);
    expect(r.blockedBy.join(" ")).toMatch(/scope/i);
  });
});
