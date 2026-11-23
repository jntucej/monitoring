"use client";

/**
 * hooks/useViewerContext.ts — build a record-abilities ViewerContext from
 * the auth store.
 *
 * Pairs with `src/lib/record-abilities.ts`: the resolvers are pure and take
 * a ViewerContext; this hook is the client-side source of that context
 * (role + userId + departmentId + assigned gateId + hostel scope).
 *
 * Hostel scope is derived from the user's own record when present (a
 * student's hostel block, a hostel staff member's assigned scope). When
 * there is nothing to read it stays null, which the resolvers treat as
 * "campus-wide / no scope constraint".
 */

import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import { type Role } from "@/lib/types";
import { makeViewer, type ViewerContext } from "@/lib/record-abilities";

export function useViewerContext(): ViewerContext {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role) as Role | undefined;

  return useMemo(() => {
    const userId = user?.id ?? "";
    // Hostel scope: a student is scoped to their own hostel block; hostel
    // staff are scoped to their assigned block. Keep it light — the resolvers
    // treat null as "no constraint".
    const hostelScope = user?.studentDetails?.hostelBlock ?? null;
    return makeViewer(role, {
      userId,
      departmentId: user?.departmentId ?? null,
      hostelScope,
      assignedGateId: user?.gateId ?? null,
    });
  }, [user, role]);
}

export default useViewerContext;
