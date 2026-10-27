import type { Role } from "@/lib/types";

export const TIER = {
  PUBLIC:   [] as Role[],
  SELF:     [] as Role[],               // any authenticated role
  APPROVER: ["principal", "vice_principal", "exam_branch", "oie",
             "hostel_manager", "deputy_warden", "caretaker",
             "hod", "staff", "supervisor", "exam_superintendent"] as Role[],
  OPERATOR: ["operator", "principal", "admin", "sysadmin"] as Role[],
  ADMIN:    ["admin", "sysadmin"] as Role[],
  SYSADMIN: ["sysadmin"] as Role[],
  MESS_INCHARGE: ["mess_incharge", "principal", "admin", "sysadmin"] as Role[],
  // All interactive-app roles — used where any authenticated user may act.
  APP: [
    "admin", "sysadmin", "principal", "vice_principal", "hod", "oie",
    "exam_branch", "exam_superintendent", "faculty", "staff", "worker",
    "supervisor", "operator", "hostel_manager", "deputy_warden",
    "caretaker", "mess_incharge", "student", "parent", "guardian", "visitor",
  ] as Role[],
} as const;
