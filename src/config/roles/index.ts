// src/config/roles/index.ts
//
// Role registry — single import point.
//   import { ROLE_CONFIGS, getRoleConfig } from "@/config/roles";
//
// getRoleConfig(role) returns the config, or undefined for roles
// without one (they get the graphite baseline).

import type { Role } from "@/lib/roles";
import type { RoleConfig, RoleRegistry } from "./types";

import { STUDENT_CONFIG } from "./student";
import { GUARDIAN_CONFIG } from "./guardian";
import { FACULTY_CONFIG } from "./faculty";
import { HOD_CONFIG } from "./hod";
import { PRINCIPAL_CONFIG } from "./principal";
import { OPERATOR_CONFIG } from "./operator";
import { SUPERVISOR_CONFIG } from "./supervisor";
import { DEPUTY_WARDEN_CONFIG } from "./deputy_warden";
import { MESS_INCHARGE_CONFIG } from "./mess_incharge";
import { ADMIN_CONFIG } from "./admin";
import { SYSADMIN_CONFIG } from "./sysadmin";
import { VISITOR_CONFIG } from "./visitor";
import { WORKER_CONFIG } from "./worker";
import { CARETAKER_CONFIG } from "./caretaker";
import { EMO_CONFIG } from "./emo";
import { EXAM_SUPERINTENDENT_CONFIG } from "./exam_superintendent";
import { EXAM_BRANCH_CONFIG } from "./exam_branch";
import { OIE_CONFIG } from "./oie";
import { HOSTEL_MANAGER_CONFIG } from "./hostel_manager";
import { STAFF_CONFIG } from "./staff";
import { VICE_PRINCIPAL_CONFIG } from "./vice_principal";

export const ROLE_CONFIGS: RoleRegistry = {
  [STUDENT_CONFIG.id]: STUDENT_CONFIG,
  [GUARDIAN_CONFIG.id]: GUARDIAN_CONFIG,
  [FACULTY_CONFIG.id]: FACULTY_CONFIG,
  [HOD_CONFIG.id]: HOD_CONFIG,
  [PRINCIPAL_CONFIG.id]: PRINCIPAL_CONFIG,
  [OPERATOR_CONFIG.id]: OPERATOR_CONFIG,
  [SUPERVISOR_CONFIG.id]: SUPERVISOR_CONFIG,
  [DEPUTY_WARDEN_CONFIG.id]: DEPUTY_WARDEN_CONFIG,
  [MESS_INCHARGE_CONFIG.id]: MESS_INCHARGE_CONFIG,
  [ADMIN_CONFIG.id]: ADMIN_CONFIG,
  [SYSADMIN_CONFIG.id]: SYSADMIN_CONFIG,
  [VISITOR_CONFIG.id]: VISITOR_CONFIG,
  [WORKER_CONFIG.id]: WORKER_CONFIG,
  [CARETAKER_CONFIG.id]: CARETAKER_CONFIG,
  [EMO_CONFIG.id]: EMO_CONFIG,
  [EXAM_SUPERINTENDENT_CONFIG.id]: EXAM_SUPERINTENDENT_CONFIG,
  [EXAM_BRANCH_CONFIG.id]: EXAM_BRANCH_CONFIG,
  [OIE_CONFIG.id]: OIE_CONFIG,
  [HOSTEL_MANAGER_CONFIG.id]: HOSTEL_MANAGER_CONFIG,
  [STAFF_CONFIG.id]: STAFF_CONFIG,
  [VICE_PRINCIPAL_CONFIG.id]: VICE_PRINCIPAL_CONFIG,
};

export function getRoleConfig(role: Role | string | undefined | null): RoleConfig | undefined {
  if (!role) return undefined;
  return ROLE_CONFIGS[role as Role];
}

export type { RoleConfig, RoleRegistry, IdentityConfig, HomeWidget, BotPersona,
  OnboardingScript, OnboardingStep, MotionPreset } from "./types";
