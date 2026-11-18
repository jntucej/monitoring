// src/hooks/useRoleConfig.ts
//
// useRoleConfig() — reads the role from the auth store and returns
// the matching RoleConfig. No runtime branching in pages: the config
// IS the branch.
//
//   const cfg = useRoleConfig();
//   const accent = cfg?.identity.accent ?? "graphite";

import { useAuthStore } from "@/stores/authStore";
import { getRoleConfig, type RoleConfig } from "@/config/roles";

export function useRoleConfig(): RoleConfig | undefined {
  const role = useAuthStore((s) => s.role);
  return getRoleConfig(role);
}

export function useRoleAccent(): string {
  const cfg = useRoleConfig();
  return cfg?.identity.accent ?? "graphite";
}

export function useRoleMotionPreset(): string {
  const cfg = useRoleConfig();
  return cfg?.identity.motionPreset ?? "calm";
}
