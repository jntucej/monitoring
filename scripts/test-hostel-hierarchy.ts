/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Task 6.1 — hostel-permission hierarchy pure-logic test runner.
 *
 * Run: npx tsx scripts/test-hostel-hierarchy.ts
 *
 * Mirrors the assertion style of scripts/test-permission-engine.ts:
 *   - no test framework, a hand-rolled pass/fail runner on top of
 *     node:assert/strict
 *   - assertions are against the REAL exported functions in
 *     src/lib/permission-workflow.ts (do not stub/mock)
 *
 * The script exits 0 when every case passes and non-zero otherwise.
 */
import assert from "node:assert/strict";
import {
  L1_ROLE,
  L2_ROLE,
  L3_ROLE,
  L4_ROLE,
  BULK_THRESHOLD,
  REASON_LEVEL_MAP,
  resolveInitialHostelStage,
  nextHostelLevel,
  levelsAbove,
  forwardTicket,
  directGeneratePass,
  requiresStepup,
  resolveEntryOptions,
  PermissionRuleError,
  type RequestSnapshot,
  type ActorContext,
} from "../src/lib/permission-workflow";

// ── Minimal valid fixtures ─────────────────────────────────────────────
const baseReq = (over: Partial<RequestSnapshot> = {}): RequestSnapshot => ({
  id: "req-hostel-1",
  ticket_number: "HOST-9001",
  workflow_type: "hostel",
  current_stage: L1_ROLE,
  status: "PENDING",
  hostel_scope: "girls",
  student_user_id: "stu-1",
  stage_history: [],
  document_required: false,
  document_url: null,
  biometric_hostel_at: null,
  biometric_gate_at: null,
  digital_signature: null,
  ...over,
});

const caretaker: ActorContext = { id: "u-caretaker", name: "Caretaker", role: L1_ROLE };
const deputyWarden: ActorContext = { id: "u-dw", name: "Deputy Warden", role: L2_ROLE };
const hostelManager: ActorContext = { id: "u-hm", name: "Hostel Manager", role: L3_ROLE };
const principal: ActorContext = { id: "u-p", name: "Principal", role: L4_ROLE };

// ── Tiny assertion runner (no framework) ───────────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];

type Case = { name: string; fn: () => void };
const cases: Case[] = [];
const c = (name: string, fn: () => void) => cases.push({ name, fn });

// Asserts `fn` throws a PermissionRuleError with the given code.
function expectRuleError(fn: () => void, code: string, label: string) {
  assert.throws(
    fn,
    (e: unknown) => e instanceof PermissionRuleError && e.code === code,
    `${label} — expected PermissionRuleError(${code})`,
  );
}

// ── Constants (must match the implementation) ─────────────────────────
c("L1/L2/L3/L4 role constants", () => {
  assert.equal(L1_ROLE, "caretaker");
  assert.equal(L2_ROLE, "deputy_warden");
  assert.equal(L3_ROLE, "hostel_manager");
  assert.equal(L4_ROLE, "principal");
  assert.equal(BULK_THRESHOLD, 5);
});

c("resolveInitialHostelStage() === L1", () => {
  assert.equal(resolveInitialHostelStage(), L1_ROLE);
});

c("levelsAbove(L1) === [L2, L3, L4]", () => {
  assert.deepEqual(levelsAbove(L1_ROLE), [L2_ROLE, L3_ROLE, L4_ROLE]);
});

c("levelsAbove(L4) === []", () => {
  assert.deepEqual(levelsAbove(L4_ROLE), []);
});

c("nextHostelLevel chain: L1->L2, L2->L3, L3->L4, L4->null", () => {
  assert.equal(nextHostelLevel(L1_ROLE), L2_ROLE);
  assert.equal(nextHostelLevel(L2_ROLE), L3_ROLE);
  assert.equal(nextHostelLevel(L3_ROLE), L4_ROLE);
  assert.equal(nextHostelLevel(L4_ROLE), null);
});

c("REASON_LEVEL_MAP maps L1 and L3 reasons", () => {
  assert.equal(REASON_LEVEL_MAP.daily_outing, L1_ROLE);
  assert.equal(REASON_LEVEL_MAP.home_out, L1_ROLE);
  assert.equal(REASON_LEVEL_MAP.day_pass, L1_ROLE);
  assert.equal(REASON_LEVEL_MAP.emergency, L3_ROLE);
  assert.equal(REASON_LEVEL_MAP.special_leave, L3_ROLE);
});

c("REASON_LEVEL_MAP routes day_scholar_out to 'auto'", () => {
  assert.equal(REASON_LEVEL_MAP.day_scholar_out, "auto");
});

// ── forwardTicket ───────────────────────────────────────────────────────
c("forwardTicket rejects target at/below the actor's level (FORWARD_TARGET_INVALID)", () => {
  // Same level
  expectRuleError(
    () => forwardTicket({ ticket: baseReq({ current_stage: L2_ROLE }), actor: deputyWarden, targetRole: L2_ROLE, comment: "same level", stepupVerified: false }),
    "FORWARD_TARGET_INVALID",
    "forward to same level",
  );
  // Lower level
  expectRuleError(
    () => forwardTicket({ ticket: baseReq({ current_stage: L2_ROLE }), actor: deputyWarden, targetRole: L1_ROLE, comment: "lower level", stepupVerified: false }),
    "FORWARD_TARGET_INVALID",
    "forward to lower level",
  );
});

c("forwardTicket rejects an empty/whitespace comment (FORWARD_COMMENT_REQUIRED)", () => {
  expectRuleError(
    () => forwardTicket({ ticket: baseReq(), actor: caretaker, targetRole: L2_ROLE, comment: "", stepupVerified: false }),
    "FORWARD_COMMENT_REQUIRED",
    "empty comment",
  );
  expectRuleError(
    () => forwardTicket({ ticket: baseReq(), actor: caretaker, targetRole: L2_ROLE, comment: "   \t", stepupVerified: false }),
    "FORWARD_COMMENT_REQUIRED",
    "whitespace comment",
  );
});

c("forwardTicket happy path to L2 from L1 produces routing fields", () => {
  const res = forwardTicket({ ticket: baseReq(), actor: caretaker, targetRole: L2_ROLE, comment: "escalating to deputy", stepupVerified: false });
  assert.equal(res.updates.current_stage, L2_ROLE);
  assert.equal(res.updates.routed_to_role, L2_ROLE);
  assert.equal(res.updates.forwarded_from_role, L1_ROLE);
  assert.equal(res.updates.forward_comment, "escalating to deputy");
  assert.equal(res.effects.auditAction, "PERMISSION_HOSTEL_FORWARDED");
  assert.ok(typeof res.updates.stepup_verified_at === "undefined", "no stepup_verified_at when not verified");
});

c("forwardTicket to L4 requires step-up when not verified (STEPUP_REQUIRED)", () => {
  expectRuleError(
    () => forwardTicket({ ticket: baseReq(), actor: caretaker, targetRole: L4_ROLE, comment: "to principal", stepupVerified: false }),
    "STEPUP_REQUIRED",
    "forward to L4 unverified",
  );
  // With verified step-up it succeeds and records stepup_verified_at
  const ok = forwardTicket({ ticket: baseReq(), actor: caretaker, targetRole: L4_ROLE, comment: "to principal", stepupVerified: true });
  assert.equal(ok.updates.current_stage, L4_ROLE);
  assert.ok(typeof ok.updates.stepup_verified_at === "string", "stepup_verified_at recorded");
});

// ── directGeneratePass ──────────────────────────────────────────────────
c("directGeneratePass rejects when actor.role === L1 (DIRECT_GEN_FORBIDDEN)", () => {
  expectRuleError(
    () => directGeneratePass({ actor: caretaker, studentUserId: "stu-1", reason: "home_out", from: "Home", to: null, note: "n", stepupVerified: true }),
    "DIRECT_GEN_FORBIDDEN",
    "caretaker direct-generate",
  );
});

c("directGeneratePass works from L2 (no step-up) with clean result", () => {
  const res = directGeneratePass({ actor: deputyWarden, studentUserId: "stu-1", reason: "home_out", from: "Home", to: "Campus", note: "direct", stepupVerified: false });
  assert.equal(res.updates.status, "APPROVED");
  assert.equal(res.updates.current_stage, "completed");
  assert.equal(res.updates.direct_generated, true);
  assert.equal(res.updates.reason, "home_out");
  assert.equal(res.effects.auditAction, "PERMISSION_DIRECT_GENERATED");
});

c("directGeneratePass from L3/L4 requires step-up when not verified (STEPUP_REQUIRED)", () => {
  expectRuleError(
    () => directGeneratePass({ actor: hostelManager, studentUserId: "stu-1", reason: "day_pass", from: "Home", to: null, stepupVerified: false }),
    "STEPUP_REQUIRED",
    "L3 direct-generate unverified",
  );
  const ok = directGeneratePass({ actor: principal, studentUserId: "stu-1", reason: "day_pass", from: "Home", to: null, stepupVerified: true });
  assert.equal(ok.updates.direct_generated, true);
  assert.ok(typeof ok.updates.stepup_verified_at === "string");
});

// ── requiresStepup: TRUE cases ──────────────────────────────────────────
c("requiresStepup TRUE: forward -> principal (target L4)", () => {
  assert.equal(requiresStepup({ actorRole: L1_ROLE, action: "forward", targetRole: L4_ROLE }), true);
});
c("requiresStepup TRUE: direct_generate from L3", () => {
  assert.equal(requiresStepup({ actorRole: L3_ROLE, action: "direct_generate" }), true);
});
c("requiresStepup TRUE: direct_generate from L4", () => {
  assert.equal(requiresStepup({ actorRole: L4_ROLE, action: "direct_generate" }), true);
});
c("requiresStepup TRUE: override_rejection", () => {
  assert.equal(requiresStepup({ actorRole: L2_ROLE, action: "override_rejection" }), true);
});
c("requiresStepup TRUE: reason 'emergency'", () => {
  assert.equal(requiresStepup({ actorRole: L2_ROLE, action: "direct_generate", reason: "emergency" }), true);
});
c("requiresStepup TRUE: reason 'special_leave'", () => {
  assert.equal(requiresStepup({ actorRole: L2_ROLE, action: "direct_generate", reason: "special_leave" }), true);
});
c("requiresStepup TRUE: studentPriorViolations >= 3", () => {
  assert.equal(requiresStepup({ actorRole: L2_ROLE, action: "approve", studentPriorViolations: 3 }), true);
  assert.equal(requiresStepup({ actorRole: L2_ROLE, action: "approve", studentPriorViolations: 5 }), true);
});
c("requiresStepup TRUE: dailyBulkCount >= BULK_THRESHOLD (5)", () => {
  assert.equal(requiresStepup({ actorRole: L2_ROLE, action: "approve", dailyBulkCount: 5 }), true);
  assert.equal(requiresStepup({ actorRole: L2_ROLE, action: "approve", dailyBulkCount: 10 }), true);
});

// ── requiresStepup: FALSE case ──────────────────────────────────────────
c("requiresStepup FALSE: L1 routine approve of daily_outing (no violations, no bulk)", () => {
  assert.equal(
    requiresStepup({ actorRole: L1_ROLE, action: "approve", reason: "daily_outing" }),
    false,
  );
});

c("requiresStepup boundary: studentPriorViolations=2 and dailyBulkCount=4 stay FALSE", () => {
  assert.equal(requiresStepup({ actorRole: L2_ROLE, action: "approve", studentPriorViolations: 2 }), false);
  assert.equal(requiresStepup({ actorRole: L2_ROLE, action: "approve", dailyBulkCount: 4 }), false);
});

// ── resolveEntryOptions (gate operator button matrix) ───────────────────
c("resolveEntryOptions('daily_outing','hosteller') pins return_to_hostel", () => {
  assert.deepEqual(
    resolveEntryOptions("daily_outing", "hosteller"),
    { buttons: ["return_to_hostel"], allowsTypeChoice: false },
  );
});

c("resolveEntryOptions('day_pass','hosteller') pins return_to_hostel", () => {
  assert.deepEqual(
    resolveEntryOptions("day_pass", "hosteller"),
    { buttons: ["return_to_hostel"], allowsTypeChoice: false },
  );
});

c("resolveEntryOptions('home_out','hosteller') offers home_in/day_scholar_in with type choice", () => {
  assert.deepEqual(
    resolveEntryOptions("home_out", "hosteller"),
    { buttons: ["home_in", "day_scholar_in"], allowsTypeChoice: true },
  );
});

c("resolveEntryOptions('day_scholar_out','day_scholar') pins day_scholar_in", () => {
  assert.deepEqual(
    resolveEntryOptions("day_scholar_out", "day_scholar"),
    { buttons: ["day_scholar_in"], allowsTypeChoice: false },
  );
});

c("resolveEntryOptions(null,'hosteller') offers home_in/day_scholar_in with type choice", () => {
  assert.deepEqual(
    resolveEntryOptions(null, "hosteller"),
    { buttons: ["home_in", "day_scholar_in"], allowsTypeChoice: true },
  );
});

c("resolveEntryOptions unknown reason defaults to home_in/day_scholar_in with type choice", () => {
  assert.deepEqual(
    resolveEntryOptions("some_unknown_reason", "hosteller"),
    { buttons: ["home_in", "day_scholar_in"], allowsTypeChoice: true },
  );
});

// ── Run the runner ──────────────────────────────────────────────────────
for (const case_ of cases) {
  try {
    case_.fn();
    passed++;
  } catch (err) {
    failed++;
    const msg = err instanceof Error ? err.message : String(err);
    failures.push(`${case_.name}:\n${msg}`);
  }
}

const total = passed + failed;
console.log("▸ Hostel-permission hierarchy invariants");
for (const f of failures) {
  console.error("  ✗ FAIL:", f);
}
console.log(`\n${passed}/${total} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
console.log("✅ Hostel-permission hierarchy invariants hold");
process.exit(0);
