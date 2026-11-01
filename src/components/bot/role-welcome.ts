// src/components/bot/role-welcome.ts
//
// Role-aware welcome copy for the bot. The subtitle line under the
// header and the suggestion chips change per role, because a student's
// "what can I ask" is a wardens' "what can I ask" — surfacing the
// right examples is what makes the welcome screen actually useful
// instead of decorative.
//
// Falls back to the student set for any role without an explicit entry,
// since students are the highest-volume user group.

import type { Role } from "@/lib/types";

export interface RoleWelcome {
  subtitle: string;
  chips: string[];
  questions: string[];
}

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

export function roleWelcome(role: Role | null): RoleWelcome {
  switch (role) {
    case "faculty":
      return FACULTY;
    case "deputy_warden":
    case "hostel_manager":
    case "principal":
    case "vice_principal":
      return WARDEN;
    case "admin":
    case "sysadmin":
      return ADMIN;
    case "operator":
      return OPERATOR;
    case "student":
    default:
      return STUDENT;
  }
}
