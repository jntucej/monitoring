<<<<<<< HEAD
import { ALL_ROLES, getDefaultRouteForRole as originalGet } from "@/server/policy/routes";

export { ALL_ROLES };

export function getDefaultRouteForRole(role: string, gateId?: string): string {
  const overrides: Record<string, string> = {
    caretaker:        "/hostel/permissions",
    deputy_warden:    "/hostel/permissions",
    hostel_manager:   "/hostel/permissions",
    principal:        "/principal/permissions",
    vice_principal:   "/exam/permissions",
    oie:              "/exam/permissions",
    exam_branch:      "/exam/permissions",
  };
  
  if (role in overrides) {
    return overrides[role];
  }
  
  return originalGet(role, gateId);
}

=======
export { getDefaultRouteForRole } from "@/server/policy/routes";
>>>>>>> 8048a8899ce098b5882a8ec0fd422ec2f3ac58f4
