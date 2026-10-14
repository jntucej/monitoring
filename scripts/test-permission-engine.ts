/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert";
import {
  applyPermissionAction,
  PermissionRuleError,
  type RequestSnapshot,
} from "../src/lib/permission-workflow";

const baseReq = (over: Partial<RequestSnapshot> = {}): RequestSnapshot => ({
  id: "req-1", ticket_number: "HST-1001", workflow_type: "hostel",
  current_stage: "caretaker", status: "PENDING", hostel_scope: "girls",
  student_user_id: "stu-1", stage_history: [], document_required: false,
  document_url: null, biometric_hostel_at: null, biometric_gate_at: null,
  digital_signature: null, ...over,
});

const actor = { id: "u1", name: "Seetha", role: "caretaker" };

const r1 = applyPermissionAction(baseReq(), actor, { action: "APPROVE" });
assert.strictEqual(r1.updates.current_stage, "deputy_warden");
assert.strictEqual(r1.updates.status, "PENDING");

assert.throws(
  () => applyPermissionAction(baseReq(), { ...actor, role: "student" }, { action: "APPROVE" }),
  (e: any) => e instanceof PermissionRuleError && e.code === "FORBIDDEN_STAGE",
);

const r3 = applyPermissionAction(
  baseReq({ current_stage: "hostel_biometric", biometric_hostel_at: null }),
  { ...actor, role: "principal" },
  { action: "APPROVE" },
);
assert.strictEqual(r3.updates.current_stage, "main_gate");
assert.strictEqual(r3.updates.status, "PENDING");
assert.strictEqual(r3.effects.auditAction, "PERMISSION_HELD_FOR_BIOMETRIC");

assert.throws(
  () => applyPermissionAction(
    baseReq({ workflow_type: "exam", current_stage: "principal" }),
    { ...actor, role: "principal" },
    { action: "SIGN" },
  ),
  (e: any) => e instanceof PermissionRuleError && e.code === "DOCUMENT_MISSING",
);

assert.throws(
  () => applyPermissionAction(
    baseReq({ workflow_type: "exam", current_stage: "principal", document_url: "/tmp/x.pdf" }),
    { ...actor, role: "principal" },
    { action: "SIGN" },
  ),
  (e: any) => e instanceof PermissionRuleError && e.code === "SIGNATURE_HASH_MISSING",
);

assert.throws(
  () => applyPermissionAction(baseReq({ status: "REJECTED" }), actor, { action: "APPROVE" }),
  (e: any) => e instanceof PermissionRuleError && e.code === "TERMINAL_STATE",
);

assert.throws(
  () => applyPermissionAction(
    baseReq({ current_stage: "main_gate" }),
    { ...actor, role: "operator" },
    { action: "BIOMETRIC_GATE" },
  ),
  (e: any) => e instanceof PermissionRuleError && e.code === "HOSTEL_BIOMETRIC_MISSING",
);

console.log("✅ Permission engine invariants hold");
