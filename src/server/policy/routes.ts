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
  "emo",
];

export function getDefaultRouteForRole(role: Role | string, gateId?: string): string {
  const routes: Record<string, string> = {
    // The operator dashboard is the home surface; the gate desk (/gate/<id>)
    // is a tool the operator opens from it, not the post-login destination.
    // Landing on the scanner removed the only dashboard the operator had and
    // contradicted (operator)/operator/page.tsx's own "one tap to YOUR gate"
    // hero. gateId is still returned by /api/auth/session and used by the
    // hero CTA href — just not as the login redirect target.
    operator: "/operator",
    admin: "/admin",
    sysadmin: "/sysadmin",
    supervisor: "/supervisor",
    guardian: "/guardian",
    parent: "/guardian",
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
    emo: "/emo",
  };
  return routes[role] || "/login";
}
