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
    operator: gateId ? `/gate/${gateId}` : "/gate/main",
    admin: "/admin",
    sysadmin: "/sysadmin",
    supervisor: "/supervisor",
    guardian: "/parent",
    parent: "/parent",
    student: "/student",
    warden: "/principal", // folded role — legacy warden users land on principal
    faculty: "/faculty/permissions",
    staff: "/staff",
    worker: "/worker",
    visitor: "/visitor",
    caretaker: "/hostel/permissions",
    deputy_warden: "/deputy-warden",
    hostel_manager: "/hostel-manager",
    principal: "/principal/permissions",
    vice_principal: "/vice-principal",
    oie: "/oie",
    exam_branch: "/exam-branch",
    hod: "/hod",
    exam_superintendent: "/exam/superintendent",
    mess_incharge: "/mess",
  };
  return routes[role] || "/login";
}
