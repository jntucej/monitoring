import assert from "assert";
import { DEFAULT_PASS_TYPES, getPassTypeName } from "../src/hooks/usePassTypes";

console.log("Running Pass Types Logic Verification...");

// 1. Verify default pass types exist and are valid
assert(Array.isArray(DEFAULT_PASS_TYPES), "DEFAULT_PASS_TYPES should be an array");
assert(DEFAULT_PASS_TYPES.length >= 2, "Should have at least 2 default pass types");

const passCodes = DEFAULT_PASS_TYPES.map((t) => t.code);
assert(passCodes.includes("day_pass"), "Should contain day_pass");
assert(passCodes.includes("home_out"), "Should contain home_out");

// 2. Verify getPassTypeName helper
assert.strictEqual(getPassTypeName("day_pass"), "Day Pass");
assert.strictEqual(getPassTypeName("home_out"), "Home Out");
assert.strictEqual(getPassTypeName("Custom Reason"), "Custom Reason");

console.log("✅ Pass Types Logic Verification Passed!");
