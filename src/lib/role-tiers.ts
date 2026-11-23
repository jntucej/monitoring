import { getTierForRole, resolveRecordView } from "@/lib/record-capabilities";
import { canInspectEntity, getFullPageRoute, type EntityKind } from "@/lib/entity-access";
import type { Role } from "@/lib/types";

export type RoleTierId = "tier-0" | "tier-1" | "tier-2" | "tier-3" | "tier-4";

export function getRoleTierId(role: string | undefined | null): RoleTierId {
  const tier = getTierForRole(role ?? "student");
  return `tier-${tier}` as RoleTierId;
}

export function isEntityAllowedForRole(
  role: string | undefined | null,
  kind: EntityKind,
): boolean {
  return canInspectEntity((role ?? "student") as Role, kind);
}

export function buildFullPageHref(
  role: string | undefined | null,
  kind: EntityKind,
  id: string,
): string | null {
  return getFullPageRoute((role ?? "student") as Role, kind, id);
}

export { getTierForRole, resolveRecordView };
