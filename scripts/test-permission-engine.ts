/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert";
import {
  applyPermissionAction,
  PermissionRuleError,
  canApproveAtStage,
  canApproveAtStageWithBranchResult,
  resolveNextStage,
  resolveInitialStage,
  type RequestSnapshot,
} from "../src/lib/permission-workflow";

const baseReq = (over: Partial<RequestSnapshot> = {}): RequestSnapshot => ({
  id: "req-1", ticket_number: "HOST-1001", workflow_type: "hostel",
  current_stage: "caretaker", status: "PENDING", hostel_scope: "girls",
  student_user_id: "stu-1", stage_history: [], document_required: false,
  document_url: null, biometric_hostel_at: null, biometric_gate_at: null,
  digital_signature: null, ...over,
});

const actor = { id: "u1", name: "Seetha", role: "caretaker" };

// APPROVE advances caretaker -> deputy_warden
const r1 = applyPermissionAction(baseReq(), actor, { action: "APPROVE" });
assert.strictEqual(r1.updates.current_stage, "deputy_warden");
assert.strictEqual(r1.updates.status, "PENDING");

// Student is not authorized at the caretaker stage
assert.throws(
  () => applyPermissionAction(baseReq(), { ...actor, role: "student" }, { action: "APPROVE" }),
  (e: any) => e instanceof PermissionRuleError && e.code === "FORBIDDEN_STAGE",
);

// APPROVE at warden_or_principal -> completed (hostel chain: ...warden_or_principal -> completed)
const r3 = applyPermissionAction(
  baseReq({ current_stage: "warden_or_principal" }),
  { ...actor, role: "principal" },
  { action: "APPROVE" },
);
assert.strictEqual(r3.updates.current_stage, "completed");
assert.strictEqual(r3.updates.status, "APPROVED");
assert.strictEqual(r3.effects.auditAction, "PERMISSION_APPROVED");

// CANCEL sets terminal CANCELLED status (admin role passes the stage gate;
// the owner check lives in the L4 route, not in the pure engine)
const rCancel = applyPermissionAction(
  baseReq({ status: "PENDING" }),
  { id: "admin-1", name: "Admin", role: "admin" },
  { action: "CANCEL" },
);
assert.strictEqual(rCancel.updates.status, "CANCELLED");
assert.strictEqual(rCancel.updates.current_stage, "cancelled");

// CANCEL is blocked from terminal states
assert.throws(
  () => applyPermissionAction(
    baseReq({ status: "CANCELLED" }),
    { ...actor, role: "admin" },
    { action: "CANCEL" },
  ),
  (e: any) => e instanceof PermissionRuleError && e.code === "TERMINAL_STATE",
);

// SIGN with no document -> DOCUMENT_MISSING
assert.throws(
  () => applyPermissionAction(
    baseReq({ workflow_type: "exam", current_stage: "principal" }),
    { ...actor, role: "principal" },
    { action: "SIGN" },
  ),
  (e: any) => e instanceof PermissionRuleError && e.code === "DOCUMENT_MISSING",
);

// SIGN with document but no hash -> SIGNATURE_HASH_MISSING
assert.throws(
  () => applyPermissionAction(
    baseReq({ workflow_type: "exam", current_stage: "principal", document_url: "/tmp/x.pdf" }),
    { ...actor, role: "principal" },
    { action: "SIGN" },
  ),
  (e: any) => e instanceof PermissionRuleError && e.code === "SIGNATURE_HASH_MISSING",
);

// REJECTED is terminal
assert.throws(
  () => applyPermissionAction(baseReq({ status: "REJECTED" }), actor, { action: "APPROVE" }),
  (e: any) => e instanceof PermissionRuleError && e.code === "TERMINAL_STATE",
);

// CANCELLED is terminal
assert.throws(
  () => applyPermissionAction(baseReq({ status: "CANCELLED" }), actor, { action: "APPROVE" }),
  (e: any) => e instanceof PermissionRuleError && e.code === "TERMINAL_STATE",
);

// canApproveAtStage: hostel_manager role owns hostel_manager stage
assert.strictEqual(canApproveAtStage("hostel_manager", "hostel", "hostel_manager"), true);
// admin can act at any stage
assert.strictEqual(canApproveAtStage("admin", "hostel", "caretaker"), true);
// vice_principal owns no stages
assert.strictEqual(canApproveAtStage("vice_principal", "exam", "vice_principal"), false);

// canApproveAtStageWithBranchResult: HOD branch gate
const branchOk = canApproveAtStageWithBranchResult(
  "hod", "staff_leave", "hod", "branch-a", "branch-a"
);
assert.strictEqual(branchOk.allowed, true);
const branchDenied = canApproveAtStageWithBranchResult(
  "hod", "staff_leave", "hod", "branch-a", "branch-b"
);
assert.strictEqual(branchDenied.allowed, false);
assert.strictEqual(branchDenied.matchedStage, "hod");

// resolveInitialStage
assert.strictEqual(resolveInitialStage("hostel"), "caretaker");
assert.strictEqual(resolveInitialStage("lab_access"), "lab_incharge");
assert.strictEqual(resolveInitialStage("exam"), "hod");

// resolveNextStage
assert.strictEqual(resolveNextStage("hostel", "caretaker"), "deputy_warden");
assert.strictEqual(resolveNextStage("hostel", "warden_or_principal"), "completed");
assert.strictEqual(resolveNextStage("lab_access", "lab_incharge"), "hod");
assert.strictEqual(resolveNextStage("lab_access", "hod"), "completed");
assert.strictEqual(resolveNextStage("hostel", "completed"), null);

console.log("✅ Permission engine invariants hold");
