import type { Role } from "./types";

export function getDefaultRouteForRole(role: Role | string, gateId?: string): string {
  const routes: Record<string, string> = {
    operator: `/gate/${gateId || "1"}`,
    admin: "/admin",
    sysadmin: "/sysadmin",
    supervisor: "/supervisor",
    guardian: "/parent",
    parent: "/parent",
    student: "/student",
    warden: "/supervisor",
    faculty: "/faculty",
    staff: "/staff",
    worker: "/worker",
    visitor: "/visitor",
    caretaker: "/hostel/permissions",
    deputy_warden: "/hostel/permissions",
    hostel_manager: "/hostel/permissions",
    principal: "/principal",
    vice_principal: "/exam/permissions",
    oie: "/exam/permissions",
    exam_branch: "/exam/permissions",
  };
  return routes[role] || "/login";
}
