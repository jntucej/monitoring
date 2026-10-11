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
    faculty: "/faculty",
    staff: "/staff",
    worker: "/worker",
    visitor: "/visitor",
    principal: "/principal",
    vice_principal: "/vice-principal",
    exam_branch: "/exam",
    hostel_manager: "/hostel-manager",
    deputy_warden: "/hostel-manager",
    caretaker: "/hostel-manager",
    warden: "/warden",
    hod: "/hod",
    oie: "/forbidden"
  };
  return routes[role] || "/login";
}
