/**
 * Regression check for the Smart Scheduling "apply" silent no-op.
 *
 * Before the fix, applyScheduleSuggestion() returned true even when it matched
 * no suggestion and wrote nothing. The route then reported success, logged a
 * SMART_SCHEDULE_APPLIED audit row, and the UI removed the card -- so every
 * apply was a silent no-op with a false audit trail.
 *
 * Run: npx tsx scripts/test-scheduling-apply.ts
 */
import assert from "node:assert/strict";
import { applyScheduleSuggestion, generateScheduleSuggestions } from "../src/lib/scheduling-assistant";

async function main() {
  const suggestions = await generateScheduleSuggestions();
  const ids = suggestions.map((s) => s.id);

  // 1. Unknown id must report failure, not success.
  assert.equal(
    await applyScheduleSuggestion("sug_does_not_exist"),
    false,
    "unknown suggestionId must return false",
  );

  // 2. A body object (the old handler's `await req.json()` result) must not be
  //    treated as a valid id -- this is the exact shape that caused the bug.
  assert.equal(
    await applyScheduleSuggestion({ suggestionId: "sug_1" } as unknown as string),
    false,
    "object body must not match a suggestion id",
  );

  // 3. operator_shifts carries shift_count, not gate hours, so there is no
  //    access rule to write. It must not silently report success.
  const shifts = suggestions.find((s) => s.category === "operator_shifts");
  assert.ok(shifts, "expected an operator_shifts suggestion to exist");
  assert.equal(
    await applyScheduleSuggestion(shifts.id),
    false,
    "suggestion without gate hours must return false instead of faking success",
  );

  console.log(`scheduling-apply regression check passed (${ids.length} suggestions known)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});