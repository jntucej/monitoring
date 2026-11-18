// src/components/bot/role-welcome.ts
//
// Role-aware welcome copy for the bot. The subtitle line under the
// header and the suggestion chips change per role, because a student's
// "what can I ask" is a warden's "what can I ask" — surfacing the
// right examples is what makes the welcome screen actually useful
// instead of decorative.
//
// Now reads from the role config (src/config/roles/) when available,
// falling back to the hardcoded sets below for roles without a config.
//
// The subtitle is time-of-day aware: "Good morning, {firstName} —"
// prefix is handled by the Greeting component; this file provides the
// role-specific subtitle, chips, and example questions.

import type { Role } from "@/lib/types";
import { getRoleConfig } from "@/config/roles";
import { useAdaptiveContext } from "@/hooks/useAdaptiveContext";

export interface RoleWelcome {
  subtitle: string;
  chips: string[];
  questions: string[];
}

// ── Hardcoded fallbacks (used when no RoleConfig exists) ────────────────

const STUDENT: RoleWelcome = {
  subtitle: "Policies · Schedules · Services",
  chips: ["Pass rules", "Mess hours", "Leave", "Gate scan"],
  questions: [
    "How do I request an out-of-campus pass?",
    "What are the hostel curfew times?",
    "How do I apply for a leave?",
    "What does the OVERDUE flag mean on my card?",
  ],
};

const FACULTY: RoleWelcome = {
  subtitle: "Classes · Attendance · Approvals",
  chips: ["Approvals", "Attendance", "Classes", "Reports"],
  questions: [
    "How do I approve or reject a leave request?",
    "How is attendance captured and what's the threshold?",
    "How do I view my class schedule?",
  ],
};

const WARDEN: RoleWelcome = {
  subtitle: "Residents · Passes · Incidents",
  chips: ["Pending passes", "Residents", "Incidents", "Exceptions"],
  questions: [
    "How many out-of-campus passes are pending right now?",
    "Show today's gate exceptions.",
    "How do I log a hostel incident?",
  ],
};

const ADMIN: RoleWelcome = {
  subtitle: "Users · Roles · Configuration",
  chips: ["RBAC", "Users", "Settings", "Audit"],
  questions: [
    "How is the RBAC model structured?",
    "How do I reset a user's password?",
    "Where do I find the audit log?",
  ],
};

const OPERATOR: RoleWelcome = {
  subtitle: "Lookup · Transactions · Passes",
  chips: ["Lookup", "Transactions", "Passes", "Exceptions"],
  questions: [
    "How do I look up a student by roll number?",
    "What's the difference between entry types H and D?",
    "How do I record a gate exception?",
  ],
};

// ── Role-to-fallback mapping ────────────────────────────────────────────

const FALLBACK: Record<string, RoleWelcome> = {
  student: STUDENT,
  faculty: FACULTY,
  deputy_warden: WARDEN,
  hostel_manager: WARDEN,
  principal: WARDEN,
  vice_principal: WARDEN,
  hod: WARDEN,
  admin: ADMIN,
  sysadmin: ADMIN,
  operator: OPERATOR,
};

/**
 * Returns the RoleWelcome for a given role.
 * Prefers the RoleConfig's botPersona when available;
 * falls back to the hardcoded sets.
 */
export function roleWelcome(role: Role | string | null): RoleWelcome {
  if (!role) return STUDENT;
  // Try the role config first
  const cfg = getRoleConfig(role);
  if (cfg?.botPersona) {
    return cfg.botPersona;
  }
  return FALLBACK[role] ?? STUDENT;
}
