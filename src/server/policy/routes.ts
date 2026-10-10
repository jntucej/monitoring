import { Role } from "@/lib/types";

export const ALL_ROLES: Role[] = [
  "admin",
  "sysadmin",
  "operator",
  "supervisor",
  "warden",
  "faculty",
  "staff",
  "worker",
  "visitor",
  "student",
  "parent",
  "guardian",
  "hod",
  "principal",
  "vice_principal",
  "exam_branch",
  "oie",
  "hostel_manager",
  "deputy_warden",
  "caretaker",
];

export function getDefaultRouteForRole(role: Role | string, gateId?: string): string {
  const routes: Record<string, string> = {
    operator: `/gate/${gateId || "1"}`,
    admin: "/admin",
    sysadmin: "/sysadmin",
    supervisor: "/supervisor",
    guardian: "/parent",
    parent: "/parent",
    student: "/student",
    warden: "/warden",
    faculty: "/faculty",
    staff: "/staff",
    worker: "/worker",
    visitor: "/visitor",
    caretaker: "/hostel/permissions",
    deputy_warden: "/hostel/permissions",
    hostel_manager: "/hostel/permissions",
    principal: "/principal",
    vice_principal: "/principal",
    oie: "/oie",
    exam_branch: "/exam",
    hod: "/hod",
  };
  return routes[role] || "/login";
}
