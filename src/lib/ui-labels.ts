const STAGE_LABELS: Record<string, string> = {
  student: "Student Submission",
  faculty: "Awaiting Faculty Review",
  hod: "Awaiting HOD Sign-Off",
  deputy_warden: "Awaiting Deputy Warden Sign-Off",
  hostel_manager: "Awaiting Hostel Manager Sign-Off",
  warden: "Awaiting Principal (Warden) Sign-Off",
  principal: "Awaiting Principal Sign-Off",
  vice_principal: "Awaiting Vice Principal Sign-Off",
  exam_branch: "Awaiting Exam Branch Verification",
  oie: "Awaiting OIE Clearance",
  exam_superintendent: "Awaiting Exam Superintendent",
  caretaker: "Assigned to Caretaker",
  emo: "Assigned to Estate / Maintenance",
};

const WORKFLOW_LABELS: Record<string, string> = {
  home_out: "Home Outing Pass",
  day_out: "Day Outing Pass",
  local_out: "Local Outing Pass",
  medical_leave: "Medical Leave",
  on_duty: "On-Duty (OD) Pass",
  exam_clearance: "Exam Hall Clearance",
  late_entry: "Late Entry Exception",
  hostel_leave: "Hostel Leave Pass",
};

const FIELD_LABELS: Record<string, string> = {
  uniqueId: "Roll / Employee ID",
  unique_id: "Roll / Employee ID",
  personType: "Campus Role",
  person_type: "Campus Role",
  hostel_scope: "Assigned Hostel Block",
  current_stage: "Current Approval Stage",
  workflow_type: "Pass / Request Type",
};

export function formatStageLabel(stage: string | null | undefined): string {
  if (!stage) return "Pending Review";
  const key = stage.toLowerCase();
  return STAGE_LABELS[key] ?? `Awaiting ${stage.replace(/_/g, " ")}`;
}

export function formatWorkflowLabel(workflow: string | null | undefined): string {
  if (!workflow) return "Campus Request";
  const key = workflow.toLowerCase();
  return WORKFLOW_LABELS[key] ?? workflow.replace(/_/g, " ");
}

export function formatFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, " ");
}
