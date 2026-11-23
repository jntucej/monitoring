export interface GreetingInput {
  name?: string | null;
  role?: string | null;
  pendingCount?: number;
  urgentCount?: number;
  wardName?: string | null;
  gateCode?: string | null;
  specialOccasionLabel?: string | null;
  now?: Date;
}

export interface CustomGreetingResult {
  timePeriod: "morning" | "afternoon" | "evening" | "night";
  headline: string;
  subline: string;
  wishBadge: string | null;
}

export function buildCustomGreeting(input: GreetingInput): CustomGreetingResult {
  const date = input.now ?? new Date();
  const hour = date.getHours();

  const timePeriod: CustomGreetingResult["timePeriod"] =
    hour >= 5 && hour < 12
      ? "morning"
      : hour >= 12 && hour < 17
      ? "afternoon"
      : hour >= 17 && hour < 21
      ? "evening"
      : "night";

  const salutation =
    timePeriod === "morning"
      ? "Good morning"
      : timePeriod === "afternoon"
      ? "Good afternoon"
      : timePeriod === "evening"
      ? "Good evening"
      : "Late-hour check-in";

  const firstName = (input.name ?? "").trim().split(/\s+/)[0] || "there";
  const role = (input.role ?? "student").toLowerCase();
  const pending = input.pendingCount ?? 0;
  const urgent = input.urgentCount ?? 0;

  let subline = "Your personalized campus workspace is ready.";

  if (role === "student") {
    subline =
      pending > 0
        ? `You have ${pending} active item${pending === 1 ? "" : "s"}—passes, assignments, or meals—to check.`
        : "No pending actions right now—check your pass, schedule, or mess updates.";
  } else if (role === "cr" || role === "student_representative") {
    subline =
      pending > 0
        ? `${pending} class assignment/readiness item${pending === 1 ? "" : "s"} waiting for your confirmation.`
        : "Class readiness is up to date—flag any timetable or assignment blockers anytime.";
  } else if (role === "guardian") {
    const target = input.wardName ? `${input.wardName}'s` : "your ward's";
    subline = `Viewing ${target} live gate movement, attendance, and request status.`;
  } else if (role === "operator") {
    subline = input.gateCode
      ? `Gate ${input.gateCode} desk ready for rapid IN/OUT verification.`
      : "Select or claim your assigned gate to begin scanning.";
  } else if (["caretaker", "worker", "mess_incharge"].includes(role)) {
    subline =
      pending > 0
        ? `${pending} active task${pending === 1 ? "" : "s"} in your operational queue.`
        : "Your assigned shift queue is clear.";
  } else if (
    ["faculty", "hod", "deputy_warden", "hostel_manager", "emo", "exam_branch", "oie"].includes(
      role,
    )
  ) {
    subline =
      pending > 0
        ? `${pending} item${pending === 1 ? "" : "s"} at your stage${urgent > 0 ? ` (${urgent} urgent/SLA)` : ""}.`
        : "Zero items waiting on your direct stage right now.";
  } else if (["vice_principal", "principal", "supervisor", "admin"].includes(role)) {
    subline =
      urgent > 0 || pending > 0
        ? `${pending} active items across oversight queues, including ${urgent} high-priority/SLA items.`
        : "Campus oversight queues are calm—inspect live pulse, operations, or governance.";
  } else if (role === "sysadmin") {
    subline =
      urgent > 0
        ? `${urgent} system or security alert${urgent === 1 ? "" : "s"} need diagnostic review.`
        : "Core services, sessions, and background jobs are ready for inspection.";
  }

  return {
    timePeriod,
    headline: `${salutation}, ${firstName}`,
    subline,
    wishBadge: input.specialOccasionLabel ?? null,
  };
}
