/**
 * Access Control Module for Unified Campus Access Management System
 * Handles time-based access control, worker shift restrictions, and curfew enforcement.
 */

export interface AccessRule {
  allowedDays: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startHour: number; // 24-hour format (e.g. 6 = 06:00)
  startMinute: number;
  endHour: number; // 24-hour format (e.g. 22 = 22:00)
  endMinute: number;
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  ruleSummary?: string;
}

/**
 * Default access rules for Worker person type:
 * Allowed Monday to Saturday (1-6), 06:00 to 22:00.
 */
export const DEFAULT_WORKER_ACCESS_RULE: AccessRule = {
  allowedDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
  startHour: 6,
  startMinute: 0,
  endHour: 22,
  endMinute: 0,
};

/**
 * Validates whether a person is allowed entry/exit at the given timestamp based on person_type & custom rules.
 */
export function checkTimeBasedAccess(
  personType: string,
  timestamp: Date = new Date(),
  customRule?: Partial<AccessRule>
): AccessCheckResult {
  if (personType === "student") {
    const currentHour = timestamp.getHours();
    const currentMinute = timestamp.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const curfewStartMinutes = 21 * 60 + 30; // 21:30
    const curfewEndMinutes = 6 * 60; // 06:00

    if (currentTotalMinutes >= curfewStartMinutes || currentTotalMinutes < curfewEndMinutes) {
      return {
        allowed: false,
        reason: "Student curfew restriction in effect (21:30 - 06:00)",
        ruleSummary: "Curfew 21:30 - 06:00",
      };
    }
    return { allowed: true, ruleSummary: "Standard Student Access" };
  }

  if (personType !== "worker") {
    return { allowed: true };
  }

  const rule: AccessRule = { ...DEFAULT_WORKER_ACCESS_RULE, ...customRule };
  const currentDay = timestamp.getDay();
  const currentHour = timestamp.getHours();
  const currentMinute = timestamp.getMinutes();

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const formatTime = (h: number, m: number) =>
    `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

  const ruleSummary = `Mon-Sat (${formatTime(rule.startHour, rule.startMinute)} - ${formatTime(
    rule.endHour,
    rule.endMinute
  )})`;

  // 1. Check Day Restriction
  if (!rule.allowedDays.includes(currentDay)) {
    return {
      allowed: false,
      reason: `Access restricted on ${dayNames[currentDay]}s for workers`,
      ruleSummary,
    };
  }

  // 2. Check Hour Window Restriction
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const startTotalMinutes = rule.startHour * 60 + rule.startMinute;
  const endTotalMinutes = rule.endHour * 60 + rule.endMinute;

  if (currentTotalMinutes < startTotalMinutes || currentTotalMinutes >= endTotalMinutes) {
    return {
      allowed: false,
      reason: `Outside allowed worker shift hours (${formatTime(rule.startHour, rule.startMinute)} - ${formatTime(rule.endHour, rule.endMinute)})`,
      ruleSummary,
    };
  }

  return {
    allowed: true,
    ruleSummary,
  };
}
