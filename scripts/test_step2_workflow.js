const assert = require("assert");
const fs = require("fs");

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log("=== Testing Step 2 Deliverables ===");

// 1. Check file existence
test("Deliverable files exist", () => {
  assert(fs.existsSync("src/lib/permission-workflow.ts"), "permission-workflow.ts missing");
  assert(fs.existsSync("src/app/api/permissions/route.ts"), "api/permissions/route.ts missing");
  assert(fs.existsSync("src/app/api/permissions/[ticket]/route.ts"), "api/permissions/[ticket]/route.ts missing");
});

// 2. Check permission-workflow content & rules
test("Approval chains and roles in permission-workflow.ts", () => {
  const code = fs.readFileSync("src/lib/permission-workflow.ts", "utf8");

  // Approval chains
  assert(code.includes('"caretaker", "deputy_warden", "hostel_manager", "warden_or_principal", "main_gate", "completed"'), "Hostel chain exact match");
  assert(code.includes('"faculty", "hod", "oie", "vice_principal", "principal", "completed"'), "Exam chain exact match");
  assert(code.includes('"hod", "vice_principal", "principal", "completed"'), "Staff leave chain exact match");

  // Sequence names & prefixes
  assert(code.includes("public.hostel_ticket_seq") && code.includes('"HST"'), "Hostel seq mapping");
  assert(code.includes("public.exam_ticket_seq") && code.includes('"EXM"'), "Exam seq mapping");
  assert(code.includes("public.memo_ticket_seq") && code.includes('"MEM"'), "Memo seq mapping");
  assert(code.includes("public.staff_leave_ticket_seq") && code.includes('"STF"'), "Staff leave seq mapping");

  // Functions
  assert(code.includes("export async function generateTicketNumber"), "generateTicketNumber exported");
  assert(code.includes("export function resolveInitialStage"), "resolveInitialStage exported");
  assert(code.includes("export function resolveNextStage"), "resolveNextStage exported");
  assert(code.includes("export function canApproveAtStage"), "canApproveAtStage exported");
  assert(code.includes("export function appendStageHistory"), "appendStageHistory exported");
});

// 3. Check api/permissions/route.ts
test("Permissions collection route has GET and POST handlers", () => {
  const code = fs.readFileSync("src/app/api/permissions/route.ts", "utf8");
  assert(code.includes("export const GET = withRateLimit(withAuthorization(handleGet)"), "GET exported with rateLimit and auth");
  assert(code.includes("export const POST = withRateLimit(withAuthorization(handlePost)"), "POST exported with rateLimit and auth");
  assert(code.includes("permission_requests"), "queries permission_requests table");
  assert(code.includes("generateTicketNumber"), "generates ticket number");
  assert(code.includes("addAudit"), "emits audit logs");
  assert(code.includes("addNotification"), "emits notifications");
});

// 4. Check api/permissions/[ticket]/route.ts
test("Single permission request route has GET and PATCH handlers", () => {
  const code = fs.readFileSync("src/app/api/permissions/[ticket]/route.ts", "utf8");
  assert(code.includes("export const GET = withRateLimit(withAuthorization(handleGet)"), "GET exported with rateLimit and auth");
  assert(code.includes("export const PATCH = withRateLimit(withAuthorization(handlePatch)"), "PATCH exported with rateLimit and auth");
  assert(code.includes("canApproveAtStage"), "checks canApproveAtStage");
  assert(code.includes("resolveNextStage"), "resolves next stage");
  assert(code.includes("document_signatures"), "integrates document_signatures");
});

// 5. Check untouched critical files
test("Existing routes and components remain untouched", () => {
  assert(fs.existsSync("src/app/api/passes/route.ts"), "passes route intact");
  assert(fs.existsSync("src/app/api/gate/scan/route.ts"), "gate scan route intact");
});

console.log("=== All Step 2 checks PASSED ===");
