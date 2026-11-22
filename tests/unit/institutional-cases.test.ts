/**
 * tests/unit/institutional-cases.test.ts — PR-02 (Case Engine) exit condition.
 *
 * "You can create and track a case without touching Principal-specific
 * code." The case layer is domain-agnostic: the reference workflow this
 * PR wires is a gate-pass case — a gate event opens a GATE_PASS case and
 * it walks CREATED → OPEN → RESOLVED → CLOSED on the universal lifecycle.
 *
 * Pure parts (lifecycle + terminal states) run without a DB. The CRUD +
 * event-stream parts run when DATABASE_URL is set (CI provides
 * postgres:17 + the migration chain); otherwise they skip cleanly so a
 * bare `npm run test:vitest` with no DB still passes.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { CASE_STATES, isTerminalCaseState } from "@/lib/institutional/contracts";
import {
  createCase,
  transitionCase,
  getCase,
  listCases,
  addCaseEvidence,
  LIFECYCLE,
  type CaseAction,
} from "@/lib/institutional/cases";
import type { Actor, CaseState } from "@/lib/institutional/contracts";

const HAS_DB = !!process.env.DATABASE_URL;

/**
 * The case layer FKs created_by to public.users, so a DB-backed test must
 * use a real user id. Insert one in beforeAll and use its uuid; the
 * scratch DB is disposable, so leaving the row is fine.
 */
const actor = async (): Promise<Actor> => {
  const { query } = await import("@/lib/postgres");
  const id = randomUUID();
  await query(
    "INSERT INTO public.users (id, name, role) VALUES ($1,'test-institutional','operator') ON CONFLICT (id) DO NOTHING",
    [id],
  );
  return {
    id,
    name: "test-institutional",
    role: "operator",
    roleContext: "administrative",
  };
};

// ── Pure: lifecycle is closed and terminal states are recognized ─────────

describe("case lifecycle (pure)", () => {
  it("the universal lifecycle set is closed", () => {
    expect(CASE_STATES).toEqual(["CREATED", "OPEN", "RESOLVED", "CLOSED", "CANCELLED"]);
  });

  it("terminal states are exactly RESOLVED / CLOSED / CANCELLED", () => {
    expect(isTerminalCaseState("CREATED")).toBe(false);
    expect(isTerminalCaseState("OPEN")).toBe(false);
    expect(isTerminalCaseState("RESOLVED")).toBe(true);
    expect(isTerminalCaseState("CLOSED")).toBe(true);
    expect(isTerminalCaseState("CANCELLED")).toBe(true);
  });

  it("every non-terminal state has at least one legal move", () => {
    for (const s of ["CREATED", "OPEN", "RESOLVED"] as CaseState[]) {
      expect((LIFECYCLE[s] as CaseAction[]).length, `state ${s} must be movable`).toBeGreaterThan(0);
    }
    for (const s of ["CLOSED", "CANCELLED"] as CaseState[]) {
      expect(LIFECYCLE[s], `terminal state ${s} must have no moves`).toEqual([]);
    }
  });

  it("the reference gate-pass case walks the reference workflow", () => {
    // CREATED → open → OPEN → resolve → RESOLVED → close → CLOSED.
    // No principal-specific code anywhere in the path.
    expect(LIFECYCLE.CREATED).toContain("open");
    expect(LIFECYCLE.OPEN).toContain("resolve");
    expect(LIFECYCLE.RESOLVED).toContain("close");
    expect(LIFECYCLE.CLOSED).toEqual([]);
  });
});

// ── DB-backed: CRUD + event stream + evidence linking ────────────────────

describe("case CRUD + event stream (DB-backed)", () => {
  if (!HAS_DB) {
    it("skipped — no DATABASE_URL set", () => {
      // No-op so the file always has at least one test.
      expect(true).toBe(true);
    });
    return;
  }

  let caseId: string;
  let testActor: Actor;

  beforeAll(async () => {
    testActor = await actor();
    const c = await createCase({
      type: "gate_pass",
      subjectType: "student",
      subjectId: "23JJ1A0599",
      origin: "reference-gate-pass",
      risk: "LOW",
      actor: testActor,
    });
    caseId = c.id;
    // Ref shape: GATE_PASS-YYYY-NNNN
    expect(c.ref).toMatch(/^GATE_PASS-\d{4}-\d{4}$/);
    expect(c.state).toBe("CREATED");
  });

  afterAll(async () => {
    // Leave it in a terminal state so a re-run is idempotent.
    await transitionCase({ caseId, action: "cancel", detail: { reason: "test-teardown" }, actor: testActor })
    .catch(() => {});
  });

  it("a case starts CREATED and its event stream opens with 'created'", async () => {
    const c = await getCase(caseId);
    expect(c).not.toBeNull();
    expect(c!.state).toBe("CREATED");
    expect(c!.events.map((e) => e.event)).toContain("created");
  });

  it("the reference workflow: open → resolve → close", async () => {
    let c = await transitionCase({ caseId, action: "open", actor: testActor });
    expect(c.state).toBe("OPEN");
    c = await transitionCase({
      caseId,
      action: "resolve",
      detail: { decision: "approved" },
      actor: testActor,
    });
    expect(c.state).toBe("RESOLVED");
    c = await transitionCase({ caseId, action: "close", actor: testActor });
    expect(c.state).toBe("CLOSED");
  });

  it("an illegal transition from a terminal state throws", async () => {
    await expect(
      transitionCase({ caseId, action: "open" }),
    ).rejects.toThrow(/illegal case transition/);
  });

  it("evidence links to existing records without copying them", async () => {
    const { evidence_id } = await addCaseEvidence({
      caseId,
      kind: "scan",
      referenceId: randomUUID(),
      actor: testActor,
    });
    expect(evidence_id).toMatch(/^[0-9a-f-]{36}$/i);
    const c = await getCase(caseId);
    expect(c!.events.map((e) => e.event)).toContain("evidence_added");
  });

  it("listCases returns the created case", async () => {
    const list = await listCases({ type: "gate_pass", limit: 200 });
    expect(list.some((x) => x.id === caseId)).toBe(true);
  });
});
