import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";
import { GateAwareOperatorShell } from "./GateAwareOperatorShell";

export const metadata: Metadata = {
  ...NOINDEX_METADATA,
  title: "Operator · Gate Monitor",
};

/**
 * Root layout for the (operator) route group.
 *
 * The gate desk at /gate/[gateId] is a chrome-free scanning surface:
 * the camera is the page and the two IN/OUT buttons are the only
 * tappable elements bottom-centre. Mounting the operator drawer, the
 * floating hamburger/settings buttons, and a GatePickerScreen wrapper
 * over it defeats that design — the desk page already renders its own
 * GatePickerScreen when the operator is unassigned, plus the offline
 * banner, scanner, and confirm card. So /gate/* must render bare
 * (AuthGuard only, no shell chrome).
 *
 * The branch decision uses usePathname (a client hook), so it lives in
 * the small client component `GateAwareOperatorShell` (its own file
 * with the "use client" directive). On /gate/* it renders AuthGuard
 * only; everywhere else it renders the full OperatorShell.
 *
 * The nested (operator)/operator/layout.tsx adds the RoleDesktopShell /
 * RoleMobileShell chrome for /operator/* pages only — that is one shell
 * per tree, not two: this root layout never mounts a RoleShell.
 */
export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GateAwareOperatorShell>{children}</GateAwareOperatorShell>;
}
