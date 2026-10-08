import assert from "node:assert";
import {
  normalizeExitReason,
  requiresGatePass,
  CANONICAL_EXIT_FLOWS,
} from "../src/lib/student-exit-flow";
import {
  STAFF_REGISTER_A,
  STAFF_REGISTER_B,
} from "../src/lib/types";

console.log("Running register and exit-flow self-checks...");

// 1. Check canonical exit flows
assert.strictEqual(requiresGatePass("daily_outing"), false, "daily_outing should not require pass");
assert.strictEqual(requiresGatePass("home_in"), false, "home_in should not require pass");
assert.strictEqual(requiresGatePass("home_out"), true, "home_out should require pass");
assert.strictEqual(requiresGatePass("day_pass"), true, "day_pass should require pass");

// 2. Check alias normalization
assert.strictEqual(normalizeExitReason("Daily Outing"), "daily_outing");
assert.strictEqual(normalizeExitReason("Home In"), "home_in");
assert.strictEqual(normalizeExitReason("Home Out"), "home_out");
assert.strictEqual(normalizeExitReason("Day Out"), "day_pass");
assert.strictEqual(normalizeExitReason("Day Pass"), "day_pass");
assert.strictEqual(normalizeExitReason("Outing"), "daily_outing");
assert.strictEqual(normalizeExitReason("Leave"), "home_out");

// 3. Check CANONICAL_EXIT_FLOWS dictionary
assert.ok(CANONICAL_EXIT_FLOWS.daily_outing);
assert.ok(CANONICAL_EXIT_FLOWS.home_in);
assert.ok(CANONICAL_EXIT_FLOWS.home_out);
assert.ok(CANONICAL_EXIT_FLOWS.day_pass);

assert.strictEqual(CANONICAL_EXIT_FLOWS.daily_outing.requiresPass, false);
assert.strictEqual(CANONICAL_EXIT_FLOWS.home_in.requiresPass, false);
assert.strictEqual(CANONICAL_EXIT_FLOWS.home_out.requiresPass, true);
assert.strictEqual(CANONICAL_EXIT_FLOWS.day_pass.requiresPass, true);

// 4. Check Staff Register categories
assert.ok(STAFF_REGISTER_A.includes("teaching_faculty"));
assert.ok(STAFF_REGISTER_A.includes("assistant_professor"));
assert.ok(STAFF_REGISTER_A.includes("associate_professor"));
assert.ok(STAFF_REGISTER_A.includes("professor"));
assert.ok(STAFF_REGISTER_A.includes("hod"));

assert.ok(STAFF_REGISTER_B.includes("support_staff"));
assert.ok(STAFF_REGISTER_B.includes("security"));
assert.ok(STAFF_REGISTER_B.includes("maintenance"));
assert.ok(STAFF_REGISTER_B.includes("canteen"));
assert.ok(STAFF_REGISTER_B.includes("driver"));

console.log("✅ All registers and exit-flow invariant checks passed successfully!");
