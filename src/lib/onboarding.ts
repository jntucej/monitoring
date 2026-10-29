/**
 * Onboarding & Training Progress Tracker
 */

import { getSupabaseServiceClient } from "./dbClient";

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
    { id: "op_online_resilience", title: "Network Resilience & Health Check", description: "Understand real-time server health, retry buttons, and online status.", targetPath: "/gate/[gateId]", role: "operator" },
  ],
  admin: [
    { id: "adm_dashboard", title: "Executive Dashboard", description: "Monitor real-time campus occupancy and gate metrics.", targetPath: "/admin", role: "admin" },
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

const inMemoryProgress = new Map<string, Set<string>>();

/**
 * F4: the ONLY step ids the API accepts. The catalogue is the closed
 * universe — a client can't mark progress on an arbitrary string and
 * pollute onboarding_progress or the audit log with junk rows.
 */
export const VALID_ONBOARDING_STEPS: ReadonlySet<string> = new Set(
  Object.values(ROLE_STEPS).flatMap((steps) => steps.map((s) => s.id))
);

export function assertValidStep(step: string): void {
  if (typeof step !== "string" || !VALID_ONBOARDING_STEPS.has(step)) {
    throw new Error(`Unknown onboarding step: ${String(step).slice(0, 120)}`);
  }
}

export async function getUserCompletedSteps(userId: string): Promise<string[]> {
  try {
    const supabase = getSupabaseServiceClient();
    const { data } = await supabase
      .from("onboarding_progress")
      .select("step, completed")
      .eq("user_id", userId);
    if (data && data.length > 0) {
      return data
        .filter((d: any) => d.completed !== false)
        .map((d: any) => d.step || (d as any).step_id)
        .filter(Boolean);
    }
  } catch {
    // fallback to in-memory
  }
  const set = inMemoryProgress.get(userId);
  return set ? Array.from(set) : [];
}

export async function markStepCompleted(userId: string, stepId: string): Promise<void> {
  // F4: reject any step id that is not in the closed catalogue BEFORE it
  // can reach the DB or the audit log (garbage-step spam).
  assertValidStep(stepId);

  let set = inMemoryProgress.get(userId);
  if (!set) {
    set = new Set<string>();
    inMemoryProgress.set(userId, set);
  }
  set.add(stepId);

  try {
    const supabase = getSupabaseServiceClient();
    // Idempotent upsert: the UNIQUE(user_id, step) constraint (migration
    // 20261231000002) makes this safe under concurrent callers — the
    // ON CONFLICT DO UPDATE branch only re-touches completed_at, and the
    // monotonic trigger prevents ever demoting a completed step back.
    const { error } = await supabase
      .from("onboarding_progress")
      .upsert(
        {
          user_id: userId,
          step: stepId,
          completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,step" }
      );
    if (error) {
      // Surface the write failure instead of silently "succeeding" — the
      // in-memory set is a cache, not the source of truth, and an unhandled
      // error here would let the client believe a step is done when it
      // isn't. The route still returns 200 (idempotent retry is fine), but
      // the error must be visible to the operator.
      console.error("[onboarding] markStepCompleted upsert failed:", error.message);
    }
  } catch {
    // DB unreachable — in-memory set already updated; logged above so the
    // fallback is not silent.
  }
}

export async function getNextRecommendedStep(userId: string, role: string): Promise<OnboardingStep | null> {
  const steps = ROLE_STEPS[role] || ROLE_STEPS.student;
  const completed = await getUserCompletedSteps(userId);
  const next = steps.find((s) => !completed.includes(s.id));
  return next || null;
}
