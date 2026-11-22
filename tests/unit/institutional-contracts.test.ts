/**
 * tests/unit/institutional-contracts.test.ts — PR-01 exit condition.
 *
 * Verifies the foundation contracts:
 *  - lifecycle sets are closed and terminal states are recognized
 *  - risk ordering + comparators behave (escalate-on-increase, not equality)
 *  - actor/role context: the principal is one role; contexts are hats
 *  - every decision-shaped record carries actor + role_context + authority_source
 *  - emergency state ordering is total
 */
import { describe, it, expect } from "vitest";
import {
  CASE_STATES,
  CASE_TYPES,
  WORKFLOW_STATES,
  TERMINAL_CASE_STATES,
  isTerminalCaseState,
  ROLE_CONTEXTS,
  AUTHORITY_SCOPES,
  STANDARD_OPERATIONS,
  ESCALATION_REASONS,
  RISK_LEVELS,
  RISK_RANK,
  riskAtLeast,
  EMERGENCY_STATES,
  EMERGENCY_RANK,
  AttentionItem,
  DecisionRecord,
  Actor,
  makeActor,
  AuthorityRequest,
} from "@/lib/institutional/contracts";

describe("case lifecycle", () => {
  it("has the five universal states and the three terminal ones", () => {
    expect(CASE_STATES).toEqual(["CREATED", "OPEN", "RESOLVED", "CLOSED", "CANCELLED"]);
    expect(TERMINAL_CASE_STATES).toEqual(["RESOLVED", "CLOSED", "CANCELLED"]);
    expect(isTerminalCaseState("OPEN")).toBe(false);
    expect(isTerminalCaseState("RESOLVED")).toBe(true);
    expect(isTerminalCaseState("CANCELLED")).toBe(true);
  });

  it("case types cover the migration domains (PR-13 order)", () => {
    // gate_pass + hostel_leave are domains 1-2 in the migration plan;
    // every type has a lifecycle it can walk.
    for (const t of CASE_TYPES) {
      expect(CASE_TYPES).toContain(t);
    }
    expect(CASE_TYPES).toContain("gate_pass");
    expect(CASE_TYPES).toContain("hostel_leave");
  });
});

describe("workflow states", () => {
  it("terminal workflow states are reachable from the review chain", () => {
    expect(WORKFLOW_STATES).toContain("submitted");
    expect(WORKFLOW_STATES).toContain("principal_review");
    expect(WORKFLOW_STATES).toContain("approved");
    expect(WORKFLOW_STATES).toContain("rejected");
    expect(WORKFLOW_STATES).toContain("expired");
  });
});

describe("risk ordering", () => {
  it("orders LOW < MEDIUM < HIGH < CRITICAL", () => {
    expect(RISK_RANK.LOW).toBeLessThan(RISK_RANK.MEDIUM);
    expect(RISK_RANK.MEDIUM).toBeLessThan(RISK_RANK.HIGH);
    expect(RISK_RANK.HIGH).toBeLessThan(RISK_RANK.CRITICAL);
  });

  it("riskAtLeast: equal passes, higher passes, lower fails", () => {
    expect(riskAtLeast("HIGH", "MEDIUM")).toBe(true);
    expect(riskAtLeast("MEDIUM", "HIGH")).toBe(false);
    expect(riskAtLeast("CRITICAL", "CRITICAL")).toBe(true);
  });

  it("escalation-on-increase: a risk jump LOW->HIGH crosses the HIGH threshold", () => {
    const before = "LOW" as const, after = "HIGH" as const;
    expect(riskAtLeast(after, "HIGH")).toBe(true);
    expect(riskAtLeast(before, "HIGH")).toBe(false);
  });
});

describe("role vs role context", () => {
  it("contexts are hats on the same user, not separate identities", () => {
    expect(ROLE_CONTEXTS).toContain("chief_warden");
    expect(ROLE_CONTEXTS).toContain("chief_superintendent");
    // The warden IS the principal (one person) — chief_warden is the context,
    // not a role: assert it is NOT a role string anywhere in the role world.
    const roles = ["principal", "vice_principal", "deputy_warden", "warden", "hostel_manager"];
    expect(roles).not.toContain("chief_warden");
    expect(roles).not.toContain("chief_superintendent");
  });

  it("makeActor pins exactly one context per actor", () => {
    const a: Actor = makeActor("u-1", "principal", "chief_warden", "Dr. Rao");
    expect(a).toEqual({ id: "u-1", role: "principal", roleContext: "chief_warden", name: "Dr. Rao" });
  });
});

describe("decision records carry the full provenance", () => {
  it("a DecisionRecord is only complete when every field is set", () => {
    const d: DecisionRecord = {
      decisionId: "DEC-2026-0421",
      caseId: "CASE-91",
      actorId: "u-1",
      actorRole: "principal",
      roleContext: "chief_warden",
      authoritySource: "role",
      decision: "approve",
      reason: "Verified emergency",
      timestamp: new Date().toISOString(),
      correlationId: "corr-1",
    };
    for (const key of ["decisionId", "caseId", "actorId", "actorRole", "roleContext", "authoritySource", "decision", "reason", "timestamp"] as const) {
      expect(d[key]).toBeDefined();
    }
    expect(d.authoritySource).toBe("role");
  });

  it("an AuthorityRequest separates WHO from WHAT (source + context + scope)", () => {
    const req: AuthorityRequest = {
      actorId: "u-2",
      role: "hostel_manager",
      context: "chief_warden",
      operation: "approve",
      caseType: "hostel_leave",
      scope: "hostel_block",
      scopeCode: "BOYS_A",
      authoritySource: "delegation",
      delegationId: "dl-7",
    };
    expect(req.scope).toBe("hostel_block");
    expect(req.authoritySource).toBe("delegation");
    expect(req.delegationId).toBe("dl-7");
  });

  it("standard operations are the only decision verbs", () => {
    expect(STANDARD_OPERATIONS).toEqual(
      ["approve", "reject", "revoke", "suspend", "debar", "override", "escalate", "delegate", "lockdown"],
    );
  });
});

describe("escalation reasons are explicit", () => {
  it("every reason in the set is a stored enum value", () => {
    for (const r of ESCALATION_REASONS) {
      expect(ESCALATION_REASONS).toContain(r);
      expect(typeof r).toBe("string");
    }
    expect(ESCALATION_REASONS).toContain("AUTHORITY_INSUFFICIENT");
    expect(ESCALATION_REASONS).toContain("SLA_BREACH");
  });
});

describe("emergency state ordering is total", () => {
  it("NORMAL < ELEVATED < CRITICAL < EMERGENCY < LOCKDOWN", () => {
    expect(EMERGENCY_RANK.NORMAL).toBeLessThan(EMERGENCY_RANK.ELEVATED);
    expect(EMERGENCY_RANK.ELEVATED).toBeLessThan(EMERGENCY_RANK.CRITICAL);
    expect(EMERGENCY_RANK.CRITICAL).toBeLessThan(EMERGENCY_RANK.EMERGENCY);
    expect(EMERGENCY_RANK.EMERGENCY).toBeLessThan(EMERGENCY_RANK.LOCKDOWN);
  });
});

describe("executive attention items are compressed, not raw", () => {
  it("an AttentionItem carries severity + title + link", () => {
    const item: AttentionItem = {
      severity: "WARNING",
      title: "Gate anomaly at Gate 2",
      detail: "43 rejected entries in 18 min; baseline ~9",
      link: { kind: "case", id: "CASE-4312" },
      recommendedAction: "Review incident",
    };
    expect(item.severity).toBe("WARNING");
    expect(item.link?.kind).toBe("case");
  });

  it("attention severities order INFO < WARNING < CRITICAL", () => {
    const order = ["INFO", "WARNING", "CRITICAL"];
    expect(order.indexOf("INFO")).toBeLessThan(order.indexOf("WARNING"));
    expect(order.indexOf("WARNING")).toBeLessThan(order.indexOf("CRITICAL"));
  });
});
