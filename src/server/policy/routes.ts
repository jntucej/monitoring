import { Role } from "@/lib/types";

export const ALL_ROLES: Role[] = [
  "admin",
  "sysadmin",
  "operator",
  "supervisor",
  "principal",
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
  "exam_superintendent",
  "mess_incharge",
];

export function getDefaultRouteForRole(role: Role | string, gateId?: string): string {
  const routes: Record<string, string> = {
    operator: gateId ? `/gate/${gateId}` : "/operator",
    admin: "/admin",
    sysadmin: "/sysadmin",
    supervisor: "/supervisor",
    guardian: "/parent",
    parent: "/parent",
    student: "/student",
    warden: "/principal",
    faculty: "/faculty/permissions",
    staff: "/staff",
    worker: "/worker",
    visitor: "/visitor",
    caretaker: "/hostel/permissions",
    deputy_warden: "/hostel/permissions",
    hostel_manager: "/hostel/permissions",
    principal: "/principal/permissions",
    vice_principal: "/vice-principal",
    oie: "/exam-branch",
    exam_branch: "/exam-branch",
    hod: "/hod",
    exam_superintendent: "/exam/superintendent",
    mess_incharge: "/mess",
  };
  return routes[role] || "/login";
}
