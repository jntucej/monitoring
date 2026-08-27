/**
 * Onboarding & Training Progress Tracker
 */

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetPath: string;
  role: string;
}

const ROLE_STEPS: Record<string, OnboardingStep[]> = {
  operator: [
    { id: "op_scan_overview", title: "Gate Scanner Overview", description: "Learn how to use camera and manual scan modes.", targetPath: "/gate/[gateId]", role: "operator" },
    { id: "op_offline_mode", title: "Offline Queueing", description: "Understand how scans queue when offline and auto-sync.", targetPath: "/gate/[gateId]", role: "operator" },
  ],
  admin: [
    { id: "adm_dashboard", title: "Executive Dashboard", description: "Monitor real-time campus occupancy and gate metrics.", targetPath: "/admin/dashboard", role: "admin" },
    { id: "adm_schedules", title: "Gate Access Schedules", description: "Configure night curfews and holiday overrides.", targetPath: "/admin/gates/schedule", role: "admin" },
  ],
  student: [
    { id: "stu_id_card", title: "Digital ID Card", description: "View and display your digital student ID for gate access.", targetPath: "/student/id", role: "student" },
    { id: "stu_pass_req", title: "Requesting Passes", description: "Apply for outstation or local leave passes.", targetPath: "/student/passes", role: "student" },
  ],
  parent: [
    { id: "par_presence", title: "Ward Presence Status", description: "Check real-time entry and exit timestamps of your ward.", targetPath: "/parent/child", role: "parent" },
  ],
};

let inMemoryProgress = new Map<string, Set<string>>();

export async function getUserCompletedSteps(userId: string): Promise<string[]> {
  const set = inMemoryProgress.get(userId);
  return set ? Array.from(set) : [];
}

export async function markStepCompleted(userId: string, stepId: string): Promise<void> {
  let set = inMemoryProgress.get(userId);
  if (!set) {
    set = new Set<string>();
    inMemoryProgress.set(userId, set);
  }
  set.add(stepId);
}

export async function getNextRecommendedStep(userId: string, role: string): Promise<OnboardingStep | null> {
  const steps = ROLE_STEPS[role] || ROLE_STEPS.student;
  const completed = await getUserCompletedSteps(userId);
  const next = steps.find((s) => !completed.includes(s.id));
  return next || null;
}
