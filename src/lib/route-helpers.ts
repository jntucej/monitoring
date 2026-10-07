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
  };
  return routes[role] || "/login";
}
