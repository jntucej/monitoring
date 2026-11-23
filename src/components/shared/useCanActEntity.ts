// src/components/shared/useCanActEntity.ts
//
// Coarse, role-based capability gate for EntityInspector action bars.
//
// Named `useCanActEntity` (NOT `useCanAct`) because the ticket-level
// `useCanAct(options)` hook already exists in `src/hooks/useCanAct.ts`
// and answers a different question — "can THIS actor approve THIS
// ticket right now?" — using the full permission-model + CoC policy
// + flag + step-up pipeline. That hook takes (requirements, options)
// and returns a rich CanAct result.
//
// This hook answers the simpler UI question — "does my role even have
// write access to a record of this kind?" — using the central
// `canActOnEntity(kind, role)` map in `@/lib/entity-access`. Use it
// to *hide* (not disable) action buttons in the inspector:
//
//   const canAct = useCanActEntity("gate");
//   <ActionGate canAct={canAct}>
//     <InspectorButton ...>Approve</InspectorButton>
//   </ActionGate>
//
// admin / sysadmin always pass (the map's privileged fallback); unknown
// kinds fall back to false for non-privileged roles.

"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import { canActOnEntity, type EntityKind } from "@/lib/entity-access";
import type { Role } from "@/lib/types";

/**
 * Return true when the current user's role may *act* on a record of
 * the given entity kind (write: approve / reject / forward / mark
 * corrected / check-in / escalate / resolve …). admin / sysadmin
 * always pass; unknown kinds (not in the ENTITY_ACTION map) only
 * pass for privileged roles.
 */
export function useCanActEntity(kind: EntityKind | string): boolean {
  const role = useAuthStore((s) => s.role) as Role | undefined | null;
  return useMemo(
    () => canActOnEntity(kind as EntityKind, role),
    [kind, role],
  );
}

export default useCanActEntity;
