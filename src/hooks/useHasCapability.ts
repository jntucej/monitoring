// src/hooks/useHasCapability.ts
//
// P1 / §1 Touch 4: the client-side capability hook for buttons + widgets.
//
// The client is a PROJECTION of the server resolver (guardrail #1). This
// hook calls the SAME `hasCapability()` the API route uses, so client and
// server agree on the decision. Use it to disable a button:
//
//   const canApply = useHasCapability("hostel.leave.apply", ctx);
//   <Button disabled={!canApply}>Apply</Button>
//
// If the API returns 403 on a click, that's a drift bug — the
// `capability.api_forbidden` metric (§3 observability) catches it.

"use client";

import { useMemo } from "react";
import { hasCapability } from "@/config/roles";
import type { WorkspaceContext } from "@/config/roles/types";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";

export function useHasCapability(
  capId: string,
  context: WorkspaceContext,
): boolean {
  const role = useAuthStore((s) => s.role) as Role | undefined;
  return useMemo(
    () => (role ? hasCapability(role, context, capId) : false),
    [role, context, capId],
  );
}
