
import type { Role } from "@/lib/types";

export type RoleTier = "super" | "admin" | "hostel" | "academic" | "staff" | "operator" | "end_user";

export interface RoleProfile {
  role: string;
  level: number;
  tier: RoleTier;
  displayName: string;
  displayNameTe: string;
  exactRoleBoost: number;
  sameTierBoost: number;
  canApproveStages: string[];
  canViewRoles: string[];
  personaEn: string;
  personaTe: string;
  primaryActionsEn: string[];
  primaryActionsTe: string[];
}

export const ROLE_PROFILES: Record<string, RoleProfile> = {
  sysadmin: {
    role: "sysadmin", level: 100, tier: "super",
    displayName: "System Administrator", displayNameTe: "సిస్టమ్ అడ్మినిస్ట్రేటర్",
    exactRoleBoost: 1.6, sameTierBoost: 1.4,
    canApproveStages: ["*"],
    canViewRoles: ["*"],
    personaEn: "The caller is a System Administrator. Provide full technical detail.",
    personaTe: "కాలర్ సిస్టమ్ అడ్మినిస్ట్రేటర్. పూర్తి సాంకేతిక వివరాలు ఇవ్వండి.",
    primaryActionsEn: ["Manage users", "Inspect migrations"],
    primaryActionsTe: ["యూజర్లు నిర్వహణ", "మైగ్రేషన్లు పరిశీలించడం"],
  },
  principal: {
    role: "principal", level: 90, tier: "admin",
    displayName: "Principal", displayNameTe: "ప్రిన్సిపాల్",
    exactRoleBoost: 1.5, sameTierBoost: 1.2,
    canApproveStages: ["principal_approval", "final"],
    canViewRoles: ["student", "faculty", "staff", "worker", "principal", "hod"],
    personaEn: "The caller is the Principal. Speak at the policy level.",
    personaTe: "కాలర్ ప్రిన్సిపాల్. విధానం స్థాయిలో మాట్లాడండి.",
    primaryActionsEn: ["Approve exam permissions"],
    primaryActionsTe: ["పరీక్ష అనుమతుల ఆమోదం"],
  },
  // Add other roles similarly...
  student: {
      role: "student", level: 20, tier: "end_user",
      displayName: "Student", displayNameTe: "విద్యార్థి",
      exactRoleBoost: 1.4, sameTierBoost: 1.1,
      canApproveStages: [],
      canViewRoles: ["student"],
      personaEn: "The caller is a Student. Friendly language.",
      personaTe: "కాలర్ విద్యార్థి. స్నేహపూర్వక భాష.",
      primaryActionsEn: ["Request pass"],
      primaryActionsTe: ["పాస్ అభ్యర్థన"],
  }
};

export function getRoleProfile(role: string): RoleProfile {
  return ROLE_PROFILES[role] ?? ROLE_PROFILES.student;
}

export function visibleRoles(callerRole: string): string[] {
  const caller = getRoleProfile(callerRole);
  const set = new Set<string>(["all", caller.role]);
  for (const r of Object.values(ROLE_PROFILES)) {
    if (r.level <= caller.level) set.add(r.role);
  }
  return Array.from(set);
}

export function sameTierRoles(callerRole: string): string[] {
  const caller = getRoleProfile(callerRole);
  return Object.values(ROLE_PROFILES)
    .filter((r) => r.tier === caller.tier)
    .map((r) => r.role);
}

export function escalationsFor(callerRole: string): RoleProfile[] {
  const caller = getRoleProfile(callerRole);
  return Object.values(ROLE_PROFILES)
    .filter((r) => r.level > caller.level)
    .sort((a, b) => a.level - b.level);
}
