"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { OperatorShell } from "./OperatorShell";

/**
 * Client-side branch for the (operator) root layout.
 *
 * The layout itself (layout.tsx) is a server component (it exports
 * metadata), so any `usePathname` usage must live in a client
 * component. This file carries the directive; the layout renders
 * `<GateAwareOperatorShell>{children}</GateAwareOperatorShell>`.
 *
 * - /gate/* → the desk owns the viewport: AuthGuard only, no shell
 *   chrome (drawer, floating buttons, picker). The desk page renders
 *   its own GatePickerScreen when the operator is unassigned.
 * - /operator/* and /worker → the full OperatorShell.
 */
export function GateAwareOperatorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/gate/")) {
    return <AuthGuard allowedRoles={["operator"] as const}>{children}</AuthGuard>;
  }

  return <OperatorShell>{children}</OperatorShell>;
}
