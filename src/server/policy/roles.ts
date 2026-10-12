import type { Role } from "@/lib/types";

export const TIER = {
  PUBLIC:   [] as Role[],
  SELF:     [] as Role[],               // any authenticated role
  APPROVER: ["principal", "vice_principal", "exam_branch", "oie",
             "hostel_manager", "deputy_warden", "caretaker", "principal",
             "hod", "staff", "supervisor"] as Role[],
  OPERATOR: ["operator", "principal", "admin", "sysadmin"] as Role[],
  ADMIN:    ["admin", "sysadmin"] as Role[],
  SYSADMIN: ["sysadmin"] as Role[],
  MESS_INCHARGE: ["mess_incharge", "principal", "admin", "sysadmin"] as Role[],
} as const;
